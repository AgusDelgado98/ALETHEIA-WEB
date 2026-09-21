import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGenerated, type GeneratedCorpus } from "../../tools/corpus/load.ts";
import { sha256Hex } from "../../tools/corpus/util.ts";
import { parseSegments, type Segment } from "../../tools/editorial/directives.ts";
import {
  loadEditorial,
  loadGlosses,
  loadSiteStrings,
  hasEditorialFinding,
  type EditorialBundle,
} from "../../tools/editorial/load.ts";
import { pendingSignoff } from "../../tools/editorial/audit.ts";
import { limitationIdFromRef } from "../../tools/editorial/resolve.ts";
import { fromSegments, markTokens, type Part } from "./render.ts";
import { documentaryLabel, publicQuestionText } from "./map.ts";
import { questionSlug } from "./slug.ts";
export { questionSlug };

/**
 * Modelo de vista de una página de pregunta. Lee SOLO `generated/` (hechos y estados) y `editorial/` (palabras).
 * Ninguna cadena visible se escribe a mano en los componentes: si falta una, esto lanza (G-UX-01: nada de `undefined`).
 */
export interface TextItem {
  id: string;
  parts: Part[];
}

export interface TrailView {
  claimId: string;
  claimState: string;
  claimLabel: string;
  sourceLabel: string;
  claim: Part[];
  hypothesis: Part[];
  evidence: Part[];
  objects: { id: string; parts: Part[] }[];
  source: { rootId: string; publication: Part[]; linkUnresolved: boolean };
  reasons: TextItem[];
  ids: {
    claim: string;
    hypothesis: string;
    evidence: string[];
    roots: string[];
    objects: string[];
    ruling: string[];
    episodes: string[];
  };
  auditOnly: { ownerId: string; text: Part[]; waiver: string }[];
}

export interface QuestionView {
  slug: string;
  moduleId: string;
  id: string;
  publicQuestion: string;
  canonicalQuestion: string;
  canonicalTitle: string;
  sourceGloss: string | null;
  hasEditorial: boolean;
  ui: (key: string) => string;
  state: {
    question: string;
    claim: string | null;
    claimLabel: string | null;
    questionLabel: string;
    absenceNotNegative: boolean;
  };
  claim: { id: string; source: string; hypothesisId: string } | null;
  claims: { id: string; state: string; source: string; kind: string; label: string }[];
  title: Part[];
  intro: Part[];
  scope: Part[];
  canSay: TextItem[];
  doesNotMean: TextItem[];
  wouldNeed: TextItem[];
  absenceText: string;
  trail: TrailView | null;
  trails: TrailView[];
  provenance: {
    moduleVersion: string;
    tag: string;
    commit: string;
    commitShort: string;
    generatorVersion: string;
    manifestSha: string;
    editorialSha: string;
    preserved: string[];
    forbidden: string[];
    entityIds: string[];
    cite: Part[];
    disclosureRequired: boolean;
    disclosure: Part[] | null;
    pendingSignoff: number;
  };
}

export function availableQuestionIds(root: string): string[] {
  return loadGenerated(root).manifest.slice.question_ids;
}

function req<T>(v: T | undefined | null, what: string): T {
  if (v === undefined || v === null)
    throw new Error(`Falta ${what}: no se renderiza una cadena inexistente`);
  return v;
}

export function loadQuestionView(root: string, qid: string): QuestionView {
  const c: GeneratedCorpus = loadGenerated(root);
  const q = req(
    c.questions.find((x) => x.id === qid),
    `pregunta ${qid}`,
  );
  const editorialManifest = readFileSync(join(root, "editorial", "manifest.json"));
  const provenanceShell = {
    moduleVersion: c.manifest.version,
    tag: c.manifest.pin.tag,
    commit: c.manifest.pin.commit,
    commitShort: c.manifest.pin.commit.slice(0, 7),
    generatorVersion: c.manifest.generator_version,
    manifestSha: c.manifestSha256,
    editorialSha: sha256Hex(editorialManifest),
    preserved: q.preserved_result_ids,
  };
  const siteLabels = loadSiteStrings(root);
  const listedClaims = q.claim_ids.map((id) => {
    const cl = req(
      c.claims.find((x) => x.id === id),
      `claim ${id}`,
    );
    return {
      id: cl.id,
      state: cl.epistemic_state,
      source: cl.source_label,
      kind: cl.claim_kind,
      label: siteLabels.states.claim_state_labels[cl.epistemic_state]?.text ?? cl.epistemic_state,
    };
  });

  if (!hasEditorialFinding(root, qid))
    return loadCanonicalView(root, qid, c, q, listedClaims, provenanceShell);

  const e: EditorialBundle = loadEditorial(root, qid);
  const segs = (text: string): Segment[] => parseSegments(text, c);
  const parts = (text: string): Part[] => fromSegments(segs(text));
  const item = (u: { id: string; text: string }): TextItem => ({ id: u.id, parts: parts(u.text) });
  const ui = (key: string): string => req(e.ui.strings[key], `cadena de interfaz «${key}»`).text;
  const qLabel = req(
    e.states.question_resolution_labels[q.resolution.value],
    `etiqueta pública de la resolución ${q.resolution.value} (G-STA-06)`,
  ).text;
  const pinCite = {
    question: e.question.public_question,
    version: c.manifest.version,
    tag: c.manifest.pin.tag,
    commit: c.manifest.pin.commit.slice(0, 7),
  };
  const fillCite = (template: string, claimId?: string): string => {
    let s = template
      .replace("{question}", pinCite.question)
      .replace("{version}", pinCite.version)
      .replace("{tag}", pinCite.tag)
      .replace("{commit}", pinCite.commit);
    if (claimId !== undefined) s = s.replace("{claim}", claimId);
    return s;
  };
  const provenanceBase = { ...provenanceShell, pendingSignoff: pendingSignoff(e).length };
  const shared = {
    slug: questionSlug(qid),
    moduleId: c.manifest.module_id,
    id: qid,
    publicQuestion: e.question.public_question,
    canonicalQuestion: q.canonical_text,
    canonicalTitle: q.canonical_title,
    sourceGloss: null,
    hasEditorial: true,
    ui,
    title: parts(e.finding.title.text),
    intro: parts(e.finding.intro.text),
    scope: parts(e.finding.scope.text),
    canSay: e.finding.can_say.map(item),
    doesNotMean: e.finding.does_not_mean.map(item),
    wouldNeed: e.finding.would_need.map(item),
    absenceText: e.states.fixed.absence_not_negative.text,
    claims: listedClaims,
  };

  if (q.claim_ids.length === 0) {
    const hyp = q.hypothesis_ids[0]
      ? req(
          c.hypotheses.find((x) => x.id === q.hypothesis_ids[0]),
          `hipótesis de ${qid}`,
        )
      : null;
    const cite = fillCite(ui("cite_template_no_claim"));
    const entityIds = [
      qid,
      ...(hyp !== null ? [hyp.id] : []),
      ...q.object_ids,
      ...q.preserved_result_ids,
      ...q.answerability.forbidden_inferences,
    ];
    return {
      ...shared,
      state: {
        question: q.resolution.value,
        claim: null,
        claimLabel: null,
        questionLabel: qLabel,
        absenceNotNegative: q.absent_vs_negative === "ABSENT_NOT_NEGATIVE",
      },
      claim: null,
      trail: null,
      trails: [],
      provenance: {
        ...provenanceBase,
        forbidden: q.answerability.forbidden_inferences,
        entityIds,
        cite: markTokens(cite),
        disclosureRequired: hyp?.disclosure_required ?? false,
        disclosure: null,
      },
    };
  }

  const trailSpecs = e.finding.trails ?? (e.finding.trail !== undefined ? [e.finding.trail] : []);
  if (trailSpecs.length !== q.claim_ids.length)
    throw new Error(
      `${qid}: hay ${trailSpecs.length} Rastros editoriales para ${q.claim_ids.length} claims`,
    );
  const byId = (list: { id: string; text: string }[], id: string): { id: string; text: string } =>
    req(
      list.find((x) => x.id === id),
      `texto editorial ${id}`,
    );
  const audit = e.limits.dispositions
    .filter((d) => d.disposition === "AUDIT_ONLY")
    .map((d) => {
      const id = req(limitationIdFromRef(c, d.limitation), `limitación ${d.limitation}`);
      const lim = req(
        c.limitations.find((l) => l.id === id),
        id,
      );
      return {
        ownerId: lim.owner_id,
        text: markTokens(lim.text),
        waiver: req(d.waiver_reason, "razón de la disposición AUDIT_ONLY"),
      };
    });

  const trails: TrailView[] = q.claim_ids.map((cid, i) => {
    const spec = req(trailSpecs[i], `Rastro editorial ${i} de ${qid}`);
    const expectedRef = spec.claim_ref?.replace(/^labor\//, "");
    if (expectedRef !== undefined && expectedRef !== cid)
      throw new Error(`${qid}: el Rastro ${i} cita ${expectedRef} y el claim es ${cid}`);
    const claim = req(
      c.claims.find((x) => x.id === cid),
      `claim ${cid}`,
    );
    const hyp = req(
      c.hypotheses.find((x) => x.id === claim.hypothesis_id),
      `hipótesis de ${cid}`,
    );
    const cLabel = req(
      e.states.claim_state_labels[claim.epistemic_state],
      `etiqueta pública del estado ${claim.epistemic_state} (G-STA-06)`,
    ).text;
    const roots = c["evidence-roots"].filter((r) => claim.root_ids.includes(r.id));
    if (roots.length !== 1) throw new Error(`${cid}: el Rastro muestra una raíz de evidencia`);
    const rootPrimary = roots[0]!;
    const objectUnits =
      spec.objects !== undefined && spec.objects.length > 0
        ? spec.objects
        : [
            req(spec.object_employment, `objeto de empleo de ${cid}`),
            req(spec.object_registration, `objeto de registro de ${cid}`),
          ];
    if (objectUnits.length !== claim.object_ids.length)
      throw new Error(
        `${cid}: el Rastro espera ${objectUnits.length} objetos y el claim declara ${claim.object_ids.length}`,
      );
    const cutIds = spec.blockers_at_cut ?? e.finding.blockers_at_cut;
    return {
      claimId: claim.id,
      claimState: claim.epistemic_state,
      claimLabel: cLabel,
      sourceLabel: claim.source_label,
      claim: parts(spec.claim.text),
      hypothesis: parts(spec.hypothesis.text),
      evidence: parts(spec.evidence.text),
      objects: claim.object_ids.map((id, j) => ({
        id,
        parts: parts(objectUnits[j]!.text),
      })),
      source: {
        rootId: rootPrimary.id,
        publication:
          spec.source !== undefined ? parts(spec.source.text) : markTokens(rootPrimary.publication),
        linkUnresolved: rootPrimary.source_link_status === "UNRESOLVED",
      },
      reasons: cutIds.map((id) => item(byId(e.finding.can_say, id))),
      ids: {
        claim: claim.id,
        hypothesis: hyp.id,
        evidence: claim.evidence_ids,
        roots: [...claim.root_ids, ...claim.referenced_root_ids, ...claim.deflator_root_ids],
        objects: claim.object_ids,
        ruling: claim.lab_gov,
        episodes: c.episodes.filter((x) => x.claim_ids.includes(claim.id)).map((x) => x.id),
      },
      auditOnly: audit,
    };
  });

  const primary = trails[0]!;
  const fullClaims = q.claim_ids.map((id) =>
    req(
      c.claims.find((x) => x.id === id),
      id,
    ),
  );
  const hyps = [
    ...new Set(fullClaims.map((cl) => cl.hypothesis_id).filter((id): id is string => id !== null)),
  ];
  const forbidden = [
    ...q.answerability.forbidden_inferences,
    ...fullClaims.flatMap((cl) => cl.answerability.forbidden_inferences),
  ];
  const entityIds = [
    qid,
    ...fullClaims.map((cl) => cl.id),
    ...hyps,
    ...fullClaims.flatMap((cl) => cl.evidence_ids),
    ...fullClaims.flatMap((cl) => [
      ...cl.root_ids,
      ...cl.referenced_root_ids,
      ...cl.deflator_root_ids,
    ]),
    ...fullClaims.flatMap((cl) => cl.object_ids),
    ...fullClaims.flatMap((cl) => cl.lab_gov),
    ...c.episodes
      .filter((x) => fullClaims.some((cl) => x.claim_ids.includes(cl.id)))
      .map((x) => x.id),
    ...q.preserved_result_ids,
    ...forbidden,
  ];
  const cite = fillCite(ui("cite_template"), fullClaims.map((cl) => cl.id).join(" "));
  const disclosureRequired = fullClaims.some((cl) => {
    if (cl.hypothesis_id === null) return false;
    const h = req(
      c.hypotheses.find((x) => x.id === cl.hypothesis_id),
      cl.hypothesis_id,
    );
    return h.disclosure_required;
  });

  return {
    ...shared,
    state: {
      question: q.resolution.value,
      claim: trails.length === 1 ? primary.claimState : null,
      claimLabel: trails.length === 1 ? primary.claimLabel : null,
      questionLabel: qLabel,
      absenceNotNegative: q.absent_vs_negative === "ABSENT_NOT_NEGATIVE",
    },
    claim:
      trails.length === 1
        ? {
            id: primary.claimId,
            source: primary.sourceLabel,
            hypothesisId: primary.ids.hypothesis,
          }
        : null,
    trail: primary,
    trails,
    provenance: {
      ...provenanceBase,
      forbidden: [...new Set(forbidden)],
      entityIds: [...new Set(entityIds)],
      cite: markTokens(cite),
      disclosureRequired,
      disclosure: e.finding.disclosure !== undefined ? parts(e.finding.disclosure.text) : null,
    },
  };
}

type ProvenanceShell = {
  moduleVersion: string;
  tag: string;
  commit: string;
  commitShort: string;
  generatorVersion: string;
  manifestSha: string;
  editorialSha: string;
  preserved: string[];
};

function loadCanonicalView(
  root: string,
  qid: string,
  c: GeneratedCorpus,
  q: GeneratedCorpus["questions"][number],
  listedClaims: QuestionView["claims"],
  provenanceShell: ProvenanceShell,
): QuestionView {
  const site = loadSiteStrings(root);
  const glosses = loadGlosses(root);
  const publicTitle = req(glosses.questions[qid]?.title, `glosa pública de ${qid}`);
  const sourceGloss =
    listedClaims.length === 1 ? (glosses.questions[qid]?.source?.text ?? null) : null;
  const ui = (key: string): string => req(site.ui.strings[key], `cadena de interfaz «${key}»`).text;
  const qLabel = documentaryLabel(
    ui,
    q.resolution.value,
    site.states.question_resolution_labels[q.resolution.value]?.text ?? q.resolution.value,
  );
  const publicQuestion = publicQuestionText(root, qid, q.canonical_text);
  const hyp = q.hypothesis_ids[0]
    ? req(
        c.hypotheses.find((x) => x.id === q.hypothesis_ids[0]),
        `hipótesis de ${qid}`,
      )
    : null;
  const fillCite = (template: string, claimId?: string): string => {
    let s = template
      .replace("{question}", publicQuestion)
      .replace("{version}", c.manifest.version)
      .replace("{tag}", c.manifest.pin.tag)
      .replace("{commit}", c.manifest.pin.commit.slice(0, 7));
    if (claimId !== undefined) s = s.replace("{claim}", claimId);
    return s;
  };
  const cite =
    listedClaims.length === 0
      ? fillCite(ui("cite_template_no_claim"))
      : fillCite(ui("cite_template"), listedClaims.map((x) => x.id).join(" "));
  const forbidden = [
    ...q.answerability.forbidden_inferences,
    ...listedClaims.flatMap((cl) => {
      const full = req(
        c.claims.find((x) => x.id === cl.id),
        cl.id,
      );
      return full.answerability.forbidden_inferences;
    }),
  ];
  const entityIds = [
    qid,
    ...listedClaims.map((x) => x.id),
    ...(hyp !== null ? [hyp.id] : []),
    ...q.object_ids,
    ...q.preserved_result_ids,
    ...forbidden,
  ];
  return {
    slug: questionSlug(qid),
    moduleId: c.manifest.module_id,
    id: qid,
    publicQuestion,
    canonicalQuestion: q.canonical_text,
    canonicalTitle: q.canonical_title,
    sourceGloss,
    hasEditorial: false,
    ui,
    state: {
      question: q.resolution.value,
      claim: listedClaims.length === 1 ? listedClaims[0]!.state : null,
      claimLabel:
        listedClaims.length === 1
          ? (site.states.claim_state_labels[listedClaims[0]!.state]?.text ?? listedClaims[0]!.state)
          : null,
      questionLabel: qLabel,
      absenceNotNegative: q.absent_vs_negative === "ABSENT_NOT_NEGATIVE",
    },
    claim:
      listedClaims.length === 1
        ? {
            id: listedClaims[0]!.id,
            source: listedClaims[0]!.source,
            hypothesisId: hyp?.id ?? "",
          }
        : null,
    claims: listedClaims,
    title: markTokens(publicTitle.text),
    intro: [],
    scope: markTokens(publicTitle.text),
    canSay: [],
    doesNotMean: [],
    wouldNeed: [],
    absenceText: site.states.fixed.absence_not_negative.text,
    trail: null,
    trails: [],
    provenance: {
      ...provenanceShell,
      forbidden: [...new Set(forbidden)],
      entityIds: [...new Set(entityIds)],
      cite: markTokens(cite),
      disclosureRequired: hyp?.disclosure_required ?? false,
      disclosure: null,
      pendingSignoff: 0,
    },
  };
}
