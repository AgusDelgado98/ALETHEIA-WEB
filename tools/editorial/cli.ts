import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { stringify } from "yaml";
import { loadGenerated } from "../corpus/load.ts";
import { canonicalJson, sha256Hex } from "../corpus/util.ts";
import { lintBundle, pendingSignoff, seal, verifyAudit } from "./audit.ts";
import { editorialPaths, loadEditorial, publishedEditorialIds } from "./load.ts";

const root = resolve(import.meta.dirname, "..", "..");

/** Manifest editorial (Data Contract §2.1): hash de cada archivo editorial. Determinista. */
export function editorialManifest(files: Map<string, string>, pending: number, units: number): string {
  const list = [...files.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([path, text]) => ({ path, sha256: sha256Hex(text.replace(/\r\n/g, "\n")), bytes: Buffer.byteLength(text.replace(/\r\n/g, "\n")) }));
  return canonicalJson({ schema: "aletheia-web/editorial-manifest/1", files: list, units, units_pending_author_signoff: pending });
}

function main(): void {
  const cmd = process.argv[2];
  const corpus = loadGenerated(root);
  const qids = publishedEditorialIds(root);

  if (cmd === "seal") {
    let n = 0;
    for (const qid of qids) {
      const bundle = loadEditorial(root, qid);
      const audit = seal(bundle, corpus);
      const path = join(root, editorialPaths(qid).find((p) => p.endsWith(".audit.yml")) as string);
      writeFileSync(path, stringify(audit, { lineWidth: 0 }), "utf8");
      n += audit.records.length;
    }
    console.log(`auditoría sellada: ${n} registros`);
    return;
  }

  const files = new Map<string, string>();
  const seenUnits = new Set<string>();
  let pending = 0;
  const errors: ReturnType<typeof lintBundle> = [];
  const issues: ReturnType<typeof verifyAudit> = [];
  for (const qid of qids) {
    const bundle = loadEditorial(root, qid);
    for (const [p, t] of bundle.files) files.set(p, t);
    const lint = lintBundle(bundle);
    errors.push(...lint.filter((i) => i.severity === "error"));
    for (const w of lint.filter((i) => i.severity === "warn")) console.warn(`  ⚠ ${w.gate} ${w.unit}: ${w.message}`);
    issues.push(...verifyAudit(bundle, corpus));
    for (const u of bundle.units) seenUnits.add(u.string_id);
    pending += pendingSignoff(bundle).length;
  }
  const units = seenUnits.size;
  for (const e of errors) console.error(`  ✗ ${e.gate} ${e.unit}: ${e.message}`);
  for (const i of issues) console.error(`  ✗ ${i.gate} ${i.unit}: ${i.message}`);
  const manifest = editorialManifest(files, pending, units);
  const manifestPath = join(root, "editorial", "manifest.json");
  if (cmd === "build") {
    writeFileSync(manifestPath, manifest, "utf8");
    console.log(`editorial/manifest.json escrito (${units} textos, ${pending} pendientes de firma de la autoría)`);
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
  if (cmd === "check") console.log(`editorial:check OK — ${units} textos con auditoría vigente atada por hash; ${pending} pendientes de firma de la autoría`);
}

main();
