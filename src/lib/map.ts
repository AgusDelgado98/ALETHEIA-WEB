import { loadGenerated } from "../../tools/corpus/load.ts";
import { hasEditorialFinding, loadEditorial, loadSiteStrings } from "../../tools/editorial/load.ts";
import { questionSlug } from "./view.ts";

export interface MapClaim {
  id: string;
  state: string;
  label: string;
}

export interface MapQuestion {
  id: string;
  slug: string;
  href: string;
  text: string;
  resolution: string;
  resolutionLabel: string;
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
    const text = hasEditorialFinding(root, qid)
      ? loadEditorial(root, qid).question.public_question
      : q.canonical_text;
    const resolutionLabel =
      site.states.question_resolution_labels[q.resolution.value]?.text ?? q.resolution.value;
    const claims = q.claim_ids.map((id) => {
      const cl = req(
        c.claims.find((x) => x.id === id),
        `claim ${id}`,
      );
      return {
        id: cl.id,
        state: cl.epistemic_state,
        label: site.states.claim_state_labels[cl.epistemic_state]?.text ?? cl.epistemic_state,
      };
    });
    const slug = questionSlug(qid);
    return {
      id: qid,
      slug,
      href: `/labor/preguntas/${slug}`,
      text,
      resolution: q.resolution.value,
      resolutionLabel,
      claims,
    };
  });
  return { moduleId: c.manifest.module_id, questions, ui };
}
