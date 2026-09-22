import { describe, expect, it } from "vitest";
import { FEATURED_QUESTION_IDS, REGIME_C_QUESTION_IDS } from "../src/lib/site.ts";
import { realContext } from "./helpers.ts";

const ctx = realContext();
const FEATURED = new Set<string>(FEATURED_QUESTION_IDS);

describe("WEB-1 arquitectura pública", () => {
  it("selección de hallazgos coincide con WEB-0 D-014 y excluye el régimen C", () => {
    expect([...FEATURED_QUESTION_IDS]).toEqual([
      "LAB-Q-0005",
      "LAB-Q-0003",
      "LAB-Q-0004",
      "LAB-Q-0013",
      "LAB-Q-0011",
    ]);
    expect(FEATURED_QUESTION_IDS).toHaveLength(5);
    expect(REGIME_C_QUESTION_IDS).toHaveLength(5);
    for (const id of REGIME_C_QUESTION_IDS) expect(FEATURED.has(id)).toBe(false);
    expect(ctx.generated.questions).toHaveLength(18);
  });

  it.skipIf(!ctx.html.has("/"))(
    "Home, hallazgos, explorar, límites, método, sobre y versiones existen",
    () => {
      for (const route of [
        "/",
        "/hallazgos",
        "/explorar",
        "/limites",
        "/metodo",
        "/sobre",
        "/versiones",
      ]) {
        expect(ctx.html.has(route), route).toBe(true);
      }
    },
  );

  // La Home (ONE QUESTION AT A TIME) ya no lista las 18 preguntas ni marca lectura completa/mínima: esa
  // distinción de datos se prueba en tests/registro-folio.test.ts. Hallazgos, sin cambios, sigue con la UI vieja.
  it.skipIf(!ctx.html.has("/hallazgos"))(
    "Hallazgos lista solo las 5 destacadas, ninguna de las 13 restantes",
    () => {
      const hall = ctx.html.get("/hallazgos") ?? "";
      for (const id of FEATURED_QUESTION_IDS)
        expect(hall, id).toContain(`data-finding-question="${id}"`);
      const remaining = ctx.generated.questions.filter((q) => !FEATURED.has(q.id));
      expect(remaining).toHaveLength(13);
      for (const q of remaining)
        expect(hall.includes(`data-finding-question="${q.id}"`), q.id).toBe(false);
    },
  );

  it.skipIf(!ctx.html.has("/"))("Régimen C visible en explorar y límites, no en hallazgos", () => {
    const hall = ctx.html.get("/hallazgos") ?? "";
    const map = ctx.html.get("/explorar") ?? "";
    const lim = ctx.html.get("/limites") ?? "";
    for (const id of REGIME_C_QUESTION_IDS) {
      expect(hall.includes(`data-finding-question="${id}"`), id).toBe(false);
      expect(map, id).toContain(`data-question-id="${id}"`);
      expect(map, id).toContain('data-regime="C"');
    }
    expect(lim).toContain('data-relation-category="GOVERNANCE_REQUIRED"');
    const gr = ctx.generated.relations.filter((r) => r.category === "GOVERNANCE_REQUIRED");
    expect(gr).toHaveLength(6);
    for (const r of gr) {
      expect(lim, r.id).toContain(`data-relation-id="${r.id}"`);
      expect(lim, r.id).toContain(`id="${r.id}"`);
    }
    const keepC = ctx.generated["preserved-results"].filter((k) => k.regime === "C");
    expect(keepC.length).toBeGreaterThan(0);
    for (const k of keepC) expect(lim, k.id).toContain(`data-keep-id="${k.id}"`);
  });

  it.skipIf(!ctx.html.has("/sobre"))("aviso legal visible; cierre congelado en versiones", () => {
    const sobre = ctx.html.get("/sobre") ?? "";
    const ver = ctx.html.get("/versiones") ?? "";
    const home = ctx.html.get("/") ?? "";
    expect(sobre).toContain('id="aviso"');
    expect(sobre).toContain("no significa verdad confirmada");
    expect(sobre).toContain("No es asesoramiento legal");
    expect(ver).toContain(ctx.generated.manifest.pin.tag);
    expect(ver).toContain(ctx.generated.manifest.pin.commit);
    expect(ver).toContain("CLOSED / FROZEN");
    // La entrada narrativa reserva los IDs técnicos para Procedencia.
    expect(home).not.toContain(ctx.generated.manifest.pin.commit.slice(0, 7));
    expect(home).toContain("corpus cerrado");
    expect(home).toContain("La verdad depende del alcance de la evidencia");
  });

  it.skipIf(!ctx.html.has("/"))(
    "estados epistemológicos en Método, sin semáforo valorativo; la Home (entrada) no los expone",
    () => {
      const home = ctx.html.get("/") ?? "";
      // ONE QUESTION AT A TIME: la entrada no muestra leyenda de estados; el selector (oculto hasta que se
      // abre) sí lleva la marca de cada pregunta, así que la prueba mira solo lo que queda fuera de él.
      const homeOutsidePicker = home.split('<div class="picker-mount">')[0] ?? home;
      const met = ctx.html.get("/metodo") ?? "";
      for (const code of [
        "OBSERVED_IN_SOURCE",
        "REFUTED_WITHIN_SCOPE",
        "INSUFFICIENT_EVIDENCE",
        "NOT_IDENTIFIABLE",
      ]) {
        expect(met, code).toContain(`data-state="${code}"`);
        expect(homeOutsidePicker, code).not.toContain(`data-state="${code}"`);
      }
      expect(home.toLowerCase()).not.toMatch(/semáforo|semaforo|kpi|dashboard/);
      expect(met).toContain("No equivale a verdad confirmada");
    },
  );
});
