import { loadContract } from "../../tools/corpus/contract.ts";
import { formatFigureValue } from "../../tools/corpus/figures.ts";
import { loadGenerated } from "../../tools/corpus/load.ts";
import { loadFigureCopy } from "../../tools/editorial/load.ts";
import { markAllNumerals, type Part } from "./render.ts";

/**
 * Autoridad de UI para las cifras de investigación (ADR-WEB3-01 D6). La interfaz SOLO puede mostrar una cifra que
 * sea una Figure `ELIGIBLE` materializada por el generador (`generated/labor/figures.json`) y autorizada por una
 * entrada `ELIGIBLE` de `figure_specs`. Este módulo nunca lee números de `canonical_text` ni de `result_text`:
 * el texto de una cifra es `formatFigureValue(value_raw, unit, display)`.
 */

export interface FigureWitnessView {
  role: "CLAIM" | "EVIDENCE";
  entityId: string;
  field: string;
  /** Fragmento canónico (inglés) donde figura el valor; sus numerales son `canon`, no Figures. */
  anchor: Part[];
}

export interface FigureView {
  id: string;
  claimId: string;
  questionId: string;
  evidenceId: string;
  rootIds: string[];
  objects: { id: string; name: string }[];
  unit: "pct" | "pp" | "count";
  nominalReal: "NOMINAL" | "REAL" | "NA";
  period: { start: string; end: string; granularity: string };
  /** Texto exacto que se renderiza dentro de `data-figure`. */
  text: string;
  label: string;
  witnesses: FigureWitnessView[];
}

interface Loaded {
  views: FigureView[];
  whyShown: string;
  vsConclusion: string;
}
const cache = new Map<string, Loaded>();

function load(root: string): Loaded {
  const hit = cache.get(root);
  if (hit !== undefined) return hit;
  const c = loadGenerated(root);
  const { contract } = loadContract(root, "labor");
  const copy = loadFigureCopy(root);
  const order = contract.figure_specs.map((s) => `fig.${s.claim_id}.${s.key}`);
  const authorized = new Set(
    contract.figure_specs
      .filter((s) => s.status === "ELIGIBLE")
      .map((s) => `fig.${s.claim_id}.${s.key}`),
  );
  const views = c.figures
    .map((f): FigureView => {
      if (f.status !== "ELIGIBLE" || !authorized.has(f.id))
        throw new Error(`${f.id}: no es una Figure ELIGIBLE autorizada por figure_specs`);
      const label = copy.labels[f.id];
      if (label === undefined)
        throw new Error(`Falta el rótulo público de ${f.id} (editorial/site/figures.yml)`);
      return {
        id: f.id,
        claimId: f.claim_id,
        questionId: f.question_id,
        evidenceId: f.evidence_id,
        rootIds: f.root_ids,
        objects: f.object_ids.map((oid) => {
          const o = c["statistical-objects"].find((x) => x.id === oid);
          if (o === undefined) throw new Error(`${f.id}: falta el objeto ${oid}`);
          return { id: oid, name: o.name };
        }),
        unit: f.unit,
        nominalReal: f.nominal_real,
        period: f.period,
        text: formatFigureValue(f),
        label: label.text,
        witnesses: f.witnesses.map((w) => ({
          role: w.role,
          entityId: w.entity.replace(/^labor\//, ""),
          field: w.field,
          anchor: markAllNumerals(w.text_anchor),
        })),
      };
    })
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const out = {
    views,
    whyShown: copy.fixed.why_shown.text,
    vsConclusion: copy.fixed.measure_vs_conclusion.text,
  };
  cache.set(root, out);
  return out;
}

/** Figures ELIGIBLE de una pregunta, en el orden de `figure_specs`. */
export function figureViewsForQuestion(root: string, questionId: string): FigureView[] {
  return load(root).views.filter((f) => f.questionId === questionId);
}

/** Una Figure por ID. Falla si no existe o no está autorizada: no hay valor «por defecto». */
export function figureView(root: string, id: string): FigureView {
  const f = load(root).views.find((x) => x.id === id);
  if (f === undefined) throw new Error(`${id}: no es una Figure ELIGIBLE del artefacto generado`);
  return f;
}

export function figureCopy(root: string): { whyShown: string; vsConclusion: string } {
  const { whyShown, vsConclusion } = load(root);
  return { whyShown, vsConclusion };
}
