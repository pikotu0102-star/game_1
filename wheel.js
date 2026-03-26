(() => {
  // ── Colour palette ────────────────────────────────────────────────────────
  const PALETTE = [
    '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71',
    '#1abc9c', '#3498db', '#9b59b6', '#e91e63',
    '#ff5722', '#8bc34a', '#00bcd4', '#673ab7',
    '#ff9800', '#4caf50', '#03a9f4', '#f06292',
    '#aed581', '#4dd0e1', '#ce93d8', '#ffcc02',
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let segments = [];   // [{ label, weight, color }]
  let rotation = 0;    // current canvas rotation in radians
  let spinning = false;

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const canvas    = document.getElementById('wheel-canvas');
  const ctx       = canvas.getContext('2d');
  const spinBtn   = document.getElementById('spin-btn');
  const applyBtn  = document.getElementById('apply-btn');
  const countInput = document.getElementById('item-count');
  const segsList  = document.getElementById('segments-list');
  const resultEl  = document.getElementById('result');

  // ── Initialise ────────────────────────────────────────────────────────────
  function init() {
    const count = parseInt(countInput.value, 10);
    renderConfigRows(count);
    applyConfig();
  }

  // ── Config UI ─────────────────────────────────────────────────────────────

  /** Build / rebuild the config rows, preserving existing values. */
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

  /** Read current values from config rows. */
  function readConfigRows() {
    const rows = segsList.querySelectorAll('.segment-row');
    return Array.from(rows).map((row, i) => ({
      label:  row.querySelector('.seg-label').value.trim() || `選項 ${i + 1}`,
      weight: Math.max(0.01, parseFloat(row.querySelector('.seg-weight').value) || 1),
      color:  PALETTE[i % PALETTE.length],
    }));
  }

  /** Read config, rebuild segments array, redraw wheel. */
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

  /** Draw the wheel at a given rotation offset (radians). */
  function drawWheel(rot) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!segments.length) return;

    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startAngle = rot - Math.PI / 2; // 0° points up

    segments.forEach((seg, i) => {
      const arc = (seg.weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + arc;
      const midAngle = startAngle + arc / 2;

      // Sector fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Sector border
      ctx.strokeStyle = '#fff3';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      drawLabel(seg.label, midAngle, arc);

      startAngle = endAngle;
    });

    // Centre circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /** Draw a label along a sector, clipped/truncated to fit. */
  function drawLabel(text, midAngle, arc) {
    const maxLen = Math.min(24, Math.max(4, Math.floor(arc * R / 8)));
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
    ctx.shadowColor = '#0007';
    ctx.shadowBlur = 3;
    ctx.fillText(display, 0, 0);
    ctx.restore();
  }

  // ── Spin logic ────────────────────────────────────────────────────────────

  /**
   * Pick a winning segment index using weighted random.
   */
  function pickWinner() {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let rand = Math.random() * totalWeight;
    for (let i = 0; i < segments.length; i++) {
      rand -= segments[i].weight;
      if (rand <= 0) return i;
    }
    return segments.length - 1;
  }

  /**
   * Calculate target rotation so that the winning segment lands
   * directly under the top pointer (−π/2 direction).
   */
  function targetRotationForWinner(winnerIndex) {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startFrac = 0;
    for (let i = 0; i < winnerIndex; i++) {
      startFrac += segments[i].weight / totalWeight;
    }
    const midFrac = startFrac + (segments[winnerIndex].weight / totalWeight) / 2;

    // The wheel's 0° is at −π/2 (top). The winning segment's centre
    // must align with the pointer (top). We need the rotation offset
    // such that: rot - midFrac * 2π ≡ 0  =>  rot = midFrac * 2π
    // But we also add several full rotations for drama.
    const fullSpins = 5 + Math.floor(Math.random() * 5); // 5-9 full spins
    return fullSpins * 2 * Math.PI + midFrac * 2 * Math.PI;
  }

  /** Ease-out cubic: t ∈ [0,1] → [0,1] */
  function easeOut(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function spin() {
    if (spinning || segments.length < 2) return;
    spinning = true;
    spinBtn.disabled = true;
    applyBtn.disabled = true;
    resultEl.classList.add('hidden');

    const winnerIndex  = pickWinner();
    const totalAngle   = targetRotationForWinner(winnerIndex);
    const startRotation = rotation;
    const duration     = 4000 + Math.random() * 1500; // 4–5.5 s
    const startTime    = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      rotation = startRotation + totalAngle * easeOut(t);
      drawWheel(rotation);

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        // Normalise rotation to [0, 2π)
        rotation = rotation % (2 * Math.PI);
        spinning = false;
        spinBtn.disabled = false;
        applyBtn.disabled = false;
        showResult(segments[winnerIndex].label);
      }
    }

    requestAnimationFrame(frame);
  }

  function showResult(label) {
    resultEl.textContent = `🎉 恭喜！結果：${label}`;
    resultEl.classList.remove('hidden');
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  countInput.addEventListener('change', () => {
    let v = parseInt(countInput.value, 10);
    if (isNaN(v) || v < 2)  v = 2;
    if (v > 20)             v = 20;
    countInput.value = v;
    renderConfigRows(v);
  });

  applyBtn.addEventListener('click', applyConfig);
  spinBtn.addEventListener('click', spin);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  init();
})();
