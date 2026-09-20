import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { seal, unitHashes, verifyAudit } from "../tools/editorial/audit.ts";
import {
  DirectiveError,
  formatAnchor,
  parseSegments,
  plain,
} from "../tools/editorial/directives.ts";
import {
  editorialPaths,
  EditorialError,
  loadEditorial,
  loadEditorialFromTexts,
} from "../tools/editorial/load.ts";
import { lintText, findBannedKeys } from "../tools/editorial/lint.ts";
import { loadGenerated } from "../tools/corpus/load.ts";
import { ROOT } from "./helpers.ts";

const corpus = loadGenerated(ROOT);
const QID = "LAB-Q-0013";
const texts = (): Record<string, string> =>
  Object.fromEntries(editorialPaths(QID).map((p) => [p, readFileSync(join(ROOT, p), "utf8")]));

describe("directivas: las fechas y cantidades salen del corpus", () => {
  it("formatea es-AR de forma determinista (sin Intl)", () => {
    expect(formatAnchor("2021-12", "month-long")).toBe("diciembre de 2021");
    expect(formatAnchor("2025-08-01", "date-long")).toBe("1 de agosto de 2025");
    expect(() => formatAnchor("2025-13", "month-long")).toThrow();
    expect(() => formatAnchor("2025-08", "date-long")).toThrow();
  });
  it("resuelve ancla, id y cantidad contra generated/", () => {
    const s = parseSegments(
      "Hay {{count:LAB-CLM-0011.blockers|words}} bloqueos hasta {{anchor:anc.LAB-CLM-0011.mler_admitted_period_end}} ({{id:EP-2025-AUG}}).",
      corpus,
    );
    expect(plain(s)).toBe("Hay tres bloqueos hasta diciembre de 2021 (EP-2025-AUG).");
  });
  it("falla ante una directiva que no resuelve o fuera de la lista blanca", () => {
    expect(() => parseSegments("{{anchor:anc.LAB-CLM-0011.no_existe}}", corpus)).toThrow(
      DirectiveError,
    );
    expect(() => parseSegments("{{id:LAB-CLM-9999}}", corpus)).toThrow(DirectiveError);
    expect(() => parseSegments("{{script:alert}}", corpus)).toThrow(DirectiveError);
    expect(() => parseSegments("{{count:LAB-CLM-0011.figures}}", corpus)).toThrow(DirectiveError);
  });
});

describe("linters editoriales", () => {
  const codes = (t: string) =>
    lintText("u", t)
      .filter((i) => i.severity === "error")
      .map((i) => i.gate);
  it("rechazan dígitos y cantidades escritas a mano, pero aceptan IDs y versiones", () => {
    expect(codes("Creció 35,48 %")).toContain("G-FIG-02");
    expect(codes("Fueron tres bloqueos")).toContain("G-FIG-02");
    expect(codes("Ver LAB-CLM-0011 y EP-2025-AUG en labor@1.0.0 (v1.0.0)")).toEqual([]);
    expect(codes("Ver §20.3.4")).toContain("G-FIG-02");
    expect(codes("{{count:LAB-CLM-0011.blockers|words}} bloqueos")).toEqual([]);
    expect(codes("una misma persona")).toEqual([]);
  });
  it("rechazan verbos protegidos y placeholders, y aceptan «Todo eso…»", () => {
    for (const t of [
      "Esto establece",
      "confirma",
      "demuestra",
      "prueba que",
      "corrobora",
      "explica",
      "causa",
      "impulsa",
      "es consistente con",
      "el mercado laboral argentino muestra",
    ])
      expect(codes(t), t).toContain("G-EDI-03");
    expect(codes("Todo eso tendría que venir de una fuente")).toEqual([]);
    expect(codes("pendiente TODO")).toContain("G-EDI-06");
    expect(codes("valor *")).toContain("G-EDI-06");
    expect(codes("texto <b>x</b>")).toContain("G-EDI-07");
  });
  it("«causal» (adjetivo) no es un verbo protegido", () => {
    expect(codes("un efecto causal")).toEqual([]);
  });
  it("detecta claves de estado en editorial", () => {
    expect(findBannedKeys({ a: { state: "X" }, b: [{ resolution: 1 }] })).toEqual([
      "$.a.state",
      "$.b[0].resolution",
    ]);
  });
});

describe("capa editorial de Q-0013", () => {
  const bundle = loadEditorial(ROOT, QID);
  it("todo texto tiene un registro de auditoría vigente atado por hash", () => {
    expect(verifyAudit(bundle, corpus)).toEqual([]);
    expect(bundle.units.length).toBeGreaterThan(70);
  });
  it("public_question es exactamente la aprobada y la única con veredicto APPROVED de la autoría", () => {
    const approved = bundle.audit!.records.filter((r) => r.verdict === "APPROVED");
    expect(approved.map((r) => r.string_id)).toEqual(["labor/LAB-Q-0013#public_question"]);
    expect(bundle.audit!.records.filter((r) => r.verdict === "PENDING_AUTHOR_REVIEW").length).toBe(
      bundle.units.length - 1,
    );
  });
  it("cada frase de «sí / no / haría falta» cita contenido canónico que resuelve", () => {
    for (const u of bundle.units.filter((x) =>
      ["can_say", "does_not_mean", "would_need", "intro", "title", "scope", "trail"].includes(
        x.section,
      ),
    )) {
      expect(u.maps_to.length, u.string_id).toBeGreaterThan(0);
      expect(unitHashes(u, corpus).unresolved, u.string_id).toEqual([]);
    }
  });
  it("ningún archivo editorial de entidad contiene un campo de estado", () => {
    const t = texts();
    t[editorialPaths(QID)[0]!] += "\nstate: OBSERVED_IN_SOURCE\n";
    expect(() => loadEditorialFromTexts(t, QID)).toThrow(EditorialError);
    const t2 = texts();
    t2[editorialPaths(QID)[1]!] += "\nresolution: X\n";
    expect(() => loadEditorialFromTexts(t2, QID)).toThrow(/G-STA-04/);
  });
  it("el registro es solo de agregado: un texto cambiado exige una revisión nueva", () => {
    const b = loadEditorial(ROOT, QID);
    b.finding.title.text = b.finding.title.text + " (editado)";
    const unit = b.units.find((u) => u.string_id.endsWith("finding.title"))!;
    unit.text = b.finding.title.text;
    expect(() => seal(b, corpus)).toThrow(/cambió después de auditarse/);
    b.review.revision = 2;
    const sealed = seal(b, corpus);
    const recs = sealed.records.filter((r) => r.string_id === unit.string_id);
    expect(recs.map((r) => r.revision)).toEqual([1, 2]);
  });
  it("sellar dos veces no cambia nada (idempotente)", () => {
    const again = seal(loadEditorial(ROOT, QID), corpus);
    expect(again.records.length).toBe(bundle.audit!.records.length);
  });
  it("cambiar el canónico deja obsoleto el registro", () => {
    const c = structuredClone(corpus);
    c.claims[0]!.scope_statement += " nuevo";
    const stale = verifyAudit(bundle, c).filter((i) => i.message.includes("OBSOLETA"));
    expect(stale.length).toBeGreaterThan(0);
  });
  it("las limitaciones de la matriz resuelven por dueño y ordinal", () => {
    expect(bundle.limits.dispositions).toHaveLength(6);
    expect(
      bundle.limits.dispositions
        .filter((d) => d.disposition === "AUDIT_ONLY")
        .every((d) => d.class === "PROCEDURAL"),
    ).toBe(true);
  });
});
