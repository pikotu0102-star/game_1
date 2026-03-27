(() => {
  // ── Audio (Web Audio API) ─────────────────────────────────────────────────
  let audioCtx = null;

  function getAudioCtx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  /** Short tick/click sound. speed: 0 (slow) → 1 (fast). */
  function playTick(speed) {
    try {
      const ac = getAudioCtx();
      const osc  = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.value = 480 + speed * 420; // 480–900 Hz
      const t = ac.currentTime;
      gain.gain.setValueAtTime(0.12 + speed * 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.start(t);
      osc.stop(t + 0.045);
    } catch (e) { /* ignore audio errors */ }
  }

  /** Fanfare played when the wheel stops. */
  function playCelebration() {
    try {
      const ac = getAudioCtx();
      // C5, E5, G5, C6, G5, C6
      const melody = [
        [523.25, 0.00],
        [659.25, 0.10],
        [783.99, 0.20],
        [1046.50, 0.30],
        [783.99,  0.46],
        [1046.50, 0.58],
      ];
      melody.forEach(([freq, delay]) => {
        const osc  = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ac.currentTime + delay;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.32, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.28);
      });
    } catch (e) { /* ignore */ }
  }

  // ── Colour palette (vivid) ────────────────────────────────────────────────
  const PALETTE = [
    '#FF3B3B', '#FF7D00', '#FFD600', '#00CC6A',
    '#00BFFF', '#9B2FBE', '#FF2D78', '#00E5D1',
    '#FF5500', '#2ECC40', '#5A5AFF', '#FF1F8E',
    '#AAFF00', '#0077FF', '#FF4500', '#DD00FF',
    '#FFAA00', '#00FFAA', '#FF0055', '#88FF00',
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let segments = [];    // [{ label, weight, color }]
  let rotation = 0;     // current canvas rotation (radians)
  let spinning = false;
  let history  = [];    // [{ label, time }], max 10
  let stats    = {};    // { label: count }
  let prevSegIdx   = -1;
  let lastTickTime = 0;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const canvas       = document.getElementById('wheel-canvas');
  const ctx          = canvas.getContext('2d');
  const spinBtn      = document.getElementById('spin-btn');
  const applyBtn     = document.getElementById('apply-btn');
  const countInput   = document.getElementById('item-count');
  const segsList     = document.getElementById('segments-list');
  const resultEl     = document.getElementById('result');
  const historyList  = document.getElementById('history-list');
  const statsList    = document.getElementById('stats-list');
  const clearHistBtn = document.getElementById('clear-history-btn');
  const flashOverlay = document.getElementById('flash-overlay');

  // ── Initialise ────────────────────────────────────────────────────────────
  function init() {
    const count = parseInt(countInput.value, 10);
    renderConfigRows(count);
    applyConfig();
    renderHistory();
    renderStats();
  }

  // ── Config UI ─────────────────────────────────────────────────────────────

  function renderConfigRows(count) {
    const existing = readConfigRows();
    segsList.innerHTML = '';

    for (let i = 0; i < count; i++) {
      const label  = existing[i]?.label  ?? `選項 ${i + 1}`;
      const weight = existing[i]?.weight ?? 1;
      const color  = PALETTE[i % PALETTE.length];

      const row = document.createElement('div');
      row.className = 'segment-row';
      row.innerHTML = `
        <span class="color-dot" style="background:${color}"></span>
        <input class="seg-label"  type="text"   value="${escHtml(label)}"  placeholder="名稱" />
        <span class="weight-label">比重</span>
        <input class="seg-weight" type="number" value="${weight}" min="0.01" step="0.01" />
      `;
      segsList.appendChild(row);
    }
  }

  function readConfigRows() {
    const rows = segsList.querySelectorAll('.segment-row');
    return Array.from(rows).map((row, i) => ({
      label:  row.querySelector('.seg-label').value.trim() || `選項 ${i + 1}`,
      weight: Math.max(0.01, parseFloat(row.querySelector('.seg-weight').value) || 1),
      color:  PALETTE[i % PALETTE.length],
    }));
  }

  function applyConfig() {
    segments = readConfigRows();
    rotation = 0;
    resultEl.classList.add('hidden');
    drawWheel(0);
  }

  // ── Canvas drawing ────────────────────────────────────────────────────────

  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const R  = canvas.width  / 2 - 4;

  function drawWheel(rot) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!segments.length) return;

    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startAngle = rot - Math.PI / 2;

    segments.forEach((seg) => {
      const arc      = (seg.weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + arc;
      const midAngle = startAngle + arc / 2;

      // Radial gradient for each sector (lighter at center, richer at edge)
      const grad = ctx.createRadialGradient(cx, cy, R * 0.15, cx, cy, R);
      grad.addColorStop(0, lightenColor(seg.color, 55));
      grad.addColorStop(1, seg.color);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      drawLabel(seg.label, midAngle, arc);
      startAngle = endAngle;
    });

    // Outer ring highlight
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Centre circle with gradient
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    cg.addColorStop(0, '#ffffff');
    cg.addColorStop(1, '#cccccc');
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Lighten a 6-digit hex colour by adding `amount` to each RGB channel. */
  function lightenColor(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function drawLabel(text, midAngle, arc) {
    const maxLen  = Math.min(24, Math.max(4, Math.floor(arc * R / 8)));
    const display = text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;

    const textR = R * 0.62;
    const tx = cx + textR * Math.cos(midAngle);
    const ty = cy + textR * Math.sin(midAngle);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(midAngle + Math.PI / 2);

    const fontSize = Math.max(10, Math.min(18, arc * R / (display.length * 0.7 + 1)));
    ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 4;
    ctx.fillText(display, 0, 0);
    ctx.restore();
  }

  // ── Spin logic ────────────────────────────────────────────────────────────

  /**
   * Return the index of the segment currently under the top pointer.
   * The pointer corresponds to rotation-fraction = rot / (2π) mod 1.
   */
  function getSegmentAtPointer(rot) {
    if (!segments.length) return -1;
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    const normalised  = ((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const fraction    = normalised / (2 * Math.PI);
    let cumFrac = 0;
    for (let i = 0; i < segments.length; i++) {
      cumFrac += segments[i].weight / totalWeight;
      if (fraction < cumFrac) return i;
    }
    return segments.length - 1;
  }

  function pickWinner() {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < segments.length; i++) {
      rand -= segments[i].weight;
      if (rand <= 0) return i;
    }
    return segments.length - 1;
  }

  function targetRotationForWinner(winnerIndex) {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startFrac = 0;
    for (let i = 0; i < winnerIndex; i++) {
      startFrac += segments[i].weight / totalWeight;
    }
    const midFrac   = startFrac + (segments[winnerIndex].weight / totalWeight) / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 5); // 5–9 full spins
    return fullSpins * 2 * Math.PI + midFrac * 2 * Math.PI;
  }

  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spin() {
    if (spinning || segments.length < 2) return;

    // Ensure AudioContext is running (may be suspended until first user gesture)
    getAudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    spinning = true;
    spinBtn.disabled  = true;
    applyBtn.disabled = true;
    resultEl.classList.add('hidden');

    const winnerIndex   = pickWinner();
    const totalAngle    = targetRotationForWinner(winnerIndex);
    const startRotation = rotation;
    const duration      = 4000 + Math.random() * 1500; // 4–5.5 s
    const startTime     = performance.now();

    prevSegIdx   = getSegmentAtPointer(rotation);
    lastTickTime = 0;

    function frame(now) {
      const elapsed = now - startTime;
      const t       = Math.min(elapsed / duration, 1);
      const newRot  = startRotation + totalAngle * easeOut(t);

      // Play tick when the pointer crosses a segment boundary
      const newSegIdx = getSegmentAtPointer(newRot);
      if (newSegIdx !== prevSegIdx) {
        prevSegIdx = newSegIdx;
        if (now - lastTickTime > 75) {
          playTick(1 - t);
          lastTickTime = now;
        }
      }

      rotation = newRot;
      drawWheel(rotation);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation  = rotation % (2 * Math.PI);
        spinning  = false;
        spinBtn.disabled  = false;
        applyBtn.disabled = false;
        showResult(segments[winnerIndex].label);
      }
    }

    requestAnimationFrame(frame);
  }

  function showResult(label) {
    resultEl.textContent = `🎉 恭喜！結果：${label}`;
    resultEl.classList.remove('hidden');
    // Re-trigger bounce animation
    resultEl.classList.remove('bounce');
    void resultEl.offsetWidth; // force reflow so animation restarts
    resultEl.classList.add('bounce');

    // Flash overlay on the wheel
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add('flashing');

    playCelebration();
    addHistory(label);
  }

  // ── History & Stats ───────────────────────────────────────────────────────

  function addHistory(label) {
    history.unshift({ label, time: new Date() });
    if (history.length > 10) history.pop();
    stats[label] = (stats[label] || 0) + 1;
    renderHistory();
    renderStats();
  }

  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<p class="history-empty">還沒有紀錄喔！</p>';
      return;
    }
    historyList.innerHTML = history.map((item, i) => {
      const timeStr = item.time.toLocaleTimeString('zh-TW', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
      return `<div class="history-item${i === 0 ? ' history-item-new' : ''}">
        <span class="history-rank">#${i + 1}</span>
        <span class="history-label">${escHtml(item.label)}</span>
        <span class="history-time">${timeStr}</span>
      </div>`;
    }).join('');
  }

  function renderStats() {
    const entries = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      statsList.innerHTML = '<p class="history-empty">尚無統計資料</p>';
      return;
    }
    const total = entries.reduce((s, [, c]) => s + c, 0);
    statsList.innerHTML = entries.map(([label, count]) => {
      const pct = Math.round((count / total) * 100);
      return `<div class="stat-item">
        <span class="stat-label" title="${escHtml(label)}">${escHtml(label)}</span>
        <div class="stat-bar-wrap">
          <div class="stat-bar" style="width:${pct}%"></div>
        </div>
        <span class="stat-count">${count}次</span>
      </div>`;
    }).join('');
  }

  // ── Ripple effect ─────────────────────────────────────────────────────────

  function addRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.width  = size + 'px';
    ripple.style.height = size + 'px';
    ripple.style.left   = (e.clientX - rect.left - size / 2) + 'px';
    ripple.style.top    = (e.clientY - rect.top  - size / 2) + 'px';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  countInput.addEventListener('change', () => {
    let v = parseInt(countInput.value, 10);
    if (isNaN(v) || v < 2) v = 2;
    if (v > 20)            v = 20;
    countInput.value = v;
    renderConfigRows(v);
  });

  spinBtn.addEventListener('click', (e) => {
    addRipple(spinBtn, e);
    spin();
  });

  applyBtn.addEventListener('click', (e) => {
    addRipple(applyBtn, e);
    applyConfig();
  });

  clearHistBtn.addEventListener('click', () => {
    history = [];
    stats   = {};
    renderHistory();
    renderStats();
  });

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  init();
})();
