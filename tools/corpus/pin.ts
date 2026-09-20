import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, gitBlobSha, sha256Hex } from "./util.ts";
import { git, gitText } from "./git.ts";

/** Pin por archivo (Data Contract §3.1). La autoridad es el commit; el tag se verifica contra él. */
export interface PinFile {
  path: string;
  blob_sha: string;
  bytes: number;
  sha256: string;
}
export interface Pin {
  schema: "aletheia-web/pin/1";
  module_id: string;
  repo_id: string;
  tag: string;
  tag_object: string;
  commit: string;
  tree: string;
  files: PinFile[];
}

export function pinPath(root: string, moduleId: string): string {
  return join(root, "pins", `${moduleId}.pin.json`);
}

export function loadPin(root: string, moduleId: string): Pin {
  const p = pinPath(root, moduleId);
  if (!existsSync(p)) throw new Error(`No existe el pin: ${p}`);
  return JSON.parse(readFileSync(p, "utf8")) as Pin;
}

/**
 * Propone un pin leyendo objetos git del commit de autoridad. El pin resultante lo revisa una persona:
 * un cambio de pin exige ADR. `expectedCommit` protege contra apuntar al commit equivocado.
 */
export function buildPin(args: {
  repo: string;
  moduleId: string;
  repoId: string;
  tag: string;
  expectedCommit: string;
  consumedPaths: readonly string[];
}): Pin {
  const { repo, tag, expectedCommit } = args;
  const commit = gitText(repo, ["rev-parse", `${tag}^{commit}`]);
  if (commit !== expectedCommit) {
    throw new Error(`G-SRC-01: el tag ${tag} resuelve a ${commit}, se esperaba ${expectedCommit}`);
  }
  const files: PinFile[] = [];
  for (const path of [...args.consumedPaths].sort()) {
    const blob_sha = gitText(repo, ["rev-parse", `${commit}:${path}`]);
    const data = git(repo, ["cat-file", "blob", blob_sha]);
    if (gitBlobSha(data) !== blob_sha) throw new Error(`blob sha inconsistente para ${path}`);
    files.push({ path, blob_sha, bytes: data.length, sha256: sha256Hex(data) });
  }
  return {
    schema: "aletheia-web/pin/1",
    module_id: args.moduleId,
    repo_id: args.repoId,
    tag,
    tag_object: gitText(repo, ["rev-parse", tag]),
    commit,
    tree: gitText(repo, ["rev-parse", `${commit}^{tree}`]),
    files,
  };
}

export function writePin(root: string, pin: Pin): void {
  writeFileSync(pinPath(root, pin.module_id), canonicalJson(pin), "utf8");
}
