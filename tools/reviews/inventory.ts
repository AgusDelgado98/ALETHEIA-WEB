import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadGenerated } from "../corpus/load.ts";
import { canonicalJson, sha256Hex } from "../corpus/util.ts";
import { latestRecord, unitHashes } from "../editorial/audit.ts";
import {
  loadEditorial,
  publishedEditorialIds,
  type EditorialUnit,
  type UnitKind,
} from "../editorial/load.ts";
import {
  CGI_LICENSE,
  CGI_ROOT_ID,
  CORPUS_SOURCE_COUNT,
  FEATURED_QUESTION_IDS,
  KNOWN_LAB_SRC_IDS,
  REVIEW_MATERIAL_PREFIXES,
  WEB2_PACKAGE_DATE,
  WEB2_PRODUCTION_URL,
  WEB2_RELEASE_LABEL,
  WEB2_REVIEWED_COMMIT,
  WEB2_STATUS,
} from "./constants.ts";

export type Materialization = "PUBLICLY_MATERIALIZED" | "NOT_PUBLICLY_MATERIALIZED";
export type EditorialFamily =
  | "public_question"
  | "finding_structure"
  | "finding_can_say"
  | "finding_does_not_mean"
  | "finding_would_need"
  | "finding_trail"
  | "finding_disclosure"
  | "limits"
  | "states"
  | "disclaimers"
  | "navigation"
  | "methodology"
  | "home"
  | "findings_index"
  | "explore"
  | "limits_page"
  | "about"
  | "versions"
  | "trail_ui"
  | "not_found"
  | "counts"
  | "ui_other";

export interface SourceInventoryItem {
  id: string;
  type: "EvidenceRoot" | "Source" | "source_label" | "website_asset";
  publication: string;
  producer: string;
  recorded_license: string;
  original_url: string | null;
  link_status: string;
  pages: string[];
  exposure: string[];
  reproduces_raw: false;
  derived_kind: string;
  materialization: Materialization;
  mechanical_notes: string[];
}

export interface DerivedTypeItem {
  id: string;
  origin: "corpus Source" | "website asset" | "editorial" | "generated corpus";
  transformation: string;
  exposure: string;
  known_license: string;
  clearance: "PENDING";
}

export interface PendingUnit {
  string_id: string;
  kind: UnitKind;
  family: EditorialFamily;
  text_hash: string;
  canonical_hash: string | null;
  verdict: string;
  source_yaml: string;
  pages: string[];
}

export interface VerdictCensus {
  total_units: number;
  by_verdict: Record<string, number>;
  public_question: {
    research_questions: number;
    records: number;
    APPROVED: number;
    REVISED_AND_APPROVED: number;
    PENDING_AUTHOR_REVIEW: number;
    REJECTED: number;
    other: number;
  };
  unexplained_non_pending_non_fourteen: PendingUnit[];
}

export interface DriftReport {
  reviewed_commit: string;
  head: string | null;
  head_differs: boolean;
  material_paths_changed: string[];
  editorial_manifest_changed: boolean;
  inventory_changed: boolean;
  invalidated: boolean;
  detail: string;
}

export interface ReviewInventory {
  schema: "aletheia-web/web-2-review-inventory/1";
  reviewed_commit: string;
  production_url: string;
  package_date: string;
  release: string;
  web2_status: string;
  verdicts: VerdictCensus;
  sources: SourceInventoryItem[];
  derived_types: DerivedTypeItem[];
  pending: PendingUnit[];
  pending_by_family: Record<string, number>;
  pending_set_hash: string;
  editorial_manifest_sha256: string;
}

const questionPath = (qid: string): string =>
  `/labor/preguntas/${qid.replace(/^LAB-/, "").toLowerCase()}`;

function git(root: string, args: string[]): string | null {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function yamlPathForUnit(u: EditorialUnit): string {
  if (
    u.section === "public_title" ||
    u.section === "nav_title" ||
    u.section === "limits_gloss" ||
    u.section === "source_gloss"
  )
    return "editorial/site/glosses.yml";
  if (u.string_id.startsWith("site#states.") || u.string_id === "site#fixed.absence_not_negative")
    return "editorial/site/states.yml";
  if (u.string_id.startsWith("site#ui.")) return "editorial/site/ui.yml";
  const q = /^labor\/(LAB-Q-[0-9]{4})#/.exec(u.string_id)?.[1];
  if (q === undefined) return "editorial/";
  if (u.kind === "public_question") return `editorial/labor/questions/${q}.yml`;
  if (u.kind === "limit_waiver") return `editorial/labor/limits/${q}.yml`;
  return `editorial/labor/findings/${q}.yml`;
}

export function familyOf(u: EditorialUnit): EditorialFamily {
  if (u.kind === "public_question") return "public_question";
  if (u.kind === "limit_waiver") return "limits";
  if (u.kind === "state_label") return "states";
  if (u.kind === "fixed_text") return "disclaimers";
  if (u.kind === "finding_text") {
    if (u.section === "nav_title") return "navigation";
    if (u.section === "trail") return "finding_trail";
    if (u.section === "disclosure") return "finding_disclosure";
    if (u.section === "can_say") return "finding_can_say";
    if (u.section === "does_not_mean") return "finding_does_not_mean";
    if (u.section === "would_need") return "finding_would_need";
    if (u.section === "limits_gloss") return "limits_page";
    if (u.section === "source_gloss") return "trail_ui";
    return "finding_structure";
  }
  const key = u.string_id.replace(/^site#ui\./, "");
  if (
    /^(brand_wordmark|skip_link|nav_|footer_|nav_label)/.test(key) ||
    key === "open_question"
  )
    return "navigation";
  if (/^legal_/.test(key) || key === "home_legal_heading" || key === "qualifier_documentary")
    return "disclaimers";
  if (/^about_/.test(key)) return "about";
  if (/^not_found_/.test(key)) return "not_found";
  if (/^method_|^prov_|^cite_|^provenance_|^home_method_/.test(key)) return "methodology";
  if (/^home_/.test(key)) return "home";
  if (/^findings_|^featured_kicker$|^minimal_kicker$/.test(key)) return "findings_index";
  if (/^map_/.test(key)) return "explore";
  if (/^limits_|^relation_governance$|^regime_c_note$/.test(key)) return "limits_page";
  if (/^versions_/.test(key)) return "versions";
  if (/^count_/.test(key)) return "counts";
  if (
    /^(trail_|node_|depth_|cut_|frame_|legend_|answer_|question_kicker|say_heading|not_heading|need_heading|shape_|layer_|doc_|no_claim_trail|source_link_unresolved)/.test(
      key,
    )
  )
    return "trail_ui";
  return "ui_other";
}

export function pagesForUnit(u: EditorialUnit): string[] {
  if (u.section === "nav_title") return ["*"];
  const q = /^labor\/(LAB-Q-[0-9]{4})#/.exec(u.string_id)?.[1];
  if (q !== undefined) {
    const pages = [questionPath(q)];
    if (u.kind === "public_question") {
      pages.push("/explorar");
      if ((FEATURED_QUESTION_IDS as readonly string[]).includes(q)) {
        pages.push("/", "/hallazgos");
      }
    }
    return [...new Set(pages)].sort();
  }
  const fam = familyOf(u);
  const map: Record<EditorialFamily, string[]> = {
    public_question: ["/explorar"],
    finding_structure: [],
    finding_can_say: [],
    finding_does_not_mean: [],
    finding_would_need: [],
    finding_trail: [],
    finding_disclosure: [],
    limits: [],
    states: ["/", "/explorar", "/metodo", "/labor/preguntas/*"],
    disclaimers: ["/", "/sobre"],
    navigation: ["*"],
    methodology: ["/metodo"],
    home: ["/"],
    findings_index: ["/hallazgos", "/"],
    explore: ["/explorar"],
    limits_page: ["/limites"],
    about: ["/sobre"],
    versions: ["/versiones"],
    trail_ui: ["/labor/preguntas/*"],
    not_found: ["/404"],
    counts: ["/", "/explorar"],
    ui_other: ["*"],
  };
  return map[fam];
}

function tokenPresent(haystack: string, needle: string): boolean {
  return haystack.includes(needle);
}

function unique(xs: string[]): string[] {
  return [...new Set(xs)].sort();
}

export function loadAllUnits(root: string): {
  units: EditorialUnit[];
  census: VerdictCensus;
  pending: PendingUnit[];
} {
  const corpus = loadGenerated(root);
  const seen = new Map<string, EditorialUnit>();
  const latest = new Map<string, ReturnType<typeof latestRecord>>();
  for (const qid of publishedEditorialIds(root)) {
    const b = loadEditorial(root, qid);
    for (const u of b.units) {
      if (!seen.has(u.string_id)) seen.set(u.string_id, u);
      const rec = latestRecord(b.audit, u.string_id);
      const prev = latest.get(u.string_id);
      if (prev === undefined || (rec !== undefined && rec.revision >= (prev.revision ?? 0)))
        latest.set(u.string_id, rec);
    }
  }
  const units = [...seen.values()].sort((a, z) => a.string_id.localeCompare(z.string_id));
  const by_verdict: Record<string, number> = {};
  const pending: PendingUnit[] = [];
  let pqApproved = 0;
  let pqRevised = 0;
  let pqPending = 0;
  let pqRejected = 0;
  let pqOther = 0;
  let pqRecords = 0;
  for (const u of units) {
    const rec = latest.get(u.string_id);
    const v = rec?.verdict ?? "MISSING_AUDIT";
    by_verdict[v] = (by_verdict[v] ?? 0) + 1;
    if (u.kind === "public_question") {
      pqRecords++;
      if (v === "APPROVED") pqApproved++;
      else if (v === "REVISED_AND_APPROVED") pqRevised++;
      else if (v === "PENDING_AUTHOR_REVIEW") pqPending++;
      else if (v === "REJECTED") pqRejected++;
      else pqOther++;
    }
    if (v === "PENDING_AUTHOR_REVIEW") {
      const h = unitHashes(u, corpus);
      pending.push({
        string_id: u.string_id,
        kind: u.kind,
        family: familyOf(u),
        text_hash: rec?.text_hash ?? h.text_hash,
        canonical_hash: rec?.canonical_hash ?? h.canonical_hash,
        verdict: v,
        source_yaml: yamlPathForUnit(u),
        pages: pagesForUnit(u),
      });
    }
  }
  const approvedPublic = units.filter((u) => {
    const v = latest.get(u.string_id)?.verdict;
    return v === "APPROVED" && u.kind === "public_question";
  });
  return {
    units,
    census: {
      total_units: units.length,
      by_verdict,
      public_question: {
        research_questions: corpus.questions.length,
        records: pqRecords,
        APPROVED: pqApproved,
        REVISED_AND_APPROVED: pqRevised,
        PENDING_AUTHOR_REVIEW: pqPending,
        REJECTED: pqRejected,
        other: pqOther,
      },
      unexplained_non_pending_non_fourteen: approvedPublic
        .filter((u) => {
          const id = /^labor\/(LAB-Q-[0-9]{4})#public_question$/.exec(u.string_id)?.[1];
          return (
            id !== undefined &&
            (FEATURED_QUESTION_IDS as readonly string[]).includes(id) &&
            id !== "LAB-Q-0013"
          );
        })
        .map((u) => {
          const rec = latest.get(u.string_id);
          const h = unitHashes(u, corpus);
          return {
            string_id: u.string_id,
            kind: u.kind,
            family: familyOf(u) as EditorialFamily,
            text_hash: rec?.text_hash ?? h.text_hash,
            canonical_hash: rec?.canonical_hash ?? h.canonical_hash,
            verdict: rec?.verdict ?? "MISSING_AUDIT",
            source_yaml: yamlPathForUnit(u),
            pages: pagesForUnit(u),
          };
        }),
    },
    pending,
  };
}

export function buildInventory(root: string): ReviewInventory {
  const corpus = loadGenerated(root);
  const { units, census, pending } = loadAllUnits(root);
  const editorialManifest = readFileSync(join(root, "editorial", "manifest.json"));
  const editorial_manifest_sha256 = sha256Hex(editorialManifest);

  const publicTexts: { page: string; text: string }[] = [];
  const add = (page: string, text: string): void => {
    if (text.trim() !== "") publicTexts.push({ page, text });
  };

  for (const u of units) {
    for (const p of pagesForUnit(u)) add(p, u.text);
  }
  for (const q of corpus.questions) {
    add(questionPath(q.id), q.canonical_text);
    add(questionPath(q.id), q.canonical_title);
  }
  for (const cl of corpus.claims) {
    add(questionPath(cl.question_id), cl.source_label);
    add(questionPath(cl.question_id), cl.root_ids.join(" "));
    add(questionPath(cl.question_id), cl.referenced_root_ids.join(" "));
    add(questionPath(cl.question_id), cl.deflator_root_ids.join(" "));
  }
  for (const k of corpus["preserved-results"]) add("/limites", `${k.must_not} ${k.id}`);
  for (const r of corpus.relations.filter((x) => x.category === "GOVERNANCE_REQUIRED")) {
    add("/limites", `${r.title} ${r.prohibited_inference} ${r.reason}`);
  }

  const haystack = publicTexts.map((x) => x.text).join("\n");
  const pagesForNeedle = (needle: string): string[] =>
    unique(publicTexts.filter((x) => x.text.includes(needle)).map((x) => x.page));

  const sources: SourceInventoryItem[] = [];
  for (const rootEnt of corpus["evidence-roots"]) {
    const idPages = pagesForNeedle(rootEnt.id);
    const pubPages = pagesForNeedle(rootEnt.publication);
    const prodPages = pagesForNeedle(rootEnt.primary_producer);
    const short =
      rootEnt.id === "LAB-ROOT-0001"
        ? "SIPA"
        : rootEnt.id === "LAB-ROOT-0002"
          ? "CGI"
          : rootEnt.id === "LAB-ROOT-0003"
            ? "MLER"
            : rootEnt.id === "LAB-ROOT-0004"
              ? "SRT"
              : rootEnt.id === "LAB-ROOT-0005"
                ? "EPH"
                : rootEnt.id === "LAB-ROOT-0006"
                  ? "IPC"
                  : rootEnt.id === "LAB-ROOT-0007"
                    ? "ARCA"
                    : rootEnt.id;
    const labelPages = pagesForNeedle(short);
    const pages = unique([...idPages, ...pubPages, ...prodPages, ...labelPages]);
    const exposure: string[] = [];
    if (idPages.length > 0) exposure.push("entity_id");
    if (pubPages.length > 0) exposure.push("publication_name");
    if (labelPages.length > 0) exposure.push("source_label_or_name");
    if (prodPages.length > 0) exposure.push("producer_name");
    const materialized: Materialization =
      pages.length > 0 ? "PUBLICLY_MATERIALIZED" : "NOT_PUBLICLY_MATERIALIZED";
    const license = rootEnt.id === CGI_ROOT_ID ? CGI_LICENSE : "NOT_RECORDED";
    const notes = [
      `source_link_status=${rootEnt.source_link_status}`,
      "generated/ no materializa entidades Source; esta fila es EvidenceRoot.",
      "No se redistribuye el archivo crudo en el sitio (G-LEG-01).",
    ];
    if (rootEnt.id === CGI_ROOT_ID)
      notes.push("Licencia CC BY-SA 4.0 registrada en provenance V1 indec_cgi (Data Contract §13.2).");
    if (license === "NOT_RECORDED")
      notes.push("license.status permanece NOT_RECORDED; no se infiere permiso.");
    if (rootEnt.id === "LAB-ROOT-0004")
      notes.push(
        "Ningún claim público usa esta raíz como root_ids; el nombre SRT aparece en relaciones GOVERNANCE_REQUIRED de /limites.",
      );
    sources.push({
      id: rootEnt.id,
      type: "EvidenceRoot",
      publication: rootEnt.publication,
      producer: rootEnt.primary_producer,
      recorded_license: license,
      original_url: null,
      link_status: rootEnt.source_link_status,
      pages,
      exposure,
      reproduces_raw: false,
      derived_kind: "nombre de publicación / etiqueta / identificador en ficha o límites",
      materialization: materialized,
      mechanical_notes: notes,
    });
  }

  const srcMentions = [...haystack.matchAll(/LAB-SRC-[0-9]{4}/g)].map((m) => m[0]!);
  for (const id of KNOWN_LAB_SRC_IDS) {
    const pages = pagesForNeedle(id);
    const mentioned = srcMentions.includes(id);
    sources.push({
      id,
      type: "Source",
      publication: "no materializada como entidad Source en generated/",
      producer: "no registrado en generated/",
      recorded_license: "NOT_RECORDED",
      original_url: null,
      link_status: "UNRESOLVED",
      pages,
      exposure: mentioned || pages.length > 0 ? ["id_in_public_text"] : [],
      reproduces_raw: false,
      derived_kind: "cita regulatoria o de admisión, si aparece",
      materialization:
        pages.length > 0 ? "PUBLICLY_MATERIALIZED" : "NOT_PUBLICLY_MATERIALIZED",
      mechanical_notes: [
        "El contrato del módulo cuenta 15 Source; generated/ no emite Source.",
        id <= "LAB-SRC-0003"
          ? "Citada en Data Contract §13.1 como fuente de admisión estadística; el vínculo raíz→fuente está UNRESOLVED (OD-04)."
          : "Fuente regulatoria LAB-B3 (LAB-SRC-0004–0011). La ficha pública de Q-0012 muestra source_label REGULATORY, no estos IDs.",
        "license.status permanece NOT_RECORDED; no se infiere permiso ni dominio público.",
      ],
    });
  }

  const unidentified = CORPUS_SOURCE_COUNT - KNOWN_LAB_SRC_IDS.length;
  sources.push({
    id: "LAB-SRC-UNIDENTIFIED-COUNT",
    type: "Source",
    publication: `${unidentified} Source del contrato (15) sin ID en generated/ ni en el registro vendorizado`,
    producer: "desconocido en esta capa",
    recorded_license: "NOT_RECORDED",
    original_url: null,
    link_status: "UNRESOLVED",
    pages: [],
    exposure: [],
    reproduces_raw: false,
    derived_kind: "ninguno en la web pública",
    materialization: "NOT_PUBLICLY_MATERIALIZED",
    mechanical_notes: [
      `G-CNT-01 espera ${CORPUS_SOURCE_COUNT} Source en el corpus científico; esta capa no las materializa.`,
      "No se inventan IDs para las Source no identificadas.",
    ],
  });

  const labelSet = unique(corpus.claims.map((c) => c.source_label));
  for (const label of labelSet) {
    const pages = unique(
      corpus.claims.filter((c) => c.source_label === label).map((c) => questionPath(c.question_id)),
    );
    const mappedRoot = sources.some((s) => s.type === "EvidenceRoot" && tokenPresent(s.id + s.publication, label));
    if (["SIPA", "CGI", "MLER", "EPH", "IPC", "ARCA", "SRT", "CGI+IPC", "EPH+IPC", "ARCA+SIPA"].includes(label))
      continue;
    sources.push({
      id: `LABEL:${label}`,
      type: "source_label",
      publication: label,
      producer: "etiqueta de claim, no entidad Source",
      recorded_license: "NOT_RECORDED",
      original_url: null,
      link_status: "n/a",
      pages,
      exposure: ["frame_source_label"],
      reproduces_raw: false,
      derived_kind: "etiqueta documental de claim.source_label",
      materialization: "PUBLICLY_MATERIALIZED",
      mechanical_notes: [
        "No es una entidad Source del corpus. Se lista porque el Encuadre la muestra.",
        mappedRoot ? "Hay raíz asociada por nombre." : "Sin EvidenceRoot correspondiente.",
      ],
    });
  }

  sources.push({
    id: "FONT:Newsreader",
    type: "website_asset",
    publication: "Newsreader (variable, latin)",
    producer: "see public/fonts/licenses/Newsreader-OFL.txt",
    recorded_license: "OFL-1.1",
    original_url: null,
    link_status: "self-hosted",
    pages: ["*"],
    exposure: ["webfont"],
    reproduces_raw: false,
    derived_kind: "tipografía autoalojada",
    materialization: "PUBLICLY_MATERIALIZED",
    mechanical_notes: [
      "No es Source del corpus. Licencia OFL-1.1 en public/fonts/licenses/Newsreader-OFL.txt.",
    ],
  });
  sources.push({
    id: "FONT:Instrument-Sans",
    type: "website_asset",
    publication: "Instrument Sans (variable, latin)",
    producer: "see public/fonts/licenses/Instrument-Sans-OFL.txt",
    recorded_license: "OFL-1.1",
    original_url: null,
    link_status: "self-hosted",
    pages: ["*"],
    exposure: ["webfont"],
    reproduces_raw: false,
    derived_kind: "tipografía autoalojada",
    materialization: "PUBLICLY_MATERIALIZED",
    mechanical_notes: [
      "No es Source del corpus. Licencia OFL-1.1 en public/fonts/licenses/Instrument-Sans-OFL.txt.",
    ],
  });
  sources.push({
    id: "FONT:IBM-Plex-Mono",
    type: "website_asset",
    publication: "IBM Plex Mono (latin 400)",
    producer: "see public/fonts/licenses/IBM-Plex-Mono-OFL.txt",
    recorded_license: "OFL-1.1",
    original_url: null,
    link_status: "self-hosted",
    pages: ["*"],
    exposure: ["webfont"],
    reproduces_raw: false,
    derived_kind: "tipografía autoalojada",
    materialization: "PUBLICLY_MATERIALIZED",
    mechanical_notes: [
      "No es Source del corpus. Licencia OFL-1.1 en public/fonts/licenses/IBM-Plex-Mono-OFL.txt.",
    ],
  });

  const derived_types: DerivedTypeItem[] = [
    {
      id: "editorial_prose",
      origin: "editorial",
      transformation: "traducción pública auditada de canónicos (findings, questions)",
      exposure: "fichas editoriales y preguntas",
      known_license: "PENDING (sujeto a G-LEG-03 por tipo de derivado)",
      clearance: "PENDING",
    },
    {
      id: "publication_names",
      origin: "generated corpus",
      transformation: "EvidenceRoot.publication verbatim o glosa editorial atada por maps_to",
      exposure: "nodo Fuente del Rastro; Encuadre",
      known_license: "mezcla: CGI CC BY-SA 4.0; resto NOT_RECORDED",
      clearance: "PENDING",
    },
    {
      id: "epistemic_status_labels",
      origin: "editorial",
      transformation: "traducción de códigos de estado del ledger (states.yml)",
      exposure: "fichas, Explorar, Método, Home",
      known_license: "n/a (vocabulario del proyecto)",
      clearance: "PENDING",
    },
    {
      id: "structural_ui",
      origin: "editorial",
      transformation: "cadenas de interfaz (ui.yml)",
      exposure: "navegación y estructura",
      known_license: "n/a (copy del sitio)",
      clearance: "PENDING",
    },
    {
      id: "disclaimers",
      origin: "editorial",
      transformation: "avisos legales y de alcance (ui.yml legal_* / about_*)",
      exposure: "/sobre, home, OG description",
      known_license: "n/a (copy del sitio)",
      clearance: "PENDING",
    },
    {
      id: "provenance_representations",
      origin: "generated corpus",
      transformation: "IDs, tag, commit, hashes, pregunta canónica en inglés",
      exposure: "Procedencia de cada ficha",
      known_license: "PENDING",
      clearance: "PENDING",
    },
    {
      id: "numerical_figures",
      origin: "generated corpus",
      transformation: "el sitio WEB-2 no renderiza Figures numéricas del corpus",
      exposure: "ninguna",
      known_license: "n/a",
      clearance: "PENDING",
    },
    {
      id: "typography_ofl",
      origin: "website asset",
      transformation: "woff2 autoalojados desde Fontsource; OFL-1.1 copiada",
      exposure: "todas las páginas",
      known_license: "OFL-1.1",
      clearance: "PENDING",
    },
    {
      id: "preserved_keep_text",
      origin: "generated corpus",
      transformation: "glosa pública en español + PreservedResult.must_not canónico (inglés)",
      exposure: "/limites",
      known_license: "PENDING",
      clearance: "PENDING",
    },
    {
      id: "governance_required_text",
      origin: "generated corpus",
      transformation: "glosa pública en español + Relation title / prohibited_inference / reason canónicos",
      exposure: "/limites",
      known_license: "PENDING",
      clearance: "PENDING",
    },
  ];

  const pending_by_family: Record<string, number> = {};
  for (const u of pending) pending_by_family[u.family] = (pending_by_family[u.family] ?? 0) + 1;

  const pending_set_hash = sha256Hex(
    canonicalJson(
      pending.map((u) => ({
        string_id: u.string_id,
        text_hash: u.text_hash,
        canonical_hash: u.canonical_hash,
        verdict: u.verdict,
      })),
    ),
  );

  return {
    schema: "aletheia-web/web-2-review-inventory/1",
    reviewed_commit: WEB2_REVIEWED_COMMIT,
    production_url: WEB2_PRODUCTION_URL,
    package_date: WEB2_PACKAGE_DATE,
    release: WEB2_RELEASE_LABEL,
    web2_status: WEB2_STATUS,
    verdicts: census,
    sources: sources.sort((a, z) => a.id.localeCompare(z.id)),
    derived_types,
    pending,
    pending_by_family: Object.fromEntries(Object.entries(pending_by_family).sort(([a], [z]) => a.localeCompare(z))),
    pending_set_hash,
    editorial_manifest_sha256,
  };
}

export function inventoryBodyHash(inv: ReviewInventory): string {
  const { ...rest } = inv;
  return sha256Hex(canonicalJson(rest));
}

export function pinFromInventory(inv: ReviewInventory): Record<string, unknown> {
  return {
    schema: "aletheia-web/web-2-review-pin/1",
    reviewed_commit: inv.reviewed_commit,
    production_url: inv.production_url,
    package_date: inv.package_date,
    release: inv.release,
    web2_status: inv.web2_status,
    editorial_manifest_sha256: inv.editorial_manifest_sha256,
    pending_set_hash: inv.pending_set_hash,
    inventory_sha256: inventoryBodyHash(inv),
    materialized_source_ids: inv.sources
      .filter((s) => s.materialization === "PUBLICLY_MATERIALIZED")
      .map((s) => s.id),
  };
}

export function detectDrift(
  root: string,
  pin: { editorial_manifest_sha256: string; inventory_sha256: string; pending_set_hash: string },
): DriftReport {
  const head = git(root, ["rev-parse", "HEAD"]);
  const committed = git(root, ["diff", "--name-only", WEB2_REVIEWED_COMMIT, "HEAD"]) ?? "";
  const worktree = git(root, ["diff", "--name-only", WEB2_REVIEWED_COMMIT]) ?? "";
  const changed = [...committed.split(/\r?\n/), ...worktree.split(/\r?\n/)]
    .map((p) => p.trim().replace(/\\/g, "/"))
    .filter(Boolean);
  const material_paths_changed = changed.filter((p) =>
    REVIEW_MATERIAL_PREFIXES.some((pre) => p === pre.slice(0, -1) || p.startsWith(pre)),
  );
  const inv = buildInventory(root);
  const editorial_manifest_changed = inv.editorial_manifest_sha256 !== pin.editorial_manifest_sha256;
  const inventory_changed =
    inventoryBodyHash(inv) !== pin.inventory_sha256 || inv.pending_set_hash !== pin.pending_set_hash;
  const invalidated =
    material_paths_changed.length > 0 || editorial_manifest_changed || inventory_changed;
  const head_differs = head !== null && head !== WEB2_REVIEWED_COMMIT;
  const detail = invalidated
    ? "REVIEW INVALIDATED BY DRIFT"
    : head_differs
      ? "HEAD distinto del commit revisado; el material sujeto a revisión no cambió"
      : "paquete atado al commit revisado; sin drift de material";
  return {
    reviewed_commit: WEB2_REVIEWED_COMMIT,
    head,
    head_differs,
    material_paths_changed,
    editorial_manifest_changed,
    inventory_changed,
    invalidated,
    detail,
  };
}

export function materializedLegalIds(inv: ReviewInventory): string[] {
  return inv.sources
    .filter((s) => s.materialization === "PUBLICLY_MATERIALIZED" && s.type !== "website_asset")
    .map((s) => s.id);
}

export function readPin(root: string): {
  editorial_manifest_sha256: string;
  inventory_sha256: string;
  pending_set_hash: string;
} | null {
  const p = join(root, "reviews", "WEB-2-PIN.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as {
    editorial_manifest_sha256: string;
    inventory_sha256: string;
    pending_set_hash: string;
  };
}
