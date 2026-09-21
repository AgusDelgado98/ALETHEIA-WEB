import { describe, expect, it } from "vitest";
import { runGate } from "../scripts/gates/gates.ts";
import { scanNumerals } from "../scripts/gates/numerals.ts";
import type { GateContext } from "../scripts/gates/context.ts";
import { cloneCtx, realContext } from "./helpers.ts";

/**
 * G-FIG-03 / G-FIG-05 / G-FIG-04 / G-LIM-04 sobre el HTML real (ADR-WEB3-01 D6): `data-figure` no es autorización
 * manual. La autorización viene del artefacto generado; el marcado solo puede reflejarla.
 */
const ctx = realContext();
const R5 = "/labor/preguntas/q-0005";
const R4 = "/labor/preguntas/q-0004";
const hasHtml = ctx.html.has(R5) && ctx.html.has(R4);
const d = hasHtml ? describe : describe.skip;

const NOMINAL = "fig.LAB-CLM-0006.nominal_growth";
const NBSP = " ";

const spanRe = (id: string): RegExp =>
  new RegExp(`<span[^>]*data-figure="${id.replace(/\./g, "\\.")}"[^>]*>[\\s\\S]*?</span>`);

function mutated(route: string, fn: (html: string) => string): GateContext {
  const c = cloneCtx(ctx);
  c.html.set(route, fn(c.html.get(route)!));
  return c;
}
/** Sustituye el `<span data-figure>` real de una Figure por otro marcado. */
const swapSpan = (route: string, id: string, replacement: string): GateContext =>
  mutated(route, (h) => {
    expect(spanRe(id).test(h), `no hay span de ${id} en ${route}`).toBe(true);
    return h.replace(spanRe(id), replacement);
  });
const inject = (route: string, snippet: string): GateContext =>
  mutated(route, (h) => h.replace("</main>", `${snippet}</main>`));

const fails = (c: GateContext, gate: string): string => {
  const r = runGate(gate, c);
  expect(r.status, `${gate}: ${r.detail}`).toBe("FAIL");
  return r.failures.join("\n");
};

d("Figures en el HTML real", () => {
  it("las seis Figures ELIGIBLE se renderizan tal como las autoriza el generador", () => {
    expect(scanNumerals(R5, ctx.html.get(R5)!, ctx).figures).toEqual([
      "fig.LAB-CLM-0006.nominal_growth",
      "fig.LAB-CLM-0006.real_growth",
      "fig.LAB-CLM-0006.gap",
    ]);
    expect(scanNumerals(R4, ctx.html.get(R4)!, ctx).figures).toEqual([
      "fig.LAB-CLM-0005.share_2025_q1",
      "fig.LAB-CLM-0005.share_2026_q1",
      "fig.LAB-CLM-0005.shift",
    ]);
    for (const [route, id, text] of [
      [R5, "fig.LAB-CLM-0006.nominal_growth", `+35,48${NBSP}%`],
      [R5, "fig.LAB-CLM-0006.real_growth", `+2,10${NBSP}%`],
      [R5, "fig.LAB-CLM-0006.gap", `33,38${NBSP}pp`],
      [R4, "fig.LAB-CLM-0005.share_2025_q1", `36,29${NBSP}%`],
      [R4, "fig.LAB-CLM-0005.share_2026_q1", `37,90${NBSP}%`],
      [R4, "fig.LAB-CLM-0005.shift", `+1,61${NBSP}pp`],
    ] as const) {
      const m = ctx.html.get(route)!.match(spanRe(id));
      expect(m, id).not.toBeNull();
      expect(m![0]).toContain(`data-figure="${id}"`);
      expect(m![0].replace(/<[^>]+>/g, "").trim()).toBe(text);
    }
  });
  it("con el HTML real pasan G-FIG-03, G-FIG-04, G-FIG-05 y G-LIM-04", () => {
    for (const g of ["G-FIG-03", "G-FIG-04", "G-FIG-05", "G-LIM-04"])
      expect(runGate(g, ctx).status, g).toBe("PASS");
  });
});

d("data-figure NO es autorización manual (F5: tests negativos)", () => {
  it("data-figure manual sin ID con una cifra no registrada → FAIL", () => {
    const c = inject(R5, "<p><span data-figure>123</span></p>");
    expect(fails(c, "G-FIG-03")).toMatch(/data-figure sin ID/);
    fails(c, "G-FIG-03");
  });
  it("data-figure manual con un valor no registrado y un ID plausible → FAIL", () => {
    const c = inject(R5, `<p><span data-figure="${NOMINAL}">99,99${NBSP}%</span></p>`);
    fails(c, "G-FIG-03");
  });
  it("Figure ID inexistente → FAIL", () => {
    const c = swapSpan(
      R5,
      NOMINAL,
      `<span data-figure="fig.LAB-CLM-0006.inventada">+35,48${NBSP}%</span>`,
    );
    expect(fails(c, "G-FIG-03")).toMatch(/no existe en figure_specs/);
    fails(c, "G-FIG-05");
  });
  it("valor HTML distinto del figure spec → FAIL", () => {
    const c = swapSpan(R5, NOMINAL, `<span data-figure="${NOMINAL}">+35,49${NBSP}%</span>`);
    expect(fails(c, "G-FIG-03")).toMatch(/no es el valor registrado/);
    fails(c, "G-FIG-05");
  });
  it("unidad distinta → FAIL", () => {
    const c = swapSpan(R5, NOMINAL, `<span data-figure="${NOMINAL}">+35,48${NBSP}pp</span>`);
    expect(fails(c, "G-FIG-03")).toMatch(/no es el valor registrado/);
  });
  it("signo distinto → FAIL", () => {
    const c = swapSpan(R5, NOMINAL, `<span data-figure="${NOMINAL}">35,48${NBSP}%</span>`);
    fails(c, "G-FIG-03");
  });
  it("Figure PENDING_REVIEW → FAIL", () => {
    const c = inject(
      R5,
      `<p><span data-figure="fig.LAB-CLM-0004.job_2019_q2">+1,09${NBSP}%</span></p>`,
    );
    expect(fails(c, "G-FIG-03")).toMatch(/PENDING_REVIEW/);
    fails(c, "G-FIG-05");
  });
  it("Figure REJECTED (−14,75 % de CLM-0004) → FAIL", () => {
    const c = inject(
      R5,
      `<p><span data-figure="fig.LAB-CLM-0004.real_wage_bill_2024_q1">−14,75${NBSP}%</span></p>`,
    );
    expect(fails(c, "G-FIG-03")).toMatch(/REJECTED/);
    fails(c, "G-FIG-05");
  });
  it("cifra fuera de data-figure → FAIL", () => {
    const c = inject(R5, `<p>creció +35,48${NBSP}% en el año</p>`);
    fails(c, "G-FIG-03");
    fails(c, "G-FIG-05");
  });
  it("una Figure válida en la página de otra pregunta o claim → FAIL", () => {
    const real = ctx.html.get(R5)!.match(spanRe(NOMINAL))![0];
    const c = inject(R4, `<p>${real}</p>`);
    expect(fails(c, "G-FIG-03")).toMatch(/fuera de la pregunta/);
  });
  it("data-figure en un elemento que no es <span>, o mezclado con data-num → FAIL", () => {
    fails(swapSpan(R5, NOMINAL, `<b data-figure="${NOMINAL}">+35,48${NBSP}%</b>`), "G-FIG-03");
    fails(
      swapSpan(
        R5,
        NOMINAL,
        `<span data-figure="${NOMINAL}" data-num="canon">+35,48${NBSP}%</span>`,
      ),
      "G-FIG-03",
    );
  });
  it("data-figure anidado o con contenido adicional → FAIL", () => {
    fails(
      swapSpan(R5, NOMINAL, `<span data-figure="${NOMINAL}"><em>+35,48${NBSP}%</em></span>`),
      "G-FIG-03",
    );
  });
  it("una Figure que se quita del HTML falla G-FIG-04 (no se exhibe con su Encuadre)", () => {
    const c = mutated(R5, (h) =>
      h.replace(/data-fig-block="fig\.LAB-CLM-0006\.gap"/, 'data-x="y"'),
    );
    expect(fails(c, "G-FIG-04")).toMatch(/no se exhibe con su bloque/);
  });
  it("una Figure sin sus testigos falla G-FIG-04", () => {
    const c = mutated(R5, (h) => h.replace(/data-witness="EVIDENCE"/g, 'data-witness="X"'));
    fails(c, "G-FIG-04");
  });
  it("un bloque de Figures sin límite ni estado falla G-LIM-04", () => {
    const c = mutated(R4, (h) =>
      h.replace(/data-measure-mode="figure"/, 'data-measure-mode="chain"'),
    );
    expect(fails(c, "G-LIM-04")).toMatch(/sin bloque/);
  });
});

d('data-num="canon": numeral canónico, nunca una Figure', () => {
  const CITE = (inner: string): string =>
    `<p><q lang="en" data-canonical-cite="true">${inner}</q></p>`;
  it("un numeral verbatim del corpus dentro de una cita canónica → PASS como canónico", () => {
    const c = inject(R5, CITE('grew <span data-num="canon">35.48%</span> in nominal terms'));
    expect(runGate("G-FIG-03", c).status).toBe("PASS");
    expect(runGate("G-FIG-05", c).status).toBe("PASS");
    const sc = scanNumerals(R5, c.html.get(R5)!, c);
    expect(sc.failures).toEqual([]);
    // …pero no se convierte en una Figure de investigación
    expect(sc.figures).toEqual(scanNumerals(R5, ctx.html.get(R5)!, ctx).figures);
    expect(sc.figures).toHaveLength(3);
  });
  it("el mismo numeral canónico fuera de una cita canónica → FAIL", () => {
    const c = inject(R5, '<p>creció <span data-num="canon">35.48%</span></p>');
    expect(fails(c, "G-FIG-03")).toMatch(/solo puede aparecer dentro de una cita canónica/);
  });
  it("un numeral que no figura literalmente en el corpus, aunque esté en una cita → FAIL", () => {
    const c = inject(R5, CITE('grew <span data-num="canon">35.49%</span>'));
    expect(fails(c, "G-FIG-03")).toMatch(/no figura literalmente en el corpus/);
  });
  it("un numeral canónico dentro de una Figure, o una Figure dentro de una cita, → FAIL", () => {
    const c = swapSpan(
      R5,
      NOMINAL,
      `<span data-figure="${NOMINAL}"><span data-num="canon">+35,48${NBSP}%</span></span>`,
    );
    fails(c, "G-FIG-03");
  });
  it('data-num="canon" no habilita el % en prosa española → FAIL en G-FIG-05', () => {
    const c = inject(R5, '<p>subió <span data-num="canon">35.48%</span> en el año</p>');
    fails(c, "G-FIG-03");
  });
});

d("clases numéricas cerradas (ADR-WEB3-01 D5)", () => {
  it("«ui» y «count» no admiten %, pp, decimales ni signo", () => {
    fails(inject(R5, '<p><span data-num="ui">35,48 %</span></p>'), "G-FIG-03");
    fails(inject(R5, '<p><span data-num="count">3.5</span></p>'), "G-FIG-03");
    fails(inject(R5, '<p><span data-num="ui">+3</span></p>'), "G-FIG-03");
  });
  it("una clase desconocida (p. ej. la vieja «anchor», «version» o «table») → FAIL", () => {
    for (const k of ["anchor", "version", "table", "kpi"])
      fails(inject(R5, `<p><span data-num="${k}">2025-Q1</span></p>`), "G-FIG-03");
  });
  it("«date» no lleva unidad; «id» solo lleva IDs; «hash» solo hex", () => {
    fails(inject(R5, '<p><span data-num="date">35 %</span></p>'), "G-FIG-03");
    fails(inject(R5, '<p><span data-num="id">LAB-CLM-0006 y 35</span></p>'), "G-FIG-03");
    fails(inject(R5, '<p><span data-num="hash">35,48</span></p>'), "G-FIG-03");
  });
  it("las clases válidas pasan", () => {
    const c = inject(
      R5,
      '<p><span data-num="id">LAB-CLM-0006</span> <span data-num="date">2025-Q1</span> <span data-num="hash">abcdef1</span> <span data-num="count">18</span> <span data-num="ui">3</span></p>',
    );
    expect(runGate("G-FIG-03", c).status).toBe("PASS");
  });
});
