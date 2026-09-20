import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveDist } from "./serve.ts";

/** Capturas de escritorio de la ruta de producción (M1). Uso: node scripts/e2e/shots.ts [carpeta de salida] */
const root = resolve(import.meta.dirname, "..", "..");
const out = resolve(process.argv[2] ?? join(root, "docs", "m1"));
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ROUTE = "/labor/preguntas/q-0013";

mkdirSync(out, { recursive: true });
const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(origin + ROUTE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "q-0013-desktop-full.png"), fullPage: true });
  console.log("q-0013-desktop-full.png");

  await page.locator("label[for=depth-2]").click();
  await page.locator(".rastro").screenshot({ path: join(out, "q-0013-rastro-detalle.png") });
  await page.locator("label[for=depth-3]").click();
  await page.locator(".rastro").screenshot({ path: join(out, "q-0013-rastro-auditoria.png") });
  await page.locator("label[for=depth-1]").click();
  await page.locator(".rastro").screenshot({ path: join(out, "q-0013-rastro-resumen.png") });
  await page.locator("summary").click();
  await page.locator(".prov").screenshot({ path: join(out, "q-0013-procedencia.png") });
  await page.locator(".lim").screenshot({ path: join(out, "q-0013-si-no.png") });

  // Referencia de identidad: las mismas secciones del prototipo V2.1 aprobado (solo lectura; no es runtime de producción).
  const PROTO =
    process.env["PROTOTYPE_HTML"] ??
    "C:/Proyectos/ALETHEIA-WEB-PROTOTYPE/ALETHEIA-WEB-V2.1-for-Claude-Code/aletheia-home-v2-1.standalone.html";
  const proto = await ctx.newPage();
  await proto.goto("file:///" + PROTO.split(String.fromCharCode(92)).join("/"), {
    waitUntil: "load",
  });
  await proto.evaluate(() => document.fonts.ready);
  for (const [sel, file] of [
    [".limites", "proto-v2-1-limites.png"],
    [".rastro", "proto-v2-1-rastro.png"],
  ] as const) {
    await proto.locator(sel).scrollIntoViewIfNeeded();
    await proto.waitForTimeout(7000);
    await proto.locator(sel).screenshot({ path: join(out, file) });
  }
  console.log("shots ok");
} finally {
  await browser.close();
  server.close();
}
