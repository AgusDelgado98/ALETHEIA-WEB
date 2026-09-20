import { loadGenerated } from "../../tools/corpus/load.ts";
import {
  hasEditorialFinding,
  loadQuestionCopy,
  loadSiteStrings,
} from "../../tools/editorial/load.ts";
import { questionSlug } from "./slug.ts";

export interface MapClaim {
  id: string;
  state: string;
  label: string;
  kind: string;
}

export interface MapQuestion {
  id: string;
  slug: string;
  href: string;
  text: string;
  regime: string;
  resolution: string;
  resolutionLabel: string;
  hasEditorial: boolean;
  claims: MapClaim[];
}

export interface QuestionMap {
  moduleId: string;
  questions: MapQuestion[];
  ui: (key: string) => string;
}

function req<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null)
    throw new Error(`Falta ${what}: no se renderiza una cadena inexistente`);
  return v;
}

export function documentaryLabel(
  ui: (key: string) => string,
  code: string,
  fallback: string,
): string {
  if (code === "BLOCKED_BY_DESIGN") return ui("doc_blocked");
  if (code === "OUTSIDE_LAB_A") return ui("doc_open");
  return fallback;
}

export function publicQuestionText(root: string, qid: string, fallback: string): string {
  return loadQuestionCopy(root, qid)?.public_question ?? fallback;
}

/** Índice de las 18 preguntas: hechos de generated/, palabras ya auditadas. Sin prosa nueva. */
export function loadQuestionMap(root: string): QuestionMap {
  const c = loadGenerated(root);
  const site = loadSiteStrings(root);
  const ui = (key: string): string => req(site.ui.strings[key], `cadena de interfaz «${key}»`).text;
  const questions = c.manifest.slice.question_ids.map((qid) => {
    const q = req(
      c.questions.find((x) => x.id === qid),
      `pregunta ${qid}`,
    );
    const text = publicQuestionText(root, qid, q.canonical_text);
    const resolutionLabel = documentaryLabel(
      ui,
      q.resolution.value,
      site.states.question_resolution_labels[q.resolution.value]?.text ?? q.resolution.value,
    );
    const claims = q.claim_ids.map((id) => {
      const cl = req(
        c.claims.find((x) => x.id === id),
        `claim ${id}`,
      );
      return {
        id: cl.id,
        state: cl.epistemic_state,
        label: site.states.claim_state_labels[cl.epistemic_state]?.text ?? cl.epistemic_state,
        kind: cl.claim_kind,
      };
    });
    const slug = questionSlug(qid);
    return {
      id: qid,
      slug,
      href: `/labor/preguntas/${slug}`,
      text,
      regime: q.regime,
      resolution: q.resolution.value,
      resolutionLabel,
      hasEditorial: hasEditorialFinding(root, qid),
      claims,
    };
  });
  return { moduleId: c.manifest.module_id, questions, ui };
}
