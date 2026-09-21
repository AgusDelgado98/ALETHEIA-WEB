import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { visibleText } from "../../scripts/gates/html.ts";
import {
  CGI_LICENSE,
  CGI_ROOT_ID,
  HUMAN_REVIEW_MD,
  LEGAL_REVIEW_YML,
  LEG03_WARNING,
  WEB2_PRODUCTION_URL,
  WEB2_REVIEWED_COMMIT,
} from "./constants.ts";
import { detectDrift, materializedLegalIds, readPin, type ReviewInventory } from "./inventory.ts";
import { HumanReview, LegalReview, type HumanReviewT, type LegalReviewT } from "./schema.ts";

export interface HumanGateResult {
  id: "OD-14" | "G-LEG-03" | "G-LEG-02";
  status: "OPEN" | "FAIL" | "PASS";
  detail: string;
  failures: string[];
  drift: string | null;
}

const filled = (s: string): boolean => s.trim() !== "";

export function parseFrontMatter(text: string): Record<string, unknown> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (m === null) throw new Error("falta front matter YAML");
  return parse(m[1] ?? "") as Record<string, unknown>;
}

export function loadHumanReview(root: string): HumanReviewT {
  const raw = readFileSync(join(root, HUMAN_REVIEW_MD), "utf8");
  return HumanReview.parse(parseFrontMatter(raw));
}

export function loadLegalReview(root: string): LegalReviewT {
  const raw = readFileSync(join(root, LEGAL_REVIEW_YML), "utf8");
  return LegalReview.parse(parse(raw));
}

export function evaluateOd14(
  review: HumanReviewT,
  opts?: { driftInvalidated?: boolean },
): HumanGateResult {
  const failures: string[] = [];
  if (opts?.driftInvalidated === true) failures.push("REVIEW INVALIDATED BY DRIFT");
  if (review.reviewed_commit !== WEB2_REVIEWED_COMMIT)
    failures.push(`commit revisado ${review.reviewed_commit} ≠ ${WEB2_REVIEWED_COMMIT}`);
  if (review.production_url !== WEB2_PRODUCTION_URL)
    failures.push(`URL ${review.production_url} ≠ ${WEB2_PRODUCTION_URL}`);
  if (review.status === "PENDING")
    failures.push("OD-14 OPEN: plantilla PENDING; no hay revisión humana completada");
  if (!filled(review.reviewer)) failures.push("falta reviewer identificable");
  if (review.reviewer_equals_author === true)
    failures.push("reviewer = author: OD-14 no satisfecho (independencia)");
  if (
    filled(review.reviewer) &&
    filled(review.author_name) &&
    review.reviewer.trim().toLowerCase() === review.author_name.trim().toLowerCase()
  )
    failures.push("reviewer = author: OD-14 no satisfecho (independencia)");
  if (review.reviewer_equals_author !== false)
    failures.push("no hay confirmación explícita de que reviewer ≠ author");
  if (!filled(review.review_date)) failures.push("falta review_date");
  if (!filled(review.signature)) failures.push("falta signature");
  if (review.decision === "") failures.push("falta decisión");
  if (review.checklist.some((c) => c.result === "")) failures.push("checklist incompleta");
  const independentApproved =
    review.status === "COMPLETED" &&
    review.decision === "APPROVED" &&
    review.reviewer_equals_author === false &&
    filled(review.reviewer) &&
    filled(review.author_name) &&
    review.reviewer.trim().toLowerCase() !== review.author_name.trim().toLowerCase() &&
    filled(review.review_date) &&
    filled(review.signature) &&
    review.checklist.every((c) => c.result !== "") &&
    opts?.driftInvalidated !== true;
  if (independentApproved && failures.length === 0)
    return {
      id: "OD-14",
      status: "PASS",
      detail: "revisión humana independiente APPROVED",
      failures: [],
      drift: null,
    };
  return {
    id: "OD-14",
    status: "OPEN",
    detail: "OD-14 OPEN: no hay revisión humana independiente completada",
    failures,
    drift: opts?.driftInvalidated === true ? "REVIEW INVALIDATED BY DRIFT" : null,
  };
}

export function evaluateLeg03(
  review: LegalReviewT,
  inv: ReviewInventory,
  opts?: { driftInvalidated?: boolean },
): HumanGateResult {
  const failures: string[] = [];
  if (opts?.driftInvalidated === true) failures.push("REVIEW INVALIDATED BY DRIFT");
  if (review.status === "PENDING")
    failures.push(
      "G-LEG-03 OPEN: registro legal PENDING; este documento vacío no satisface G-LEG-03",
    );
  if (!review.warning.includes("no satisface G-LEG-03"))
    failures.push("falta la advertencia de que el documento vacío no satisface G-LEG-03");
  if (!filled(review.reviewer)) failures.push("falta reviewer legal");
  if (!filled(review.review_date)) failures.push("falta review_date");
  if (!filled(review.signature)) failures.push("falta signature");
  const required = materializedLegalIds(inv);
  const byId = new Map(review.items.map((i) => [i.id, i]));
  for (const id of required) {
    const item = byId.get(id);
    if (item === undefined) {
      failures.push(`Source/Root pública faltante del inventario legal: ${id}`);
      continue;
    }
    if (item.decision === "") failures.push(`${id}: decisión legal vacía; no hay clearance`);
  }
  for (const d of review.derived_types) {
    if (d.clearance === "" || d.clearance === "PENDING")
      failures.push(`tipo de derivado ${d.id}: clearance PENDING`);
  }
  const cgi = review.items.find((i) => i.id === CGI_ROOT_ID);
  if (cgi === undefined) failures.push("falta entrada de LAB-ROOT-0002 (CGI / CC BY-SA 4.0)");
  const cgiFields = [
    review.cgi_cc_by_sa.attribution_to_indec,
    review.cgi_cc_by_sa.cgi_imo_denomination,
    review.cgi_cc_by_sa.cc_by_sa_4_0_reference,
    review.cgi_cc_by_sa.sharealike,
    review.cgi_cc_by_sa.published_derivatives_nature,
    review.cgi_cc_by_sa.sobre_changes_required,
  ];
  if (cgiFields.every((x) => !filled(x)))
    failures.push("sección CGI/CC BY-SA 4.0 sin decisión humana");
  const notRecorded = inv.sources.filter(
    (s) =>
      s.materialization === "PUBLICLY_MATERIALIZED" &&
      s.recorded_license === "NOT_RECORDED" &&
      s.type !== "website_asset",
  );
  for (const s of notRecorded) {
    const item = byId.get(s.id);
    if (item !== undefined && item.decision === "")
      failures.push(`${s.id}: NOT_RECORDED sin decisión humana (no se infiere permiso)`);
  }
  const allCleared =
    review.status === "COMPLETED" &&
    required.every((id) => {
      const d = byId.get(id)?.decision;
      return d === "CLEARED" || d === "CLEARED_WITH_CONDITIONS";
    }) &&
    review.derived_types.every(
      (d) => d.clearance === "CLEARED" || d.clearance === "CLEARED_WITH_CONDITIONS",
    ) &&
    filled(review.reviewer) &&
    filled(review.review_date) &&
    filled(review.signature) &&
    opts?.driftInvalidated !== true;
  if (allCleared && failures.length === 0)
    return {
      id: "G-LEG-03",
      status: "PASS",
      detail: "registro legal humano completo con clearance de Source materializadas",
      failures: [],
      drift: null,
    };
  return {
    id: "G-LEG-03",
    status: "OPEN",
    detail: "G-LEG-03 OPEN: sin registro legal humano válido",
    failures,
    drift: opts?.driftInvalidated === true ? "REVIEW INVALIDATED BY DRIFT" : null,
  };
}

export function evaluateLeg02(sobreHtml: string | undefined, inv: ReviewInventory): HumanGateResult {
  const failures: string[] = [];
  if (sobreHtml === undefined || sobreHtml === "") {
    failures.push(
      "sin HTML de /sobre: G-LEG-02 permanece OPEN (no se verifica atribución pública)",
    );
    return {
      id: "G-LEG-02",
      status: "OPEN",
      detail: "G-LEG-02 OPEN: no hay atribuciones públicas verificables en /sobre",
      failures,
      drift: null,
    };
  }
  const text = visibleText(sobreHtml);
  const cgi = inv.sources.find((s) => s.id === CGI_ROOT_ID);
  if (cgi !== undefined && cgi.materialization === "PUBLICLY_MATERIALIZED") {
    if (!/INDEC/i.test(text)) failures.push("/sobre: falta atribución a INDEC (CGI)");
    if (!/CGI-IMO|CGI/i.test(text)) failures.push("/sobre: falta denominación CGI-IMO");
    if (!/CC BY-SA 4\.0|CC-BY-SA/i.test(text))
      failures.push(`/sobre: falta referencia a ${CGI_LICENSE}`);
  }
  if (!/licenc|atribuc/i.test(text))
    failures.push("/sobre: no hay sección de atribuciones y licencias exigida por G-LEG-02");
  if (failures.length === 0)
    return {
      id: "G-LEG-02",
      status: "PASS",
      detail: "atribuciones públicas presentes en /sobre",
      failures: [],
      drift: null,
    };
  return {
    id: "G-LEG-02",
    status: "OPEN",
    detail:
      "G-LEG-02 OPEN: /sobre no presenta las atribuciones y licencias de cada Source mostrada ni en la cota",
    failures,
    drift: null,
  };
}

export function evaluateHumanGates(
  root: string,
  sobreHtml: string | undefined,
  inventory: ReviewInventory,
): { od14: HumanGateResult; leg03: HumanGateResult; leg02: HumanGateResult } {
  const pin = readPin(root);
  const invalidated =
    pin === null ? true : detectDrift(root, pin).invalidated;
  const human = existsSync(join(root, HUMAN_REVIEW_MD)) ? loadHumanReview(root) : null;
  const legal = existsSync(join(root, LEGAL_REVIEW_YML)) ? loadLegalReview(root) : null;
  const od14 =
    human === null
      ? {
          id: "OD-14" as const,
          status: "OPEN" as const,
          detail: "OD-14 OPEN: falta reviews/WEB-2-HUMAN-REVIEW.md",
          failures: ["falta plantilla de revisión humana"],
          drift: null,
        }
      : evaluateOd14(human, { driftInvalidated: invalidated });
  const leg03 =
    legal === null
      ? {
          id: "G-LEG-03" as const,
          status: "OPEN" as const,
          detail: "G-LEG-03 OPEN: falta registro legal",
          failures: ["falta reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml"],
          drift: null,
        }
      : evaluateLeg03(legal, inventory, { driftInvalidated: invalidated });
  return { od14, leg03, leg02: evaluateLeg02(sobreHtml, inventory) };
}

export function emptyLegalSkeleton(inv: ReviewInventory): LegalReviewT {
  const items = inv.sources
    .filter((s) => s.type !== "website_asset")
    .map((s) => ({
      id: s.id,
      review_date: "",
      reviewer: "",
      decision: "" as const,
      attribution_required: "",
      sharealike_applicable: "",
      publisher_link_required: "",
      conditions: "",
      notes: "",
      evidence_reference: "",
      signature: "",
    }));
  return LegalReview.parse({
    schema: "aletheia-web/web-2-legal-review/1",
    status: "PENDING",
    reviewed_commit: WEB2_REVIEWED_COMMIT,
    production_url: WEB2_PRODUCTION_URL,
    package_generated_at: inv.package_date,
    warning: LEG03_WARNING,
    reviewer: "",
    review_date: "",
    signature: "",
    required_public_attribution_changes: "",
    cgi_cc_by_sa: {
      root_id: "LAB-ROOT-0002",
      attribution_to_indec: "",
      cgi_imo_denomination: "",
      cc_by_sa_4_0_reference: "",
      license_link: "",
      sharealike: "",
      published_derivatives_nature: "",
      sobre_changes_required: "",
    },
    items,
    derived_types: inv.derived_types.map((d) => ({
      id: d.id,
      clearance: "PENDING" as const,
      notes: "",
    })),
  });
}

export function emptyHumanSkeleton(): HumanReviewT {
  return HumanReview.parse({
    schema: "aletheia-web/web-2-human-review/1",
    status: "PENDING",
    project: "ALETHEIA-WEB",
    release: "WEB-2",
    reviewed_commit: WEB2_REVIEWED_COMMIT,
    production_url: WEB2_PRODUCTION_URL,
    package_generated_at: "2026-09-20",
    reviewer: "",
    relationship_to_project: "",
    author_name: "",
    reviewer_equals_author: null,
    review_date: "",
    signature: "",
    observations: "",
    required_changes: "",
    decision: "",
    checklist: [
      { id: 1, item: "Las 18 research questions siguen accesibles.", result: "" },
      {
        id: 2,
        item: "Las cinco destacadas tienen prominencia editorial, no estatus epistemológico superior.",
        result: "",
      },
      {
        id: 3,
        item: "OBSERVED_IN_SOURCE no se presenta como verdad general confirmada.",
        result: "",
      },
      { id: 4, item: "INSUFFICIENT_EVIDENCE permanece explícito.", result: "" },
      { id: 5, item: "REFUTED_WITHIN_SCOPE conserva su scope.", result: "" },
      { id: 6, item: "Los seis GOVERNANCE_REQUIRED siguen sin resolver.", result: "" },
      { id: 7, item: "No aparecen nuevas causalidades.", result: "" },
      { id: 8, item: "No se ocultan limitaciones materiales.", result: "" },
      {
        id: 9,
        item: "Claims e hypotheses no reciben interpretación más fuerte que la frozen.",
        result: "",
      },
      { id: 10, item: "Method/provenance se representan fielmente.", result: "" },
      { id: 11, item: "Avisos y disclaimers son comprensibles.", result: "" },
      {
        id: 12,
        item: "Se distingue investigación frozen de presentación web.",
        result: "",
      },
      { id: 13, item: "No hay contenido materialmente engañoso.", result: "" },
      {
        id: 14,
        item: "No existe otro motivo editorial que impida publicación formal.",
        result: "",
      },
    ],
  });
}
