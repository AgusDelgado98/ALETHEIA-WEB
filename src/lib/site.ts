import { loadGenerated } from "../../tools/corpus/load.ts";
import { loadSiteStrings } from "../../tools/editorial/load.ts";
import { documentaryLabel, loadQuestionMap, type MapQuestion, type QuestionMap } from "./map.ts";
import { markAllNumerals, type Part } from "./render.ts";

/** WEB-0 D-014 / MVP §2.2: las cinco fichas destacadas. El régimen C no entra. */
export const FEATURED_QUESTION_IDS = [
  "LAB-Q-0005",
  "LAB-Q-0003",
  "LAB-Q-0004",
  "LAB-Q-0013",
  "LAB-Q-0011",
] as const;

export const REGIME_C_QUESTION_IDS = [
  "LAB-Q-0014",
  "LAB-Q-0015",
  "LAB-Q-0016",
  "LAB-Q-0017",
  "LAB-Q-0018",
] as const;

export const NAV = [
  { href: "/hallazgos", key: "nav_findings" },
  { href: "/explorar", key: "nav_explore" },
  { href: "/limites", key: "nav_limits" },
  { href: "/metodo", key: "nav_method" },
  { href: "/sobre", key: "nav_about" },
] as const;

export type UiFn = (key: string) => string;

function req<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null)
    throw new Error(`Falta ${what}: no se renderiza una cadena inexistente`);
  return v;
}

export function loadUi(root: string): UiFn {
  const site = loadSiteStrings(root);
  return (key: string): string => req(site.ui.strings[key], `cadena de interfaz «${key}»`).text;
}

export function isDocumentaryObserved(kind: string, state: string): boolean {
  return state === "OBSERVED_IN_SOURCE" && kind !== "STATISTICAL_MEASUREMENT";
}

export interface CountItem {
  key: string;
  label: string;
  value: number;
}

export interface GovernanceItem {
  id: string;
  title: string;
  titleParts: Part[];
  inference: Part[];
  reason: Part[];
  claimIds: string[];
}

export interface PreservedItem {
  id: string;
  category: string;
  regime: string;
  questionId: string;
  href: string;
  mustNot: Part[];
}

export interface SiteView {
  ui: UiFn;
  map: QuestionMap;
  featured: MapQuestion[];
  remaining: MapQuestion[];
  counts: CountItem[];
  claimStates: { state: string; label: string; n: number }[];
  questionResolutions: { state: string; label: string; n: number }[];
  governance: GovernanceItem[];
  preserved: PreservedItem[];
  pin: { tag: string; commit: string; commitShort: string; repoId: string; version: string };
}

export function loadSite(root: string): SiteView {
  const c = loadGenerated(root);
  const map = loadQuestionMap(root);
  const ui = map.ui;
  const featuredSet = new Set<string>(FEATURED_QUESTION_IDS);
  const featured = FEATURED_QUESTION_IDS.map((id) =>
    req(
      map.questions.find((q) => q.id === id),
      `hallazgo ${id}`,
    ),
  );
  const remaining = map.questions.filter((q) => !featuredSet.has(q.id));
  const gr = c.relations.filter((r) => r.category === "GOVERNANCE_REQUIRED");
  const site = loadSiteStrings(root);
  const claimLabel = (state: string): string =>
    site.states.claim_state_labels[state]?.text ?? documentaryLabel(ui, state, state);
  const qLabel = (state: string): string =>
    site.states.question_resolution_labels[state]?.text ?? documentaryLabel(ui, state, state);
  const claimStates = [...new Set(c.claims.map((x) => x.epistemic_state))].map((state) => ({
    state,
    label: claimLabel(state),
    n: c.claims.filter((x) => x.epistemic_state === state).length,
  }));
  const questionResolutions = [...new Set(c.questions.map((x) => x.resolution.value))].map(
    (state) => ({
      state,
      label: qLabel(state),
      n: c.questions.filter((x) => x.resolution.value === state).length,
    }),
  );
  return {
    ui,
    map,
    featured,
    remaining,
    counts: [
      { key: "questions", label: ui("count_questions"), value: c.questions.length },
      { key: "claims", label: ui("count_claims"), value: c.claims.length },
      { key: "hypotheses", label: ui("count_hypotheses"), value: c.hypotheses.length },
      { key: "preserved", label: ui("count_preserved"), value: c["preserved-results"].length },
      { key: "governance", label: ui("count_governance"), value: gr.length },
    ],
    claimStates,
    questionResolutions,
    governance: gr.map((r) => ({
      id: r.id,
      title: r.title,
      titleParts: markAllNumerals(r.title),
      inference: markAllNumerals(r.prohibited_inference),
      reason: markAllNumerals(r.reason),
      claimIds: r.claim_ids,
    })),
    preserved: c["preserved-results"].map((k) => ({
      id: k.id,
      category: k.category,
      regime: k.regime,
      questionId: k.question_id,
      href: `/labor/preguntas/${k.question_id.replace(/^LAB-/, "").toLowerCase()}`,
      mustNot: markAllNumerals(k.must_not),
    })),
    pin: {
      tag: c.manifest.pin.tag,
      commit: c.manifest.pin.commit,
      commitShort: c.manifest.pin.commit.slice(0, 7),
      repoId: c.manifest.pin.repo_id,
      version: c.manifest.version,
    },
  };
}
