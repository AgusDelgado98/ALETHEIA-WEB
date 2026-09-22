import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveDist } from "./serve.ts";

/**
 * Capturas del recorrido guiado (Home, preguntas, desarrollo, documentos y cierre), en escritorio y móvil.
 * Uso: node scripts/e2e/single-shots.ts [carpeta de salida] (por defecto docs/redesign/shots)
 */
const root = resolve(import.meta.dirname, "..", "..");
const out = resolve(process.argv[2] ?? join(root, "docs", "redesign", "shots"));
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const DESKTOP = { width: 1366, height: 768 } as const;
const MOBILE = { width: 390, height: 844 } as const;
const Q3 = "/labor/preguntas/q-0003";
const Q13 = "/labor/preguntas/q-0013";
const Q1 = "/labor/preguntas/q-0001";

mkdirSync(out, { recursive: true });
const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  const desktop = await browser.newContext({ viewport: DESKTOP, deviceScaleFactor: 1 });
  const page = await desktop.newPage();

  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "single-home-1366x768.png") });

  await page.locator('label[for="picker-toggle"]').first().click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, "single-picker-1366x768.png") });

  for (let i = 1; i <= 18; i++) {
    const href = `/labor/preguntas/q-${String(i).padStart(4, "0")}`;
    await page.goto(origin + href, { waitUntil: "networkidle" });
    const lines = await page.locator(".single__q").evaluate((element) => {
      const style = getComputedStyle(element);
      return Math.round(
        element.getBoundingClientRect().height / Number.parseFloat(style.lineHeight),
      );
    });
    if (lines > 2) throw new Error(`${href}: el título ocupa ${lines} líneas en desktop`);
  }

  await page.goto(origin + Q1, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "guided-q0001-respuesta-1366x768.png") });

  await page.goto(origin + Q3, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "single-q0003-resumen-1366x768.png") });
  await page.locator(".development-open").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, "single-q0003-desarrollo-1366x768.png") });
  await page.locator(".development__close").click();

  for (const [id, name] of [
    ["v-evidencia", "evidencia"],
    ["v-limites", "limites"],
    ["v-prov", "procedencia"],
  ] as const) {
    await page.locator(`.tabbar label[for=${id}]`).click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(out, `single-q0003-${name}-1366x768.png`) });
  }

  await page.goto(origin + Q13, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "guided-q0013-respuesta-1366x768.png") });
  await page.locator('.tabbar label[for="v-evidencia"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, "guided-q0013-evidencia-1366x768.png") });

  await page.goto(origin + "/metodo", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "guided-metodo-1366x768.png") });

  await page.goto(origin + "/cierre", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(out, "guided-cierre-1366x768.png") });
  await desktop.close();

  const mobile = await browser.newContext({ viewport: MOBILE, deviceScaleFactor: 1 });
  const mpage = await mobile.newPage();
  await mpage.goto(origin + "/", { waitUntil: "networkidle" });
  await mpage.evaluate(() => document.fonts.ready);
  await mpage.screenshot({ path: join(out, "single-home-390x844.png") });
  await mpage.goto(origin + Q1, { waitUntil: "networkidle" });
  await mpage.evaluate(() => document.fonts.ready);
  await mpage.screenshot({ path: join(out, "guided-q0001-390x844.png") });
  await mpage.goto(origin + Q3, { waitUntil: "networkidle" });
  await mpage.evaluate(() => document.fonts.ready);
  await mpage.screenshot({ path: join(out, "single-q0003-390x844.png") });
  await mpage.goto(origin + Q13, { waitUntil: "networkidle" });
  await mpage.evaluate(() => document.fonts.ready);
  await mpage.screenshot({ path: join(out, "guided-q0013-390x844.png") });
  await mpage.goto(origin + "/cierre", { waitUntil: "networkidle" });
  await mpage.evaluate(() => document.fonts.ready);
  await mpage.screenshot({ path: join(out, "guided-cierre-390x844.png") });
  await mobile.close();

  console.log("single-shots ok");
} finally {
  await browser.close();
  server.close();
}
