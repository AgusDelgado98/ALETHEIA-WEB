import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { AuditFile, Finding, FigureCopy, Glosses, Limits, QuestionEditorial, Review, States, Ui, type AuditFileT, type FigureCopyT, type FindingT, type GlossesT, type LimitsT, type ReviewT, type StatesT, type UiT } from "./schema.ts";
import { findBannedKeys } from "./lint.ts";

export type UnitKind = "public_question" | "finding_text" | "limit_waiver" | "state_label" | "fixed_text" | "ui_label";
export interface EditorialUnit {
  string_id: string;
  kind: UnitKind;
  text: string;
  /** Referencias canónicas de las que deriva (`labor/<ID>#<campo>`, `vocab:…`). */
  maps_to: string[];
  /** Sección de la ficha o del sitio (para los gates de cobertura). */
  section: string;
}

export interface EditorialBundle {
  question: ReturnType<typeof QuestionEditorial.parse>;
  finding: FindingT;
  limits: LimitsT;
  states: StatesT;
  ui: UiT;
  /** Rótulos públicos de las Figures (ADR-WEB3-01). `null` si el árbol de textos no lo trae. */
  figures: FigureCopyT | null;
  review: ReviewT;
  audit: AuditFileT | null;
  /** Archivos editoriales crudos (ruta relativa → texto), para el manifest editorial. */
  files: Map<string, string>;
  units: EditorialUnit[];
}

const ROOT_FILES = (qid: string) => ({
  question: `editorial/labor/questions/${qid}.yml`,
  finding: `editorial/labor/findings/${qid}.yml`,
  limits: `editorial/labor/limits/${qid}.yml`,
  review: `editorial/labor/audit/${qid}.review.yml`,
  audit: `editorial/labor/audit/${qid}.audit.yml`,
  states: "editorial/site/states.yml",
  ui: "editorial/site/ui.yml",
  glosses: "editorial/site/glosses.yml",
  figures: "editorial/site/figures.yml",
});

export class EditorialError extends Error {}

/** Pregunta que posee las cadenas compartidas de sitio (`states.yml`, `ui.yml`) en su auditoría. */
export const SITE_STRINGS_OWNER = "LAB-Q-0013";

export function loadSiteStrings(root: string): { states: StatesT; ui: UiT } {
  const states = States.parse(
    parse(readFileSync(join(root, "editorial", "site", "states.yml"), "utf8")),
  );
  const ui = Ui.parse(parse(readFileSync(join(root, "editorial", "site", "ui.yml"), "utf8")));
  return { states, ui };
}

const GLOSSES_PATH = "editorial/site/glosses.yml";

/** Preguntas mínimas que exigen glosa pública de `canonical_title`. */
export const MINIMAL_GLOSS_QUESTION_IDS = [
  "LAB-Q-0001",
  "LAB-Q-0002",
  "LAB-Q-0006",
  "LAB-Q-0007",
  "LAB-Q-0008",
  "LAB-Q-0009",
  "LAB-Q-0010",
  "LAB-Q-0012",
  "LAB-Q-0014",
  "LAB-Q-0015",
  "LAB-Q-0016",
  "LAB-Q-0017",
  "LAB-Q-0018",
] as const;

export function loadGlosses(root: string): GlossesT {
  const g = Glosses.parse(parse(readFileSync(join(root, GLOSSES_PATH), "utf8")));
  for (const id of MINIMAL_GLOSS_QUESTION_IDS) {
    if (g.questions[id] === undefined)
      throw new EditorialError(`falta glosa pública de ${id} en ${GLOSSES_PATH}`);
  }
  return g;
}

export function loadFigureCopy(root: string): FigureCopyT {
  return FigureCopy.parse(parse(readFileSync(join(root, "editorial", "site", "figures.yml"), "utf8")));
}

export function hasEditorialFinding(root: string, qid: string): boolean {
  return existsSync(join(root, "editorial", "labor", "findings", `${qid}.yml`));
}

export function publishedEditorialIds(root: string): string[] {
  const dir = join(root, "editorial", "labor", "findings");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".yml"))
    .map((n) => n.replace(/\.yml$/, ""))
    .sort();
}

/** Carga pura desde textos (los tests inyectan variantes defectuosas sin tocar el disco). */
export function loadEditorialFromTexts(
  texts: Record<string, string>,
  qid: string,
  opts?: { includeSiteUnits?: boolean },
): EditorialBundle {
  const p = ROOT_FILES(qid);
  const get = (path: string): string => {
    const t = texts[path];
    if (t === undefined) throw new EditorialError(`falta el archivo editorial ${path}`);
    return t;
  };
  const doc = (path: string): unknown => parse(get(path));

  // G-STA-04: ningún registro editorial de entidad contiene un campo de estado
  const banned: string[] = [];
  for (const path of [p.question, p.finding, p.limits, p.glosses])
    banned.push(...findBannedKeys(doc(path)).map((k) => `${path} ${k}`));
  if (banned.length > 0) throw new EditorialError(`G-STA-04: campo de estado en editorial: ${banned.join(", ")}`);

  const question = QuestionEditorial.parse(doc(p.question));
  const finding = Finding.parse(doc(p.finding));
  const limits = Limits.parse(doc(p.limits));
  const states = States.parse(doc("editorial/site/states.yml"));
  const ui = Ui.parse(doc("editorial/site/ui.yml"));
  const figuresText = texts[p.figures];
  const figures = figuresText === undefined ? null : FigureCopy.parse(parse(figuresText));
  const review = Review.parse(doc(p.review));
  const auditText = texts[p.audit];
  const audit = auditText === undefined ? null : AuditFile.parse(parse(auditText));

  const files = new Map<string, string>();
  for (const [path, t] of Object.entries(texts)) files.set(path, t);

  const units: EditorialUnit[] = [];
  const cref = finding.canonical_ref;
  units.push({ string_id: `${cref}#public_question`, kind: "public_question", text: question.public_question, maps_to: [`${cref}#canonical_text`], section: "question" });
  const add = (sid: string, u: { text: string; maps_to: string[] }, section: string): void => {
    units.push({ string_id: `${cref}#finding.${sid}`, kind: "finding_text", text: u.text, maps_to: u.maps_to, section });
  };
  add("title", finding.title, "title");
  add("intro", finding.intro, "intro");
  add("scope", finding.scope, "scope");
  for (const u of finding.can_say) add(`can_say.${u.id}`, u, "can_say");
  for (const u of finding.does_not_mean) add(`does_not_mean.${u.id}`, u, "does_not_mean");
  for (const u of finding.would_need) add(`would_need.${u.id}`, u, "would_need");
  if (finding.disclosure !== undefined) add("disclosure", finding.disclosure, "disclosure");
  const addTrail = (prefix: string, tr: NonNullable<FindingT["trail"]>): void => {
    add(`${prefix}.claim`, tr.claim, "trail");
    add(`${prefix}.hypothesis`, tr.hypothesis, "trail");
    add(`${prefix}.evidence`, tr.evidence, "trail");
    if (tr.object_employment !== undefined)
      add(`${prefix}.object_employment`, tr.object_employment, "trail");
    if (tr.object_registration !== undefined)
      add(`${prefix}.object_registration`, tr.object_registration, "trail");
    if (tr.source !== undefined) add(`${prefix}.source`, tr.source, "trail");
    for (const o of tr.objects ?? []) add(`${prefix}.objects.${o.id}`, o, "trail");
  };
  if (finding.trail !== undefined) addTrail("trail", finding.trail);
  if (finding.trails !== undefined)
    finding.trails.forEach((tr, i) => addTrail(`trails.${i}`, tr));
  // Razones de las limitaciones AUDIT_ONLY: se muestran en el nivel Auditoría, así que son texto público auditado.
  for (const d of limits.dispositions) {
    if (d.waiver_reason !== undefined) units.push({ string_id: `${cref}#limits.${d.limitation}.waiver`, kind: "limit_waiver", text: d.waiver_reason, maps_to: [d.limitation], section: "limits" });
  }
  const includeSiteUnits = opts?.includeSiteUnits ?? qid === SITE_STRINGS_OWNER;
  if (includeSiteUnits) {
    for (const [code, l] of Object.entries(states.claim_state_labels)) units.push({ string_id: `site#states.claim.${code}`, kind: "state_label", text: l.text, maps_to: [`vocab:claim_state:${code}`], section: "states" });
    for (const [code, l] of Object.entries(states.question_resolution_labels)) units.push({ string_id: `site#states.question.${code}`, kind: "state_label", text: l.text, maps_to: [`vocab:question_resolution:${code}`], section: "states" });
    units.push({ string_id: "site#fixed.absence_not_negative", kind: "fixed_text", text: states.fixed.absence_not_negative.text, maps_to: [`${cref}#absent_vs_negative`], section: "states" });
    for (const [k, l] of Object.entries(ui.strings)) units.push({ string_id: `site#ui.${k}`, kind: "ui_label", text: l.text, maps_to: [], section: "ui" });
    // public_question de preguntas sin ficha editorial (OD-05 / Charter §20.7): viven en questions/*.yml.
    for (const [path, t] of Object.entries(texts)) {
      if (!path.startsWith("editorial/labor/questions/") || path === p.question) continue;
      const extra = QuestionEditorial.parse(parse(t));
      units.push({
        string_id: `${extra.canonical_ref}#public_question`,
        kind: "public_question",
        text: extra.public_question,
        maps_to: [`${extra.canonical_ref}#canonical_text`],
        section: "question",
      });
    }
    if (figures !== null) {
      for (const [fid, u] of Object.entries(figures.labels)) units.push({ string_id: `site#figures.label.${fid}`, kind: "finding_text", text: u.text, maps_to: u.maps_to, section: "figures" });
      for (const [k, u] of Object.entries(figures.fixed)) units.push({ string_id: `site#figures.fixed.${k}`, kind: "fixed_text", text: u.text, maps_to: u.maps_to, section: "figures" });
    }
    const glosses = Glosses.parse(doc(p.glosses));
    const addGloss = (sid: string, u: { text: string; maps_to: string[] }, section: string): void => {
      units.push({ string_id: sid, kind: "finding_text", text: u.text, maps_to: u.maps_to, section });
    };
    for (const [glossQid, g] of Object.entries(glosses.questions)) {
      addGloss(`labor/${glossQid}#public_title`, g.title, "public_title");
      if (g.source !== undefined) addGloss(`labor/${glossQid}#source_gloss`, g.source, "source_gloss");
    }
    for (const [id, g] of Object.entries(glosses.governance)) {
      addGloss(`labor/${id}#public_title`, g.title, "limits_gloss");
      addGloss(`labor/${id}#public_inference`, g.inference, "limits_gloss");
      addGloss(`labor/${id}#public_reason`, g.reason, "limits_gloss");
    }
    for (const [id, g] of Object.entries(glosses.preserved)) {
      addGloss(`labor/${id}#public_must_not`, g.must_not, "limits_gloss");
    }
  }

  return { question, finding, limits, states, ui, figures, review, audit, files, units };
}

export function editorialPaths(qid: string): string[] {
  return Object.values(ROOT_FILES(qid));
}

/** Lista de `public_question` YAML (las 18). */
export function listQuestionEditorialPaths(root: string): string[] {
  const dir = join(root, "editorial", "labor", "questions");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".yml"))
    .sort()
    .map((n) => `editorial/labor/questions/${n}`);
}

/** `public_question` aprobado, o `null` si todavía no hay YAML. */
export function loadQuestionCopy(root: string, qid: string): ReturnType<typeof QuestionEditorial.parse> | null {
  const path = join(root, "editorial", "labor", "questions", `${qid}.yml`);
  if (!existsSync(path)) return null;
  return QuestionEditorial.parse(parse(readFileSync(path, "utf8")));
}

export function loadEditorial(
  root: string,
  qid = SITE_STRINGS_OWNER,
  opts?: { includeSiteUnits?: boolean },
): EditorialBundle {
  const texts: Record<string, string> = {};
  for (const path of editorialPaths(qid)) {
    try {
      texts[path] = readFileSync(join(root, path), "utf8");
    } catch {
      /* el archivo de auditoría puede no existir todavía */
    }
  }
  const includeSiteUnits = opts?.includeSiteUnits ?? qid === SITE_STRINGS_OWNER;
  if (includeSiteUnits) {
    for (const path of listQuestionEditorialPaths(root)) {
      const extraQid = path.replace(/^editorial\/labor\/questions\//, "").replace(/\.yml$/, "");
      if (hasEditorialFinding(root, extraQid)) continue;
      texts[path] = readFileSync(join(root, path), "utf8");
    }
  }
  return loadEditorialFromTexts(texts, qid, opts);
}
