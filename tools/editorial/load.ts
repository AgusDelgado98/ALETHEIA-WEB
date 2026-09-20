import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { AuditFile, Finding, Limits, QuestionEditorial, Review, States, Ui, type AuditFileT, type FindingT, type LimitsT, type ReviewT, type StatesT, type UiT } from "./schema.ts";
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
  for (const path of [p.question, p.finding, p.limits]) banned.push(...findBannedKeys(doc(path)).map((k) => `${path} ${k}`));
  if (banned.length > 0) throw new EditorialError(`G-STA-04: campo de estado en editorial: ${banned.join(", ")}`);

  const question = QuestionEditorial.parse(doc(p.question));
  const finding = Finding.parse(doc(p.finding));
  const limits = Limits.parse(doc(p.limits));
  const states = States.parse(doc("editorial/site/states.yml"));
  const ui = Ui.parse(doc("editorial/site/ui.yml"));
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
  if (finding.trail !== undefined) {
    for (const [k, u] of Object.entries(finding.trail)) {
      if (u === undefined) continue;
      add(`trail.${k}`, u, "trail");
    }
  }
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
  }

  return { question, finding, limits, states, ui, review, audit, files, units };
}

export function editorialPaths(qid: string): string[] {
  return Object.values(ROOT_FILES(qid));
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
  return loadEditorialFromTexts(texts, qid, opts);
}
