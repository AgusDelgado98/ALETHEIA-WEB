import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { loadGenerated } from "../corpus/load.ts";
import { canonicalJson, sha256Hex } from "../corpus/util.ts";
import { lintBundle, pendingSignoff, seal, verifyAudit } from "./audit.ts";
import { editorialPaths, loadEditorial } from "./load.ts";

const root = resolve(import.meta.dirname, "..", "..");
const QID = "LAB-Q-0013";

/** Manifest editorial (Data Contract §2.1): hash de cada archivo editorial. Determinista. */
export function editorialManifest(files: Map<string, string>, pending: number, units: number): string {
  const list = [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, text]) => ({ path, sha256: sha256Hex(text.replace(/\r\n/g, "\n")), bytes: Buffer.byteLength(text.replace(/\r\n/g, "\n")) }));
  return canonicalJson({ schema: "aletheia-web/editorial-manifest/1", files: list, units, units_pending_author_signoff: pending });
}

function main(): void {
  const cmd = process.argv[2];
  const corpus = loadGenerated(root);
  const bundle = loadEditorial(root, QID);

  if (cmd === "seal") {
    const audit = seal(bundle, corpus);
    const path = join(root, editorialPaths(QID).find((p) => p.endsWith(".audit.yml")) as string);
    writeFileSync(path, stringify(audit, { lineWidth: 0 }), "utf8");
    console.log(`auditoría sellada: ${audit.records.length} registros`);
    return;
  }

  // check / build: lint + auditoría + manifest
  const lint = lintBundle(bundle);
  const errors = lint.filter((i) => i.severity === "error");
  for (const w of lint.filter((i) => i.severity === "warn")) console.warn(`  ⚠ ${w.gate} ${w.unit}: ${w.message}`);
  for (const e of errors) console.error(`  ✗ ${e.gate} ${e.unit}: ${e.message}`);
  const issues = verifyAudit(bundle, corpus);
  for (const i of issues) console.error(`  ✗ ${i.gate} ${i.unit}: ${i.message}`);
  const manifest = editorialManifest(bundle.files, pendingSignoff(bundle).length, bundle.units.length);
  const manifestPath = join(root, "editorial", "manifest.json");
  if (cmd === "build") {
    writeFileSync(manifestPath, manifest, "utf8");
    console.log(`editorial/manifest.json escrito (${bundle.units.length} textos, ${pendingSignoff(bundle).length} pendientes de firma de la autoría)`);
  } else if (cmd === "check") {
    if (readFileSync(manifestPath, "utf8") !== manifest) {
      console.error("  ✗ editorial/manifest.json no coincide con los archivos editoriales (npm run editorial:build)");
      process.exit(1);
    }
  } else {
    console.error("uso: editorial <seal|build|check>");
    process.exit(2);
  }
  if (errors.length > 0 || issues.length > 0) process.exit(1);
  if (cmd === "check") console.log(`editorial:check OK — ${bundle.units.length} textos con auditoría vigente atada por hash; ${pendingSignoff(bundle).length} pendientes de firma de la autoría`);
}

main();
