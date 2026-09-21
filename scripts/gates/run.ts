import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson } from "../../tools/corpus/util.ts";
import { loadContext } from "./context.ts";
import { ALL_GATES } from "./gates.ts";

/**
 * Ejecutor de gates CORE_BUILD y RELEASE. Cada gate emite `reports/gates/<id>.json`.
 * Un FAIL de un gate que bloquea CI termina con código 1. Los gates humanos
 * (G-OD-14, G-LEG-02, G-LEG-03) se registran con blocksCi: false: un FAIL/OPEN
 * no fabrica revisión ni cierra el release.
 * Uso: node scripts/gates/run.ts [--require-html]
 */
const root = resolve(import.meta.dirname, "..", "..");
const requireHtml = process.argv.includes("--require-html");
const ctx = loadContext(root);
if (requireHtml && ctx.html.size === 0) {
  console.error(
    "✗ faltan las páginas construidas: ejecutá `npm run build` antes de los gates de HTML",
  );
  process.exit(1);
}

const out = join(root, "reports", "gates");
mkdirSync(out, { recursive: true });
const rows: { id: string; status: string; detail: string }[] = [];
let failed = 0;
for (const g of ALL_GATES) {
  let r;
  try {
    r = g.run(ctx);
  } catch (e) {
    r = {
      status: "FAIL" as const,
      detail: "el gate lanzó una excepción",
      failures: [(e as Error).message],
    };
  }
  const classification = g.classification ?? "CORE_BUILD";
  const blocksCi = g.blocksCi !== false;
  writeFileSync(
    join(out, `${g.id}.json`),
    canonicalJson({ id: g.id, title: g.title, classification, blocks_ci: blocksCi, ...r }),
    "utf8",
  );
  rows.push({ id: g.id, status: r.status, detail: r.detail });
  if (r.status === "FAIL" && blocksCi) failed++;
  const mark = r.status === "PASS" ? "✓" : r.status === "FAIL" ? "✗" : "·";
  console.log(
    `${mark} ${g.id.padEnd(9)} ${r.status.padEnd(4)} ${classification.padEnd(11)} ${g.title}`,
  );
  if (r.status !== "PASS") console.log(`             ${r.detail}`);
  for (const x of r.failures.slice(0, 8)) console.log(`             - ${x}`);
}
const count = (s: string): number => rows.filter((r) => r.status === s).length;
writeFileSync(
  join(out, "summary.json"),
  canonicalJson({
    pass: count("PASS"),
    fail: count("FAIL"),
    not_applicable: count("NA"),
    skipped: count("SKIP"),
    gates: rows,
  }),
  "utf8",
);
console.log(
  `\n${ALL_GATES.length} gates: ${count("PASS")} PASS · ${count("FAIL")} FAIL · ${count("NA")} N/A · ${count("SKIP")} SKIP (routes: ${[...ctx.html.keys()].join(", ") || "ninguna"})`,
);
process.exit(failed > 0 ? 1 : 0);
