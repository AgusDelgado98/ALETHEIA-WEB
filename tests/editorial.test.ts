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
import { plainText } from "../src/lib/render.ts";
import {
  editorialPaths,
  EditorialError,
  loadEditorial,
  loadEditorialFromTexts,
} from "../tools/editorial/load.ts";
import { lintText, findBannedKeys } from "../tools/editorial/lint.ts";
import { loadGenerated } from "../tools/corpus/load.ts";
import { ROOT } from "./helpers.ts";
import { loadQuestionMap } from "../src/lib/map.ts";
import { availableQuestionIds, loadQuestionView, questionSlug } from "../src/lib/view.ts";

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
  it("public_question de Q-0013 y las 13 fichas mínimas tienen veredicto APPROVED (Charter §20.7)", () => {
    const latest = (sid: string) =>
      bundle
        .audit!.records.filter((r) => r.string_id === sid)
        .sort((a, z) => z.revision - a.revision)[0];
    expect(latest("labor/LAB-Q-0013#public_question")?.verdict).toBe("APPROVED");
    const extras = bundle.units
      .filter(
        (u) => u.kind === "public_question" && u.string_id !== "labor/LAB-Q-0013#public_question",
      )
      .map((u) => u.string_id);
    expect(extras).toHaveLength(13);
    for (const sid of extras) expect(latest(sid)?.verdict, sid).toBe("APPROVED");
    const pendingLatest = bundle.units.filter(
      (u) => latest(u.string_id)?.verdict === "PENDING_AUTHOR_REVIEW",
    );
    // 14 public_question + 18 títulos cortos de navegación (aprobados expresamente por la autoría, revisión 3).
    const navApproved = bundle.units.filter((u) => u.section === "nav_title");
    expect(navApproved).toHaveLength(18);
    for (const u of navApproved) expect(latest(u.string_id)?.verdict, u.string_id).toBe("APPROVED");
    expect(pendingLatest.length).toBe(bundle.units.length - 14 - 18);
  });
  it("cada frase de «sí / no / haría falta» cita contenido canónico que resuelve", () => {
    for (const u of bundle.units.filter((x) =>
      [
        "can_say",
        "does_not_mean",
        "would_need",
        "intro",
        "title",
        "scope",
        "trail",
        "public_title",
        "nav_title",
        "limits_gloss",
        "source_gloss",
      ].includes(x.section),
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
    b.review.revision = b.review.revision + 1;
    const sealed = seal(b, corpus);
    const recs = sealed.records.filter((r) => r.string_id === unit.string_id);
    expect(recs.map((r) => r.revision)).toEqual(
      Array.from({ length: b.review.revision }, (_, i) => i + 1),
    );
  });
  it("sellar dos veces no cambia nada (idempotente)", () => {
    const again = seal(loadEditorial(ROOT, QID), corpus);
    expect(again.records.length).toBe(bundle.audit!.records.length);
  });
  it("cambiar el canónico deja obsoleto el registro", () => {
    const c = structuredClone(corpus);
    c.claims.find((x) => x.id === "LAB-CLM-0011")!.scope_statement += " nuevo";
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

describe("capa editorial de Q-0011 (0 claims)", () => {
  const bundle = loadEditorial(ROOT, "LAB-Q-0011");
  it("no fabrica claim ni Rastro y la auditoría está vigente", () => {
    expect(bundle.finding.claim_ref).toBeUndefined();
    expect(bundle.finding.trail).toBeUndefined();
    expect(verifyAudit(bundle, corpus)).toEqual([]);
  });
  it("public_question es la aprobada y no hay unidades de sitio duplicadas", () => {
    expect(bundle.units.some((u) => u.string_id.startsWith("site#"))).toBe(false);
    const rec = bundle.audit!.records.find((r) => r.string_id.endsWith("#public_question"));
    expect(rec?.verdict).toBe("APPROVED");
    expect(bundle.question.public_question).toBe(
      "¿Se puede distinguir una prestación de servicios realmente independiente de una relación de empleo dependiente encubierta con las fuentes hoy admisibles?",
    );
  });
});

describe("vista de Q-0011", () => {
  it("carga 0 claims y NOT_IDENTIFIABLE sin inventar afirmación", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0011");
    expect(v.hasEditorial).toBe(true);
    expect(v.claim).toBeNull();
    expect(v.trail).toBeNull();
    expect(v.state.question).toBe("NOT_IDENTIFIABLE");
    expect(v.state.claim).toBeNull();
    expect(v.state.questionLabel).toBe("No identificable con las fuentes conocidas");
    expect(plainText(v.provenance.cite)).not.toMatch(/LAB-CLM-/);
    expect(plainText(v.provenance.cite)).toMatch(/Sin afirmación/);
  });
});

describe("páginas mínimas de las 18 preguntas LABOR", () => {
  const ids = availableQuestionIds(ROOT);
  const ZERO = ["LAB-Q-0006", "LAB-Q-0007", "LAB-Q-0011", "LAB-Q-0015", "LAB-Q-0017"];
  it("genera las 18 rutas del slice", () => {
    expect(ids).toHaveLength(18);
    expect(ids.map(questionSlug)).toEqual(
      Array.from({ length: 18 }, (_, i) => `q-${String(i + 1).padStart(4, "0")}`),
    );
  });
  it("Q-0003 conserva 2 claims", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0003");
    expect(v.hasEditorial).toBe(true);
    expect(v.claims.map((c) => c.id)).toEqual(["LAB-CLM-0002", "LAB-CLM-0004"]);
    expect(v.claim).toBeNull();
    expect(v.trails).toHaveLength(2);
  });
  it("las 5 preguntas sin claim cargan sin afirmación ni Rastro", () => {
    for (const id of ZERO) {
      const v = loadQuestionView(ROOT, id);
      expect(v.claims, id).toEqual([]);
      expect(v.claim, id).toBeNull();
      expect(v.trail, id).toBeNull();
    }
  });
  it("Q-0013, Q-0011, Q-0005, Q-0003 y Q-0004 conservan la ficha editorial", () => {
    const a = loadQuestionView(ROOT, "LAB-Q-0013");
    expect(a.hasEditorial).toBe(true);
    expect(a.claim?.id).toBe("LAB-CLM-0011");
    expect(a.trail).not.toBeNull();
    const b = loadQuestionView(ROOT, "LAB-Q-0011");
    expect(b.hasEditorial).toBe(true);
    expect(b.state.question).toBe("NOT_IDENTIFIABLE");
    const c = loadQuestionView(ROOT, "LAB-Q-0005");
    expect(c.hasEditorial).toBe(true);
    expect(c.claim?.id).toBe("LAB-CLM-0006");
    expect(c.trail).not.toBeNull();
    const d = loadQuestionView(ROOT, "LAB-Q-0003");
    expect(d.hasEditorial).toBe(true);
    expect(d.claims.map((x) => x.id)).toEqual(["LAB-CLM-0002", "LAB-CLM-0004"]);
    const e = loadQuestionView(ROOT, "LAB-Q-0004");
    expect(e.hasEditorial).toBe(true);
    expect(e.claim?.id).toBe("LAB-CLM-0005");
  });
});

describe("capa editorial de Q-0005", () => {
  const bundle = loadEditorial(ROOT, "LAB-Q-0005");
  it("no fabrica cifras y la auditoría está vigente", () => {
    expect(bundle.finding.claim_ref).toBe("labor/LAB-CLM-0006");
    expect(bundle.finding.trail).toBeDefined();
    expect(bundle.finding.blockers_at_cut).toEqual([]);
    expect(bundle.finding.disclosure).toBeDefined();
    expect(bundle.units.some((u) => u.string_id.startsWith("site#"))).toBe(false);
    expect(verifyAudit(bundle, corpus)).toEqual([]);
    const approved = bundle.audit!.records.filter((r) => r.verdict === "APPROVED");
    expect(approved.map((r) => r.string_id)).toEqual(["labor/LAB-Q-0005#public_question"]);
  });
  it("public_question es la aprobada y no hay literales numéricos", () => {
    expect(bundle.question.public_question).toBe(
      "¿Cómo evolucionó el ingreso laboral, nominal y real (descontada la inflación), dentro de tramos de tiempo comparables, sin cruzar los quiebres registrados en las series?",
    );
    for (const u of bundle.units) {
      const errors = lintText(u.string_id, u.text).filter((i) => i.severity === "error");
      expect(errors, u.string_id).toEqual([]);
    }
  });
});

describe("vista de Q-0005", () => {
  it("carga el claim observado, el Rastro sin corte y la divulgación", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0005");
    expect(v.hasEditorial).toBe(true);
    expect(v.claim?.id).toBe("LAB-CLM-0006");
    expect(v.state.question).toBe("OBSERVED_IN_SOURCE");
    expect(v.state.claim).toBe("OBSERVED_IN_SOURCE");
    expect(v.state.questionLabel).toBe("Observado en la fuente");
    expect(v.state.claimLabel).toBe("Observado en la fuente");
    expect(v.trail).not.toBeNull();
    expect(v.trail!.reasons).toEqual([]);
    expect(v.trail!.objects.map((o) => o.id)).toEqual(["LAB-OBJ-0009", "LAB-OBJ-0025"]);
    expect(v.trail!.ids.roots).toEqual(["LAB-ROOT-0005", "LAB-ROOT-0006"]);
    expect(v.provenance.disclosureRequired).toBe(true);
    expect(plainText(v.provenance.disclosure ?? [])).toMatch(/indirecta/);
    expect(plainText(v.title)).not.toMatch(/[0-9]/);
    expect(plainText(v.intro)).not.toMatch(/[0-9]/);
    expect(plainText(v.scope)).not.toMatch(/[0-9]/);
  });
});

describe("capa editorial de Q-0003", () => {
  const bundle = loadEditorial(ROOT, "LAB-Q-0003");
  it("conserva ambos claims sin fusionarlos y la auditoría está vigente", () => {
    expect(bundle.finding.claim_ref).toBeUndefined();
    expect(bundle.finding.trails).toHaveLength(2);
    expect(bundle.finding.trails?.map((t) => t.claim_ref)).toEqual([
      "labor/LAB-CLM-0002",
      "labor/LAB-CLM-0004",
    ]);
    expect(bundle.finding.blockers_at_cut).toEqual([]);
    expect(bundle.finding.disclosure).toBeDefined();
    expect(bundle.units.some((u) => u.string_id.startsWith("site#"))).toBe(false);
    expect(verifyAudit(bundle, corpus)).toEqual([]);
    const approved = bundle.audit!.records.filter((r) => r.verdict === "APPROVED");
    expect(approved.map((r) => r.string_id)).toEqual(["labor/LAB-Q-0003#public_question"]);
  });
  it("public_question es la aprobada y no hay literales numéricos", () => {
    expect(bundle.question.public_question).toBe(
      "¿Cómo evolucionaron las horas, los puestos y la masa salarial dentro del universo de cuentas nacionales en que se observa cada uno?",
    );
    for (const u of bundle.units) {
      const errors = lintText(u.string_id, u.text).filter((i) => i.severity === "error");
      expect(errors, u.string_id).toEqual([]);
    }
  });
});

describe("vista de Q-0003", () => {
  it("carga el claim nominal y el claim real, cada uno con su Rastro, sin fusionarlos", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0003");
    expect(v.hasEditorial).toBe(true);
    expect(v.claim).toBeNull();
    expect(v.state.claim).toBeNull();
    expect(v.state.question).toBe("OBSERVED_IN_SOURCE");
    expect(v.claims.map((c) => c.id)).toEqual(["LAB-CLM-0002", "LAB-CLM-0004"]);
    expect(v.trails.map((t) => t.claimId)).toEqual(["LAB-CLM-0002", "LAB-CLM-0004"]);
    expect(v.trails.map((t) => t.sourceLabel)).toEqual(["CGI", "CGI+IPC"]);
    expect(v.trails[0]!.objects.map((o) => o.id)).toEqual([
      "LAB-OBJ-0002",
      "LAB-OBJ-0011",
      "LAB-OBJ-0012",
    ]);
    expect(v.trails[1]!.objects.map((o) => o.id)).toEqual([
      "LAB-OBJ-0002",
      "LAB-OBJ-0011",
      "LAB-OBJ-0012",
      "LAB-OBJ-0025",
    ]);
    expect(v.trails[0]!.ids.roots).toEqual(["LAB-ROOT-0002"]);
    expect(v.trails[1]!.ids.roots).toEqual(["LAB-ROOT-0002", "LAB-ROOT-0006"]);
    expect(v.trails.every((t) => t.reasons.length === 0)).toBe(true);
    expect(v.provenance.disclosureRequired).toBe(true);
    expect(plainText(v.provenance.disclosure ?? [])).toMatch(/indirecta/);
    expect(plainText(v.title)).not.toMatch(/[0-9]/);
    expect(plainText(v.intro)).not.toMatch(/[0-9]/);
    expect(plainText(v.scope)).not.toMatch(/[0-9]/);
    expect(plainText(v.provenance.cite)).toMatch(/LAB-CLM-0002/);
    expect(plainText(v.provenance.cite)).toMatch(/LAB-CLM-0004/);
  });
});

describe("capa editorial de Q-0004", () => {
  const bundle = loadEditorial(ROOT, "LAB-Q-0004");
  it("conserva el claim y la auditoría está vigente", () => {
    expect(bundle.finding.claim_ref).toBe("labor/LAB-CLM-0005");
    expect(bundle.finding.trail).toBeDefined();
    expect(bundle.finding.blockers_at_cut).toEqual([]);
    expect(bundle.finding.disclosure).toBeDefined();
    expect(bundle.units.some((u) => u.string_id.startsWith("site#"))).toBe(false);
    expect(verifyAudit(bundle, corpus)).toEqual([]);
    const approved = bundle.audit!.records.filter((r) => r.verdict === "APPROVED");
    expect(approved.map((r) => r.string_id)).toEqual(["labor/LAB-Q-0004#public_question"]);
  });
  it("public_question es la aprobada y no hay literales numéricos", () => {
    expect(bundle.question.public_question).toBe(
      "¿Cómo cambia la composición del trabajo observable en conjunto cuando a las fuentes de registro se les suma la encuesta de hogares (EPH)?",
    );
    for (const u of bundle.units) {
      const errors = lintText(u.string_id, u.text).filter((i) => i.severity === "error");
      expect(errors, u.string_id).toEqual([]);
    }
  });
});

describe("vista de Q-0004", () => {
  it("carga el claim refutado en su alcance, separado de la resolución de la pregunta", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0004");
    expect(v.hasEditorial).toBe(true);
    expect(v.claim?.id).toBe("LAB-CLM-0005");
    expect(v.state.question).toBe("REFUTED_WITHIN_SCOPE");
    expect(v.state.claim).toBe("REFUTED_WITHIN_SCOPE");
    expect(v.state.questionLabel).toBe("Refutada dentro de su alcance");
    expect(v.state.claimLabel).toBe("Refutado dentro de su alcance");
    expect(v.claim?.hypothesisId).toBe("LAB-HYP-0003");
    expect(v.trail).not.toBeNull();
    expect(v.trail!.reasons).toEqual([]);
    expect(v.trail!.objects.map((o) => o.id)).toEqual(["LAB-OBJ-0006", "LAB-OBJ-0007"]);
    expect(v.trail!.ids.roots).toEqual(["LAB-ROOT-0005"]);
    expect(v.provenance.disclosureRequired).toBe(true);
    expect(plainText(v.provenance.disclosure ?? [])).toMatch(/indirecta/);
    expect(plainText(v.title)).not.toMatch(/[0-9]/);
    expect(plainText(v.intro)).not.toMatch(/[0-9]/);
    expect(plainText(v.scope)).not.toMatch(/[0-9]/);
    expect(plainText(v.intro)).toMatch(/No es un hallazgo sobre la informalidad en general/);
    expect(plainText(v.provenance.cite)).toMatch(/LAB-CLM-0005/);
  });
});

describe("mapa de las 18 preguntas LABOR", () => {
  const map = loadQuestionMap(ROOT);
  const ZERO = ["LAB-Q-0006", "LAB-Q-0007", "LAB-Q-0011", "LAB-Q-0015", "LAB-Q-0017"];
  it("incluye las 18 preguntas del slice", () => {
    expect(map.questions).toHaveLength(18);
    expect(map.questions.map((q) => q.id)).toEqual(availableQuestionIds(ROOT));
  });
  it("cada pregunta enlaza a su ficha", () => {
    for (const q of map.questions) {
      expect(q.href).toBe(`/labor/preguntas/${questionSlug(q.id)}`);
    }
  });
  it("las 5 preguntas sin claim no inventan afirmación", () => {
    for (const id of ZERO) {
      expect(map.questions.find((q) => q.id === id)?.claims, id).toEqual([]);
    }
  });
  it("Q-0003 refleja 2 claims", () => {
    expect(map.questions.find((q) => q.id === "LAB-Q-0003")?.claims.map((c) => c.id)).toEqual([
      "LAB-CLM-0002",
      "LAB-CLM-0004",
    ]);
  });
});
