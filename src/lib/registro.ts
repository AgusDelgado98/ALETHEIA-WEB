import { CGI_LICENSE, CGI_ROOT_ID } from "../../tools/reviews/constants.ts";
import { loadQuestionMap } from "./map.ts";
import { plainText } from "./render.ts";
import { loadQuestionView } from "./view.ts";

/**
 * Datos del Registro (índice de las 18 preguntas). Todo se DERIVA de lo que el pipeline ya expone: estado de
 * generated/, título corto = el título ya auditado de la ficha (`finding.title` o glosa pública). No crea texto editorial.
 */

/** Preguntas ya migradas al shell Registro + Folio (páginas propias, fuera de [id].astro): solo el prototipo Q-0003. */
export const MIGRATED_QUESTION_IDS: readonly string[] = ["LAB-Q-0003"];

/** Los seis estados del Registro, en orden de leyenda. `code`/`name` son claves de cadenas de interfaz. */
export const STATES = [
  { state: "OBSERVED_IN_SOURCE", code: "stc_observed", name: "stn_observed" },
  { state: "REFUTED_WITHIN_SCOPE", code: "stc_refuted", name: "stn_refuted" },
  { state: "INSUFFICIENT_EVIDENCE", code: "stc_insufficient", name: "stn_insufficient" },
  { state: "NOT_IDENTIFIABLE", code: "stc_not_identifiable", name: "stn_not_identifiable" },
  { state: "BLOCKED_BY_DESIGN", code: "stc_blocked", name: "stn_blocked" },
  { state: "OUTSIDE_LAB_A", code: "stc_open", name: "stn_open" },
] as const;

export function shapeKey(state: string): string {
  return state === "INSUFFICIENT_EVIDENCE"
    ? "shape_insufficient"
    : state === "OBSERVED_IN_SOURCE"
      ? "shape_observed"
      : state === "REFUTED_WITHIN_SCOPE"
        ? "shape_refuted"
        : state === "NOT_IDENTIFIABLE"
          ? "shape_not_identifiable"
          : state === "BLOCKED_BY_DESIGN"
            ? "shape_blocked"
            : state === "OUTSIDE_LAB_A"
              ? "shape_open"
              : "layer_question";
}

export interface RegistroRow {
  id: string;
  shortId: string;
  href: string;
  title: string;
  state: string;
  stateLabel: string;
  code: string;
  regime: string;
  hasEditorial: boolean;
}

export interface Registro {
  ui: (key: string) => string;
  groups: { regime: string; rows: RegistroRow[] }[];
  count: number;
}

export function loadRegistro(root: string): Registro {
  const map = loadQuestionMap(root);
  const ui = map.ui;
  const rows: RegistroRow[] = map.questions.map((q) => {
    const meta = STATES.find((s) => s.state === q.resolution);
    return {
      id: q.id,
      shortId: q.id.replace(/^LAB-Q-/, ""),
      href: q.href,
      title: plainText(loadQuestionView(root, q.id).title),
      state: q.resolution,
      stateLabel: q.resolutionLabel,
      code: meta === undefined ? q.resolution : ui(meta.code),
      regime: q.regime,
      hasEditorial: q.hasEditorial,
    };
  });
  const regimes = [...new Set(rows.map((r) => r.regime))];
  return {
    ui,
    groups: regimes.map((regime) => ({ regime, rows: rows.filter((r) => r.regime === regime) })),
    count: rows.length,
  };
}

/** Licencia registrada de una raíz de evidencia. Solo CGI la registra (provenance V1, Data Contract §13.2). */
export function licenseOfRoot(rootId: string): string | null {
  return rootId === CGI_ROOT_ID ? CGI_LICENSE : null;
}
