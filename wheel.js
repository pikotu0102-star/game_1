(() => {
  // ── Audio (Web Audio API) ─────────────────────────────────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function playTick(speed) {
    try {
      const ac = getAudioCtx();
      const osc = ac.createOscillator(), gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'triangle';
      osc.frequency.value = 480 + speed * 420;
      const t = ac.currentTime;
      gain.gain.setValueAtTime(0.12 + speed * 0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.start(t); osc.stop(t + 0.045);
    } catch(e) {}
  }
  function playCelebration() {
    try {
      const ac = getAudioCtx();
      [[523.25,0],[659.25,.1],[783.99,.2],[1046.5,.3],[783.99,.46],[1046.5,.58]]
        .forEach(([freq, delay]) => {
          const osc = ac.createOscillator(), gain = ac.createGain();
          osc.connect(gain); gain.connect(ac.destination);
          osc.type = 'sine'; osc.frequency.value = freq;
          const t = ac.currentTime + delay;
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.32, t + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
          osc.start(t); osc.stop(t + 0.28);
        });
    } catch(e) {}
  }

  // ── Visual constants ──────────────────────────────────────────────────────
  const PALETTE = [
    '#FF3B3B','#FF7D00','#FFD600','#00CC6A','#00BFFF','#9B2FBE',
    '#FF2D78','#00E5D1','#FF5500','#2ECC40','#5A5AFF','#FF1F8E',
    '#AAFF00','#0077FF','#FF4500','#DD00FF','#FFAA00','#00FFAA','#FF0055','#88FF00',
  ];
  const BODY_BG     = 'linear-gradient(135deg,#1a0533 0%,#0d1b5e 55%,#0a0a2e 100%)';
  const RIM         = { dark: '#b8860b', mid: '#daa520', light: '#ffd700' };
  const ACCENT_GLOW = 'rgba(240,192,64,0.55)';

  // ── Default themes (content-focused) ─────────────────────────────────────
  const DEFAULT_THEMES = [
    {
      id: 'eat', name: '今天吃什麼', emoji: '🍽️',
      items: [
        { label: '火鍋',   weight: 1 },
        { label: '壽司',   weight: 1 },
        { label: '麥當勞', weight: 1 },
        { label: '便當',   weight: 1 },
        { label: '滷肉飯', weight: 1 },
        { label: '牛肉麵', weight: 1 },
      ],
    },
    {
      id: 'game', name: '玩什麼遊戲', emoji: '🎮',
      items: [
        { label: 'Switch', weight: 1 },
        { label: '手遊',   weight: 1 },
        { label: '桌遊',   weight: 1 },
        { label: '看電影', weight: 1 },
        { label: 'KTV',    weight: 1 },
        { label: '運動',   weight: 1 },
      ],
    },
    {
      id: 'sleep', name: '睡覺時間', emoji: '😴',
      items: [
        { label: '10點', weight: 1 },
        { label: '11點', weight: 1 },
        { label: '12點', weight: 1 },
        { label: '1點',  weight: 1 },
        { label: '2點',  weight: 1 },
        { label: '隨便', weight: 1 },
      ],
    },
  ];

  // ── Storage ───────────────────────────────────────────────────────────────
  const LS_THEMES = 'luckyWheel_themes2';
  const LS_ACTIVE = 'luckyWheel_activeId2';

  let themes = [];
  let activeThemeId = '';

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_THEMES));
      themes = (saved && saved.length)
        ? saved
        : DEFAULT_THEMES.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));
    } catch (e) {
      themes = DEFAULT_THEMES.map(t => ({ ...t, items: t.items.map(i => ({ ...i })) }));
    }
    const savedId = localStorage.getItem(LS_ACTIVE);
    activeThemeId = themes.find(t => t.id === savedId) ? savedId : (themes[0]?.id ?? '');
  }

  function saveData() {
    localStorage.setItem(LS_THEMES, JSON.stringify(themes));
    localStorage.setItem(LS_ACTIVE, activeThemeId);
  }

  function getActiveTheme() {
    return themes.find(t => t.id === activeThemeId) || themes[0];
  }

  // ── Wheel state ───────────────────────────────────────────────────────────
  let segments     = [];
  let rotation     = 0;
  let spinning     = false;
  let history      = [];
  let stats        = {};
  let prevSegIdx   = -1;
  let lastTickTime = 0;

  // ── Jiaobei state ─────────────────────────────────────────────────────────
  let jiaobeiMode    = false;
  let throwingAnim   = false;
  let jiaobeiHistory = [];
  let jiaobeiStats   = {};

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const canvas        = document.getElementById('wheel-canvas');
  const ctx           = canvas.getContext('2d');
  const spinBtn       = document.getElementById('spin-btn');
  const resultEl      = document.getElementById('result');
  const historyList   = document.getElementById('history-list');
  const statsList     = document.getElementById('stats-list');
  const clearHistBtn  = document.getElementById('clear-history-btn');
  const flashOverlay  = document.getElementById('flash-overlay');
  const themeSelect   = document.getElementById('theme-select');
  const settingsBtn   = document.getElementById('settings-btn');
  const addThemeBtn   = document.getElementById('add-theme-btn');
  // Management modal
  const mgmtModal     = document.getElementById('mgmt-modal');
  const mgmtAddBtn    = document.getElementById('mgmt-add-btn');
  const mgmtCloseBtn  = document.getElementById('mgmt-close-btn');
  const themeCards    = document.getElementById('theme-cards');
  // Edit modal
  const editModal      = document.getElementById('edit-modal');
  const editModalTitle = document.getElementById('edit-modal-title');
  const editEmoji      = document.getElementById('edit-emoji');
  const editName       = document.getElementById('edit-name');
  const editItemsList  = document.getElementById('edit-items-list');
  const editAddItemBtn = document.getElementById('edit-add-item-btn');
  const editSaveBtn    = document.getElementById('edit-save-btn');
  const editCancelBtn  = document.getElementById('edit-cancel-btn');
  // Jiaobei
  const modeToggleBtn   = document.getElementById('mode-toggle-btn');
  const jiaobeiView     = document.getElementById('jiaobei-view');
  const jCanvas         = document.getElementById('jiaobei-canvas');
  const jCtx            = jCanvas.getContext('2d');
  const throwBtn        = document.getElementById('throw-btn');
  const jiaobeiResultEl = document.getElementById('jiaobei-result');
  const historyTitle    = document.getElementById('history-panel-title');
  const wheelMode       = document.getElementById('wheel-mode');

  // ── Theme application ─────────────────────────────────────────────────────
  function applyTheme(id) {
    activeThemeId = id;
    const theme = getActiveTheme();
    segments = theme.items.map((item, i) => ({
      label:  item.label,
      weight: item.weight,
      color:  PALETTE[i % PALETTE.length],
    }));
    rotation = 0;
    if (!jiaobeiMode) resultEl.classList.add('hidden');
    drawWheel(0);
    renderThemeSelector();
    saveData();
  }

  function renderThemeSelector() {
    themeSelect.innerHTML = themes.map(t =>
      `<option value="${t.id}"${t.id === activeThemeId ? ' selected' : ''}>${t.emoji} ${t.name}</option>`
    ).join('');
  }

  // ── Canvas drawing ─────────────────────────────────────────────────────────
  const cx = canvas.width  / 2;
  const cy = canvas.height / 2;
  const R  = canvas.width  / 2 - 4;

  function drawWheel(rot) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!segments.length) return;

    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startAngle = rot - Math.PI / 2;

    // 1. Sectors
    segments.forEach(seg => {
      const arc      = (seg.weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + arc;
      const midAngle = startAngle + arc / 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.closePath();

      const rg = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
      rg.addColorStop(0,    lightenColor(seg.color, 80));
      rg.addColorStop(0.45, lightenColor(seg.color, 28));
      rg.addColorStop(1,    seg.color);
      ctx.fillStyle = rg;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.closePath();
      const spec = ctx.createRadialGradient(cx - R*0.28, cy - R*0.28, 0, cx, cy, R);
      spec.addColorStop(0,   'rgba(255,255,255,0.20)');
      spec.addColorStop(0.5, 'rgba(255,255,255,0.04)');
      spec.addColorStop(1,   'rgba(0,0,0,0.10)');
      ctx.fillStyle = spec;
      ctx.fill();

      drawLabel(seg.label, midAngle, arc);
      startAngle = endAngle;
    });

    // 2. Divider lines
    let divAngle = rot - Math.PI / 2;
    segments.forEach(seg => {
      const arc = (seg.weight / totalWeight) * 2 * Math.PI;
      const ex = cx + (R + 1) * Math.cos(divAngle);
      const ey = cy + (R + 1) * Math.sin(divAngle);
      ctx.beginPath(); ctx.moveTo(cx+1, cy+1); ctx.lineTo(ex+1, ey+1);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(255,255,255,0.70)'; ctx.lineWidth = 1.5; ctx.stroke();
      divAngle += arc;
    });

    // 3. Metallic outer rim
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = ACCENT_GLOW.replace(/[\d.]+\)$/, '0.22)');
    ctx.lineWidth = 16;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = RIM.dark; ctx.lineWidth = 11; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = RIM.mid; ctx.lineWidth = 7; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = RIM.light; ctx.lineWidth = 3; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, R - 6, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.stroke();

    // 4. Metallic center
    const cR = 26;
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, cR, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fill();

    const mg = ctx.createRadialGradient(cx - cR*0.38, cy - cR*0.38, 0, cx, cy, cR);
    mg.addColorStop(0,    '#ffffff');
    mg.addColorStop(0.22, '#e8e8e8');
    mg.addColorStop(0.55, '#b4b4b4');
    mg.addColorStop(0.85, '#808080');
    mg.addColorStop(1,    '#585858');
    ctx.beginPath();
    ctx.arc(cx, cy, cR, 0, 2 * Math.PI);
    ctx.fillStyle = mg;
    ctx.fill();

    const gg = ctx.createLinearGradient(cx - cR, cy - cR, cx + cR, cy + cR);
    gg.addColorStop(0,   RIM.light);
    gg.addColorStop(0.4, '#fffacd');
    gg.addColorStop(1,   RIM.dark);
    ctx.strokeStyle = gg; ctx.lineWidth = 3.5; ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx - cR*0.36, cy - cR*0.36, cR * 0.26, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.fill();
  }

  function lightenColor(hex, amount) {
    const r = Math.min(255, parseInt(hex.slice(1,3), 16) + amount);
    const g = Math.min(255, parseInt(hex.slice(3,5), 16) + amount);
    const b = Math.min(255, parseInt(hex.slice(5,7), 16) + amount);
    return `rgb(${r},${g},${b})`;
  }

  function drawLabel(text, midAngle, arc) {
    const maxLen  = Math.min(24, Math.max(4, Math.floor(arc * R / 8)));
    const display = text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
    const textR   = R * 0.62;
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
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 4;
    ctx.fillText(display, 0, 0);
    ctx.restore();
  }

  // ── Spin logic ─────────────────────────────────────────────────────────────
  function getSegmentAtPointer(rot) {
    if (!segments.length) return -1;
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    const normalised  = ((rot % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const offset      = (2 * Math.PI - normalised) % (2 * Math.PI);
    let cumAngle = 0;
    for (let i = 0; i < segments.length; i++) {
      cumAngle += (segments[i].weight / totalWeight) * 2 * Math.PI;
      if (offset < cumAngle) return i;
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

  function targetRotationForWinner(winnerIndex, startRotation) {
    const totalWeight = segments.reduce((s, seg) => s + seg.weight, 0);
    let startFrac = 0;
    for (let i = 0; i < winnerIndex; i++) startFrac += segments[i].weight / totalWeight;
    const midFrac   = startFrac + (segments[winnerIndex].weight / totalWeight) / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 5);
    return (1 - midFrac) * 2 * Math.PI - startRotation + fullSpins * 2 * Math.PI;
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function spin() {
    if (spinning || segments.length < 2) return;
    getAudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    spinning = true;
    spinBtn.disabled = true;
    resultEl.classList.add('hidden');
    const winnerIndex   = pickWinner();
    const startRotation = rotation;
    const totalAngle    = targetRotationForWinner(winnerIndex, startRotation);
    const duration      = 4000 + Math.random() * 1500;
    const startTime     = performance.now();
    prevSegIdx   = getSegmentAtPointer(rotation);
    lastTickTime = 0;

    function frame(now) {
      const elapsed = now - startTime;
      const t       = Math.min(elapsed / duration, 1);
      const newRot  = startRotation + totalAngle * easeOut(t);
      const newSegIdx = getSegmentAtPointer(newRot);
      if (newSegIdx !== prevSegIdx) {
        prevSegIdx = newSegIdx;
        if (now - lastTickTime > 75) { playTick(1 - t); lastTickTime = now; }
      }
      rotation = newRot;
      drawWheel(rotation);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        rotation = rotation % (2 * Math.PI);
        spinning = false;
        spinBtn.disabled = false;
        showResult(segments[winnerIndex].label);
      }
    }
    requestAnimationFrame(frame);
  }

  function showResult(label) {
    resultEl.textContent = `🎉 恭喜！結果：${label}`;
    resultEl.classList.remove('hidden');
    resultEl.classList.remove('bounce');
    void resultEl.offsetWidth;
    resultEl.classList.add('bounce');
    flashOverlay.classList.remove('flashing');
    void flashOverlay.offsetWidth;
    flashOverlay.classList.add('flashing');
    playCelebration();
    addHistory(label);
  }

  // ── History & Stats ────────────────────────────────────────────────────────
  function addHistory(label) {
    history.unshift({ label, time: new Date() });
    if (history.length > 10) history.pop();
    stats[label] = (stats[label] || 0) + 1;
    renderHistory(); renderStats();
  }

  function renderHistory() {
    const src = jiaobeiMode ? jiaobeiHistory : history;
    if (!src.length) {
      historyList.innerHTML = '<p class="history-empty">還沒有紀錄喔！</p>';
      return;
    }
    historyList.innerHTML = src.map((item, i) => {
      const timeStr = item.time.toLocaleTimeString('zh-TW', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const extra   = item.type ? ` jb-${item.type}` : '';
      return `<div class="history-item${extra}${i===0?' history-item-new':''}">
        <span class="history-rank">#${i+1}</span>
        <span class="history-label">${escHtml(item.label)}</span>
        <span class="history-time">${timeStr}</span>
      </div>`;
    }).join('');
  }

  function renderStats() {
    const src = jiaobeiMode ? jiaobeiStats : stats;
    const entries = Object.entries(src).sort((a,b)=>b[1]-a[1]);
    if (!entries.length) {
      statsList.innerHTML = '<p class="history-empty">尚無統計資料</p>';
      return;
    }
    const total = entries.reduce((s,[,c])=>s+c, 0);
    statsList.innerHTML = entries.map(([label,count]) => {
      const pct = Math.round(count/total*100);
      return `<div class="stat-item">
        <span class="stat-label" title="${escHtml(label)}">${escHtml(label)}</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%"></div></div>
        <span class="stat-count">${count}次</span>
      </div>`;
    }).join('');
  }

  // ── Ripple ─────────────────────────────────────────────────────────────────
  function addRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), {once:true});
  }

  // ── Theme management modal ─────────────────────────────────────────────────
  function openMgmtModal() {
    renderThemeCards();
    mgmtModal.classList.remove('hidden');
  }
  function closeMgmtModal() {
    mgmtModal.classList.add('hidden');
  }

  function drawMiniWheel(miniCanvas, items) {
    const mCtx = miniCanvas.getContext('2d');
    const W = miniCanvas.width, H = miniCanvas.height;
    const mcx = W / 2, mcy = H / 2, mR = Math.min(W, H) / 2 - 2;
    mCtx.clearRect(0, 0, W, H);
    if (!items.length) return;
    const total = items.reduce((s, i) => s + i.weight, 0);
    let angle = -Math.PI / 2;
    items.forEach((item, i) => {
      const arc = (item.weight / total) * 2 * Math.PI;
      mCtx.beginPath();
      mCtx.moveTo(mcx, mcy);
      mCtx.arc(mcx, mcy, mR, angle, angle + arc);
      mCtx.closePath();
      mCtx.fillStyle = PALETTE[i % PALETTE.length];
      mCtx.fill();
      angle += arc;
    });
    angle = -Math.PI / 2;
    items.forEach(item => {
      const arc = (item.weight / total) * 2 * Math.PI;
      const ex = mcx + mR * Math.cos(angle), ey = mcy + mR * Math.sin(angle);
      mCtx.beginPath(); mCtx.moveTo(mcx, mcy); mCtx.lineTo(ex, ey);
      mCtx.strokeStyle = 'rgba(255,255,255,0.5)'; mCtx.lineWidth = 1; mCtx.stroke();
      angle += arc;
    });
    mCtx.beginPath(); mCtx.arc(mcx, mcy, mR, 0, Math.PI * 2);
    mCtx.strokeStyle = '#daa520'; mCtx.lineWidth = 3; mCtx.stroke();
    mCtx.beginPath(); mCtx.arc(mcx, mcy, mR * 0.18, 0, Math.PI * 2);
    mCtx.fillStyle = '#b8860b'; mCtx.fill();
  }

  function renderThemeCards() {
    themeCards.innerHTML = themes.map(t => `
      <div class="theme-card${t.id === activeThemeId ? ' theme-card-active' : ''}" data-id="${t.id}">
        <canvas class="mini-wheel" width="90" height="90"></canvas>
        <div class="theme-card-info">
          <div class="theme-card-title">${t.emoji} ${escHtml(t.name)}</div>
          <div class="theme-card-items-preview">
            ${t.items.slice(0, 5).map(i => `<span>${escHtml(i.label)}</span>`).join('')}
            ${t.items.length > 5 ? `<span class="more-badge">+${t.items.length - 5}</span>` : ''}
          </div>
          <div class="theme-card-actions">
            <button class="btn btn-sm btn-card-edit" data-id="${t.id}">✏️ 編輯</button>
            <button class="btn btn-sm btn-card-del"  data-id="${t.id}">🗑️ 刪除</button>
          </div>
        </div>
      </div>
    `).join('');

    themeCards.querySelectorAll('.theme-card').forEach(card => {
      const t = themes.find(th => th.id === card.dataset.id);
      if (t) drawMiniWheel(card.querySelector('.mini-wheel'), t.items);
    });

    themeCards.querySelectorAll('.theme-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        applyTheme(card.dataset.id);
        closeMgmtModal();
      });
    });

    themeCards.querySelectorAll('.btn-card-edit').forEach(btn =>
      btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
    themeCards.querySelectorAll('.btn-card-del').forEach(btn =>
      btn.addEventListener('click', () => deleteTheme(btn.dataset.id)));
  }

  // ── Theme edit modal ───────────────────────────────────────────────────────
  let editingId = null;

  function openEditModal(themeId) {
    editingId = themeId || null;
    const theme = themeId ? themes.find(t => t.id === themeId) : null;
    editModalTitle.textContent = theme ? '編輯主題' : '新增主題';
    editEmoji.value = theme?.emoji ?? '⭐';
    editName.value  = theme?.name  ?? '';
    editItemsList.innerHTML = '';
    const items = theme
      ? theme.items
      : [{ label: '', weight: 1 }, { label: '', weight: 1 }];
    items.forEach(item => addEditItemRow(item.label));
    if (themeId) closeMgmtModal();
    editModal.classList.remove('hidden');
    editName.focus();
  }

  function closeEditModal() {
    editModal.classList.add('hidden');
  }

  function addEditItemRow(label = '') {
    const row = document.createElement('div');
    row.className = 'item-edit-row';
    row.innerHTML = `
      <input type="text" class="item-label-input" value="${escHtml(label)}" placeholder="選項名稱" maxlength="20" />
      <button class="btn btn-sm btn-item-del" title="刪除">🗑️</button>
    `;
    row.querySelector('.btn-item-del').addEventListener('click', () => {
      if (editItemsList.children.length > 1) row.remove();
    });
    editItemsList.appendChild(row);
  }

  function saveEditTheme() {
    const name  = editName.value.trim();
    const emoji = editEmoji.value.trim() || '⭐';
    if (!name) { editName.focus(); return; }

    const items = Array.from(editItemsList.querySelectorAll('.item-label-input'))
      .map(inp => inp.value.trim())
      .filter(Boolean)
      .map(label => ({ label, weight: 1 }));
    if (!items.length) { alert('請至少新增一個選項！'); return; }

    if (editingId) {
      const idx = themes.findIndex(t => t.id === editingId);
      if (idx >= 0) themes[idx] = { ...themes[idx], name, emoji, items };
      applyTheme(editingId);
    } else {
      const newId = 'theme_' + Date.now();
      themes.push({ id: newId, name, emoji, items });
      applyTheme(newId);
    }
    saveData();
    closeEditModal();
  }

  function deleteTheme(themeId) {
    if (themes.length <= 1) { alert('至少要保留一個主題！'); return; }
    const theme = themes.find(t => t.id === themeId);
    if (!theme || !confirm(`確定要刪除「${theme.emoji} ${theme.name}」嗎？`)) return;
    themes = themes.filter(t => t.id !== themeId);
    if (activeThemeId === themeId) applyTheme(themes[0].id);
    else saveData();
    renderThemeCards();
  }

  // ── Jiaobei mode ───────────────────────────────────────────────────────────
  const JIAOBEI_BG = 'linear-gradient(135deg,#1c0900 0%,#2d1400 50%,#0f0500 100%)';

  const JB_RESULTS = {
    sheng: { label: '聖筊', desc: '神明同意，吉！',     emoji: '✨', cls: 'sheng' },
    yin:   { label: '陰筊', desc: '神明不同意，凶。',   emoji: '🔴', cls: 'yin'   },
    xiao:  { label: '笑筊', desc: '神明在笑，請再問。', emoji: '😄', cls: 'xiao'  },
  };

  const JCX = jCanvas.width  / 2;
  const JCY = jCanvas.height / 2;

  function drawCup(ctx2, x, y, scaleY, face) {
    const W = 122, H = 58;
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.scale(1, scaleY);

    const showFace = scaleY < 0 ? (face === 'yang' ? 'yin' : 'yang') : face;

    const rg = ctx2.createRadialGradient(-W * 0.18, -H * 0.22, 2, 0, 0, W * 0.65);
    rg.addColorStop(0,    showFace === 'yang' ? '#cb7d3c' : '#d9962e');
    rg.addColorStop(0.42, '#8b4513');
    rg.addColorStop(0.82, '#5c2b0a');
    rg.addColorStop(1,    '#3a1408');

    ctx2.beginPath();
    ctx2.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
    ctx2.fillStyle = rg;
    ctx2.fill();

    if (showFace === 'yang') {
      const hg = ctx2.createRadialGradient(0, H * 0.1, 0, 0, H * 0.06, W * 0.32);
      hg.addColorStop(0,    '#1a0a02');
      hg.addColorStop(0.65, '#3d1b08');
      hg.addColorStop(1,    '#5c2b0a');
      ctx2.beginPath();
      ctx2.ellipse(0, H * 0.1, W * 0.37, H * 0.27, 0, 0, Math.PI * 2);
      ctx2.fillStyle = hg;
      ctx2.fill();
    } else {
      const sg = ctx2.createRadialGradient(-W * 0.15, -H * 0.18, 0, 0, 0, W * 0.52);
      sg.addColorStop(0,    'rgba(255,215,140,0.46)');
      sg.addColorStop(0.38, 'rgba(200,140,55,0.14)');
      sg.addColorStop(1,    'rgba(0,0,0,0)');
      ctx2.beginPath();
      ctx2.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
      ctx2.fillStyle = sg;
      ctx2.fill();
    }

    ctx2.beginPath();
    ctx2.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
    ctx2.strokeStyle = '#6b3008';
    ctx2.lineWidth = 3;
    ctx2.stroke();
    ctx2.restore();
  }

  function drawJiaobeiScene(c1, c2) {
    jCtx.clearRect(0, 0, jCanvas.width, jCanvas.height);
    const atmos = jCtx.createRadialGradient(JCX, JCY, 40, JCX, JCY, 240);
    atmos.addColorStop(0, 'rgba(160,90,20,0.12)');
    atmos.addColorStop(1, 'rgba(0,0,0,0)');
    jCtx.fillStyle = atmos;
    jCtx.fillRect(0, 0, jCanvas.width, jCanvas.height);
    const floorY = 400;
    const floor  = jCtx.createLinearGradient(0, floorY, 0, jCanvas.height);
    floor.addColorStop(0, 'rgba(110,55,15,0.38)');
    floor.addColorStop(1, 'rgba(50,20,5,0.58)');
    jCtx.fillStyle = floor;
    jCtx.fillRect(0, floorY, jCanvas.width, jCanvas.height - floorY);
    jCtx.beginPath();
    jCtx.moveTo(0, floorY); jCtx.lineTo(jCanvas.width, floorY);
    jCtx.strokeStyle = 'rgba(180,100,30,0.28)';
    jCtx.lineWidth = 1; jCtx.stroke();
    [c1, c2].forEach(c => {
      const alpha = Math.max(0, 1 - (floorY - c.y) / 200) * 0.28;
      if (alpha > 0) {
        jCtx.beginPath();
        jCtx.ellipse(c.x, floorY - 6, 56, 10, 0, 0, Math.PI * 2);
        jCtx.fillStyle = `rgba(0,0,0,${alpha})`;
        jCtx.fill();
      }
    });
    drawCup(jCtx, c1.x, c1.y, c1.scaleY, c1.face);
    drawCup(jCtx, c2.x, c2.y, c2.scaleY, c2.face);
  }

  function drawJiaobeiInitial() {
    drawJiaobeiScene(
      { x: 165, y: 365, scaleY: 1, face: 'yang' },
      { x: 335, y: 365, scaleY: 1, face: 'yang' }
    );
  }

  function throwJiaobei() {
    if (throwingAnim) return;
    const face1 = Math.random() < 0.5 ? 'yang' : 'yin';
    const face2 = Math.random() < 0.5 ? 'yang' : 'yin';
    let resultType;
    if ((face1 === 'yang') !== (face2 === 'yang')) resultType = 'sheng';
    else if (face1 === 'yin')                      resultType = 'yin';
    else                                           resultType = 'xiao';
    throwingAnim = true;
    throwBtn.disabled = true;
    jiaobeiResultEl.classList.add('hidden');
    const LAND1 = { x: 165, y: 365 };
    const LAND2 = { x: 335, y: 365 };
    const PEAK_Y = 120;
    const drift1 = (Math.random() - 0.5) * 80;
    const drift2 = (Math.random() - 0.5) * 80;
    const flips1 = 3 + Math.floor(Math.random() * 3);
    const flips2 = 3 + Math.floor(Math.random() * 3);
    const dur    = 1900 + Math.random() * 400;
    const startT = performance.now();

    function jbFrame(now) {
      const t      = Math.min((now - startT) / dur, 1);
      const height = 4 * t * (1 - t);
      const drift  = Math.sin(t * Math.PI);
      const spinT  = Math.min(t / 0.78, 1);
      const sc1    = spinT < 1 ? Math.cos(flips1 * 2 * Math.PI * spinT) : 1;
      const sc2    = spinT < 1 ? Math.cos(flips2 * 2 * Math.PI * spinT) : 1;
      drawJiaobeiScene(
        { x: LAND1.x + drift1 * drift,
          y: LAND1.y - (LAND1.y - PEAK_Y) * height,
          scaleY: Math.abs(sc1) < 0.055 ? 0.055 * Math.sign(sc1 || 1) : sc1,
          face: face1 },
        { x: LAND2.x + drift2 * drift,
          y: LAND2.y - (LAND2.y - PEAK_Y) * height,
          scaleY: Math.abs(sc2) < 0.055 ? 0.055 * Math.sign(sc2 || 1) : sc2,
          face: face2 }
      );
      if (t < 1) {
        requestAnimationFrame(jbFrame);
      } else {
        drawJiaobeiScene(
          { x: LAND1.x, y: LAND1.y, scaleY: 1, face: face1 },
          { x: LAND2.x, y: LAND2.y, scaleY: 1, face: face2 }
        );
        throwingAnim = false;
        throwBtn.disabled = false;
        showJiaobeiResult(resultType);
      }
    }
    requestAnimationFrame(jbFrame);
  }

  function showJiaobeiResult(type) {
    const r = JB_RESULTS[type];
    jiaobeiResultEl.className = `jiaobei-result ${r.cls}`;
    jiaobeiResultEl.textContent = `${r.emoji} ${r.label}：${r.desc}`;
    jiaobeiResultEl.classList.remove('hidden');
    jiaobeiResultEl.classList.remove('bounce');
    void jiaobeiResultEl.offsetWidth;
    jiaobeiResultEl.classList.add('bounce');
    if (type === 'sheng') playCelebration(); else playTick(0.5);
    addJiaobeiHistory(r.label, type);
  }

  function addJiaobeiHistory(label, type) {
    jiaobeiHistory.unshift({ label, type, time: new Date() });
    if (jiaobeiHistory.length > 10) jiaobeiHistory.pop();
    jiaobeiStats[label] = (jiaobeiStats[label] || 0) + 1;
    renderHistory(); renderStats();
  }

  function toggleMode() {
    jiaobeiMode = !jiaobeiMode;
    if (jiaobeiMode) {
      modeToggleBtn.textContent = '🎡 轉盤';
      document.body.style.background = JIAOBEI_BG;
      wheelMode.style.display   = 'none';
      jiaobeiView.style.display = 'flex';
      historyTitle.textContent  = '🪬 擲筊紀錄';
      drawJiaobeiInitial();
    } else {
      modeToggleBtn.textContent = '🪬 擲筊';
      document.body.style.background = BODY_BG;
      wheelMode.style.display   = 'flex';
      jiaobeiView.style.display = 'none';
      historyTitle.textContent  = '📝 抽獎紀錄';
    }
    renderHistory(); renderStats();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Event listeners ────────────────────────────────────────────────────────
  spinBtn.addEventListener('click', e => { addRipple(spinBtn, e); spin(); });

  clearHistBtn.addEventListener('click', () => {
    if (jiaobeiMode) { jiaobeiHistory = []; jiaobeiStats = {}; }
    else             { history = []; stats = {}; }
    renderHistory(); renderStats();
  });

  themeSelect.addEventListener('change', () => applyTheme(themeSelect.value));
  settingsBtn.addEventListener('click', openMgmtModal);
  addThemeBtn.addEventListener('click', () => openEditModal(null));
  mgmtAddBtn.addEventListener('click',  () => openEditModal(null));
  mgmtCloseBtn.addEventListener('click', closeMgmtModal);
  mgmtModal.addEventListener('click', e => { if (e.target === mgmtModal) closeMgmtModal(); });

  editAddItemBtn.addEventListener('click', () => addEditItemRow());
  editSaveBtn.addEventListener('click', saveEditTheme);
  editCancelBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

  // Enter key in name field saves
  editName.addEventListener('keydown', e => { if (e.key === 'Enter') saveEditTheme(); });

  modeToggleBtn.addEventListener('click', e => { addRipple(modeToggleBtn, e); toggleMode(); });
  throwBtn.addEventListener('click', e => { addRipple(throwBtn, e); throwJiaobei(); });

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    document.body.style.background = BODY_BG;
    document.documentElement.style.setProperty('--accent', '#f0c040');
    document.documentElement.style.setProperty('--accent-glow', ACCENT_GLOW);
    // Ensure correct initial visibility (inline style, immune to CSS cache)
    wheelMode.style.display   = 'flex';
    jiaobeiView.style.display = 'none';
    loadData();
    applyTheme(activeThemeId);
    renderHistory();
    renderStats();
  }

  init();
})();
