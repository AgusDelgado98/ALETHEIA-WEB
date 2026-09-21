import type { MapQuestion } from "./map.ts";

/**
 * Presentación de una pregunta en un índice (Home y /explorar). Todo se DERIVA de campos que ya existen en el
 * corpus (`regime`, `claim_kind`) o en editorial (`hasEditorial`): no se crea ninguna taxonomía ni «área».
 */
export type UiFn = (key: string) => string;

export const REGIMES = ["A", "B", "C"] as const;
export type Regime = (typeof REGIMES)[number];

export function regimeLabel(ui: UiFn, regime: string): string {
  return ui(`regime_${regime.toLowerCase()}_label`);
}
export function regimeGloss(ui: UiFn, regime: string): string {
  return ui(`regime_${regime.toLowerCase()}_gloss`);
}

/** «Medición» si algún claim es una medición estadística; en cualquier otro caso, resultado documental. */
export function readingKind(q: MapQuestion): "measurement" | "documentary" {
  return q.claims.some((c) => c.kind === "STATISTICAL_MEASUREMENT") ? "measurement" : "documentary";
}
export function readingLabel(ui: UiFn, q: MapQuestion): string {
  return ui(readingKind(q) === "measurement" ? "read_measurement" : "read_documentary");
}
/** «Lectura completa» = mayor desarrollo editorial. No es una jerarquía epistemológica. */
export function depthLabel(ui: UiFn, q: MapQuestion): string {
  return q.hasEditorial ? ui("depth_full") : ui("minimal_kicker");
}

/** Descripción textual de la forma de un estado (para `MapState`). */
export function stateShape(ui: UiFn, state: string): string {
  switch (state) {
    case "INSUFFICIENT_EVIDENCE":
      return ui("shape_insufficient");
    case "OBSERVED_IN_SOURCE":
      return ui("shape_observed");
    case "REFUTED_WITHIN_SCOPE":
      return ui("shape_refuted");
    case "NOT_IDENTIFIABLE":
      return ui("shape_not_identifiable");
    case "BLOCKED_BY_DESIGN":
      return ui("shape_blocked");
    case "OUTSIDE_LAB_A":
      return ui("shape_open");
    default:
      return ui("layer_question");
  }
}
