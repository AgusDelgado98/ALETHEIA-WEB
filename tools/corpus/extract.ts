import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { git, gitText, sameSnapshot, snapshot, type RepoSnapshot } from "./git.ts";
import type { Pin } from "./pin.ts";
import { gitBlobSha, sha256Hex } from "./util.ts";

/** Carpeta vendorizada: `corpus-src/<módulo>@<commit corto>/<ruta original>` (Data Contract §3.2). */
export function srcDir(root: string, pin: Pin): string {
  return join(root, "corpus-src", `${pin.module_id}@${pin.commit.slice(0, 7)}`);
}

/** El repo científico se ubica por variable de entorno o por el registro humano de `corpus-pins.json`. */
export function resolveRepoPath(root: string, moduleId: string): string {
  const env = process.env[`ALETHEIA_${moduleId.toUpperCase()}_REPO`];
  if (env !== undefined && env !== "") return env;
  const pins = JSON.parse(readFileSync(join(root, "corpus-pins", "corpus-pins.json"), "utf8")) as {
    pins: Record<string, { source_path: string }>;
  };
  const entry = pins.pins[moduleId];
  if (entry === undefined) throw new Error(`Sin ubicación registrada para el módulo ${moduleId}`);
  return entry.source_path;
}

export function isInside(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export interface ExtractReport {
  files: number;
  bytes: number;
  before: RepoSnapshot;
  after: RepoSnapshot;
  unchanged: boolean;
}

/**
 * S1 `extract`: copia byte a byte los archivos del pin desde OBJETOS GIT (nunca el working tree),
 * verificando blob sha y sha256, y falla ante cualquier diferencia o si el repo fuente cambió (G-SRC-04/05).
 */
export function extract(args: {
  root: string;
  repo: string;
  pin: Pin;
  outDir?: string;
}): ExtractReport {
  const { root, repo, pin } = args;
  const outDir = args.outDir ?? srcDir(root, pin);
  if (isInside(repo, outDir))
    throw new Error("La herramienta rechaza escribir bajo un repo fuente (Data Contract §3.3.4)");

  const before = snapshot(repo);
  const commit = gitText(repo, ["rev-parse", `${pin.tag}^{commit}`]);
  if (commit !== pin.commit)
    throw new Error(`G-SRC-01: ${pin.tag} resuelve a ${commit}, el pin exige ${pin.commit}`);
  const tree = gitText(repo, ["rev-parse", `${pin.commit}^{tree}`]);
  if (tree !== pin.tree) throw new Error(`G-SRC-01: tree ${tree} != pin ${pin.tree}`);

  let bytes = 0;
  for (const f of pin.files) {
    const blob = gitText(repo, ["rev-parse", `${pin.commit}:${f.path}`]);
    if (blob !== f.blob_sha)
      throw new Error(`G-SRC-02: blob de ${f.path} es ${blob}, el pin exige ${f.blob_sha}`);
    const data = git(repo, ["cat-file", "blob", blob]);
    if (gitBlobSha(data) !== f.blob_sha)
      throw new Error(`G-SRC-02: contenido de ${f.path} no corresponde a su blob`);
    if (data.length !== f.bytes)
      throw new Error(`G-SRC-03: ${f.path} pesa ${data.length} B, el pin exige ${f.bytes}`);
    if (sha256Hex(data) !== f.sha256)
      throw new Error(`G-SRC-03: sha256 de ${f.path} distinto del pin`);
    const dest = join(outDir, f.path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, data);
    bytes += data.length;
  }

  const after = snapshot(repo);
  const unchanged = sameSnapshot(before, after);
  if (!unchanged) throw new Error("G-SRC-04: el repo fuente cambió durante la extracción");
  return { files: pin.files.length, bytes, before, after, unchanged };
}

export interface VendoredProblem {
  path: string;
  problem: string;
}

/** Verificación OFFLINE de `corpus-src/` contra el pin (G-SRC-02 y G-SRC-03 con los hashes del pin). */
export function verifyVendored(
  root: string,
  pin: Pin,
  dir: string = srcDir(root, pin),
): VendoredProblem[] {
  const problems: VendoredProblem[] = [];
  for (const f of pin.files) {
    const p = join(dir, f.path);
    if (!existsSync(p)) {
      problems.push({ path: f.path, problem: "falta el archivo vendorizado" });
      continue;
    }
    const data = readFileSync(p);
    if (data.length !== f.bytes)
      problems.push({ path: f.path, problem: `bytes ${data.length} != ${f.bytes}` });
    if (gitBlobSha(data) !== f.blob_sha)
      problems.push({ path: f.path, problem: "blob_sha distinto del pin (G-SRC-02)" });
    if (sha256Hex(data) !== f.sha256)
      problems.push({ path: f.path, problem: "sha256 distinto del pin (G-SRC-03)" });
  }
  return problems;
}

/** Verificación CON acceso de solo lectura al repo (G-SRC-01 y no-drift de `corpus-src/` contra el tag). */
export function verifyAgainstRepo(
  root: string,
  repo: string,
  pin: Pin,
  dir: string = srcDir(root, pin),
): VendoredProblem[] {
  const problems: VendoredProblem[] = [];
  const commit = gitText(repo, ["rev-parse", `${pin.tag}^{commit}`]);
  if (commit !== pin.commit)
    problems.push({ path: pin.tag, problem: `G-SRC-01: el tag resuelve a ${commit}` });
  for (const f of pin.files) {
    const blob = gitText(repo, ["rev-parse", `${pin.commit}:${f.path}`]);
    if (blob !== f.blob_sha)
      problems.push({ path: f.path, problem: `blob en el repo ${blob} != pin` });
    const p = join(dir, f.path);
    if (
      existsSync(p) &&
      sha256Hex(readFileSync(p)) !== sha256Hex(git(repo, ["cat-file", "blob", blob]))
    ) {
      problems.push({ path: f.path, problem: "corpus-src difiere del objeto git (drift)" });
    }
  }
  return problems;
}
