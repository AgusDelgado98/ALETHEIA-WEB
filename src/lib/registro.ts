import { loadGlosses } from "../../tools/editorial/load.ts";
import { CGI_LICENSE, CGI_ROOT_ID } from "../../tools/reviews/constants.ts";
import { loadQuestionMap } from "./map.ts";

/**
 * Datos del Registro (índice de las 18 preguntas). El estado sale de generated/; el título corto de navegación es el
 * texto editorial `nav_titles` de editorial/site/glosses.yml (auditado como el resto; PENDING_AUTHOR_REVIEW).
 */

/** Las 18 preguntas usan la experiencia guiada; el Registro anterior ya no se monta en sus rutas. */
export const SINGLE_QUESTION_IDS: readonly string[] = Array.from(
  { length: 18 },
  (_, i) => `LAB-Q-${String(i + 1).padStart(4, "0")}`,
);

/** id del checkbox que abre/cierra el selector de preguntas (overlay 0 JS): compartido por disparador y overlay. */
export const PICKER_TOGGLE_ID = "picker-toggle";

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
  const navTitles = loadGlosses(root).nav_titles;
  const rows: RegistroRow[] = map.questions.map((q) => {
    const meta = STATES.find((s) => s.state === q.resolution);
    const nav = navTitles[q.id];
    if (nav === undefined) throw new Error(`Falta el título corto de navegación de ${q.id}`);
    return {
      id: q.id,
      shortId: q.id.replace(/^LAB-Q-/, ""),
      href: q.href,
      title: nav.text,
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
