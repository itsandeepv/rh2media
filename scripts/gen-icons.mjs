// Generates the favicon PNG set from the RH2 growth-arrow motif.
// (The OG/social image is /assets/img/og-image.jpg, made from the brand logo.)
// Zero dependencies: a tiny anti-aliased stroke rasteriser + PNG encoder using node:zlib.
// Run: npm run icons   (re-run only if you change the artwork below)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');

/* ---------- PNG encoder ---------- */
const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function encodePNG(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w * 4; x++) raw[y * (w * 4 + 1) + 1 + x] = Math.round(Math.max(0, Math.min(1, rgba[y * w * 4 + x])) * 255);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* ---------- Raster helpers ---------- */
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const GOLD = ['#FBBD1A', '#EDA326', '#DA8119'].map(hex);
const lerp = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// Gold gradient: bright top-right → deep bottom-left (like the logo "2")
const goldAt = (x, y, w, h) => {
  const t = Math.max(0, Math.min(1, ((w - x) / w + y / h) / 2));
  return t < 0.55 ? lerp(GOLD[0], GOLD[1], t / 0.55) : lerp(GOLD[1], GOLD[2], (t - 0.55) / 0.45);
};

function canvas(w, h) {
  const px = new Float32Array(w * h * 4);
  const blend = (x, y, rgb, a) => {
    if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
    const i = (y * w + x) * 4;
    const da = px[i + 3];
    const oa = a + da * (1 - a);
    for (let c = 0; c < 3; c++) px[i + c] = oa ? (rgb[c] * a + px[i + c] * da * (1 - a)) / oa : 0;
    px[i + 3] = oa;
  };
  const fill = (fn) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [rgb, a] = fn(x + 0.5, y + 0.5); blend(x, y, rgb, a); } };
  // Thick round-capped polyline via distance field (anti-aliased)
  const stroke = (pts, width, colorFn) => {
    const r = width / 2;
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) segs.push([pts[i], pts[i + 1]]);
    const xs = pts.map((p) => p[0]); const ys = pts.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - r - 1)); const x1 = Math.min(w - 1, Math.ceil(Math.max(...xs) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - r - 1)); const y1 = Math.min(h - 1, Math.ceil(Math.max(...ys) + r + 1));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px_ = x + 0.5; const py = y + 0.5;
      let d = Infinity;
      for (const [[ax, ay], [bx, by]] of segs) {
        const dx = bx - ax; const dy = by - ay;
        const t = Math.max(0, Math.min(1, ((px_ - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
        d = Math.min(d, Math.hypot(px_ - (ax + t * dx), py - (ay + t * dy)));
      }
      const cov = Math.max(0, Math.min(1, r - d + 0.5));
      if (cov > 0) blend(x, y, colorFn(px_, py), cov);
    }
  };
  return { w, h, px, fill, stroke, png: () => encodePNG(w, h, px) };
}

const roundRect = (x, y, w, h, r) => {
  const dx = Math.max(Math.abs(x - w / 2) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(y - h / 2) - (h / 2 - r), 0);
  return Math.max(0, Math.min(1, r - Math.hypot(dx, dy) + 0.5));
};

// Arrow motif in a 64×64 design space (same as /assets/brand/arrow.svg)
const ARROW = [[[8, 50], [26, 32], [36, 40], [56, 16]], [[40, 14], [57, 14], [57, 31]]];
const BG = hex('#0A0A0A');

function icon(size, { radius = 0.22, pad = 0.12, bg = true } = {}) {
  const c = canvas(size, size);
  if (bg) c.fill((x, y) => [BG, roundRect(x, y, size, size, size * radius)]);
  const s = (size * (1 - pad * 2)) / 50; // arrow spans ~50 units
  const ox = size / 2 - 32.5 * s; const oy = size / 2 - 32 * s;
  for (const line of ARROW) c.stroke(line.map(([x, y]) => [ox + x * s, oy + y * s]), 7 * s, (x, y) => goldAt(x, y, size, size));
  return c.png();
}

/* ---------- Write files ---------- */
const icons = join(root, 'assets/icons');
mkdirSync(icons, { recursive: true });
writeFileSync(join(icons, 'favicon-32.png'), icon(32, { pad: 0.08 }));
writeFileSync(join(icons, 'favicon-16.png'), icon(16, { pad: 0.06 }));
writeFileSync(join(icons, 'apple-touch-icon.png'), icon(180, { radius: 0 }));
writeFileSync(join(icons, 'icon-192.png'), icon(192));
writeFileSync(join(icons, 'icon-512.png'), icon(512));
writeFileSync(join(icons, 'icon-maskable-512.png'), icon(512, { radius: 0, pad: 0.22 }));
console.log('Icons written.');
