import type { ClaimT, EvidenceT, FigureT, ProvenanceT } from "../../schemas/corpus.ts";
import type { FigureSpecT, FigureWitnessSpecT, VerifiedFigureSpecT } from "./contract.ts";

/**
 * Figures (Data Contract §9, ADR-WEB3-01). Este módulo NO calcula: solo comprueba que una cantidad ya registrada
 * figura, con el mismo valor, la misma unidad, el mismo objeto, el mismo período y el mismo signo, en dos testigos
 * vigentes del corpus (el texto del claim y el RESULT de una evidencia vigente del mismo claim), y la materializa.
 * Cualquier discrepancia es un error de build: no hay degradación silenciosa.
 */

type Rec = Record<string, unknown>;
export interface RawRecord {
  r: Rec;
  i: number;
}
export type Sign = "+" | "-" | "none";

export interface WitnessReading {
  value: string;
  sign: Sign;
  start: string | null;
  end: string | null;
  anchor: string;
}

/** Verbos que fijan un signo cuando el testigo no lo escribe (ADR-WEB3-01 D1.5). */
const VERB_SIGN: Record<string, "+" | "-"> = { grew: "+", rose: "+", fell: "-" };

const UNIT_TOKEN: Record<VerifiedFigureSpecT["unit"], RegExp | null> = {
  pct: /%/,
  pp: /pp|percentage[ -]points?/,
  count: null,
};

function matchOnce(pattern: string, text: string, what: string): RegExpMatchArray {
  const all = [...text.matchAll(new RegExp(pattern, "gs"))];
  if (all.length !== 1)
    throw new Error(`${what}: el patrón coincide ${all.length} veces (se esperaba exactamente 1)`);
  return all[0]!;
}

/** Lee un testigo: valor, signo (explícito o por verbo) y, si lo atestigua, el período. */
export function readWitness(
  w: FigureWitnessSpecT,
  fields: Record<string, string>,
  unit: VerifiedFigureSpecT["unit"],
  what: string,
): WitnessReading {
  const text = fields[w.field];
  if (text === undefined) throw new Error(`${what}: el registro no tiene el campo ${w.field}`);
  const m = matchOnce(w.pattern, text, `${what} [${w.field}]`);
  const g = m.groups ?? {};
  const value = g["value"];
  if (value === undefined) throw new Error(`${what}: el patrón no captura el grupo «value»`);
  const unitToken = UNIT_TOKEN[unit];
  if (unitToken !== null && !unitToken.test(m[0]))
    throw new Error(`${what}: el fragmento no contiene la unidad declarada (${unit}): «${m[0]}»`);
  let sign: Sign = "none";
  if (g["sign"] !== undefined && g["verb"] !== undefined)
    throw new Error(`${what}: el patrón captura «sign» y «verb» a la vez`);
  if (g["sign"] !== undefined) sign = g["sign"] === "+" ? "+" : "-";
  if (g["verb"] !== undefined) {
    const v = VERB_SIGN[g["verb"]];
    if (v === undefined) throw new Error(`${what}: verbo sin signo registrado: ${g["verb"]}`);
    sign = v;
  }
  let start: string | null = null;
  let end: string | null = null;
  if (w.period_pattern !== undefined) {
    const periodText = fields[w.period_field ?? w.field];
    if (periodText === undefined)
      throw new Error(`${what}: el registro no tiene el campo ${w.period_field ?? w.field}`);
    const pm = matchOnce(w.period_pattern, periodText, `${what} [período]`);
    start = pm.groups?.["start"] ?? null;
    end = pm.groups?.["end"] ?? null;
    if (start === null) throw new Error(`${what}: period_pattern no captura «start»`);
  } else if (g["start"] !== undefined) {
    start = g["start"];
    end = g["end"] ?? null;
  }
  return { value, sign, start, end, anchor: m[0] };
}

export interface VerifyContext {
  claim: ClaimT;
  evidence: EvidenceT;
  claimFields: Record<string, string>;
  evidenceFields: Record<string, string>;
  /** IDs de evidencia reemplazados por el corpus (`claim_supersessions`): NO son testigos. */
  replaced: ReadonlySet<string>;
}

const decimalsOf = (value: string): number => (value.split(".")[1] ?? "").length;

/**
 * Verifica una entrada `ELIGIBLE` o `PENDING_REVIEW` contra el corpus (ADR-WEB3-01 D1). Devuelve las dos lecturas.
 * Una `ELIGIBLE` exige además período atestiguado en AMBOS testigos, coincidencia exacta y emparejamiento explícito.
 */
export function verifyFigureSpec(
  spec: VerifiedFigureSpecT,
  ctx: VerifyContext,
): { a: WitnessReading; b: WitnessReading } {
  const id = `fig.${spec.claim_id}.${spec.key}`;
  const { claim, evidence } = ctx;
  if (claim.id !== spec.claim_id) throw new Error(`${id}: el contexto es de ${claim.id}`);
  if (claim.question_id !== spec.question_id)
    throw new Error(`${id}: question_id ${spec.question_id} != ${claim.question_id} del claim`);
  if (spec.witness_a.source !== "claim" || spec.witness_a.id !== claim.id)
    throw new Error(`${id}: el testigo A debe ser el claim ${claim.id}`);
  if (spec.witness_a.field !== "CLAIM_TEXT")
    throw new Error(`${id}: el testigo A se lee de CLAIM_TEXT`);
  if (spec.witness_b.source !== "evidence" || spec.witness_b.id !== evidence.id)
    throw new Error(`${id}: el testigo B debe ser la evidencia ${evidence.id}`);
  if (spec.witness_b.field !== "RESULT") throw new Error(`${id}: el testigo B se lee de RESULT`);
  if (evidence.claim_id !== claim.id)
    throw new Error(`${id}: ${evidence.id} no es evidencia de ${claim.id}`);
  if (ctx.replaced.has(evidence.id))
    throw new Error(
      `${id}: ${evidence.id} fue reemplazada por el corpus y no es un testigo vigente`,
    );
  for (const o of spec.object_ids)
    if (!claim.object_ids.includes(o) && !evidence.object_ids.includes(o))
      throw new Error(`${id}: el objeto ${o} no pertenece ni al claim ni a la evidencia`);
  if (spec.display.decimals !== decimalsOf(spec.value_text))
    throw new Error(`${id}: display.decimals no reproduce los decimales del valor registrado`);

  const a = readWitness(spec.witness_a, ctx.claimFields, spec.unit, `${id} (testigo A)`);
  const b = readWitness(spec.witness_b, ctx.evidenceFields, spec.unit, `${id} (testigo B)`);
  if (a.value !== spec.value_text || b.value !== spec.value_text)
    throw new Error(
      `${id}: los testigos no coinciden con el valor registrado (${spec.value_text}): A=${a.value}, B=${b.value}`,
    );

  // signo: el fija quien lo escribe; el otro no puede contradecirlo (D1.5)
  const explicit = [a.sign, b.sign].filter((s) => s !== "none");
  if (spec.sign === "none") {
    if (explicit.length > 0)
      throw new Error(`${id}: se declara sin signo pero un testigo lo registra`);
  } else {
    if (explicit.length === 0)
      throw new Error(`${id}: se declara con signo ${spec.sign} pero ningún testigo lo registra`);
    if (explicit.some((s) => s !== spec.sign))
      throw new Error(`${id}: los testigos discrepan en el signo (declarado ${spec.sign})`);
  }

  // período (D1.4): coincidencia con lo declarado; `CONTAINED` solo admite un prefijo menos granular
  const periodOk = (r: WitnessReading): boolean => {
    if (r.start === null) return false;
    const exact = r.start === spec.period.start && (r.end ?? r.start) === spec.period.end;
    if (exact) return true;
    return (
      spec.period_compat === "CONTAINED" &&
      spec.period.start.startsWith(r.start) &&
      spec.period.end.startsWith(r.end ?? r.start)
    );
  };
  if (spec.status === "ELIGIBLE") {
    if (spec.pairing !== "EXPLICIT") throw new Error(`${id}: una ELIGIBLE exige pairing EXPLICIT`);
    if (spec.period_compat !== "EXACT")
      throw new Error(`${id}: una ELIGIBLE exige period_compat EXACT`);
    for (const [who, r] of [
      ["A", a],
      ["B", b],
    ] as const)
      if (r.start === null) throw new Error(`${id}: el testigo ${who} no atestigua el período`);
  }
  for (const [who, r] of [
    ["A", a],
    ["B", b],
  ] as const)
    if (r.start !== null && !periodOk(r))
      throw new Error(
        `${id}: el período del testigo ${who} (${r.start}${r.end === null ? "" : ` → ${r.end}`}) no coincide con el declarado`,
      );
  return { a, b };
}

export interface BuildFiguresArgs {
  specs: readonly FigureSpecT[];
  claims: readonly ClaimT[];
  evidence: readonly EvidenceT[];
  claimsRaw: readonly RawRecord[];
  evidenceRaw: readonly RawRecord[];
  replaced: ReadonlySet<string>;
  claimsPath: string;
  evidencePath: string;
  blobOf: (path: string) => string;
  prov: (path: string, sourceId: string, pointer: string) => ProvenanceT;
  gid: (id: string) => string;
}

const textFields = (r: Rec, names: string[]): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const n of names) if (typeof r[n] === "string") out[n] = r[n];
  return out;
};

/** Materializa las Figures `ELIGIBLE`. Verifica también las `PENDING_REVIEW` (no se emiten) y valida las `REJECTED`. */
export function buildFigures(a: BuildFiguresArgs): FigureT[] {
  const out: FigureT[] = [];
  const ids = new Set<string>();
  const eligibleValues = new Set<string>();
  for (const spec of a.specs) {
    const id = `fig.${spec.claim_id}.${spec.key}`;
    if (ids.has(id)) throw new Error(`${id}: entrada duplicada en figure_specs`);
    ids.add(id);
    const claim = a.claims.find((c) => c.id === spec.claim_id);
    if (claim === undefined)
      throw new Error(`${id}: el claim ${spec.claim_id} no está en el corte`);
    if (claim.question_id !== spec.question_id)
      throw new Error(`${id}: question_id ${spec.question_id} != ${claim.question_id} del claim`);
    if (spec.status === "REJECTED") continue;

    const evidence = a.evidence.find((e) => e.id === spec.witness_b.id);
    if (evidence === undefined)
      throw new Error(`${id}: la evidencia ${spec.witness_b.id} no existe`);
    const claimRaw = a.claimsRaw.find((c) => c.r["CLAIM_ID"] === claim.id);
    const evidenceRaw = a.evidenceRaw.find((e) => e.r["EVIDENCE_ID"] === evidence.id);
    if (claimRaw === undefined || evidenceRaw === undefined)
      throw new Error(`${id}: falta el registro crudo de un testigo`);
    const { a: ra, b: rb } = verifyFigureSpec(spec, {
      claim,
      evidence,
      claimFields: textFields(claimRaw.r, ["CLAIM_TEXT"]),
      evidenceFields: textFields(evidenceRaw.r, ["RESULT", "METRIC"]),
      replaced: a.replaced,
    });
    if (spec.status !== "ELIGIBLE") continue;
    eligibleValues.add(`${spec.claim_id}|${spec.value_text}|${spec.unit}`);
    const signed = spec.sign === "none" ? spec.value_text : `${spec.sign}${spec.value_text}`;
    out.push({
      id,
      global_id: a.gid(id),
      id_origin: "DERIVED",
      provenance: a.prov(a.claimsPath, claim.id, `/${claimRaw.i}/CLAIM_TEXT`),
      key: spec.key,
      claim_id: spec.claim_id,
      question_id: spec.question_id,
      evidence_id: evidence.id,
      status: "ELIGIBLE",
      metric_key: spec.metric_key,
      object_ids: [...spec.object_ids].sort(),
      root_ids: [...evidence.root_ids].sort(),
      unit: spec.unit,
      sign: spec.sign,
      value_raw: signed,
      period: { ...spec.period },
      nominal_real: spec.nominal_real,
      stock_flow: spec.stock_flow,
      display: { decimals: spec.display.decimals, locale: "es-AR", sign: spec.display.sign },
      witnesses: [
        {
          role: "CLAIM",
          entity: a.gid(claim.id),
          source_path: a.claimsPath,
          blob_sha: a.blobOf(a.claimsPath),
          field: spec.witness_a.field,
          pointer: `/${claimRaw.i}/${spec.witness_a.field}`,
          pattern: spec.witness_a.pattern,
          text_anchor: ra.anchor,
        },
        {
          role: "EVIDENCE",
          entity: a.gid(evidence.id),
          source_path: a.evidencePath,
          blob_sha: a.blobOf(a.evidencePath),
          field: spec.witness_b.field,
          pointer: `/${evidenceRaw.i}/${spec.witness_b.field}`,
          pattern: spec.witness_b.pattern,
          text_anchor: rb.anchor,
        },
      ],
    });
  }
  // Una cifra no puede figurar a la vez como ELIGIBLE y REJECTED: no hay forma de «forzar» una rechazada.
  for (const spec of a.specs)
    if (
      spec.status === "REJECTED" &&
      eligibleValues.has(`${spec.claim_id}|${spec.value_text}|${spec.unit}`)
    )
      throw new Error(
        `fig.${spec.claim_id}.${spec.key}: figura REJECTED y también ELIGIBLE con el mismo valor`,
      );
  return out.sort((x, y) => x.id.localeCompare(y.id));
}

/**
 * Formato de presentación (es-AR): coma decimal, signo menos tipográfico, «+» solo si se registró y la política lo
 * pide, y la unidad separada por un espacio de no separación. Es una función pura de (`value_raw`, `unit`,
 * `display`): no cambia la cantidad de decimales ni redondea.
 */
export function formatFigureValue(f: Pick<FigureT, "value_raw" | "unit" | "display">): string {
  const neg = f.value_raw.startsWith("-");
  const pos = f.value_raw.startsWith("+");
  const [whole = "", dec = ""] = f.value_raw.replace(/^[+-]/, "").split(".");
  const intPart = f.unit === "count" ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : whole;
  const body = dec === "" ? intPart : `${intPart},${dec}`;
  const sign = neg ? "−" : pos && f.display.sign === "explicit" ? "+" : "";
  const unit = f.unit === "pct" ? " %" : f.unit === "pp" ? " pp" : "";
  return `${sign}${body}${unit}`;
}
