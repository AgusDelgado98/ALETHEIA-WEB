import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveDist } from "./serve.ts";

/**
 * Capturas y medición de scroll del prototipo Registro + Folio.
 * Uso: node scripts/e2e/registro-shots.ts [carpeta de salida]  (por defecto docs/redesign/shots)
 */
const root = resolve(import.meta.dirname, "..", "..");
const out = resolve(process.argv[2] ?? join(root, "docs", "redesign", "shots"));
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const VIEWPORTS = [
  { name: "1366x650", width: 1366, height: 650 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "390x844", width: 390, height: 844 },
] as const;
const ROUTES = [
  { name: "home", path: "/" },
  { name: "q-0003", path: "/labor/preguntas/q-0003" },
] as const;

mkdirSync(out, { recursive: true });
const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      await page.goto(origin + r.path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(out, `${r.name}-${vp.name}.png`) });
      const m = await page.evaluate(() => {
        const h = (s: string): number =>
          Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? -1);
        const de = document.documentElement;
        const list = document.querySelector<HTMLElement>(".registro__list");
        const panels = document.querySelector<HTMLElement>(".panels");
        const q = document.querySelector<HTMLElement>(".folio__q");
        const lh = q === null ? 0 : parseFloat(getComputedStyle(q).lineHeight);
        return {
          docScrollH: de.scrollHeight,
          viewportH: window.innerHeight,
          globalScroll: de.scrollHeight > window.innerHeight + 1,
          registroOverflowPx: list === null ? null : list.scrollHeight - list.clientHeight,
          panelsOverflowPx: panels === null ? null : panels.scrollHeight - panels.clientHeight,
          panelsVisibleH: panels === null ? null : Math.round(panels.clientHeight),
          folioHeadH: h(".folio__head"),
          questionH: h(".folio__q"),
          questionLines: q === null ? null : Math.round(q.getBoundingClientRect().height / lh),
          rowH: h(".row"),
          rows: document.querySelectorAll(".row").length,
        };
      });
      console.log(`${vp.name} ${r.name}`, JSON.stringify(m));
    }
    if (vp.width >= 1024) {
      await page.goto(origin + "/labor/preguntas/q-0003", { waitUntil: "networkidle" });
      for (const [id, name] of [
        ["v-evidencia", "evidencia"],
        ["v-limites", "limites"],
        ["v-prov", "procedencia"],
      ] as const) {
        await page.locator(`.tabbar label[for=${id}]`).click();
        await page.screenshot({ path: join(out, `q-0003-${name}-${vp.name}.png`) });
        const ov = await page.evaluate(() => {
          const p = document.querySelector<HTMLElement>(".panels");
          return p === null ? null : p.scrollHeight - p.clientHeight;
        });
        console.log(`${vp.name} q-0003 ${name} panelOverflowPx=${String(ov)}`);
      }
    }
    await ctx.close();
  }
  console.log("registro-shots ok");
} finally {
  await browser.close();
  server.close();
}
