import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

/**
 * Hoja de revisión del prototipo Registro + Folio: junta, sin modificar las capturas originales, las cinco vistas
 * principales de escritorio a 1366×768 (Home, Lectura, Evidencia, Límites, Procedencia) en una sola imagen.
 * Uso: node scripts/e2e/registro-sheet.ts  →  docs/redesign/shots/registro-folio-review-sheet.png
 */
const root = resolve(import.meta.dirname, "..", "..");
const dir = join(root, "docs", "redesign", "shots");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const FILES = [
  "home-1366x768.png",
  "q-0003-1366x768.png",
  "q-0003-evidencia-1366x768.png",
  "q-0003-limites-1366x768.png",
  "q-0003-procedencia-1366x768.png",
] as const;
const W = 1366;
const H = 768;
const GAP = 16;
const COLS = 2;
const rows = Math.ceil(FILES.length / COLS);
const imgs = FILES.map(
  (f) =>
    `<img alt="" src="data:image/png;base64,${readFileSync(join(dir, f)).toString("base64")}" width="${W}" height="${H}">`,
).join("");
const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#fff}
main{display:grid;grid-template-columns:repeat(${COLS},${W}px);gap:${GAP}px;padding:${GAP}px;width:max-content}
img{display:block;outline:1px solid #d6d6d0}
</style><main>${imgs}</main>`;
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: COLS * W + (COLS + 1) * GAP, height: rows * H + (rows + 1) * GAP },
  });
  await page.setContent(html);
  await page.screenshot({ path: join(dir, "registro-folio-review-sheet.png") });
  console.log("registro-folio-review-sheet.png ok");
} finally {
  await browser.close();
}
