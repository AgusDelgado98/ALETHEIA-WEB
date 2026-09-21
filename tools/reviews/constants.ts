/** Commit técnico de WEB-2 al que se ata este paquete de revisión humana. */
export const WEB2_REVIEWED_COMMIT = "f4db08b9cfcc4cfbb67f21c93f2c3d6954eb4142";
export const WEB2_PRODUCTION_URL = "https://aletheia-web-seven.vercel.app";
export const WEB2_PACKAGE_DATE = "2026-09-21";
export const WEB2_RELEASE_LABEL = "WEB-2";
export const WEB2_STATUS = "TECHNICALLY COMPLETE / FINAL INDEPENDENT HUMAN REVIEW PENDING";

export const HUMAN_REVIEW_MD = "reviews/WEB-2-HUMAN-REVIEW.md";
export const LEGAL_REVIEW_MD = "reviews/WEB-2-LEGAL-SOURCE-REVIEW.md";
export const LEGAL_REVIEW_YML = "reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml";
export const EDITORIAL_PENDING_MD = "reviews/WEB-2-EDITORIAL-PENDING.md";
export const BATCH_APPROVAL_MD = "reviews/WEB-2-BATCH-APPROVAL.md";
export const PIN_JSON = "reviews/WEB-2-PIN.json";
export const INVENTORY_JSON = "reviews/WEB-2-INVENTORY.json";

/** Rutas cuyo cambio invalida el material sujeto a revisión (no el propio paquete). */
export const REVIEW_MATERIAL_PREFIXES = [
  "editorial/",
  "generated/",
  "src/",
  "public/",
  "governance/",
  "corpus-pins/",
  "corpus-src/",
  "design/",
] as const;

export const KNOWN_LAB_SRC_IDS = [
  "LAB-SRC-0001",
  "LAB-SRC-0002",
  "LAB-SRC-0003",
  "LAB-SRC-0004",
  "LAB-SRC-0005",
  "LAB-SRC-0006",
  "LAB-SRC-0007",
  "LAB-SRC-0008",
  "LAB-SRC-0009",
  "LAB-SRC-0010",
  "LAB-SRC-0011",
] as const;

/** El contrato del módulo cuenta 15 Source; generated/ no materializa la entidad. */
export const CORPUS_SOURCE_COUNT = 15;

export const FEATURED_QUESTION_IDS = [
  "LAB-Q-0005",
  "LAB-Q-0003",
  "LAB-Q-0004",
  "LAB-Q-0013",
  "LAB-Q-0011",
] as const;
export const CGI_ROOT_ID = "LAB-ROOT-0002";
export const CGI_LICENSE = "CC BY-SA 4.0";
export const CGI_LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export const OD14_WARNING =
  "Esta plantilla no constituye una revisión humana completada y no satisface OD-14 mientras no exista una segunda persona identificable distinta del autor.";

export const LEG03_WARNING = "Este documento vacío no satisface G-LEG-03.";
