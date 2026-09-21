import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import { join, relative } from "node:path";
import {
  ENTITY_FILES,
  GENERATOR_VERSION,
  Manifest,
  type EntityFileName,
  type ManifestT,
} from "../../schemas/corpus.ts";
import type { ModuleContractT } from "./contract.ts";
import { normalize, type NormalizeResult } from "./normalize.ts";
import type { Pin } from "./pin.ts";
import { canonicalJson, normalizeEol, sha256Hex } from "./util.ts";

/** Sin red (Data Contract §4.2.4): el generador falla si intenta abrirla. */
export function denyNetwork(): void {
  const fail = (): never => {
    throw new Error(
      "Red deshabilitada: el generador no puede abrir conexiones (Data Contract §4.2)",
    );
  };
  (globalThis as { fetch: unknown }).fetch = fail;
  net.Socket.prototype.connect = fail as unknown as typeof net.Socket.prototype.connect;
}

function walk(dir: string, exts: readonly string[]): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, exts));
    else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** Hash del código que produce el corpus: `tools/corpus` + `schemas` (G-GEN-03). EOL normalizado. */
export function generatorSourceSha256(root: string): string {
  const files = [
    ...walk(join(root, "tools", "corpus"), [".ts"]),
    ...walk(join(root, "schemas"), [".ts"]),
  ]
    .map((p) => relative(root, p).split("\\").join("/"))
    .sort();
  const lines = files.map(
    (f) => `${f}\0${sha256Hex(normalizeEol(readFileSync(join(root, f), "utf8")))}`,
  );
  return sha256Hex(lines.join("\n"));
}

export interface GeneratedBundle {
  /** Ruta relativa dentro de `generated/<módulo>/` → contenido. */
  files: Map<string, string>;
  manifest: ManifestT;
  result: NormalizeResult;
}

/** Valida cada entidad contra su esquema estricto (G-SCH-01). Devuelve todos los errores, no solo el primero. */
export function validateSchemas(corpus: NormalizeResult["corpus"]): string[] {
  const errors: string[] = [];
  for (const [name, schema] of Object.entries(ENTITY_FILES) as [
    EntityFileName,
    (typeof ENTITY_FILES)[EntityFileName],
  ][]) {
    (corpus[name] as unknown[]).forEach((item, i) => {
      const r = schema.safeParse(item);
      if (!r.success)
        errors.push(
          `${name}[${i}]: ${r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`,
        );
    });
  }
  return errors;
}

const ENTITY_LABEL: Record<EntityFileName, string> = {
  questions: "Question",
  claims: "Claim",
  hypotheses: "Hypothesis",
  evidence: "Evidence",
  "evidence-roots": "EvidenceRoot",
  "statistical-objects": "StatisticalObject",
  limitations: "Limitation",
  blockers: "Blocker",
  anchors: "Anchor",
  figures: "Figure",
  episodes: "Episode",
  "governance-rulings": "GovernanceRuling",
  relations: "Relation",
  "preserved-results": "PreservedResult",
};

export function buildBundle(args: {
  root: string;
  pin: Pin;
  contract: ModuleContractT;
  contractRaw: Buffer;
  srcOverride?: string;
}): GeneratedBundle {
  const { root, pin, contract, contractRaw } = args;
  const result = normalize({
    root,
    pin,
    contract,
    ...(args.srcOverride === undefined ? {} : { dir: args.srcOverride }),
  });
  const errors = validateSchemas(result.corpus);
  if (errors.length > 0)
    throw new Error(`G-SCH-01: ${errors.length} error(es) de esquema:\n${errors.join("\n")}`);

  const files = new Map<string, string>();
  const fileEntries: ManifestT["files"] = [];
  const counts: Record<string, number> = {};
  for (const name of Object.keys(ENTITY_FILES) as EntityFileName[]) {
    const items = result.corpus[name];
    counts[name] = items.length;
    const text = canonicalJson({
      schema_version: contract.schema_version,
      module_id: contract.module_id,
      entity: ENTITY_LABEL[name],
      items,
    });
    files.set(`${name}.json`, text);
    fileEntries.push({
      path: `${name}.json`,
      sha256: sha256Hex(text),
      bytes: Buffer.byteLength(text),
    });
  }
  const states = result.corpus.claims.map((c) => c.epistemic_state);
  const invariants: Record<string, number> = {};
  for (const k of Object.keys(contract.invariants))
    invariants[k] = states.filter((s) => s === k).length;

  const manifest = Manifest.parse({
    schema: "aletheia-web/module-manifest/1",
    module_id: contract.module_id,
    version: contract.version,
    status: contract.status,
    schema_version: contract.schema_version,
    generator_version: GENERATOR_VERSION,
    generator_source_sha256: generatorSourceSha256(root),
    pin: {
      repo_id: pin.repo_id,
      tag: pin.tag,
      tag_object: pin.tag_object,
      commit: pin.commit,
      tree: pin.tree,
    },
    contract_sha256: sha256Hex(normalizeEol(contractRaw.toString("utf8"))),
    slice: { question_ids: contract.slice.question_ids },
    source_files: pin.files.map((f) => ({
      path: f.path,
      blob_sha: f.blob_sha,
      sha256: f.sha256,
      bytes: f.bytes,
    })),
    files: fileEntries.sort((a, b) => a.path.localeCompare(b.path)),
    entity_counts: counts,
    invariants,
  });
  files.set("manifest.json", canonicalJson(manifest));
  return { files, manifest, result };
}

export function writeBundle(outDir: string, bundle: GeneratedBundle): void {
  mkdirSync(outDir, { recursive: true });
  for (const [name, text] of bundle.files) writeFileSync(join(outDir, name), text, "utf8");
}

export function readBundleFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const name of readdirSync(dir).sort()) out.set(name, readFileSync(join(dir, name), "utf8"));
  return out;
}
