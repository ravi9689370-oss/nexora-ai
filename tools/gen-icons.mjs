/**
 * Nexora AI launcher icon generator.
 * Pure Node (no deps): rasterizes the brand mark (purple rounded square +
 * amber lightning bolt + white sparks) into every Android mipmap density.
 *
 * Run: node tools/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath()), "..");
function fileURLToPath() {
  return import.meta.url.replace(/^file:\/\//, "");
}

/* ---------- PNG writer (RGBA8, no interlace) ---------- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(width, height, pixelFn) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Brand palette ---------- */
const PURPLE_DARK = [76, 29, 149];   // #4C1D95
const PURPLE_LIGHT = [109, 40, 217]; // #6D28D9
const AMBER = [251, 191, 36];        // #FBBF24
const WHITE = [255, 255, 255];

/* Bolt polygon in 108×108 viewBox (matches the in-app boot mark) */
const BOLT = [[44,14],[74,14],[58,45],[73,45],[39,95],[49,58],[34,58]];
const SPARK1 = [[84,30],[89,35],[84,40],[79,35]];
const SPARK2 = [[22,72],[26,76],[22,80],[18,76]];

function inPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function scaled(poly, s, cx, cy) {
  return poly.map(([x, y]) => [cx + (x - 54) * s, cy + (y - 54) * s]);
}

/** Legacy launcher: rounded-square gradient + bolt + sparks. */
function launcherIcon(S, round) {
  const r = round ? S / 2 : S * 0.22;
  const cx = S / 2, cy = S / 2;
  const bolt = scaled(BOLT, 0.72 * (S / 108), cx, cy);
  const s1 = scaled(SPARK1, 0.72 * (S / 108), cx, cy);
  const s2 = scaled(SPARK2, 0.72 * (S / 108), cx, cy);
  return png(S, S, (x, y) => {
    let a = 0;
    if (round) {
      a = Math.hypot(x - cx + 0.5, y - cy + 0.5) <= r ? 255 : 0;
    } else {
      const dx = Math.min(x + 0.5 - r, 0); // rounded-corner distance
      const dy = Math.min(y + 0.5 - r, 0);
      const ex = x + 0.5 - (S - r);
      const ey = y + 0.5 - (S - r);
      const inside =
        x + 0.5 >= r ||
        y + 0.5 >= r ||
        Math.min(x + 0.5, r) * 0; // simple corner test below
      const corner = (x < r && y < r) || (x < r && y > S - r) || (x > S - r && y < r) || (x > S - r && y > S - r);
      if (!corner) a = 255;
      else if (Math.hypot(Math.min(x + 0.5 - r, (x + 0.5) - (S - r)), Math.min(y + 0.5 - r, (y + 0.5) - (S - r))) <= r) a = 255;
    }
    if (!a) return [0, 0, 0, 0];
    const t = (y / S) * 0.9;
    let c = PURPLE_DARK.map((v, i) => Math.round(v + (PURPLE_LIGHT[i] - v) * t));
    if (inPolygon(x + 0.5, y + 0.5, bolt)) c = AMBER;
    else if (inPolygon(x + 0.5, y + 0.5, s1)) c = WHITE;
    else if (inPolygon(x + 0.5, y + 0.5, s2)) c = WHITE;
    return [...c, a];
  });
}

/** Adaptive foreground: transparent bg, bolt in the 72dp safe zone. */
function foregroundIcon(S) {
  const bolt = scaled(BOLT, 0.58 * (S / 108), S / 2, S / 2);
  const s1 = scaled(SPARK1, 0.58 * (S / 108), S / 2, S / 2);
  const s2 = scaled(SPARK2, 0.58 * (S / 108), S / 2, S / 2);
  return png(S, S, (x, y) => {
    let c = null;
    if (inPolygon(x + 0.5, y + 0.5, bolt)) c = AMBER;
    else if (inPolygon(x + 0.5, y + 0.5, s1)) c = WHITE;
    else if (inPolygon(x + 0.5, y + 0.5, s2)) c = WHITE;
    return c ? [...c, 255] : [0, 0, 0, 0];
  });
}

const DENSITY = { hdpi: 72, mdpi: 48, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const res = path.join(ROOT, "android", "app", "src", "main", "res");

for (const [dir, S] of Object.entries(DENSITY)) {
  const out = path.join(res, `mipmap-${dir}`);
  writeFileSync(path.join(out, "ic_launcher.png"), launcherIcon(S, false));
  writeFileSync(path.join(out, "ic_launcher_round.png"), launcherIcon(S, true));
  writeFileSync(path.join(out, "ic_launcher_foreground.png"), foregroundIcon(S));
  console.log(`mipmap-${dir}: ${S}px ✓`);
}
console.log("Nexora AI icons generated.");
