import { execFileSync } from "node:child_process";

/**
 * Acceso de SOLO LECTURA a un repositorio científico (Data Contract §3.3).
 * Solo se permiten subcomandos que leen objetos, refs o estado. Nunca checkout ni escritura.
 */
const READ_ONLY = new Set([
  "rev-parse",
  "cat-file",
  "ls-tree",
  "show",
  "for-each-ref",
  "status",
  "--version",
]);

export function git(repo: string, args: readonly string[]): Buffer {
  const sub = args[0];
  if (sub === undefined || !READ_ONLY.has(sub)) {
    throw new Error(`git: subcomando no permitido (solo lectura): ${String(sub)}`);
  }
  return execFileSync("git", ["-C", repo, ...args], {
    env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
    maxBuffer: 512 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

export function gitText(repo: string, args: readonly string[]): string {
  return git(repo, args).toString("utf8").trim();
}

export function gitVersion(): string {
  return execFileSync("git", ["--version"], { encoding: "utf8" }).trim();
}

export interface RepoSnapshot {
  head: string;
  refs: string;
  status: string;
}

/** Foto de HEAD, refs y `git status --porcelain` (G-SRC-04: se compara el CAMBIO, no el estado sucio previo). */
export function snapshot(repo: string): RepoSnapshot {
  return {
    head: gitText(repo, ["rev-parse", "HEAD"]),
    refs: gitText(repo, ["for-each-ref", "--format=%(refname) %(objectname)"]),
    status: gitText(repo, ["status", "--porcelain"]),
  };
}

export function sameSnapshot(a: RepoSnapshot, b: RepoSnapshot): boolean {
  return a.head === b.head && a.refs === b.refs && a.status === b.status;
}
