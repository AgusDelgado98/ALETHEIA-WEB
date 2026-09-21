import { describe, expect, it } from "vitest";
import { Figure } from "../schemas/corpus.ts";
import { loadContract, FigureSpec, type VerifiedFigureSpecT } from "../tools/corpus/contract.ts";
import {
  buildFigures,
  formatFigureValue,
  verifyFigureSpec,
  type VerifyContext,
} from "../tools/corpus/figures.ts";
import { loadGenerated } from "../tools/corpus/load.ts";
import { ROOT } from "./helpers.ts";

const generated = loadGenerated(ROOT);
const { contract } = loadContract(ROOT, "labor");
const replaced = new Set(contract.claim_supersessions.map((s) => s.replaced_evidence_id));

const specs = contract.figure_specs;
const verifiedSpecs = specs.filter((s): s is VerifiedFigureSpecT => s.status !== "REJECTED");
const spec = (claim: string, key: string): VerifiedFigureSpecT => {
  const s = verifiedSpecs.find((x) => x.claim_id === claim && x.key === key);
  if (s === undefined) throw new Error(`no hay spec ${claim}.${key}`);
  return s;
};

/** Contexto de verificación armado con el corpus generado (mismo texto que el registro crudo). */
function ctxFor(claimId: string, evidenceId: string): VerifyContext {
  const claim = generated.claims.find((c) => c.id === claimId)!;
  const evidence = generated.evidence.find((e) => e.id === evidenceId)!;
  return {
    claim,
    evidence,
    claimFields: { CLAIM_TEXT: claim.canonical_text },
    evidenceFields: { RESULT: evidence.result_text, METRIC: evidence.metric },
    replaced,
  };
}
const verify = (s: VerifiedFigureSpecT) => verifyFigureSpec(s, ctxFor(s.claim_id, s.witness_b.id));

const ELIGIBLE_IDS = [
  "fig.LAB-CLM-0005.share_2025_q1",
  "fig.LAB-CLM-0005.share_2026_q1",
  "fig.LAB-CLM-0005.shift",
  "fig.LAB-CLM-0006.gap",
  "fig.LAB-CLM-0006.nominal_growth",
  "fig.LAB-CLM-0006.real_growth",
];

describe("Figures: el conjunto habilitado es exactamente la primera ola (ADR-WEB3-01)", () => {
  it("solo Q-0005 (CLM-0006) y Q-0004 (CLM-0005): 6 Figures ELIGIBLE", () => {
    expect(generated.figures.map((f) => f.id).sort()).toEqual(ELIGIBLE_IDS);
    expect(specs.filter((s) => s.status === "ELIGIBLE")).toHaveLength(6);
    expect(new Set(generated.figures.map((f) => f.claim_id))).toEqual(
      new Set(["LAB-CLM-0005", "LAB-CLM-0006"]),
    );
  });
  it("cada claim declara exactamente las Figures que tiene", () => {
    for (const c of generated.claims)
      expect([...c.figure_ids].sort()).toEqual(
        generated.figures
          .filter((f) => f.claim_id === c.id)
          .map((f) => f.id)
          .sort(),
      );
  });
  it("las PENDING_REVIEW se verifican pero no se materializan", () => {
    const pending = specs.filter((s) => s.status === "PENDING_REVIEW");
    expect(pending).toHaveLength(6);
    for (const p of pending) {
      const id = `fig.${p.claim_id}.${p.key}`;
      expect(generated.figures.some((f) => f.id === id)).toBe(false);
      expect(generated.claims.find((c) => c.id === p.claim_id)!.figure_ids).not.toContain(id);
      expect(() => verify(p as VerifiedFigureSpecT)).not.toThrow();
    }
  });
  it("las REJECTED nunca se materializan y no pueden convivir con una ELIGIBLE del mismo valor", () => {
    const rejected = specs.filter((s) => s.status === "REJECTED");
    expect(rejected.length).toBeGreaterThan(0);
    for (const r of rejected)
      expect(
        generated.figures.some(
          (f) => f.claim_id === r.claim_id && f.value_raw.replace(/^[+-]/, "") === r.value_text,
        ),
      ).toBe(false);
  });
  it("los ELIGIBLE tienen período atestiguado, emparejamiento explícito y coincidencia exacta", () => {
    for (const s of specs.filter((x): x is VerifiedFigureSpecT => x.status === "ELIGIBLE")) {
      expect(s.pairing).toBe("EXPLICIT");
      expect(s.period_compat).toBe("EXACT");
      const { a, b } = verify(s);
      expect(a.start).not.toBeNull();
      expect(b.start).not.toBeNull();
    }
  });
  it("todo Figure validado cumple el esquema estricto (y rechaza campos desconocidos)", () => {
    for (const f of generated.figures) {
      expect(Figure.safeParse(f).success).toBe(true);
      expect(Figure.safeParse({ ...f, invento: true }).success).toBe(false);
      expect(Figure.safeParse({ ...f, status: "PENDING_REVIEW" }).success).toBe(false);
      expect(f.witnesses.map((w) => w.role)).toEqual(["CLAIM", "EVIDENCE"]);
    }
  });
});

describe("Figures: formato es-AR sin cálculo", () => {
  const shown = Object.fromEntries(generated.figures.map((f) => [f.id, formatFigureValue(f)]));
  it("reproduce lo registrado, sin redondear ni cambiar decimales", () => {
    expect(shown["fig.LAB-CLM-0006.nominal_growth"]).toBe("+35,48 %");
    expect(shown["fig.LAB-CLM-0006.real_growth"]).toBe("+2,10 %");
    expect(shown["fig.LAB-CLM-0006.gap"]).toBe("33,38 pp");
    expect(shown["fig.LAB-CLM-0005.share_2025_q1"]).toBe("36,29 %");
    expect(shown["fig.LAB-CLM-0005.share_2026_q1"]).toBe("37,90 %");
    expect(shown["fig.LAB-CLM-0005.shift"]).toBe("+1,61 pp");
  });
  it("es función pura: signo menos tipográfico y decimales intactos", () => {
    const base = {
      unit: "pct",
      display: { decimals: 2, locale: "es-AR", sign: "explicit" },
    } as const;
    expect(formatFigureValue({ ...base, value_raw: "-7.97" })).toBe("−7,97 %");
    expect(formatFigureValue({ ...base, value_raw: "2.10" })).toBe("2,10 %");
    expect(
      formatFigureValue({
        ...base,
        value_raw: "+2.10",
        display: { ...base.display, sign: "none" },
      }),
    ).toBe("2,10 %");
  });
});

describe("Figures: un matcher por valor es epistemológicamente incorrecto", () => {
  it("una evidencia REEMPLAZADA (LAB-EVD-0015) no es testigo aunque comparta valores con el claim", () => {
    const claim = generated.claims.find((c) => c.id === "LAB-CLM-0007")!;
    const old = generated.evidence.find((e) => e.id === "LAB-EVD-0015")!;
    const vigente = generated.evidence.find((e) => e.id === "LAB-EVD-0017")!;
    expect(replaced.has("LAB-EVD-0015")).toBe(true);
    // el numeral coincide en el claim, en la evidencia reemplazada y en la vigente…
    expect(claim.canonical_text).toContain("1,678,677");
    expect(old.result_text).toContain("1,678,677");
    // …pero solo la evidencia vigente registra el par «N de M» que atribuye el claim
    expect(vigente.result_text).toContain("1,678,677 of 11,498,694");
    expect(old.result_text).not.toContain("1,678,677 of 11,498,694");
    expect(old.result_text).toContain("1,678,677 of 2,202,532");
    const fake: VerifiedFigureSpecT = {
      ...spec("LAB-CLM-0006", "nominal_growth"),
      claim_id: "LAB-CLM-0007",
      question_id: "LAB-Q-0008",
      witness_a: { ...spec("LAB-CLM-0006", "nominal_growth").witness_a, id: "LAB-CLM-0007" },
      witness_b: { ...spec("LAB-CLM-0006", "nominal_growth").witness_b, id: "LAB-EVD-0015" },
    };
    expect(() => verifyFigureSpec(fake, ctxFor("LAB-CLM-0007", "LAB-EVD-0015"))).toThrow(
      /reemplazada/,
    );
  });
  it("−14,75 % de CLM-0004 no puede autorizarse por texto: la evidencia no lo ubica en 2024-Q1", () => {
    const claim = generated.claims.find((c) => c.id === "LAB-CLM-0004")!;
    const evd = generated.evidence.find((e) => e.id === "LAB-EVD-0007")!;
    expect(claim.canonical_text).toContain("-14.75% in 2024-Q1");
    expect(evd.result_text).toContain("approximately -14.75% to +14.86%");
    const forced: VerifiedFigureSpecT = {
      key: "real_wage_bill_2024_q1_forced",
      claim_id: "LAB-CLM-0004",
      question_id: "LAB-Q-0003",
      status: "ELIGIBLE",
      value_text: "14.75",
      unit: "pct",
      sign: "-",
      metric_key: "real_wage_bill_growth",
      object_ids: ["LAB-OBJ-0002"],
      period: { start: "2024-Q1", end: "2024-Q1", granularity: "quarter" },
      period_compat: "EXACT",
      pairing: "EXPLICIT",
      nominal_real: "REAL",
      stock_flow: "NA",
      display: { decimals: 2, sign: "explicit" },
      witness_a: {
        source: "claim",
        id: "LAB-CLM-0004",
        field: "CLAIM_TEXT",
        pattern: String.raw`e\.g\. (?<sign>-)(?<value>14\.75)% in (?<start>2024-Q1)`,
      },
      witness_b: {
        source: "evidence",
        id: "LAB-EVD-0007",
        field: "RESULT",
        pattern: String.raw`approximately (?<sign>-)(?<value>14\.75)% to \+14\.86%`,
      },
    };
    // el testigo B no atestigua el período 2024-Q1 → una ELIGIBLE es imposible
    expect(() => verifyFigureSpec(forced, ctxFor("LAB-CLM-0004", "LAB-EVD-0007"))).toThrow(
      /período/,
    );
    // aun declarando el período «desde» el testigo B, no puede inventarlo: el texto no lo dice
    expect(() =>
      verifyFigureSpec(
        {
          ...forced,
          witness_b: { ...forced.witness_b, period_pattern: String.raw`(?<start>2024-Q1)` },
        },
        ctxFor("LAB-CLM-0004", "LAB-EVD-0007"),
      ),
    ).toThrow();
    // y no hay ninguna ELIGIBLE ni PENDING con ese valor en el contrato
    expect(
      verifiedSpecs.some((s) => s.claim_id === "LAB-CLM-0004" && s.value_text === "14.75"),
    ).toBe(false);
  });
});

describe("Figures: la verificación falla cuando el contrato no se cumple", () => {
  const nominal = spec("LAB-CLM-0006", "nominal_growth");
  const c6 = () => ctxFor("LAB-CLM-0006", "LAB-EVD-0010");
  it("un solo testigo: si el valor no figura en la evidencia, el build falla", () => {
    const s: VerifiedFigureSpecT = {
      ...nominal,
      witness_b: { ...nominal.witness_b, pattern: String.raw`(?<value>794,253)` },
    };
    expect(() => verifyFigureSpec(s, c6())).toThrow(/valor registrado|unidad/);
    const s2: VerifiedFigureSpecT = {
      ...nominal,
      witness_b: {
        ...nominal.witness_b,
        pattern: String.raw`nominal growth (?<sign>[+-])(?<value>99\.99)%`,
      },
    };
    expect(() => verifyFigureSpec(s2, c6())).toThrow(/0 veces/);
  });
  it("los testigos discrepan en el valor", () => {
    const s: VerifiedFigureSpecT = {
      ...nominal,
      witness_b: {
        ...nominal.witness_b,
        pattern: String.raw`real growth (?<sign>[+-])(?<value>2\.10)%`,
      },
    };
    expect(() => verifyFigureSpec(s, c6())).toThrow(/no coinciden con el valor/);
  });
  it("un patrón ambiguo (varias coincidencias) es un error, no una elección", () => {
    const s: VerifiedFigureSpecT = {
      ...nominal,
      witness_b: { ...nominal.witness_b, pattern: String.raw`(?<sign>[+-])(?<value>\d+\.\d+)%` },
    };
    expect(() => verifyFigureSpec(s, c6())).toThrow(/exactamente 1/);
  });
  it("el signo declarado no puede contradecir a los testigos ni inventarse", () => {
    expect(() => verifyFigureSpec({ ...nominal, sign: "-" }, c6())).toThrow(/signo/);
    expect(() => verifyFigureSpec({ ...nominal, sign: "none" }, c6())).toThrow(/signo/);
    const gap = spec("LAB-CLM-0006", "gap");
    expect(() => verifyFigureSpec({ ...gap, sign: "+" }, c6())).toThrow(/signo/);
  });
  it("la unidad declarada debe figurar en el fragmento", () => {
    expect(() => verifyFigureSpec({ ...nominal, unit: "pp" }, c6())).toThrow(/unidad/);
  });
  it("el período de un testigo debe coincidir con el declarado", () => {
    expect(() =>
      verifyFigureSpec({ ...nominal, period: { ...nominal.period, end: "2025-Q4" } }, c6()),
    ).toThrow(/período/);
  });
  it("una ELIGIBLE no admite emparejamiento posicional ni período contenido", () => {
    expect(() => verifyFigureSpec({ ...nominal, pairing: "POSITIONAL" }, c6())).toThrow(/EXPLICIT/);
    expect(() => verifyFigureSpec({ ...nominal, period_compat: "CONTAINED" }, c6())).toThrow(
      /EXACT/,
    );
  });
  it("una ELIGIBLE exige que ambos testigos atestigüen el período", () => {
    const { period_pattern: _omit, ...bNoPeriod } = nominal.witness_b;
    void _omit;
    expect(() =>
      verifyFigureSpec(
        { ...nominal, witness_b: { ...bNoPeriod, pattern: nominal.witness_b.pattern } },
        c6(),
      ),
    ).toThrow(/no atestigua el período/);
  });
  it("la evidencia debe ser del mismo claim", () => {
    const wrong = ctxFor("LAB-CLM-0006", "LAB-EVD-0009");
    expect(() =>
      verifyFigureSpec(
        { ...nominal, witness_b: { ...nominal.witness_b, id: "LAB-EVD-0009" } },
        wrong,
      ),
    ).toThrow(/no es evidencia de/);
  });
  it("display.decimals debe reproducir los decimales registrados (no se redondea)", () => {
    expect(() =>
      verifyFigureSpec({ ...nominal, display: { decimals: 1, sign: "explicit" } }, c6()),
    ).toThrow(/decimals/);
  });
  it("un testigo A que no es el claim, o B que no es la evidencia, se rechaza", () => {
    expect(() =>
      verifyFigureSpec(
        { ...nominal, witness_a: { ...nominal.witness_a, id: "LAB-CLM-0005" } },
        c6(),
      ),
    ).toThrow(/testigo A/);
    expect(() =>
      verifyFigureSpec({ ...nominal, witness_b: { ...nominal.witness_b, source: "claim" } }, c6()),
    ).toThrow(/testigo B/);
  });
});

describe("Figures: contrato (figure_specs)", () => {
  it("el esquema es estricto: una REJECTED no lleva testigos y un estado desconocido no existe", () => {
    const r = specs.find((s) => s.status === "REJECTED")!;
    expect(FigureSpec.safeParse(r).success).toBe(true);
    expect(FigureSpec.safeParse({ ...r, witness_a: nominalWitness() }).success).toBe(false);
    expect(FigureSpec.safeParse({ ...r, status: "FORCED" }).success).toBe(false);
  });
  it("no hay forma de forzar una REJECTED: ELIGIBLE y REJECTED con el mismo valor no compilan", () => {
    const eligible = spec("LAB-CLM-0006", "gap");
    const clash = specs.find((s) => s.status === "REJECTED")!;
    const bad = {
      ...clash,
      claim_id: "LAB-CLM-0006",
      question_id: "LAB-Q-0005",
      value_text: "33.38",
      unit: "pp",
    } as typeof clash;
    expect(() =>
      buildFigures({
        specs: [eligible, bad],
        claims: generated.claims,
        evidence: generated.evidence,
        claimsRaw: generated.claims.map((c, i) => ({
          r: { CLAIM_ID: c.id, CLAIM_TEXT: c.canonical_text },
          i,
        })),
        evidenceRaw: generated.evidence.map((e, i) => ({
          r: { EVIDENCE_ID: e.id, RESULT: e.result_text, METRIC: e.metric },
          i,
        })),
        replaced,
        claimsPath: "metadata/claims/claim-ledger.json",
        evidencePath: "metadata/evidence/evidence-registry.json",
        blobOf: () => "0".repeat(40),
        prov: () => generated.figures[0]!.provenance,
        gid: (id) => `labor/${id}`,
      }),
    ).toThrow(/REJECTED y también ELIGIBLE/);
  });
  it("una entrada duplicada en figure_specs es un error", () => {
    const eligible = spec("LAB-CLM-0006", "gap");
    expect(() =>
      buildFigures({
        specs: [eligible, eligible],
        claims: generated.claims,
        evidence: generated.evidence,
        claimsRaw: generated.claims.map((c, i) => ({
          r: { CLAIM_ID: c.id, CLAIM_TEXT: c.canonical_text },
          i,
        })),
        evidenceRaw: generated.evidence.map((e, i) => ({
          r: { EVIDENCE_ID: e.id, RESULT: e.result_text, METRIC: e.metric },
          i,
        })),
        replaced,
        claimsPath: "p",
        evidencePath: "q",
        blobOf: () => "0".repeat(40),
        prov: () => generated.figures[0]!.provenance,
        gid: (id) => `labor/${id}`,
      }),
    ).toThrow(/duplicada/);
  });
});

function nominalWitness() {
  return spec("LAB-CLM-0006", "nominal_growth").witness_a;
}
