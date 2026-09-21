import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runGate } from "../scripts/gates/gates.ts";
import { scanNumerals } from "../scripts/gates/numerals.ts";
import { tags, visibleText } from "../scripts/gates/html.ts";
import { figureView } from "../src/lib/figures.ts";
import { FEATURED_QUESTION_IDS, NAV } from "../src/lib/site.ts";
import { cloneCtx, realContext, ROOT } from "./helpers.ts";

/** WEB3-D1: Home y /explorar. Se prueba sobre el HTML real construido (`dist/`). */
const ctx = realContext();
const home = ctx.html.get("/") ?? "";
const map = ctx.html.get("/explorar") ?? "";
const hall = ctx.html.get("/hallazgos") ?? "";
const built = home !== "";
const d = built ? describe : describe.skip;
const src = (p: string): string => readFileSync(join(ROOT, p), "utf8");
const words = (html: string): number => visibleText(html).split(/\s+/).filter(Boolean).length;

d("Home (WEB3-D1)", () => {
  it("muestra exactamente las 5 destacadas y no lista las otras 13", () => {
    const ids = [...home.matchAll(/data-index-question="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual([...FEATURED_QUESTION_IDS]);
    const rest = ctx.generated.questions.filter(
      (q) => !(FEATURED_QUESTION_IDS as readonly string[]).includes(q.id),
    );
    expect(rest).toHaveLength(13);
    for (const q of rest) expect(home.includes(q.id), q.id).toBe(false);
    // la Home no es una página de pregunta
    expect(home.includes("data-question-id=")).toBe(false);
  });
  it("cada destacada muestra su estado sin abrir nada, y hay un enlace a las 18", () => {
    for (const id of FEATURED_QUESTION_IDS) {
      const q = ctx.generated.questions.find((x) => x.id === id)!;
      const at = home.indexOf(`data-index-question="${id}"`);
      const block = home.slice(at, home.indexOf("</li>", at));
      expect(block, id).toContain(`data-state="${q.resolution.value}"`);
    }
    expect(tags(home).some((t) => t.name === "a" && t.attrs["href"] === "/explorar")).toBe(true);
  });
  it("es corta: 4–5 bloques y del orden de 450–700 palabras", () => {
    const sections = (home.match(/<section\b/g) ?? []).length;
    expect(sections).toBeLessThanOrEqual(4);
    const n = words(home);
    expect(n, `${n} palabras`).toBeGreaterThan(350);
    expect(n, `${n} palabras`).toBeLessThan(700);
  });
  it("no expone hashes, commits, IDs internos, gates ni códigos de governance", () => {
    const t = visibleText(home);
    for (const bad of [
      /\b[0-9a-f]{40}\b/,
      /\bLAB-[A-Z0-9-]+\b/,
      /\bREL-[A-Z]+-\d+\b/,
      /\bKEEP-\d+\b/,
      /\bOD-\d+\b/,
      /\bG-[A-Z]+-\d+\b/,
      /GOVERNANCE_REQUIRED|ESTABLISHED_WITHIN_SCOPE|CONVERGENT|DIVERGENT/,
      /CLOSED \/ FROZEN/,
    ])
      expect(bad.test(t), String(bad)).toBe(false);
  });
  it("no menciona gates internos como OD-14, G-LEG-02 ni G-LEG-03", () => {
    for (const bad of ["OD-14", "G-LEG-02", "G-LEG-03"]) expect(home.includes(bad)).toBe(false);
  });
  it("0 JavaScript de cliente", () => {
    for (const h of [home, map]) {
      expect(/<script\b/i.test(h)).toBe(false);
      expect(/\son[a-z]+\s*=/i.test(h)).toBe(false);
    }
  });
  it("tiene el hero con los dos CTA y el ancla del recorrido", () => {
    const links = tags(home).filter((t) => t.name === "a");
    expect(links.some((t) => t.attrs["href"] === "/explorar")).toBe(true);
    expect(links.some((t) => t.attrs["href"] === "#como-llegamos")).toBe(true);
    expect(home).toContain('id="como-llegamos"');
  });
});

d("Recorrido de la Home: fallback y autoridad de Figures", () => {
  it("siete pasos en una lista ordenada, con TODOS los paneles en el DOM (fallback completo)", () => {
    expect((home.match(/<li class="hi__s"/g) ?? []).length).toBe(7);
    expect((home.match(/type="radio" name="hi-step"/g) ?? []).length).toBe(7);
    expect(home).toContain("<ol");
    expect((home.match(/class="hi__p"/g) ?? []).length).toBe(7);
    // solo el primer paso nace elegido, y nada es autoplay
    expect((home.match(/name="hi-step"[^>]*checked/g) ?? []).length).toBe(1);
    expect(
      /@keyframes|animation\s*:|setInterval|setTimeout/i.test(
        src("src/components/HowItWorks.astro"),
      ),
    ).toBe(false);
  });
  it("las tres cifras de Q-0005 salen de IDs de Figure y pasan los gates", () => {
    const sc = scanNumerals("/", home, ctx);
    expect(sc.figures).toEqual([
      "fig.LAB-CLM-0006.nominal_growth",
      "fig.LAB-CLM-0006.real_growth",
      "fig.LAB-CLM-0006.gap",
    ]);
    expect(sc.failures).toEqual([]);
    for (const g of ["G-FIG-03", "G-FIG-05", "G-EDI-08"])
      expect(runGate(g, ctx).status, g).toBe("PASS");
  });
  it("no hay valores de investigación escritos a mano en componentes, páginas ni editorial", () => {
    const files = [
      "src/components/HowItWorks.astro",
      "src/components/QuestionRow.astro",
      "src/pages/index.astro",
      "src/pages/explorar.astro",
      "editorial/site/ui.yml",
      "editorial/site/figures.yml",
    ];
    for (const f of files) {
      const t = src(f);
      for (const v of ["35,48", "35.48", "2,10", "33,38", "36,29", "37,90", "1,61"])
        expect(t.includes(v), `${f} contiene ${v}`).toBe(false);
      expect(/[0-9]+[,.][0-9]+\s?(%|pp)/.test(t), `${f}: cifra con unidad`).toBe(false);
    }
  });
  it("un ID de Figure que no es ELIGIBLE (o no existe) hace fallar el build del recorrido", () => {
    expect(() => figureView(ROOT, "fig.LAB-CLM-0004.job_2019_q2")).toThrow(/ELIGIBLE/);
    expect(() => figureView(ROOT, "fig.LAB-CLM-0006.inventada")).toThrow(/ELIGIBLE/);
    expect(() => figureView(ROOT, "fig.LAB-CLM-0006.gap")).not.toThrow();
  });
  it("una Figure de Q-0005 en el contexto de otra pregunta falla G-FIG-03", () => {
    const c = cloneCtx(ctx);
    c.html.set(
      "/",
      home.replace('data-figure-question="LAB-Q-0005"', 'data-figure-question="LAB-Q-0004"'),
    );
    expect(runGate("G-FIG-03", c).status).toBe("FAIL");
  });
});

d("/explorar (WEB3-D1)", () => {
  it("contiene las 18 preguntas y los 14 claims, visibles sin abrir nada", () => {
    for (const q of ctx.generated.questions) {
      expect(map, q.id).toContain(`data-question-id="${q.id}"`);
      const at = map.indexOf(`data-question-id="${q.id}"`);
      const next = map.indexOf('data-question-id="', at + 10);
      const block = map.slice(at, next < 0 ? undefined : next);
      // el estado (forma + texto) está en la propia fila, no detrás de un <details>
      expect(block, q.id).toContain(`data-state="${q.resolution.value}"`);
      expect(block, q.id).toContain(`data-regime="${q.regime}"`);
    }
    for (const c of ctx.generated.claims) expect(map, c.id).toContain(`data-claim-id="${c.id}"`);
    expect(map.includes("<details")).toBe(false);
    expect(runGate("G-UX-04", ctx).status).toBe("PASS");
  });
  it("el régimen C sigue visible, con su glosa, y sin lenguaje jerárquico", () => {
    for (const id of ["LAB-Q-0014", "LAB-Q-0015", "LAB-Q-0016", "LAB-Q-0017", "LAB-Q-0018"]) {
      expect(map, id).toContain(`data-question-id="${id}"`);
    }
    for (const r of ["A", "B", "C"]) expect(map).toContain(`data-regime-group="${r}"`);
    const t = visibleText(map).toLowerCase();
    for (const bad of ["principal", "secundari", "mejor", "peor", "área", "area temática"])
      expect(t.includes(bad), bad).toBe(false);
  });
  it("muestra profundidad editorial y tipo de resultado sin jerarquizar", () => {
    const full = ctx.generated.questions.filter(
      (q) =>
        q.id in
        { "LAB-Q-0003": 1, "LAB-Q-0004": 1, "LAB-Q-0005": 1, "LAB-Q-0011": 1, "LAB-Q-0013": 1 },
    );
    expect(full).toHaveLength(5);
    expect((map.match(/data-depth="full"/g) ?? []).length).toBe(5);
    expect((map.match(/data-depth="minimal"/g) ?? []).length).toBe(13);
    expect(map).toContain("No indica un resultado más importante");
  });
  it("el filtro por estado no quita contenido: radios en el DOM, «Todas» elegida y las 18 filas presentes", () => {
    expect(map).toContain('id="f-all" checked');
    expect((map.match(/name="estado"/g) ?? []).length).toBe(7);
    expect((map.match(/class="row"/g) ?? []).length).toBe(18);
    // ninguna regla oculta filas por defecto: solo bajo un filtro elegido
    const css = [...map.matchAll(/href="(\/_astro\/[^"]+\.css)"/g)].map((m) => m[1]!);
    expect(css.length).toBeGreaterThan(0);
  });
  it("enlaza a /hallazgos como vista secundaria (lectura completa)", () => {
    expect(tags(map).some((t) => t.name === "a" && t.attrs["href"] === "/hallazgos")).toBe(true);
    expect(hall.length).toBeGreaterThan(0);
  });
});

d("Navegación (WEB3-D1)", () => {
  it("/hallazgos sale de la navegación principal pero la ruta sigue existiendo", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/explorar", "/limites", "/metodo", "/sobre"]);
    for (const [route, html] of ctx.html) {
      const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(html)?.[0] ?? "";
      expect(nav.includes('href="/hallazgos"'), `nav de ${route}`).toBe(false);
    }
    expect(ctx.html.has("/hallazgos")).toBe(true);
    expect(hall).toContain("data-index-question");
  });
  it("sin dropdowns ni JS: la navegación es una fila de enlaces que envuelve", () => {
    const nav = /<nav[^>]*>[\s\S]*?<\/nav>/.exec(home)?.[0] ?? "";
    expect(nav).not.toMatch(/<button|<details|aria-haspopup|aria-expanded/);
    expect((nav.match(/<a /g) ?? []).length).toBe(4);
  });
  it("no enlaza a /fuentes hasta WEB3-D2 (no hay página placeholder)", () => {
    for (const [, html] of ctx.html) expect(html.includes('href="/fuentes"')).toBe(false);
    expect(ctx.html.has("/fuentes")).toBe(false);
  });
  it('el contenido canónico en inglés sigue disponible (lang="en") en las fichas y en /limites', () => {
    expect(ctx.html.get("/limites") ?? "").toContain('lang="en"');
    expect(ctx.html.get("/labor/preguntas/q-0005") ?? "").toContain('data-canonical-cite="true"');
    expect(home).toContain('<html lang="es-AR"');
  });
});
