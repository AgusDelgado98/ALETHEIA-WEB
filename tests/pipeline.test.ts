import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { Claim, ClaimEpistemicState, Question, QuestionResolution } from "../schemas/corpus.ts";
import { loadContract } from "../tools/corpus/contract.ts";
import { extract, srcDir } from "../tools/corpus/extract.ts";
import { buildBundle } from "../tools/corpus/generate.ts";
import { git } from "../tools/corpus/git.ts";
import { normalize, numberedSegments } from "../tools/corpus/normalize.ts";
import { buildPin, loadPin, type Pin } from "../tools/corpus/pin.ts";
import { canonicalJson, gitBlobSha, sha256Hex } from "../tools/corpus/util.ts";
import { ROOT } from "./helpers.ts";

const ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@example.org",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@example.org",
  GIT_CONFIG_GLOBAL: "",
  GIT_CONFIG_NOSYSTEM: "1",
};
const sh = (cwd: string, args: string[]): string =>
  execFileSync("git", args, { cwd, env: ENV, encoding: "utf8" }).trim();

/** Repo sintético con un archivo versionado y un tag (para probar la extracción sin tocar los repos reales). */
function syntheticRepo(): { repo: string; commit: string } {
  const repo = mkdtempSync(join(tmpdir(), "aletheia-repo-"));
  sh(repo, ["init", "-q", "-b", "main"]);
  writeFileSync(join(repo, "a.json"), '{"a":1}\n');
  sh(repo, ["add", "."]);
  sh(repo, ["-c", "commit.gpgsign=false", "commit", "-q", "-m", "init"]);
  sh(repo, ["tag", "t1"]);
  return { repo, commit: sh(repo, ["rev-parse", "HEAD"]) };
}

describe("extracción desde objetos git (G-SRC-01/04/05)", () => {
  it("un working tree sucio no cambia el resultado (G-SRC-05) y el repo fuente no cambia (G-SRC-04)", () => {
    const { repo, commit } = syntheticRepo();
    const pin = buildPin({
      repo,
      moduleId: "labor",
      repoId: "ALETHEIA-LABOR",
      tag: "t1",
      expectedCommit: commit,
      consumedPaths: ["a.json"],
    });
    const clean = mkdtempSync(join(tmpdir(), "aletheia-out-"));
    const r1 = extract({ root: ROOT, repo, pin, outDir: clean });
    // ensuciar el working tree: archivo versionado modificado + archivo untracked
    writeFileSync(join(repo, "a.json"), '{"a":999}\n');
    writeFileSync(join(repo, "untracked.txt"), "ajeno al freeze");
    const dirty = mkdtempSync(join(tmpdir(), "aletheia-out-"));
    const r2 = extract({ root: ROOT, repo, pin, outDir: dirty });
    expect(readFileSync(join(dirty, "a.json"), "utf8")).toBe('{"a":1}\n');
    expect(readFileSync(join(dirty, "a.json"))).toEqual(readFileSync(join(clean, "a.json")));
    expect(r1.unchanged && r2.unchanged).toBe(true);
    expect(r2.after.status).toBe(r2.before.status);
  });

  it("el tag que no resuelve al commit del pin falla (G-SRC-01)", () => {
    const { repo } = syntheticRepo();
    expect(() =>
      buildPin({
        repo,
        moduleId: "labor",
        repoId: "x",
        tag: "t1",
        expectedCommit: "3".repeat(40),
        consumedPaths: ["a.json"],
      }),
    ).toThrow(/G-SRC-01/);
  });

  it("un pin adulterado (blob distinto) falla la extracción (G-SRC-02)", () => {
    const { repo, commit } = syntheticRepo();
    const pin = buildPin({
      repo,
      moduleId: "labor",
      repoId: "x",
      tag: "t1",
      expectedCommit: commit,
      consumedPaths: ["a.json"],
    });
    const bad: Pin = { ...pin, files: pin.files.map((f) => ({ ...f, blob_sha: "4".repeat(40) })) };
    expect(() =>
      extract({ root: ROOT, repo, pin: bad, outDir: mkdtempSync(join(tmpdir(), "o-")) }),
    ).toThrow(/G-SRC-02/);
  });

  it("la herramienta se niega a escribir bajo un repo fuente", () => {
    const { repo, commit } = syntheticRepo();
    const pin = buildPin({
      repo,
      moduleId: "labor",
      repoId: "x",
      tag: "t1",
      expectedCommit: commit,
      consumedPaths: ["a.json"],
    });
    expect(() => extract({ root: ROOT, repo, pin, outDir: join(repo, "salida") })).toThrow(
      /rechaza escribir/,
    );
  });

  it("el acceso a git es de solo lectura", () => {
    const { repo } = syntheticRepo();
    for (const sub of ["checkout", "commit", "reset", "clean", "add", "tag", "push"])
      expect(() => git(repo, [sub])).toThrow(/no permitido/);
    expect(git(repo, ["rev-parse", "HEAD"]).length).toBeGreaterThan(0);
  });

  it("el hash de un blob se calcula igual que git", () => {
    const { repo } = syntheticRepo();
    const data = Buffer.from('{"a":1}\n');
    expect(gitBlobSha(data)).toBe(sh(repo, ["rev-parse", "HEAD:a.json"]));
  });
});

describe("determinismo (G-GEN-01/04)", () => {
  const { contract, raw } = loadContract(ROOT, "labor");
  const pin = loadPin(ROOT, "labor");
  it("dos corridas desde limpio producen bytes idénticos y el mismo manifest", () => {
    const a = buildBundle({ root: ROOT, pin, contract, contractRaw: raw });
    const b = buildBundle({ root: ROOT, pin, contract, contractRaw: raw });
    expect([...a.files.keys()]).toEqual([...b.files.keys()]);
    for (const [name, text] of a.files) expect(b.files.get(name), name).toBe(text);
    expect(sha256Hex(a.files.get("manifest.json")!)).toBe(sha256Hex(b.files.get("manifest.json")!));
  });
  it("copiar corpus-src a otra ruta no cambia el resultado (sin rutas del entorno)", () => {
    const dir = mkdtempSync(join(tmpdir(), "aletheia-det-"));
    cpSync(srcDir(ROOT, pin), dir, { recursive: true });
    const a = buildBundle({ root: ROOT, pin, contract, contractRaw: raw });
    const b = buildBundle({ root: ROOT, pin, contract, contractRaw: raw, srcOverride: dir });
    for (const [name, text] of a.files) expect(b.files.get(name), name).toBe(text);
  });
  it("el JSON canónico rechaza NaN, Infinity y undefined", () => {
    expect(() => canonicalJson({ a: NaN })).toThrow();
    expect(() => canonicalJson({ a: Infinity })).toThrow();
    expect(() => canonicalJson({ a: undefined })).toThrow();
    expect(canonicalJson({ b: 1, a: [2, { d: 1, c: 2 }] })).toBe(
      '{\n  "a": [\n    2,\n    {\n      "c": 2,\n      "d": 1\n    }\n  ],\n  "b": 1\n}\n',
    );
  });
  it("el generador falla si intenta abrir la red", () => {
    const url = pathToFileURL(join(ROOT, "tools", "corpus", "generate.ts")).href;
    const code = `import { denyNetwork } from ${JSON.stringify(url)}; denyNetwork(); try { await fetch("http://127.0.0.1:9"); console.log("ABIERTA"); } catch (e) { console.log("BLOQUEADA:" + e.message.slice(0, 24)); }`;
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", code], {
      encoding: "utf8",
    });
    expect(out).toContain("BLOQUEADA");
  });
});

describe("el pipeline detecta deriva del corpus en vez de adivinar", () => {
  const { contract } = loadContract(ROOT, "labor");
  const pin = loadPin(ROOT, "labor");

  /** Copia corpus-src, edita un archivo y ajusta el pin en memoria para que la deriva llegue a la lógica de negocio. */
  function drifted(file: string, edit: (text: string) => string): () => unknown {
    const dir = mkdtempSync(join(tmpdir(), "aletheia-drift-"));
    cpSync(srcDir(ROOT, pin), dir, { recursive: true });
    const p = join(dir, file);
    const text = readFileSync(p, "utf8");
    const next = edit(text);
    expect(next).not.toBe(text);
    writeFileSync(p, next);
    const changed: Pin = {
      ...pin,
      files: pin.files.map((f) =>
        f.path === file ? { ...f, sha256: sha256Hex(readFileSync(p)) } : f,
      ),
    };
    return () => normalize({ root: ROOT, pin: changed, contract, dir });
  }

  it("testigos que discrepan en una fecha", () => {
    expect(
      drifted("metadata/claims/claim-ledger.json", (t) =>
        t.replace("admitted period ends 2021-12", "admitted period ends 2021-11"),
      ),
    ).toThrow(/discrepan|testigo/);
  });
  it("una etiqueta de bloqueo que cambió", () => {
    expect(
      drifted("metadata/claims/claim-ledger.json", (t) =>
        t.replace("(3) No person-level linkage", "(3) Something else"),
      ),
    ).toThrow(/etiqueta del bloqueo/);
  });
  it("un bloqueo que desaparece", () => {
    expect(
      drifted("metadata/claims/claim-ledger.json", (t) =>
        t.replace("(3) No person-level linkage", "(x) No person-level linkage"),
      ),
    ).toThrow(/bloqueos/);
  });
  it("una resolución en S0 que contradice a los claims", () => {
    expect(
      drifted("reports/lab_s/LAB-S0-inventory.json", (t) =>
        t.replace('"VALUE": "INSUFFICIENT_EVIDENCE"', '"VALUE": "OBSERVED_IN_SOURCE"'),
      ),
    ).toThrow(/G-STA-02/);
  });
  it("un archivo de corpus-src que no coincide con el pin", () => {
    const dir = mkdtempSync(join(tmpdir(), "aletheia-drift-"));
    cpSync(srcDir(ROOT, pin), dir, { recursive: true });
    const p = join(dir, "metadata/questions/question-ledger.json");
    writeFileSync(p, readFileSync(p, "utf8") + " ");
    expect(() => normalize({ root: ROOT, pin, contract, dir })).toThrow(/G-SRC-03/);
  });
  it("numeración de bloqueos no consecutiva", () => {
    expect(() => numberedSegments("(1) a (3) b fin", "fin", "t")).toThrow(/consecutiva/);
    expect(() => numberedSegments("(1) a (2) b", "fin", "t")).toThrow(/marcador de fin/);
  });
});

describe("esquemas: Question → 0..N Claims y estados separados", () => {
  const generated = (f: string): { items: Record<string, unknown>[] } =>
    JSON.parse(readFileSync(join(ROOT, "generated", "labor", f), "utf8")) as {
      items: Record<string, unknown>[];
    };
  const q = generated("questions.json").items.find((x) => x["id"] === "LAB-Q-0013")!;

  it("una pregunta admite 0, 1 o N claims (no es 1:1)", () => {
    for (const ids of [[], ["LAB-CLM-0011"], ["LAB-CLM-0002", "LAB-CLM-0004"]]) {
      expect(Question.safeParse({ ...q, claim_ids: ids }).success, JSON.stringify(ids)).toBe(true);
    }
  });
  it("un claim tiene exactamente una pregunta", () => {
    const c = generated("claims.json").items[0]!;
    expect(Claim.safeParse({ ...c, question_id: ["LAB-Q-0013", "LAB-Q-0001"] }).success).toBe(
      false,
    );
  });
  it("NOT_IDENTIFIABLE / BLOCKED_BY_DESIGN / OUTSIDE_LAB_A no son estado de claim", () => {
    for (const bad of ["NOT_IDENTIFIABLE", "BLOCKED_BY_DESIGN", "OUTSIDE_LAB_A"])
      expect(ClaimEpistemicState.safeParse(bad).success, bad).toBe(false);
    const c = generated("claims.json").items[0]!;
    expect(Claim.safeParse({ ...c, epistemic_state: "BLOCKED_BY_DESIGN" }).success).toBe(false);
  });
  it("question_resolution es un campo distinto y no admite mezclar vocabularios", () => {
    const base = { basis_refs: ["LAB-CLM-0011"] };
    expect(
      QuestionResolution.safeParse({
        ...base,
        value: "INSUFFICIENT_EVIDENCE",
        vocabulary: "CLAIM_LIFECYCLE_STATE",
        basis: "CLAIM",
      }).success,
    ).toBe(true);
    // una etiqueta documental no puede declararse como estado de ciclo de vida
    expect(
      QuestionResolution.safeParse({
        ...base,
        value: "BLOCKED_BY_DESIGN",
        vocabulary: "CLAIM_LIFECYCLE_STATE",
        basis: "CLAIM",
      }).success,
    ).toBe(false);
    // una etiqueta documental no puede basarse en un claim
    expect(
      QuestionResolution.safeParse({
        ...base,
        value: "NOT_IDENTIFIABLE",
        vocabulary: "CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS",
        basis: "CLAIM",
      }).success,
    ).toBe(false);
    // un valor de ciclo de vida sin claim que lo respalde no es válido
    expect(
      QuestionResolution.safeParse({
        value: "INSUFFICIENT_EVIDENCE",
        vocabulary: "CLAIM_LIFECYCLE_STATE",
        basis: "CLAIM",
        basis_refs: [],
      }).success,
    ).toBe(false);
    // la etiqueta documental sí es válida en su vocabulario, sin claim
    expect(
      QuestionResolution.safeParse({
        value: "NOT_IDENTIFIABLE",
        vocabulary: "CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS",
        basis: "QUESTION_LEDGER",
        basis_refs: ["LAB-Q-0011"],
      }).success,
    ).toBe(true);
  });
  it("el estado registrado en el ledger no se confunde con la resolución", () => {
    expect(q["ledger_status"]).toBe("NOT_YET_OPERATIONAL");
    expect((q["resolution"] as { value: string }).value).toBe("INSUFFICIENT_EVIDENCE");
  });
  it("solo los claims de la primera ola (ADR-WEB3-01) declaran Figures; el resto no se inventa", () => {
    const withFigures = generated("claims.json")
      .items.filter((c) => (c["figure_ids"] as string[]).length > 0)
      .map((c) => c["id"])
      .sort();
    expect(withFigures).toEqual(["LAB-CLM-0005", "LAB-CLM-0006"]);
  });
  it("cada entidad rechaza campos desconocidos", () => {
    expect(Question.safeParse({ ...q, invento: true }).success).toBe(false);
  });
});

describe("corpus completo: 18 preguntas → 0..N claims", () => {
  const generated = (f: string): { items: Record<string, unknown>[] } =>
    JSON.parse(readFileSync(join(ROOT, "generated", "labor", f), "utf8")) as {
      items: Record<string, unknown>[];
    };
  const questions = (): Record<string, unknown>[] => generated("questions.json").items;
  const claims = (): Record<string, unknown>[] => generated("claims.json").items;
  const byId = (id: string): Record<string, unknown> => {
    const hit = questions().find((x) => x["id"] === id);
    if (hit === undefined) throw new Error(`falta ${id}`);
    return hit;
  };

  it("genera 18 preguntas y 14 claims", () => {
    expect(questions().map((x) => x["id"])).toEqual([
      "LAB-Q-0001",
      "LAB-Q-0002",
      "LAB-Q-0003",
      "LAB-Q-0004",
      "LAB-Q-0005",
      "LAB-Q-0006",
      "LAB-Q-0007",
      "LAB-Q-0008",
      "LAB-Q-0009",
      "LAB-Q-0010",
      "LAB-Q-0011",
      "LAB-Q-0012",
      "LAB-Q-0013",
      "LAB-Q-0014",
      "LAB-Q-0015",
      "LAB-Q-0016",
      "LAB-Q-0017",
      "LAB-Q-0018",
    ]);
    expect(claims()).toHaveLength(14);
  });
  it("5 preguntas tienen 0 claims y resolución documental", () => {
    const zero = ["LAB-Q-0006", "LAB-Q-0007", "LAB-Q-0011", "LAB-Q-0015", "LAB-Q-0017"];
    expect(
      questions()
        .filter((x) => (x["claim_ids"] as string[]).length === 0)
        .map((x) => x["id"]),
    ).toEqual(zero);
    expect((byId("LAB-Q-0006")["resolution"] as { value: string; basis: string }).value).toBe(
      "BLOCKED_BY_DESIGN",
    );
    expect((byId("LAB-Q-0006")["resolution"] as { basis: string }).basis).toBe("REGIME_CLOSEOUT");
    expect((byId("LAB-Q-0007")["resolution"] as { value: string }).value).toBe("OUTSIDE_LAB_A");
    for (const id of ["LAB-Q-0011", "LAB-Q-0015", "LAB-Q-0017"]) {
      const r = byId(id)["resolution"] as { value: string; basis: string; vocabulary: string };
      expect(r.value).toBe("NOT_IDENTIFIABLE");
      expect(r.basis).toBe("QUESTION_LEDGER");
      expect(r.vocabulary).toBe("CLAIM_LIFECYCLE_STATE_RECORDED_AS_QUESTION_LEDGER_STATUS");
    }
    for (const c of claims())
      expect(["NOT_IDENTIFIABLE", "BLOCKED_BY_DESIGN", "OUTSIDE_LAB_A"]).not.toContain(
        c["epistemic_state"],
      );
  });
  it("Q-0003 tiene 2 claims y resolución de pregunta distinta del campo de estado del claim", () => {
    const q3 = byId("LAB-Q-0003");
    expect(q3["claim_ids"]).toEqual(["LAB-CLM-0002", "LAB-CLM-0004"]);
    expect((q3["resolution"] as { value: string; basis: string }).value).toBe("OBSERVED_IN_SOURCE");
    expect((q3["resolution"] as { basis: string }).basis).toBe("CLAIM");
    const pair = claims().filter((c) => c["question_id"] === "LAB-Q-0003");
    expect(pair).toHaveLength(2);
    for (const c of pair) {
      expect(c["epistemic_state"]).toBe("OBSERVED_IN_SOURCE");
      expect(c).not.toHaveProperty("resolution");
    }
  });
});
