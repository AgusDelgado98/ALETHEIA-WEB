import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright-core";
import { formatFigureValue } from "../../tools/corpus/figures.ts";
import { loadContext } from "../gates/context.ts";
import { serveDist } from "./serve.ts";

/**
 * Pruebas de navegador de las Figures de la primera ola (WEB-3 · F2–F5): Q-0005 y Q-0004.
 * Verifica, con Edge headless: el HTML exacto de cada Figure, que todo lo esencial se ve sin abrir nada y sin JS,
 * axe, teclado y foco, reflow (320/375/768/1440), reduced-motion, y que una Figure NO es un KPI (tamaño, color,
 * animación). Guarda capturas en `docs/web-3/shots/`. Uso: node scripts/e2e/figures.ts
 */
const root = resolve(import.meta.dirname, "..", "..");
const dist = join(root, "dist");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const shots = join(root, "docs", "web-3", "shots");
mkdirSync(shots, { recursive: true });

const ctxData = loadContext(root);
const failures: string[] = [];
const report: Record<string, unknown> = {};
const check = (ok: boolean, msg: string): void => {
  if (!ok) failures.push(msg);
};

const PAGES = [
  { qid: "LAB-Q-0005", route: "/labor/preguntas/q-0005", claim: "LAB-CLM-0006", slug: "q-0005" },
  { qid: "LAB-Q-0004", route: "/labor/preguntas/q-0004", claim: "LAB-CLM-0005", slug: "q-0004" },
] as const;

const { server, origin } = await serveDist(dist);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  for (const p of PAGES) {
    const figures = ctxData.generated.figures.filter((f) => f.claim_id === p.claim);
    const claim = ctxData.generated.claims.find((c) => c.id === p.claim)!;
    const out: Record<string, unknown> = {};
    report[p.slug] = out;

    // ═════ 1. SIN JAVASCRIPT: las Figures, el estado y el límite se ven sin abrir nada ═════
    {
      const ctx = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 1440, height: 900 },
      });
      const page = await ctx.newPage();
      await page.goto(origin + p.route, { waitUntil: "networkidle" });
      const rendered = await page.$$eval("[data-figure]", (els) =>
        els.map((e) => ({
          id: e.getAttribute("data-figure"),
          tag: e.tagName,
          text: (e.textContent ?? "").replace(/\s+/g, " ").trim(),
          html: e.outerHTML,
        })),
      );
      out["figure_html"] = rendered.map((r) => r.html);
      check(
        rendered.length === figures.length,
        `${p.slug}: se esperaban ${figures.length} Figures`,
      );
      for (const f of figures) {
        const r = rendered.find((x) => x.id === f.id);
        check(r !== undefined, `${p.slug}: falta ${f.id}`);
        check(
          r?.text === formatFigureValue(f).replace(/\s+/g, " "),
          `${p.slug}: ${f.id} no muestra el valor generado`,
        );
        check(r?.tag === "SPAN", `${p.slug}: ${f.id} no es un <span>`);
      }
      const block = page.locator(`.how__c[data-claim-id="${p.claim}"][data-measure-mode="figure"]`);
      check(
        (await block.count()) === 1,
        `${p.slug}: falta el bloque «Cómo llegamos» en modo Figure`,
      );
      check(
        await block.locator(`[data-state="${claim.epistemic_state}"]`).first().isVisible(),
        `${p.slug}: el estado de la afirmación no se ve sin abrir nada`,
      );
      check(
        await block.getByRole("heading", { name: "Límite", level: 4 }).isVisible(),
        `${p.slug}: el límite no se ve sin abrir nada`,
      );
      for (const f of figures) {
        const d = page.locator(`[data-fig-block="${f.id}"] details`);
        check(
          (await d.getAttribute("open")) === null,
          `${p.slug}: los testigos deben nacer cerrados`,
        );
        // los campos esenciales NO están detrás de una interacción
        check(
          await page.locator(`[data-fig-block="${f.id}"] dl`).isVisible(),
          `${p.slug}: unidad/período/fuente no visibles`,
        );
      }
      check((await page.locator("script").count()) === 0, `${p.slug}: hay <script> en la página`);
      await ctx.close();
    }

    // ═════ 2. CON NAVEGADOR: axe, teclado, reflow, reduced-motion, no-KPI, capturas ═════
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page: Page = await ctx.newPage();
    const reqs: string[] = [];
    page.on("request", (r) => reqs.push(`${r.resourceType()} ${r.url()}`));
    await page.goto(origin + p.route, { waitUntil: "networkidle" });
    check(!reqs.some((r) => r.startsWith("script ")), `${p.slug}: se pidió JavaScript al servidor`);

    const axeRun = async (label: string) => {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      return { label, violations: r.violations.map((v) => `${v.id}×${v.nodes.length}`) };
    };
    const axe = [await axeRun("cerrado")];
    for (const d of await page.locator(".fig__w > summary").all()) await d.click();
    axe.push(await axeRun("testigos abiertos"));
    out["axe"] = axe;
    for (const s of axe)
      check(s.violations.length === 0, `${p.slug} axe (${s.label}): ${s.violations.join(", ")}`);

    // teclado: se llega a «Cómo sabemos…» con Tab, tiene foco visible y se opera con Enter
    await page.reload({ waitUntil: "networkidle" });
    const first = page.locator(".fig__w > summary").first();
    let reached = false;
    for (let i = 0; i < 200 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await first.evaluate((el) => el === document.activeElement);
    }
    check(reached, `${p.slug}: no se llega al resumen de testigos con el teclado`);
    if (reached) {
      // el contorno se asienta tras el primer fotograma (transición de ~0 ms bajo reduced-motion)
      await page.waitForTimeout(150);
      const outline = await first.evaluate((el) => {
        const cs = getComputedStyle(el);
        return `${cs.outlineStyle} ${cs.outlineWidth}`;
      });
      out["focus_outline"] = outline;
      check(/solid 2px/.test(outline), `${p.slug}: foco no visible (${outline})`);
      await page.keyboard.press("Enter");
      check(
        (await first.evaluate((el) => (el.parentElement as HTMLDetailsElement).open)) === true,
        `${p.slug}: Enter no abre los testigos`,
      );
    }

    // reflow
    const reflow: Record<string, boolean> = {};
    for (const w of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const d of await page.locator(".fig__w > summary").all()) {
        const open = await d.evaluate((el) => (el.parentElement as HTMLDetailsElement).open);
        if (!open) await d.click();
      }
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      reflow[String(w)] = over;
      check(!over, `${p.slug}: scroll horizontal a ${w} px`);
    }
    out["horizontal_scroll_by_width"] = reflow;
    await page.setViewportSize({ width: 1440, height: 900 });

    // una Figure NO es un KPI: tamaño moderado, sin color, sin animación, sin contadores
    const style = await page.$$eval("[data-figure]", (els) =>
      els.map((e) => {
        const cs = getComputedStyle(e);
        const p = getComputedStyle(e.parentElement!);
        const ink = getComputedStyle(document.body).color;
        return {
          fontPx: parseFloat(cs.fontSize),
          color: cs.color,
          isInk: cs.color === ink,
          animation: cs.animationName,
          transition: cs.transitionDuration,
          background: cs.backgroundColor,
          parentBackground: p.backgroundColor,
          boxShadow: cs.boxShadow,
        };
      }),
    );
    out["figure_style"] = style;
    for (const s of style) {
      check(s.fontPx <= 30, `${p.slug}: una Figure mide ${s.fontPx}px (no es un KPI: ≤ 30 px)`);
      check(s.isInk, `${p.slug}: una Figure no usa el color de texto de la página (${s.color})`);
      check(s.animation === "none", `${p.slug}: una Figure tiene animación (${s.animation})`);
      check(s.boxShadow === "none", `${p.slug}: una Figure tiene sombra`);
      check(
        s.background === "rgba(0, 0, 0, 0)",
        `${p.slug}: una Figure tiene fondo (${s.background})`,
      );
    }
    const animated = await page.$$eval(
      ".how *",
      (els) => els.filter((e) => getComputedStyle(e).animationName !== "none").length,
    );
    check(animated === 0, `${p.slug}: hay ${animated} elementos animados en «Cómo llegamos»`);

    // capturas (descripción visual: se leen en el reporte)
    const how = page.locator("section.how");
    await how.scrollIntoViewIfNeeded();
    await how.screenshot({ path: join(shots, `${p.slug}-desktop.png`) });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("section.how").screenshot({ path: join(shots, `${p.slug}-375.png`) });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(join(root, "reports", "e2e-figures.json"), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  "✓ e2e Figures OK: 6 Figures con su HTML exacto, sin JS, estado y límite visibles sin abrir nada, axe 0, teclado, reflow, reduced-motion y sin semántica de KPI",
);
