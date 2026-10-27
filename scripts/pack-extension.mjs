// Empacota a extensão do Chrome.
// - public/shoppe-hunter-extensao.zip: instalação manual pelo site (inclui localhost para testes)
// - loja-chrome/shoppe-hunter-chrome-web-store.zip: envio à Chrome Web Store (sem localhost)
// Uso: npm run ext:pack (rode sempre que mudar algo na pasta extensao/)
import JSZip from "jszip";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const DIR = "extensao";
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : files.push(join(d, f))));
walk(DIR);

async function pack(out, editManifest) {
  const zip = new JSZip();
  for (const f of files) {
    const name = relative(DIR, f).replace(/\\/g, "/");
    if (name === "manifest.json" && editManifest) zip.file(name, JSON.stringify(editManifest(JSON.parse(readFileSync(f, "utf8"))), null, 2));
    else zip.file(name, readFileSync(f));
  }
  writeFileSync(out, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log("gerado:", out);
}

const noLocal = (list) => list.filter((u) => !u.includes("localhost"));

mkdirSync("loja-chrome", { recursive: true });
await pack("public/shoppe-hunter-extensao.zip");
await pack("loja-chrome/shoppe-hunter-chrome-web-store.zip", (m) => ({
  ...m,
  host_permissions: noLocal(m.host_permissions),
  content_scripts: m.content_scripts.map((c) => ({ ...c, matches: noLocal(c.matches) })),
}));
