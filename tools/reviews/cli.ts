import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson } from "../corpus/util.ts";
import {
  BATCH_APPROVAL_MD,
  EDITORIAL_PENDING_MD,
  HUMAN_REVIEW_MD,
  INVENTORY_JSON,
  LEGAL_REVIEW_MD,
  LEGAL_REVIEW_YML,
  PIN_JSON,
} from "./constants.ts";
import {
  buildInventory,
  detectDrift,
  inventoryBodyHash,
  pinFromInventory,
  readPin,
} from "./inventory.ts";
import {
  emptyHumanSkeleton,
  emptyLegalSkeleton,
  loadHumanReview,
  loadLegalReview,
} from "./status.ts";
import {
  legalYaml,
  renderBatchApprovalGuide,
  renderEditorialPending,
  renderHumanReviewMarkdown,
  renderLegalMarkdown,
} from "./render.ts";

const root = resolve(import.meta.dirname, "..", "..");

function write(rel: string, text: string): void {
  const p = join(root, rel);
  mkdirSync(join(root, "reviews"), { recursive: true });
  writeFileSync(p, text.endsWith("\n") ? text : `${text}\n`, "utf8");
}

function build(): void {
  const inv = buildInventory(root);
  const pin = pinFromInventory(inv);
  write(INVENTORY_JSON, canonicalJson(inv));
  write(PIN_JSON, canonicalJson(pin));
  write(EDITORIAL_PENDING_MD, renderEditorialPending(inv));
  write(BATCH_APPROVAL_MD, renderBatchApprovalGuide(inv));
  const legalPath = join(root, LEGAL_REVIEW_YML);
  const legal = existsSync(legalPath) ? loadLegalReview(root) : emptyLegalSkeleton(inv);
  const expectedIds = emptyLegalSkeleton(inv).items.map((i) => i.id);
  const have = new Set(legal.items.map((i) => i.id));
  if (expectedIds.some((id) => !have.has(id))) {
    throw new Error(
      "WEB-2-LEGAL-SOURCE-REVIEW.yml no cubre el inventario actual; no se rellenan decisiones. Regenerá el esqueleto a mano si el inventario cambió.",
    );
  }
  write(LEGAL_REVIEW_YML, legalYaml(legal));
  write(LEGAL_REVIEW_MD, renderLegalMarkdown(legal, inv));
  const humanPath = join(root, HUMAN_REVIEW_MD);
  const human = existsSync(humanPath) ? loadHumanReview(root) : emptyHumanSkeleton();
  write(HUMAN_REVIEW_MD, renderHumanReviewMarkdown(human));
  console.log(
    `reviews:build OK — ${inv.verdicts.total_units} textos, ${inv.pending.length} PENDING_AUTHOR_REVIEW, inventario ${inventoryBodyHash(inv).slice(0, 12)}…`,
  );
}

function sameText(got: string, want: string): boolean {
  const n = (s: string): string => s.replace(/\r\n/g, "\n").replace(/\n+$/, "\n");
  return n(got) === n(want);
}

function check(): void {
  const inv = buildInventory(root);
  const pin = readPin(root);
  if (pin === null) {
    console.error("falta reviews/WEB-2-PIN.json");
    process.exit(1);
  }
  if (readFileSync(join(root, PIN_JSON), "utf8") !== canonicalJson(pinFromInventory(inv))) {
    console.error("WEB-2-PIN.json no coincide con el inventario (npm run reviews:build)");
    process.exit(1);
  }
  if (readFileSync(join(root, INVENTORY_JSON), "utf8") !== canonicalJson(inv)) {
    console.error("WEB-2-INVENTORY.json no coincide (npm run reviews:build)");
    process.exit(1);
  }
  const drift = detectDrift(root, pin);
  if (drift.invalidated) {
    console.error(`REVIEW INVALIDATED BY DRIFT: ${drift.detail}`);
    for (const p of drift.material_paths_changed) console.error(`  - ${p}`);
    process.exit(1);
  }
  const legal = loadLegalReview(root);
  const human = loadHumanReview(root);
  if (!sameText(readFileSync(join(root, LEGAL_REVIEW_MD), "utf8"), renderLegalMarkdown(legal, inv))) {
    console.error("WEB-2-LEGAL-SOURCE-REVIEW.md no coincide con el YAML/inventario");
    process.exit(1);
  }
  if (!sameText(readFileSync(join(root, HUMAN_REVIEW_MD), "utf8"), renderHumanReviewMarkdown(human))) {
    console.error("WEB-2-HUMAN-REVIEW.md no coincide con su front matter");
    process.exit(1);
  }
  if (
    !sameText(readFileSync(join(root, EDITORIAL_PENDING_MD), "utf8"), renderEditorialPending(inv))
  ) {
    console.error("WEB-2-EDITORIAL-PENDING.md no coincide");
    process.exit(1);
  }
  console.log(
    `reviews:check OK — ${drift.detail}; plantillas humanas PENDING no cierran OD-14 ni G-LEG-03`,
  );
}

const cmd = process.argv[2];
if (cmd === "build") build();
else if (cmd === "check") check();
else {
  console.error("uso: reviews <build|check>");
  process.exit(2);
}
