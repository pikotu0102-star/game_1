// generate-icons.js
// 用 Node.js 內建 zlib 產生 PNG 圖示，不需要外部套件
// 執行：node generate-icons.js

'use strict';
const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC32（PNG 規格要求）─────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const lb = Buffer.alloc(4); lb.writeUInt32BE(data.length);
  const cb = Buffer.alloc(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([lb, tb, data, cb]);
}

// ── 純 JavaScript PNG 編碼器 ──────────────────────────────────────────────
function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // 每列前加 filter byte = 0（None）
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    rgba.copy(row, 1, y * width * 4, (y + 1) * width * 4);
    rows.push(row);
  }
  const idat = zlib.deflateSync(Buffer.concat(rows), { level: 6 });

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG 簽名
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idat),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 繪製轉盤圖示 ──────────────────────────────────────────────────────────
function drawIcon(size) {
  const buf = Buffer.alloc(size * size * 4, 0);
  const cx = size / 2, cy = size / 2;
  const outerR  = size * 0.46;
  const rimW    = size * 0.045;
  const innerR  = size * 0.11;

  // 6 個扇形顏色（鮮豔版）
  const COLORS = [
    [255,  59,  59],  // 紅
    [255, 140,   0],  // 橘
    [255, 214,   0],  // 黃
    [  0, 204, 106],  // 綠
    [  0, 191, 255],  // 藍
    [155,  47, 190],  // 紫
  ];
  const N = COLORS.length;
  const segAngle = (2 * Math.PI) / N;

  function set(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const i = (y * size + x) * 4;
    buf[i] = r; buf[i+1] = g; buf[i+2] = b; buf[i+3] = a;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 整個正方形填深紫色背景（maskable 安全區）
      set(x, y, 26, 5, 51, 255);

      // 外圍金色邊框
      if (dist <= outerR + rimW && dist > outerR) {
        const t = (dist - outerR) / rimW;
        const r = Math.round(240 * (1 - t) + 26 * t);
        const g = Math.round(192 * (1 - t) +  5 * t);
        const b = Math.round( 64 * (1 - t) + 51 * t);
        set(x, y, r, g, b, 255);
        continue;
      }

      if (dist > outerR) continue;

      // 中心圓（金色）
      if (dist < innerR) {
        const t = dist / innerR;
        set(x, y, 255, Math.round(220 - t * 30), Math.round(80 - t * 40), 255);
        continue;
      }

      // 扇形區域
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += 2 * Math.PI;

      const segIdx    = Math.floor(angle / segAngle) % N;
      const [r, g, b] = COLORS[segIdx];

      // 分格線（1.5px 寬）
      const fracInSeg   = (angle % segAngle) / segAngle;
      const distToEdge  = Math.min(fracInSeg, 1 - fracInSeg) * segAngle;
      const halfLineAng = 1.5 / Math.max(1, dist);

      if (distToEdge < halfLineAng) {
        set(x, y, 255, 255, 255, 200);
      } else {
        // 由中心向外漸層（略亮→正常）
        const bright = 0.72 + 0.45 * (1 - dist / outerR);
        const extra  = Math.round(45 * (1 - dist / outerR));
        set(x, y,
          Math.min(255, Math.round(r * bright) + extra),
          Math.min(255, Math.round(g * bright) + extra),
          Math.min(255, Math.round(b * bright) + extra),
          255
        );
      }
    }
  }

  return buf;
}

// ── 產生圖示 ──────────────────────────────────────────────────────────────
const iconsDir = path.join(__dirname, 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [192, 512]) {
  const rgba = drawIcon(size);
  const png  = encodePNG(size, size, rgba);
  const out  = path.join(iconsDir, `icon-${size}.png`);
  fs.writeFileSync(out, png);
  console.log(`✓ icons/icon-${size}.png  (${(png.length / 1024).toFixed(1)} KB)`);
}
console.log('圖示產生完成！');
