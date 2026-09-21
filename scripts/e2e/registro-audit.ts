import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveDist } from "./serve.ts";

/**
 * Recorre TODAS las rutas del shell Registro + Folio y mide, por viewport de escritorio: scroll global (debe ser 0),
 * áreas con scroll interno, altura útil bajo las pestañas del Folio y desborde horizontal. Opcionalmente guarda capturas.
 * Uso: node scripts/e2e/registro-audit.ts [carpeta de capturas] [viewport, p. ej. 1366x768]
 */
const root = resolve(import.meta.dirname, "..", "..");
const out = process.argv[2] === undefined ? null : resolve(process.argv[2]);
const only = process.argv[3];
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const VIEWPORTS = [
  { name: "1366x650", width: 1366, height: 650 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "390x844", width: 390, height: 844 },
] as const;
const questions = Array.from(
  { length: 18 },
  (_, i) => `/labor/preguntas/q-${String(i + 1).padStart(4, "0")}`,
);
const ROUTES = [
  "/",
  ...questions,
  "/explorar",
  "/hallazgos",
  "/limites",
  "/metodo",
  "/versiones",
  "/sobre",
  "/404",
];
if (out !== null) mkdirSync(out, { recursive: true });
const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
let bad = 0;
try {
  for (const vp of VIEWPORTS.filter((v) => only === undefined || v.name === only)) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    for (const r of ROUTES) {
      const res = await page.goto(origin + r, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (out !== null) {
        const name =
          (r === "/" ? "home" : r.replace(/^\/(labor\/preguntas\/)?/, "")) + `-${vp.name}.png`;
        await page.screenshot({ path: join(out, name) });
      }
      const m = await page.evaluate(() => {
        const de = document.documentElement;
        const folio = document.querySelector<HTMLElement>(".folio");
        const tabbar = document.querySelector<HTMLElement>(".tabbar");
        const list = document.querySelector<HTMLElement>(".registro__list");
        const scrollers = [...document.querySelectorAll<HTMLElement>("body *")]
          .filter(
            (el) =>
              /(auto|scroll)/.test(getComputedStyle(el).overflowY) &&
              el.scrollHeight > el.clientHeight + 1,
          )
          .map((el) => `${el.className}:+${el.scrollHeight - el.clientHeight}`);
        return {
          globalScroll:
            de.scrollHeight > window.innerHeight + 1 ? de.scrollHeight - window.innerHeight : 0,
          hOverflow: de.scrollWidth > window.innerWidth + 1,
          registroOverflow: list === null ? null : list.scrollHeight - list.clientHeight,
          usefulH:
            folio === null || tabbar === null
              ? null
              : Math.round(
                  folio.clientHeight -
                    (tabbar.getBoundingClientRect().bottom - folio.getBoundingClientRect().top),
                ),
          scrollers,
        };
      });
      const desktop = vp.width >= 1024;
      const flags: string[] = [];
      if (desktop && m.globalScroll > 0) flags.push("GLOBAL-SCROLL");
      if (m.hOverflow) flags.push("H-OVERFLOW");
      if (desktop && (m.registroOverflow ?? 0) > 0) flags.push("REGISTRO-SCROLLS");
      if (desktop && vp.height <= 650 && m.usefulH !== null && m.usefulH < 200)
        flags.push("USEFUL<200");
      if (desktop && m.scrollers.filter((s) => !s.startsWith("registro__list")).length > 1)
        flags.push("MULTI-SCROLL");
      if (flags.length > 0) bad++;
      console.log(
        `${vp.name} ${String(res?.status())} ${r} global=${m.globalScroll} useful=${String(m.usefulH)} scr=[${m.scrollers.join(",")}] ${flags.join(" ")}`,
      );
    }
    await ctx.close();
  }
  console.log(bad === 0 ? "registro-audit ok" : `registro-audit: ${bad} ruta(s) con avisos`);
} finally {
  await browser.close();
  server.close();
}
