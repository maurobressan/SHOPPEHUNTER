// Gera os arquivos da marca a partir de brand-src/logo-original.webp.
// Uso: node scripts/brand-assets.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "brand-src/logo-original.webp";
mkdirSync("public/brand", { recursive: true });

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const ink = (x, y) => {
  return data[(y * W + x) * 4 + 3] > 40;
};

// linhas com conteúdo, para separar o ícone do nome escrito embaixo
const rows = [];
for (let y = 0; y < H; y++) {
  let n = 0;
  for (let x = 0; x < W; x++) if (ink(x, y)) n++;
  rows.push(n);
}
const bands = [];
let start = -1;
for (let y = 0; y <= H; y++) {
  const on = y < H && rows[y] > 2;
  if (on && start < 0) start = y;
  if (!on && start >= 0) {
    if (y - start > 20) bands.push([start, y]);
    start = -1;
  }
}
const cols = (y0, y1) => {
  let a = W, b = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { a = Math.min(a, x); b = Math.max(b, x); }
  return [a, b];
};
console.log("faixas", bands);
const icon = bands[0];
const [ix0, ix1] = cols(icon[0], icon[1]);
const last = bands[bands.length - 1];
const [ax0, ax1] = cols(bands[0][0], last[1]);

const pad = 24;
const box = (x0, x1, y0, y1) => {
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  return { left, top, width: Math.min(W, x1 + pad) - left, height: Math.min(H, y1 + pad) - top };
};

// ícone quadrado
const ib = box(ix0, ix1, icon[0], icon[1]);
const side = Math.max(ib.width, ib.height);
const iconBuf = await sharp(SRC)
  .extract(ib)
  .extend({
    top: Math.floor((side - ib.height) / 2), bottom: Math.ceil((side - ib.height) / 2),
    left: Math.floor((side - ib.width) / 2), right: Math.ceil((side - ib.width) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer();
await sharp(iconBuf).resize(256, 256).png().toFile("public/brand/icon.png");
await sharp(iconBuf).resize(512, 512).png().toFile("src/app/icon.png");
// o iOS pinta fundo transparente de preto
await sharp(iconBuf).resize(180, 180).flatten({ background: "#ffffff" }).png().toFile("src/app/apple-icon.png");

// ícones da extensão do Chrome
mkdirSync("extensao/icons", { recursive: true });
for (const s of [16, 32, 48, 128]) await sharp(iconBuf).resize(s, s).png().toFile(`extensao/icons/icon${s}.png`);

// logo completa (ícone + nome), fundo transparente
await sharp(SRC).extract(box(ax0, ax1, bands[0][0], last[1])).resize({ width: 640 }).png().toFile("public/brand/logo.png");

// logo horizontal só com o nome
if (bands.length > 1) {
  const [nx0, nx1] = cols(bands[1][0], last[1]);
  await sharp(SRC).extract(box(nx0, nx1, bands[1][0], last[1])).resize({ width: 640 }).png().toFile("public/brand/wordmark.png");
}
console.log("ok", { W, H, icon: ib });
