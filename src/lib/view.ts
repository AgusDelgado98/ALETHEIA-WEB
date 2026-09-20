import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGenerated, type GeneratedCorpus } from "../../tools/corpus/load.ts";
import { sha256Hex } from "../../tools/corpus/util.ts";
import { parseSegments, type Segment } from "../../tools/editorial/directives.ts";
import {
  loadEditorial,
  loadSiteStrings,
  hasEditorialFinding,
  type EditorialBundle,
} from "../../tools/editorial/load.ts";
import { pendingSignoff } from "../../tools/editorial/audit.ts";
import { limitationIdFromRef } from "../../tools/editorial/resolve.ts";
import { fromSegments, markTokens, type Part } from "./render.ts";

/**
 * Modelo de vista de una página de pregunta. Lee SOLO `generated/` (hechos y estados) y `editorial/` (palabras).
 * Ninguna cadena visible se escribe a mano en los componentes: si falta una, esto lanza (G-UX-01: nada de `undefined`).
 */
export interface TextItem {
  id: string;
  parts: Part[];
}

export interface QuestionView {
  slug: string;
  moduleId: string;
  id: string;
  publicQuestion: string;
  canonicalQuestion: string;
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
  claims: { id: string; state: string; source: string; kind: string }[];
  title: Part[];
  intro: Part[];
  scope: Part[];
  canSay: TextItem[];
  doesNotMean: TextItem[];
  wouldNeed: TextItem[];
  absenceText: string;
  trail: {
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
  } | null;
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

export function questionSlug(id: string): string {
  return id.replace(/^LAB-/, "").toLowerCase();
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
  const listedClaims = q.claim_ids.map((id) => {
    const cl = req(
      c.claims.find((x) => x.id === id),
      `claim ${id}`,
    );
    return { id: cl.id, state: cl.epistemic_state, source: cl.source_label, kind: cl.claim_kind };
  });

  if (!hasEditorialFinding(root, qid))
    return loadCanonicalView(root, qid, c, q, listedClaims, provenanceShell);

  const e: EditorialBundle = loadEditorial(root, qid);
  if (q.claim_ids.length > 1)
    throw new Error(
      `${qid}: hay ${q.claim_ids.length} claims. La ficha editorial de M1 cubre 0 o 1; el resto usa la página canónica`,
    );

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

  const claim = req(
    c.claims.find((x) => x.id === q.claim_ids[0]),
    `claim de ${qid}`,
  );
  const hyp = req(
    c.hypotheses.find((x) => x.id === claim.hypothesis_id),
    "hipótesis del claim",
  );
  const trail = req(e.finding.trail, `Rastro editorial de ${qid}`);
  const cLabel = req(
    e.states.claim_state_labels[claim.epistemic_state],
    `etiqueta pública del estado ${claim.epistemic_state} (G-STA-06)`,
  ).text;

  const byId = (list: { id: string; text: string }[], id: string): { id: string; text: string } =>
    req(
      list.find((x) => x.id === id),
      `texto editorial ${id}`,
    );
  const root7 = c["evidence-roots"].filter((r) => claim.root_ids.includes(r.id));
  if (root7.length !== 1) throw new Error("M1 muestra una raíz de evidencia en el Rastro");
  const rootPrimary = root7[0]!;

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

  const cite = fillCite(ui("cite_template"), claim.id);
  const ids = {
    claim: claim.id,
    hypothesis: hyp.id,
    evidence: claim.evidence_ids,
    roots: [...claim.root_ids, ...claim.referenced_root_ids, ...claim.deflator_root_ids],
    objects: claim.object_ids,
    ruling: claim.lab_gov,
    episodes: c.episodes.filter((x) => x.claim_ids.includes(claim.id)).map((x) => x.id),
  };

  return {
    ...shared,
    state: {
      question: q.resolution.value,
      claim: claim.epistemic_state,
      claimLabel: cLabel,
      questionLabel: qLabel,
      absenceNotNegative: q.absent_vs_negative === "ABSENT_NOT_NEGATIVE",
    },
    claim: { id: claim.id, source: claim.source_label, hypothesisId: hyp.id },
    trail: {
      claim: parts(trail.claim.text),
      hypothesis: parts(trail.hypothesis.text),
      evidence: parts(trail.evidence.text),
      objects: (() => {
        const objectUnits = [trail.object_employment, trail.object_registration];
        if (claim.object_ids.length !== objectUnits.length)
          throw new Error(
            `${qid}: el Rastro espera ${objectUnits.length} objetos y el claim declara ${claim.object_ids.length}`,
          );
        return claim.object_ids.map((id, i) => ({
          id,
          parts: parts(objectUnits[i]!.text),
        }));
      })(),
      source: {
        rootId: rootPrimary.id,
        publication:
          trail.source !== undefined
            ? parts(trail.source.text)
            : markTokens(rootPrimary.publication),
        linkUnresolved: rootPrimary.source_link_status === "UNRESOLVED",
      },
      reasons: e.finding.blockers_at_cut.map((id) => item(byId(e.finding.can_say, id))),
      ids,
      auditOnly: audit,
    },
    provenance: {
      ...provenanceBase,
      forbidden: claim.answerability.forbidden_inferences,
      entityIds: [
        qid,
        ids.claim,
        ids.hypothesis,
        ...ids.evidence,
        ...ids.roots,
        ...ids.objects,
        ...ids.ruling,
        ...ids.episodes,
        ...q.preserved_result_ids,
        ...claim.answerability.forbidden_inferences,
      ],
      cite: markTokens(cite),
      disclosureRequired: hyp.disclosure_required,
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
  const ui = (key: string): string => req(site.ui.strings[key], `cadena de interfaz «${key}»`).text;
  const qLabel =
    site.states.question_resolution_labels[q.resolution.value]?.text ?? q.resolution.value;
  const hyp = q.hypothesis_ids[0]
    ? req(
        c.hypotheses.find((x) => x.id === q.hypothesis_ids[0]),
        `hipótesis de ${qid}`,
      )
    : null;
  const fillCite = (template: string, claimId?: string): string => {
    let s = template
      .replace("{question}", q.canonical_text)
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
    publicQuestion: q.canonical_text,
    canonicalQuestion: q.canonical_text,
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
    title: markTokens(q.canonical_title),
    intro: [],
    scope: markTokens(q.canonical_title),
    canSay: [],
    doesNotMean: [],
    wouldNeed: [],
    absenceText: site.states.fixed.absence_not_negative.text,
    trail: null,
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
