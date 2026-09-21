import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "playwright-core";
import { serveDist } from "./serve.ts";

/**
 * Navegador real para WEB3-D1 (Home y /explorar), con Edge headless: sin JS, axe, teclado, reflow a
 * 320/375/768/1440, recorrido (horizontal en escritorio, vertical en móvil, un paso a la vez), filtro por estado,
 * reduced-motion, y capturas en `docs/web-3/shots/`. Uso: node scripts/e2e/home.ts
 */
const root = resolve(import.meta.dirname, "..", "..");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const shots = join(root, "docs", "web-3", "shots");
mkdirSync(shots, { recursive: true });
const failures: string[] = [];
const report: Record<string, unknown> = {};
const check = (ok: boolean, msg: string): void => {
  if (!ok) failures.push(msg);
};

const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });

const axe = async (page: Page, label: string): Promise<string[]> => {
  const r = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const v = r.violations.map((x) => `${x.id}×${x.nodes.length}`);
  check(v.length === 0, `axe (${label}): ${v.join(", ")}`);
  return v;
};
const overflow = (page: Page): Promise<boolean> =>
  page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );

try {
  // ═════ SIN JAVASCRIPT ═════
  {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const page = await ctx.newPage();
    await page.goto(origin + "/", { waitUntil: "networkidle" });
    check((await page.locator("script").count()) === 0, "Home: hay <script>");
    check((await page.locator("[data-index-question]").count()) === 5, "Home: no son 5 destacadas");
    check((await page.locator("[data-figure]").count()) === 3, "Home: no hay 3 Figures");
    // el estado de cada destacada se ve sin abrir nada
    for (const s of await page.locator("[data-index-question] .ms").all())
      check(await s.isVisible(), "Home: un estado no es visible");
    await page.goto(origin + "/explorar", { waitUntil: "networkidle" });
    const rows = page.locator("[data-question-id]");
    check((await rows.count()) === 18, "Explorar: no hay 18 filas");
    let hidden = 0;
    for (const r of await rows.all()) if (!(await r.isVisible())) hidden++;
    check(hidden === 0, `Explorar: ${hidden} filas no visibles sin interacción`);
    check((await page.locator("details").count()) === 0, "Explorar: hay <details>");
    report["no_js"] = {
      rows_visible: 18 - hidden,
      filter_ui_visible: await page.locator(".ex__f").isVisible(),
    };
    await ctx.close();
  }

  // ═════ HOME ═════
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    const reqs: string[] = [];
    page.on("request", (r) => reqs.push(`${r.resourceType()} ${r.url()}`));
    await page.goto(origin + "/", { waitUntil: "networkidle" });
    check(!reqs.some((r) => r.startsWith("script ")), "Home: se pidió JS");
    const metrics = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      viewport: innerHeight,
      words: document.body.innerText.split(/\s+/).filter(Boolean).length,
      wordsMain: document.querySelector("main")!.innerText.split(/\s+/).filter(Boolean).length,
      h2: [...document.querySelectorAll("main h2")].map((h) => h.textContent!.trim()),
    }));
    report["home_1440"] = metrics;
    check(metrics.h2.length <= 4, "Home: demasiadas secciones");

    // recorrido: un paso a la vez; en escritorio las etiquetas forman UNA fila
    const labels = page.locator(".hi__s > label");
    check((await labels.count()) === 7, "recorrido: no son 7 pasos");
    const tops = await labels.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    );
    check(
      new Set(tops).size === 1,
      `recorrido: en escritorio no es horizontal (${tops.join(",")})`,
    );
    const visiblePanels = async (): Promise<number> =>
      await page
        .locator(".hi__p")
        .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
    check((await visiblePanels()) === 1, "recorrido: debe verse un solo panel");
    await labels.nth(5).click();
    check(await page.locator("#hi-result").isChecked(), "recorrido: el clic no eligió «Resultado»");
    check((await visiblePanels()) === 1, "recorrido: tras elegir, un solo panel");
    const figs = await page.locator('.hi__s[data-step="result"] [data-figure]').allTextContents();
    check(figs.length === 3, "recorrido: el paso Resultado no muestra las 3 Figures");
    report["walkthrough_result_figures"] = figs.map((t) => t.replace(/\s+/g, " "));
    // teclado: flechas entre pasos; foco visible
    await page.locator("#hi-question").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    check(
      await page.locator("#hi-source").isChecked(),
      "recorrido: la flecha no avanzó al paso siguiente",
    );
    const outline = await page.locator("#hi-source + label").evaluate((el) => {
      const c = getComputedStyle(el);
      return `${c.outlineStyle} ${c.outlineWidth}`;
    });
    report["stepper_focus_outline"] = outline;
    check(/solid 2px/.test(outline), `recorrido: foco no visible (${outline})`);
    // el estado activo NO depende solo del color: peso y grosor del hilo
    const active = await page.locator("#hi-source + label").evaluate((el) => {
      const c = getComputedStyle(el);
      return { weight: c.fontWeight, border: c.borderTopWidth };
    });
    const inactive = await page.locator("#hi-limit + label").evaluate((el) => {
      const c = getComputedStyle(el);
      return { weight: c.fontWeight, border: c.borderTopWidth };
    });
    report["stepper_active_vs_inactive"] = { active, inactive };
    check(
      active.weight !== inactive.weight && active.border !== inactive.border,
      "recorrido: el estado activo depende solo del color",
    );

    await labels.nth(5).click();
    const axeHome = [
      ...(await axe(page, "home · resultado")),
      ...(await (async () => {
        await labels.nth(0).click();
        return axe(page, "home · pregunta");
      })()),
    ];
    report["axe_home"] = axeHome;

    // no-KPI: las cifras del recorrido
    await labels.nth(5).click();
    const fstyle = await page.$$eval("[data-figure]", (els) =>
      els.map((e) => ({
        px: parseFloat(getComputedStyle(e).fontSize),
        anim: getComputedStyle(e).animationName,
        color: getComputedStyle(e).color,
      })),
    );
    for (const s of fstyle) {
      check(s.px <= 30, `Home: una Figure mide ${s.px}px`);
      check(s.anim === "none", "Home: una Figure tiene animación");
    }
    const ink = await page.evaluate(() => getComputedStyle(document.body).color);
    check(
      fstyle.every((s) => s.color === ink),
      "Home: una Figure usa un color distinto del texto",
    );

    // reflow
    const reflow: Record<string, boolean> = {};
    for (const w of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      for (const i of [0, 5]) {
        await labels.nth(i).click();
        const o = await overflow(page);
        reflow[`${w}:${i}`] = o;
        check(!o, `Home: scroll horizontal a ${w} px (paso ${i})`);
      }
    }
    report["home_reflow"] = reflow;

    // capturas
    await page.setViewportSize({ width: 1440, height: 900 });
    await labels.nth(5).click();
    await page.screenshot({ path: join(shots, "home-1440.png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 800 });
    await labels.nth(5).click();
    const m375 = await page.evaluate(() => ({ height: document.documentElement.scrollHeight }));
    report["home_375"] = m375;
    // en móvil el recorrido es VERTICAL: las etiquetas se apilan
    const t375 = await labels.evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    );
    check(
      new Set(t375).size === 7 && t375.every((v, i) => i === 0 || v > t375[i - 1]!),
      "recorrido: en móvil no es vertical",
    );
    await page.screenshot({ path: join(shots, "home-375.png"), fullPage: true });
    await ctx.close();
  }

  // ═════ EXPLORAR ═════
  {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = await ctx.newPage();
    await page.goto(origin + "/explorar", { waitUntil: "networkidle" });
    report["explorar_1440"] = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      words: document.querySelector("main")!.innerText.split(/\s+/).filter(Boolean).length,
    }));
    await axe(page, "explorar");
    const visibleRows = async (): Promise<number> =>
      page
        .locator("[data-question-id]")
        .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
    check((await visibleRows()) === 18, "Explorar: sin filtro no se ven las 18");
    // filtro por estado: no quita nada del DOM
    const beforeDom = await page.locator("[data-question-id]").count();
    await page.locator('label[for="f-REFUTED_WITHIN_SCOPE"]').click();
    const refuted = await visibleRows();
    check(refuted === 1, `Explorar: filtro «Refutada» muestra ${refuted}`);
    check(
      (await page.locator("[data-question-id]").count()) === beforeDom,
      "Explorar: el filtro quitó filas del DOM",
    );
    const groups = await page
      .locator(".grp")
      .evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().height > 0).length);
    report["filter_refuted"] = {
      visible_rows: refuted,
      visible_groups: groups,
      dom_rows: beforeDom,
    };
    await page.locator('label[for="f-OBSERVED_IN_SOURCE"]').click();
    report["filter_observed_rows"] = await visibleRows();
    await axe(page, "explorar filtrado");
    // teclado sobre el filtro
    await page.locator("#f-all").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(150);
    check(
      await page.locator("#f-OBSERVED_IN_SOURCE").isChecked(),
      "Explorar: la flecha no cambió el filtro",
    );
    await page.locator('label[for="f-all"]').click();
    check((await visibleRows()) === 18, "Explorar: «Todas» no restaura las 18");
    const reflow: Record<string, boolean> = {};
    for (const w of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      const o = await overflow(page);
      reflow[String(w)] = o;
      check(!o, `Explorar: scroll horizontal a ${w} px`);
    }
    report["explorar_reflow"] = reflow;
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: join(shots, "explorar-1440.png"), fullPage: true });
    await page.setViewportSize({ width: 375, height: 800 });
    report["explorar_375"] = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
    }));
    await page.screenshot({ path: join(shots, "explorar-375.png"), fullPage: true });
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}
mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(join(root, "reports", "e2e-home.json"), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length > 0) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(
  "✓ e2e Home/Explorar OK: sin JS, axe 0, teclado, recorrido horizontal/vertical, filtro sin quitar contenido y sin scroll horizontal",
);
