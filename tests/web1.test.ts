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

  it.skipIf(!ctx.html.has("/"))(
    "el Registro de la Home lista las 18 (5 con lectura completa, 13 mínimas); Hallazgos solo las 5",
    () => {
      const home = ctx.html.get("/") ?? "";
      const hall = ctx.html.get("/hallazgos") ?? "";
      const tier = (id: string): string | undefined =>
        new RegExp(`data-index-question="${id}"[^>]*data-tier="([AB])"`).exec(home)?.[1];
      for (const id of FEATURED_QUESTION_IDS) {
        expect(tier(id), id).toBe("A");
        expect(hall, id).toContain(`data-finding-question="${id}"`);
      }
      const remaining = ctx.generated.questions.filter((q) => !FEATURED.has(q.id));
      expect(remaining).toHaveLength(13);
      for (const q of remaining) {
        expect(tier(q.id), q.id).toBe("B");
        expect(hall.includes(`data-finding-question="${q.id}"`), q.id).toBe(false);
      }
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
    // La Home ya no es una landing: el corte congelado vive en la barra de estado (tag y commit abreviado).
    expect(home).toContain(ctx.generated.manifest.pin.commit.slice(0, 7));
    expect(home).toContain("Corpus congelado");
  });

  it.skipIf(!ctx.html.has("/"))(
    "estados epistemológicos en Home y Método, sin semáforo valorativo",
    () => {
      const home = ctx.html.get("/") ?? "";
      const met = ctx.html.get("/metodo") ?? "";
      for (const code of [
        "OBSERVED_IN_SOURCE",
        "REFUTED_WITHIN_SCOPE",
        "INSUFFICIENT_EVIDENCE",
        "NOT_IDENTIFIABLE",
      ]) {
        expect(home, code).toContain(`data-state="${code}"`);
        expect(met, code).toContain(`data-state="${code}"`);
      }
      expect(home.toLowerCase()).not.toMatch(/semáforo|semaforo|kpi|dashboard/);
      expect(met).toContain("No equivale a verdad confirmada");
    },
  );
});
