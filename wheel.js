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

  // ── Themes ────────────────────────────────────────────────────────────────
  const PRESET_THEMES = [
    {
      id: 'rainbow', name: '彩虹', emoji: '🌈', preset: true,
      bg: 'linear-gradient(135deg,#1a0533 0%,#0d1b5e 55%,#0a0a2e 100%)',
      palette: ['#FF3B3B','#FF7D00','#FFD600','#00CC6A','#00BFFF','#9B2FBE',
                '#FF2D78','#00E5D1','#FF5500','#2ECC40','#5A5AFF','#FF1F8E',
                '#AAFF00','#0077FF','#FF4500','#DD00FF','#FFAA00','#00FFAA','#FF0055','#88FF00'],
      accent: '#f0c040', accentGlow: 'rgba(240,192,64,0.55)',
      rim: { dark: '#b8860b', mid: '#daa520', light: '#ffd700' },
    },
    {
      id: 'sakura', name: '櫻花', emoji: '🌸', preset: true,
      bg: 'linear-gradient(135deg,#2d0020 0%,#5c1a3a 50%,#1a000f 100%)',
      palette: ['#FF6B8A','#FF9EB5','#E8557A','#FFB3C6','#C9337A','#FF85A1',
                '#F06292','#E91E8C','#FF4081','#AD1457','#F48FB1','#FCE4EC',
                '#FF80AB','#F50057','#880E4F','#FFA0B0','#FF3366','#E91E63','#C2185B','#FF69B4'],
      accent: '#FFB3C6', accentGlow: 'rgba(255,150,180,0.55)',
      rim: { dark: '#c0607a', mid: '#e8819a', light: '#ffb3c6' },
    },
    {
      id: 'ocean', name: '海洋', emoji: '🌊', preset: true,
      bg: 'linear-gradient(135deg,#001428 0%,#003366 50%,#000a1e 100%)',
      palette: ['#00BFFF','#0099CC','#00E5FF','#006994','#40C4FF','#0288D1',
                '#00B4D8','#0077B6','#48CAE4','#90E0EF','#023E8A','#0096C7',
                '#00CFE8','#0072BB','#00B8D9','#2962FF','#00E5CC','#00BFA5','#26C6DA','#0097A7'],
      accent: '#00E5FF', accentGlow: 'rgba(0,229,255,0.5)',
      rim: { dark: '#006994', mid: '#0099cc', light: '#00e5ff' },
    },
    {
      id: 'flame', name: '火焰', emoji: '🔥', preset: true,
      bg: 'linear-gradient(135deg,#1a0800 0%,#3d0f00 50%,#0f0000 100%)',
      palette: ['#FF3D00','#FF6D00','#FFAB00','#FF1744','#FF6E40','#FF9100',
                '#FF4500','#FF8C00','#FFC107','#FF5722','#E64A19','#FF6F00',
                '#FF3300','#FF8000','#FFD000','#FF2200','#FF7700','#FFB300','#FF4400','#FF9900'],
      accent: '#FF8C00', accentGlow: 'rgba(255,140,0,0.55)',
      rim: { dark: '#b84500', mid: '#e05000', light: '#ffd700' },
    },
    {
      id: 'starry', name: '星空', emoji: '🌙', preset: true,
      bg: 'linear-gradient(135deg,#05001a 0%,#0a0028 50%,#000814 100%)',
      palette: ['#7C4DFF','#651FFF','#B388FF','#AA00FF','#D500F9','#E040FB',
                '#CE93D8','#9C27B0','#7B1FA2','#4A148C','#AB47BC','#6A1B9A',
                '#8E24AA','#5E35B1','#3949AB','#1E88E5','#7986CB','#5C6BC0','#9575CD','#7E57C2'],
      accent: '#B388FF', accentGlow: 'rgba(179,136,255,0.55)',
      rim: { dark: '#4a148c', mid: '#7b2fbe', light: '#b388ff' },
    },
  ];

  // ── HSL ↔ Hex helpers (for custom palette generation) ─────────────────────
  function hexToHsl(hex) {
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if (max !== min) {
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return [h*360, s*100, l*100];
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => {
      const k = (n + h/30) % 12;
      const c = l - a * Math.max(-1, Math.min(k-3, 9-k, 1));
      return Math.round(255*c).toString(16).padStart(2,'0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function generatePalette(accentHex) {
    const [h, s] = hexToHsl(accentHex);
    const palette = [];
    for (let i = 0; i < 20; i++) {
      const hue = (h + i * 18) % 360;
      const sat = Math.min(95, Math.max(60, s + (i%3-1)*8));
      const lig = Math.min(65, Math.max(38, 55 + (i%4-1.5)*5));
      palette.push(hslToHex(hue, sat, lig));
    }
    return palette;
  }

  // ── Theme state & persistence ──────────────────────────────────────────────
  let activeTheme = PRESET_THEMES[0];
  let customThemes = [];  // loaded from localStorage

  const LS_THEME   = 'luckyWheel_themeId';
  const LS_CUSTOM  = 'luckyWheel_customThemes';

  function loadThemeData() {
    try { customThemes = JSON.parse(localStorage.getItem(LS_CUSTOM)) || []; } catch(e) { customThemes = []; }
    const savedId = localStorage.getItem(LS_THEME);
    const all = allThemes();
    activeTheme = all.find(t => t.id === savedId) || PRESET_THEMES[0];
  }

  function saveThemeData() {
    localStorage.setItem(LS_CUSTOM, JSON.stringify(customThemes));
    localStorage.setItem(LS_THEME, activeTheme.id);
  }

  function allThemes() {
    return [...PRESET_THEMES, ...customThemes];
  }

  function applyTheme(theme) {
    activeTheme = theme;
    if (!jiaobeiMode) document.body.style.background = theme.bg;
    // Update CSS variables for accent colour
    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-glow', theme.accentGlow);
    saveThemeData();
    renderConfigRows(parseInt(countInput.value, 10));
    drawWheel(rotation);
    updateThemeButtons();
  }

  function renderThemeSelector() {
    themeSelect.innerHTML = allThemes().map(t =>
      `<option value="${t.id}"${t.id === activeTheme.id ? ' selected' : ''}>${t.emoji} ${t.name}</option>`
    ).join('');
    updateThemeButtons();
  }

  function updateThemeButtons() {
    const isCustom = !activeTheme.preset;
    themeEditBtn.classList.toggle('hidden', !isCustom);
    themeDelBtn.classList.toggle('hidden', !isCustom);
  }

  // ── Colour palette (driven by active theme) ───────────────────────────────
  function getActivePalette() { return activeTheme.palette; }

  // ── State ─────────────────────────────────────────────────────────────────
  let segments    = [];
  let rotation    = 0;
  let spinning    = false;
  let history     = [];
  let stats       = {};
  let prevSegIdx  = -1;
  let lastTickTime = 0;
  let jiaobeiMode    = false;
  let throwingAnim   = false;
  let jiaobeiHistory = [];
  let jiaobeiStats   = {};

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const canvas        = document.getElementById('wheel-canvas');
  const ctx           = canvas.getContext('2d');
  const spinBtn       = document.getElementById('spin-btn');
  const applyBtn      = document.getElementById('apply-btn');
  const countInput    = document.getElementById('item-count');
  const segsList      = document.getElementById('segments-list');
  const resultEl      = document.getElementById('result');
  const historyList   = document.getElementById('history-list');
  const statsList     = document.getElementById('stats-list');
  const clearHistBtn  = document.getElementById('clear-history-btn');
  const flashOverlay  = document.getElementById('flash-overlay');
  const themeSelect   = document.getElementById('theme-select');
  const themeAddBtn   = document.getElementById('theme-add-btn');
  const themeEditBtn  = document.getElementById('theme-edit-btn');
  const themeDelBtn   = document.getElementById('theme-del-btn');
  const themeModal    = document.getElementById('theme-modal');
  const themeModalTitle = document.getElementById('theme-modal-title');
  const teEmoji       = document.getElementById('te-emoji');
  const teName        = document.getElementById('te-name');
  const teBg1         = document.getElementById('te-bg1');
  const teBg2         = document.getElementById('te-bg2');
  const teAccent      = document.getElementById('te-accent');
  const teSave        = document.getElementById('te-save');
  const teCancel      = document.getElementById('te-cancel');
  const modeToggleBtn   = document.getElementById('mode-toggle-btn');
  const jiaobeiView     = document.getElementById('jiaobei-view');
  const jCanvas         = document.getElementById('jiaobei-canvas');
  const jCtx            = jCanvas.getContext('2d');
  const throwBtn        = document.getElementById('throw-btn');
  const jiaobeiResultEl = document.getElementById('jiaobei-result');
  const configPanel     = document.getElementById('config-panel');
  const historyTitle    = document.getElementById('history-panel-title');
  const wheelView       = document.getElementById('wheel-view');

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    loadThemeData();
    applyTheme(activeTheme);
    renderThemeSelector();
    const count = parseInt(countInput.value, 10);
    renderConfigRows(count);
    applyConfig();
    renderHistory();
    renderStats();
  }

  // ── Config UI ─────────────────────────────────────────────────────────────
  function renderConfigRows(count) {
    const existing = readConfigRows();
    const pal = getActivePalette();
    segsList.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const label  = existing[i]?.label  ?? `選項 ${i + 1}`;
      const weight = existing[i]?.weight ?? 1;
      const color  = pal[i % pal.length];
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
    const pal = getActivePalette();
    return Array.from(segsList.querySelectorAll('.segment-row')).map((row, i) => ({
      label:  row.querySelector('.seg-label').value.trim() || `選項 ${i + 1}`,
      weight: Math.max(0.01, parseFloat(row.querySelector('.seg-weight').value) || 1),
      color:  pal[i % pal.length],
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

    // ── 1. Sectors ──────────────────────────────────────────────────────────
    segments.forEach(seg => {
      const arc      = (seg.weight / totalWeight) * 2 * Math.PI;
      const endAngle = startAngle + arc;
      const midAngle = startAngle + arc / 2;

      // Path
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, startAngle, endAngle);
      ctx.closePath();

      // Radial gradient: bright at center → rich at edge
      const rg = ctx.createRadialGradient(cx, cy, R * 0.08, cx, cy, R);
      rg.addColorStop(0,    lightenColor(seg.color, 80));
      rg.addColorStop(0.45, lightenColor(seg.color, 28));
      rg.addColorStop(1,    seg.color);
      ctx.fillStyle = rg;
      ctx.fill();

      // Specular overlay: top-left highlight → bottom-right shadow
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

    // ── 2. Divider lines ────────────────────────────────────────────────────
    let divAngle = rot - Math.PI / 2;
    segments.forEach(seg => {
      const arc = (seg.weight / totalWeight) * 2 * Math.PI;
      const ex = cx + (R + 1) * Math.cos(divAngle);
      const ey = cy + (R + 1) * Math.sin(divAngle);
      // Shadow
      ctx.beginPath(); ctx.moveTo(cx+1, cy+1); ctx.lineTo(ex+1, ey+1);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3; ctx.stroke();
      // Line
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(255,255,255,0.70)'; ctx.lineWidth = 1.5; ctx.stroke();
      divAngle += arc;
    });

    // ── 3. Metallic outer rim ───────────────────────────────────────────────
    const rim = activeTheme.rim;

    // Outer glow halo
    ctx.beginPath();
    ctx.arc(cx, cy, R + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = activeTheme.accentGlow.replace(/[\d.]+\)$/, '0.22)');
    ctx.lineWidth = 16;
    ctx.stroke();

    // Dark base band
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = rim.dark;
    ctx.lineWidth = 11;
    ctx.stroke();

    // Mid gold
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = rim.mid;
    ctx.lineWidth = 7;
    ctx.stroke();

    // Bright highlight
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, 2 * Math.PI);
    ctx.strokeStyle = rim.light;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner specular line
    ctx.beginPath();
    ctx.arc(cx, cy, R - 6, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // ── 4. Metallic center ──────────────────────────────────────────────────
    const cR = 26;

    // Drop shadow
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, cR, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.fill();

    // Metal body
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

    // Gold border ring
    const gg = ctx.createLinearGradient(cx - cR, cy - cR, cx + cR, cy + cR);
    gg.addColorStop(0,   rim.light);
    gg.addColorStop(0.4, '#fffacd');
    gg.addColorStop(1,   rim.dark);
    ctx.strokeStyle = gg;
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Specular highlight dot
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

  // ── Spin logic ────────────────────────────────────────────────────────────
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
    spinBtn.disabled = applyBtn.disabled = true;
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
        spinBtn.disabled = applyBtn.disabled = false;
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

  // ── History & Stats ───────────────────────────────────────────────────────
  function addHistory(label) {
    history.unshift({ label, time: new Date() });
    if (history.length > 10) history.pop();
    stats[label] = (stats[label] || 0) + 1;
    renderHistory(); renderStats();
  }
  function renderHistory() {
    const src = jiaobeiMode ? jiaobeiHistory : history;
    if (!src.length) { historyList.innerHTML = '<p class="history-empty">還沒有紀錄喔！</p>'; return; }
    historyList.innerHTML = src.map((item, i) => {
      const timeStr = item.time.toLocaleTimeString('zh-TW', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
      const extra = item.type ? ` jb-${item.type}` : '';
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
    if (!entries.length) { statsList.innerHTML = '<p class="history-empty">尚無統計資料</p>'; return; }
    const total = entries.reduce((s,[,c])=>s+c,0);
    statsList.innerHTML = entries.map(([label,count]) => {
      const pct = Math.round(count/total*100);
      return `<div class="stat-item">
        <span class="stat-label" title="${escHtml(label)}">${escHtml(label)}</span>
        <div class="stat-bar-wrap"><div class="stat-bar" style="width:${pct}%"></div></div>
        <span class="stat-count">${count}次</span>
      </div>`;
    }).join('');
  }

  // ── Ripple ────────────────────────────────────────────────────────────────
  function addRipple(btn, e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), {once:true});
  }

  // ── Theme modal helpers ───────────────────────────────────────────────────
  let editingThemeId = null;

  function openModal(theme = null) {
    editingThemeId = theme ? theme.id : null;
    themeModalTitle.textContent = theme ? '編輯主題' : '新增主題';
    teEmoji.value  = theme?.emoji  ?? '⭐';
    teName.value   = theme?.name   ?? '';
    teBg1.value    = theme ? extractBgColor(theme.bg, 0) : '#1a0533';
    teBg2.value    = theme ? extractBgColor(theme.bg, 1) : '#0d1b5e';
    teAccent.value = theme?.accent ?? '#f0c040';
    themeModal.classList.remove('hidden');
  }

  function extractBgColor(bgStr, idx) {
    const matches = bgStr.match(/#[0-9a-fA-F]{6}/g);
    return matches?.[idx] ?? (idx === 0 ? '#1a0533' : '#0d1b5e');
  }

  function closeModal() { themeModal.classList.add('hidden'); }

  function buildCustomTheme(id) {
    const emoji  = teEmoji.value.trim() || '⭐';
    const name   = teName.value.trim()  || '自訂主題';
    const bg1    = teBg1.value;
    const bg2    = teBg2.value;
    const accent = teAccent.value;
    const [h] = hexToHsl(accent);
    const mid  = hslToHex((h + 30) % 360, 60, 35);
    return {
      id, name, emoji, preset: false,
      bg: `linear-gradient(135deg,${bg1} 0%,${bg2} 55%,${darkenHex(bg1)} 100%)`,
      palette: generatePalette(accent),
      accent,
      accentGlow: hexToRgba(accent, 0.55),
      rim: { dark: darkenHex(accent), mid, light: accent },
    };
  }

  function darkenHex(hex) {
    const r = Math.max(0, parseInt(hex.slice(1,3),16) - 60);
    const g = Math.max(0, parseInt(hex.slice(3,5),16) - 60);
    const b = Math.max(0, parseInt(hex.slice(5,7),16) - 60);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  countInput.addEventListener('change', () => {
    let v = parseInt(countInput.value, 10);
    if (isNaN(v) || v < 2) v = 2;
    if (v > 20) v = 20;
    countInput.value = v;
    renderConfigRows(v);
  });

  spinBtn.addEventListener('click', e => { addRipple(spinBtn, e); spin(); });
  applyBtn.addEventListener('click', e => { addRipple(applyBtn, e); applyConfig(); });
  clearHistBtn.addEventListener('click', () => { history=[]; stats={}; renderHistory(); renderStats(); });

  themeSelect.addEventListener('change', () => {
    const t = allThemes().find(t => t.id === themeSelect.value);
    if (t) applyTheme(t);
  });

  themeAddBtn.addEventListener('click', () => openModal(null));

  themeEditBtn.addEventListener('click', () => {
    const t = customThemes.find(t => t.id === activeTheme.id);
    if (t) openModal(t);
  });

  themeDelBtn.addEventListener('click', () => {
    if (!confirm(`確定要刪除「${activeTheme.emoji} ${activeTheme.name}」嗎？`)) return;
    customThemes = customThemes.filter(t => t.id !== activeTheme.id);
    applyTheme(PRESET_THEMES[0]);
    renderThemeSelector();
    saveThemeData();
  });

  teSave.addEventListener('click', () => {
    if (!teName.value.trim()) { teName.focus(); return; }
    if (editingThemeId) {
      const idx = customThemes.findIndex(t => t.id === editingThemeId);
      customThemes[idx] = buildCustomTheme(editingThemeId);
      applyTheme(customThemes[idx]);
    } else {
      const newTheme = buildCustomTheme('custom_' + Date.now());
      customThemes.push(newTheme);
      applyTheme(newTheme);
    }
    renderThemeSelector();
    closeModal();
  });

  teCancel.addEventListener('click', closeModal);
  themeModal.addEventListener('click', e => { if (e.target === themeModal) closeModal(); });

  modeToggleBtn.addEventListener('click', e => { addRipple(modeToggleBtn, e); toggleMode(); });
  throwBtn.addEventListener('click', e => { addRipple(throwBtn, e); throwJiaobei(); });

  // ── Jiaobei mode ──────────────────────────────────────────────────────────
  const JIAOBEI_BG = 'linear-gradient(135deg,#1c0900 0%,#2d1400 50%,#0f0500 100%)';

  const JB_RESULTS = {
    sheng: { label: '聖筊', desc: '神明同意，吉！',   emoji: '✨', cls: 'sheng' },
    yin:   { label: '陰筊', desc: '神明不同意，凶。', emoji: '🔴', cls: 'yin'   },
    xiao:  { label: '笑筊', desc: '神明在笑，請再問。', emoji: '😄', cls: 'xiao' },
  };

  const JCX = jCanvas.width  / 2;
  const JCY = jCanvas.height / 2;

  function drawCup(ctx2, x, y, scaleY, face) {
    const W = 122, H = 58;
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.scale(1, scaleY);

    // When y-flipped, visually show opposite face
    const showFace = scaleY < 0 ? (face === 'yang' ? 'yin' : 'yang') : face;

    // Wood radial gradient
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
      // Yang (flat/concave): dark inner hollow
      const hg = ctx2.createRadialGradient(0, H * 0.1, 0, 0, H * 0.06, W * 0.32);
      hg.addColorStop(0,    '#1a0a02');
      hg.addColorStop(0.65, '#3d1b08');
      hg.addColorStop(1,    '#5c2b0a');
      ctx2.beginPath();
      ctx2.ellipse(0, H * 0.1, W * 0.37, H * 0.27, 0, 0, Math.PI * 2);
      ctx2.fillStyle = hg;
      ctx2.fill();
    } else {
      // Yin (dome/convex): specular highlight
      const sg = ctx2.createRadialGradient(-W * 0.15, -H * 0.18, 0, 0, 0, W * 0.52);
      sg.addColorStop(0,    'rgba(255,215,140,0.46)');
      sg.addColorStop(0.38, 'rgba(200,140,55,0.14)');
      sg.addColorStop(1,    'rgba(0,0,0,0)');
      ctx2.beginPath();
      ctx2.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
      ctx2.fillStyle = sg;
      ctx2.fill();
    }

    // Rim
    ctx2.beginPath();
    ctx2.ellipse(0, 0, W / 2, H / 2, 0, 0, Math.PI * 2);
    ctx2.strokeStyle = '#6b3008';
    ctx2.lineWidth = 3;
    ctx2.stroke();

    ctx2.restore();
  }

  function drawJiaobeiScene(c1, c2) {
    jCtx.clearRect(0, 0, jCanvas.width, jCanvas.height);

    // Warm incense atmosphere
    const atmos = jCtx.createRadialGradient(JCX, JCY, 40, JCX, JCY, 240);
    atmos.addColorStop(0, 'rgba(160,90,20,0.12)');
    atmos.addColorStop(1, 'rgba(0,0,0,0)');
    jCtx.fillStyle = atmos;
    jCtx.fillRect(0, 0, jCanvas.width, jCanvas.height);

    // Floor
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

    // Shadows on floor
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
    const PEAK_Y  = 120;
    const drift1  = (Math.random() - 0.5) * 80;
    const drift2  = (Math.random() - 0.5) * 80;
    const flips1  = 3 + Math.floor(Math.random() * 3);
    const flips2  = 3 + Math.floor(Math.random() * 3);
    const dur     = 1900 + Math.random() * 400;
    const startT  = performance.now();

    function jbFrame(now) {
      const t      = Math.min((now - startT) / dur, 1);
      const height = 4 * t * (1 - t);         // parabola peaking at t=0.5
      const drift  = Math.sin(t * Math.PI);   // drift peaks at t=0.5

      // Spin: oscillate then freeze at final face
      const spinT = Math.min(t / 0.78, 1);
      const sc1   = spinT < 1 ? Math.cos(flips1 * 2 * Math.PI * spinT) : 1;
      const sc2   = spinT < 1 ? Math.cos(flips2 * 2 * Math.PI * spinT) : 1;

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
      wheelView.classList.add('hidden');
      spinBtn.classList.add('hidden');
      resultEl.classList.add('hidden');
      jiaobeiView.classList.remove('hidden');
      configPanel.classList.add('hidden');
      historyTitle.textContent = '🪬 擲筊紀錄';
      drawJiaobeiInitial();
    } else {
      modeToggleBtn.textContent = '🪬 擲筊';
      document.body.style.background = activeTheme.bg;
      wheelView.classList.remove('hidden');
      spinBtn.classList.remove('hidden');
      jiaobeiView.classList.add('hidden');
      configPanel.classList.remove('hidden');
      historyTitle.textContent = '📝 抽獎紀錄';
    }
    renderHistory(); renderStats();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Start ─────────────────────────────────────────────────────────────────
  init();
})();
