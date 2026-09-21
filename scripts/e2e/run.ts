import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright-core";
import { canonicalJson } from "../../tools/corpus/util.ts";
import { loadContext } from "../gates/context.ts";
import { serveDist } from "./serve.ts";

/**
 * Pruebas de navegador del shell Registro + Folio (Edge headless vía playwright-core; sin descargar navegadores).
 * Recorre TODAS las rutas: contenido íntegro SIN JavaScript (las vistas del Folio son radios + labels), 0 JS enviado,
 * axe en cada vista, teclado y foco visible, reflow a 320 px, sin scroll global en escritorio, un único scroll interno y
 * reduced-motion. No declara WCAG AA (Charter §15): cubre solo lo automático.
 * Uso: node scripts/e2e/run.ts
 */
const root = resolve(import.meta.dirname, "..", "..");
const dist = join(root, "dist");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const data = loadContext(root);
const slug = (id: string): string => `/labor/preguntas/${id.replace(/^LAB-/, "").toLowerCase()}`;
const QUESTIONS = data.generated.questions.map((q) => slug(q.id));
const DOCS = ["/explorar", "/hallazgos", "/limites", "/metodo", "/versiones", "/sobre"];
const ROUTES = ["/", ...QUESTIONS, ...DOCS];
const TABS = ["v-lectura", "v-evidencia", "v-limites", "v-prov"] as const;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const failures: string[] = [];
const report: Record<string, unknown> = {};
const check = (ok: boolean, msg: string): void => {
  if (!ok) failures.push(msg);
};

const { server, origin } = await serveDist(dist);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

async function axe(page: Page, label: string): Promise<string[]> {
  const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return r.violations.map((v) => `${label}: ${v.id}×${v.nodes.length}`);
}

try {
  // ═════════ 1. SIN JAVASCRIPT, 0 JS, CONTENIDO ÍNTEGRO ═════════
  {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1366, height: 768 },
    });
    const reqs: { type: string; url: string }[] = [];
    ctx.on("request", (r) => reqs.push({ type: r.resourceType(), url: r.url() }));
    const page = await ctx.newPage();
    for (const route of [...ROUTES, "/404"]) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      const text = await page.evaluate(() => document.body.textContent ?? "");
      check(text.trim().length > 200, `${route}: sin JS la página no tiene contenido`);
    }
    // Las cuatro vistas del Folio cambian sin JS (radios + labels) y muestran su panel.
    for (const route of [slug("LAB-Q-0013"), slug("LAB-Q-0008")]) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      const seen: Record<string, boolean> = {};
      for (const id of TABS) {
        await page.locator(`.tabbar label[for=${id}]`).click();
        seen[id] = await page.locator(`#${id.replace("v-", "p-")}`).isVisible();
        const others = await page.locator(".panel:visible").count();
        check(others === 1, `${route}: con ${id} hay ${others} paneles visibles (debe ser 1)`);
      }
      check(Object.values(seen).every(Boolean), `${route}: una vista del Folio no se abre sin JS`);
    }
    check(reqs.filter((r) => r.type === "script").length === 0, "sin JS se pidió un script");
    report["no_js"] = { routes: ROUTES.length + 1, script_requests: 0 };
    await ctx.close();
  }

  // ═════════ 2. 0 JS ENVIADO, SIN TERCEROS, SIN ERRORES DE CONSOLA ═════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    const bad: string[] = [];
    const errors: string[] = [];
    const scripts: string[] = [];
    page.on("request", (r) => {
      if (r.resourceType() === "script") scripts.push(r.url());
      if (!r.url().startsWith(origin)) bad.push(r.url());
    });
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
    });
    for (const route of ROUTES) await page.goto(origin + route, { waitUntil: "networkidle" });
    const jsFiles = (function walk(d: string): string[] {
      return readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".js") ? [e.name] : [],
      );
    })(dist);
    check(scripts.length === 0, `se envía JavaScript: ${scripts.join(", ")}`);
    check(jsFiles.length === 0, "dist/ contiene archivos JS");
    check(bad.length === 0, `hay solicitudes a otro origen: ${bad.join(", ")}`);
    check(errors.length === 0, `errores o avisos de consola: ${errors.join(" | ")}`);
    report["network"] = { js_requests: scripts.length, third_party: bad.length, console: errors };
    await ctx.close();
  }

  // ═════════ 3. AXE EN CADA VISTA ═════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    const violations: string[] = [];
    let states = 0;
    for (const route of ROUTES) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      violations.push(...(await axe(page, route)));
      states++;
    }
    for (const route of [slug("LAB-Q-0013"), slug("LAB-Q-0003"), slug("LAB-Q-0008")]) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      for (const id of TABS.slice(1)) {
        await page.locator(`.tabbar label[for=${id}]`).click();
        violations.push(...(await axe(page, `${route} ${id}`)));
        states++;
      }
    }
    await page.goto(origin + "/404", { waitUntil: "networkidle" });
    violations.push(...(await axe(page, "/404")));
    states++;
    report["axe"] = {
      tags: AXE_TAGS.join(", "),
      states,
      total_violations: violations.length,
      violations,
      note: "la prueba automática cubre solo parte de WCAG; no se declara WCAG 2.2 AA (responsive y lectores de pantalla pendientes, G-A11Y-05/06)",
    };
    for (const v of violations) check(false, `axe ${v}`);
    await ctx.close();
  }

  // ═════════ 4. SEMÁNTICA ═════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    const problems: string[] = [];
    for (const route of [...ROUTES, "/404"]) {
      await page.goto(origin + route, { waitUntil: "networkidle" });
      const s = await page.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map((x) => x.id);
        const heads = [...document.querySelectorAll("h1,h2,h3")].map((h) => Number(h.tagName[1]));
        return {
          lang: document.documentElement.lang,
          h1: document.querySelectorAll("h1").length,
          main: document.querySelectorAll("main").length,
          jumps: heads.filter((h, i) => i > 0 && h - heads[i - 1]! > 1).length,
          dupIds: ids.length - new Set(ids).size,
        };
      });
      if (s.lang !== "es-AR") problems.push(`${route}: lang=${s.lang}`);
      if (s.h1 !== 1) problems.push(`${route}: ${s.h1} h1`);
      if (s.main !== 1) problems.push(`${route}: ${s.main} main`);
      if (s.jumps > 0) problems.push(`${route}: salto de encabezados`);
      if (s.dupIds > 0) problems.push(`${route}: ${s.dupIds} ids duplicados`);
    }
    report["semantics"] = { routes: ROUTES.length + 1, problems };
    for (const p of problems) check(false, `semántica ${p}`);
    await ctx.close();
  }

  // ═════════ 5. TECLADO Y FOCO VISIBLE ═════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage();
    await page.goto(origin + slug("LAB-Q-0013"), { waitUntil: "networkidle" });
    const stops: { tag: string; text: string; outline: string }[] = [];
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press("Tab");
      const s = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const lab = el.tagName === "INPUT" ? document.querySelector(`label[for="${el.id}"]`) : null;
        const target = (lab ?? el) as HTMLElement;
        const cs = getComputedStyle(target);
        return {
          tag:
            el.tagName.toLowerCase() +
            (el.getAttribute("type") ? `[${el.getAttribute("type")}]` : ""),
          text: (target.textContent ?? "").trim().slice(0, 30),
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        };
      });
      stops.push(s);
    }
    const focusable = stops.filter((s) => s.tag !== "body");
    report["keyboard"] = { tab_stops: focusable.length, first: focusable[0]?.text };
    check(focusable.length >= 20, "el teclado no recorre el Registro y el Folio");
    check(focusable[0]?.text === "Ir al contenido", "el primer foco no es el enlace de salto");
    check(
      focusable.every((s) => !s.outline.startsWith("none") && !s.outline.startsWith("0px")),
      `un elemento con foco no muestra contorno: ${focusable.find((s) => s.outline.startsWith("none"))?.text ?? ""}`,
    );
    // Las flechas cambian de vista en el grupo de radios (comportamiento nativo).
    await page.locator("#v-lectura").focus();
    await page.keyboard.press("ArrowRight");
    check(
      await page.locator("#v-evidencia").isChecked(),
      "ArrowRight no cambió la vista del Folio",
    );
    await ctx.close();
  }

  // ═════════ 6. ESCRITORIO: SIN SCROLL GLOBAL, UN SOLO SCROLL INTERNO, SIN DESBORDE ═════════
  {
    const rows: string[] = [];
    for (const [w, h] of [
      [1366, 650],
      [1366, 768],
      [1920, 1080],
    ] as const) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      for (const route of [...ROUTES, "/404"]) {
        await page.goto(origin + route, { waitUntil: "networkidle" });
        const m = await page.evaluate(() => {
          const de = document.documentElement;
          const internal = [...document.querySelectorAll<HTMLElement>("body *")]
            .filter(
              (el) =>
                /(auto|scroll)/.test(getComputedStyle(el).overflowY) &&
                el.scrollHeight > el.clientHeight + 1,
            )
            .map((el) => el.className);
          const list = document.querySelector<HTMLElement>(".registro__list");
          return {
            global: de.scrollHeight - window.innerHeight,
            hOver: de.scrollWidth - window.innerWidth,
            internal: internal.filter((c) => c !== "registro__list"),
            registro: list === null ? 0 : list.scrollHeight - list.clientHeight,
          };
        });
        const tag = `${w}x${h} ${route}`;
        if (m.global > 1) rows.push(`${tag}: scroll global +${m.global}`);
        if (m.hOver > 1) rows.push(`${tag}: desborde horizontal +${m.hOver}`);
        if (m.internal.length > 1)
          rows.push(`${tag}: varios scrolls internos ${m.internal.join(",")}`);
        if (m.registro > 0) rows.push(`${tag}: el Registro scrollea +${m.registro}`);
      }
      await ctx.close();
    }
    report["desktop_viewport"] = {
      viewports: ["1366x650", "1366x768", "1920x1080"],
      problems: rows,
    };
    for (const r of rows) check(false, r);
  }

  // ═════════ 7. REFLOW A 320 PX Y MOBILE (Registro → Folio) ═════════
  {
    const rows: string[] = [];
    for (const width of [320, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: 700 } });
      const page = await ctx.newPage();
      for (const route of [...ROUTES, "/404"]) {
        await page.goto(origin + route, { waitUntil: "networkidle" });
        const over = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        );
        if (over > 1) rows.push(`${width}px ${route}: desborde horizontal +${over}`);
      }
      await ctx.close();
    }
    report["reflow"] = { widths: [320, 390], problems: rows };
    for (const r of rows) check(false, r);
  }

  // ═════════ 8. prefers-reduced-motion ═════════
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await ctx.newPage();
    await page.goto(origin + slug("LAB-Q-0013"), { waitUntil: "networkidle" });
    const d = await page.evaluate(() => {
      const durations = [...document.querySelectorAll("*")].map(
        (e) =>
          parseFloat(getComputedStyle(e).transitionDuration.split(",")[0] ?? "0") +
          parseFloat(getComputedStyle(e).animationDuration.split(",")[0] ?? "0"),
      );
      return {
        max_duration_s: Math.max(...durations),
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
    report["reduced_motion"] = d;
    check(
      d.reduced && d.max_duration_s <= 0.001,
      `reduced-motion no elimina las duraciones (${d.max_duration_s}s)`,
    );
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(
  join(root, "reports", "e2e.json"),
  canonicalJson({ routes: ROUTES.length + 1, failures, ...report }),
  "utf8",
);
console.log(JSON.stringify(report, null, 1));
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} fallo(s) de navegador:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "\n✓ e2e OK: contenido íntegro sin JS, 0 JS enviado, axe sin violaciones, teclado y foco visibles, sin scroll global en escritorio, sin scroll horizontal, reduced-motion",
);
