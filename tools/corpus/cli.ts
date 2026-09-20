import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadContract } from "./contract.ts";
import { extract, resolveRepoPath, srcDir, verifyAgainstRepo, verifyVendored } from "./extract.ts";
import { buildBundle, denyNetwork, readBundleFiles, writeBundle } from "./generate.ts";
import { buildPin, loadPin, writePin } from "./pin.ts";

const root = resolve(import.meta.dirname, "..", "..");
const MODULE = "labor";

function usage(): never {
  console.error("uso: corpus <pin|extract|verify-pin|build|check>");
  process.exit(2);
}

function main(): void {
  const cmd = process.argv[2];
  const { contract, raw } = loadContract(root, MODULE);

  if (cmd === "pin") {
    const repo = resolveRepoPath(root, MODULE);
    const pin = buildPin({
      repo,
      moduleId: MODULE,
      repoId: contract.repo.repo_id,
      tag: contract.repo.tag,
      expectedCommit: contract.repo.commit,
      consumedPaths: contract.consumed_paths,
    });
    writePin(root, pin);
    console.log(`pin escrito: ${pin.files.length} archivos, commit ${pin.commit.slice(0, 7)}`);
    return;
  }

  const pin = loadPin(root, MODULE);
  if (pin.commit !== contract.repo.commit || pin.tag !== contract.repo.tag)
    throw new Error("El pin no coincide con el contrato del módulo");

  if (cmd === "extract") {
    const repo = resolveRepoPath(root, MODULE);
    const r = extract({ root, repo, pin });
    console.log(
      `extraídos ${r.files} archivos (${r.bytes} B) desde objetos git; repo fuente sin cambios: ${String(r.unchanged)}`,
    );
    return;
  }

  if (cmd === "verify-pin") {
    let problems = verifyVendored(root, pin);
    console.log(
      `offline: ${pin.files.length} archivos verificados contra el pin, ${problems.length} problema(s)`,
    );
    let repoOk: string;
    try {
      const repo = resolveRepoPath(root, MODULE);
      const online = verifyAgainstRepo(root, repo, pin);
      problems = [...problems, ...online];
      repoOk = `con acceso de solo lectura: ${online.length} problema(s)`;
    } catch (e) {
      repoOk = `sin acceso al repo fuente (${(e as Error).message.split("\n")[0]})`;
    }
    console.log(`online: ${repoOk}`);
    for (const p of problems) console.error(`  ✗ ${p.path}: ${p.problem}`);
    if (problems.length > 0) process.exit(1);
    return;
  }

  if (cmd === "build" || cmd === "check") {
    denyNetwork();
    const bundle = buildBundle({ root, pin, contract, contractRaw: raw });
    if (cmd === "build") {
      const out = join(root, "generated", MODULE);
      writeBundle(out, bundle);
      console.log(
        `generated/${MODULE}: ${bundle.files.size} archivos; conteos ${JSON.stringify(bundle.manifest.entity_counts)}`,
      );
      return;
    }
    // check: G-GEN-01 (dos corridas idénticas) y G-GEN-02 (lo commiteado == regenerado)
    const second = buildBundle({ root, pin, contract, contractRaw: raw });
    const tmp = mkdtempSync(join(tmpdir(), "aletheia-gen-"));
    try {
      const bad: string[] = [];
      for (const [name, text] of bundle.files)
        if (second.files.get(name) !== text) bad.push(`G-GEN-01 ${name}: dos corridas difieren`);
      const committed = readBundleFiles(join(root, "generated", MODULE));
      for (const [name, text] of bundle.files)
        if (committed.get(name) !== text)
          bad.push(`G-GEN-02 ${name}: generated/ commiteado difiere del regenerado`);
      for (const name of committed.keys())
        if (!bundle.files.has(name)) bad.push(`G-GEN-02 ${name}: archivo sobrante en generated/`);
      if (bad.length > 0) {
        for (const b of bad) console.error(`  ✗ ${b}`);
        process.exit(1);
      }
      console.log(
        `corpus:check OK — ${bundle.files.size} archivos idénticos en dos corridas y contra generated/`,
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
    return;
  }
  void srcDir;
  usage();
}

main();
