import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

/**
 * Hojas de revisión del prototipo Registro + Folio: juntan, sin modificar ni reescalar las capturas originales, las cinco
 * vistas principales de escritorio a 1366×768 (Home, Lectura, Evidencia, Límites, Procedencia).
 *   registro-folio-review-sheet.png        2 columnas, tamaño nativo (2 × 1366 px de ancho)
 *   registro-folio-review-sheet-large.png  1 columna, tamaño nativo (1366 px de ancho; se lee sin ampliar)
 * Uso: node scripts/e2e/registro-sheet.ts  (las capturas salen de `npm run build` + scripts/e2e/registro-shots.ts)
 */
const root = resolve(import.meta.dirname, "..", "..");
const dir = join(root, "docs", "redesign", "shots");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const SHOTS = [
  { label: "Home", file: "home-1366x768.png" },
  { label: "Lectura", file: "q-0003-1366x768.png" },
  { label: "Evidencia", file: "q-0003-evidencia-1366x768.png" },
  { label: "Límites", file: "q-0003-limites-1366x768.png" },
  { label: "Procedencia", file: "q-0003-procedencia-1366x768.png" },
] as const;
const W = 1366;
const H = 768;
const GAP = 24;
const LABEL_H = 28;

async function sheet(name: string, cols: number): Promise<void> {
  const cells = SHOTS.map(
    (s) =>
      `<figure><figcaption>${s.label}</figcaption><img alt="${s.label}" src="data:image/png;base64,${readFileSync(join(dir, s.file)).toString("base64")}" width="${W}" height="${H}"></figure>`,
  ).join("");
  const rows = Math.ceil(SHOTS.length / cols);
  const html = `<!doctype html><meta charset="utf-8"><style>
html,body{margin:0;background:#e9e9e5}
main{display:grid;grid-template-columns:repeat(${cols},${W}px);gap:${GAP}px;padding:${GAP}px;width:max-content}
figure{margin:0}
figcaption{height:${LABEL_H}px;font:600 15px/${LABEL_H}px system-ui,sans-serif;color:#3a3a36;letter-spacing:.04em;text-transform:uppercase}
img{display:block;outline:1px solid #b9b9b3}
</style><main>${cells}</main>`;
  const width = cols * W + (cols + 1) * GAP;
  const height = rows * (H + LABEL_H) + (rows + 1) * GAP;
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(html);
    await page.screenshot({ path: join(dir, name) });
    console.log(`${name} ${String(width)}x${String(height)}`);
  } finally {
    await browser.close();
  }
}

await sheet("registro-folio-review-sheet.png", 2);
await sheet("registro-folio-review-sheet-large.png", 1);
