import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { loadContract, type ModuleContractT } from "../../tools/corpus/contract.ts";
import { resolveRepoPath, srcDir } from "../../tools/corpus/extract.ts";
import { loadGenerated, type GeneratedCorpus } from "../../tools/corpus/load.ts";
import { normalize, type CorpusMap, type CorpusStats } from "../../tools/corpus/normalize.ts";
import { loadPin, type Pin } from "../../tools/corpus/pin.ts";
import { loadEditorial, type EditorialBundle } from "../../tools/editorial/load.ts";

export interface GoldenQuestion {
  QUESTION_ID: string;
  PUBLIC_QUESTION: string;
  CLAIM_IDS: string[];
  CLAIM_STATES: string[];
  HYPOTHESIS_IDS: string[];
  EFFECTIVE_RESOLUTION: { VALUE: string };
}

export interface GateContext {
  root: string;
  pin: Pin;
  contract: ModuleContractT;
  contractRaw: Buffer;
  generated: GeneratedCorpus;
  /** Contenido crudo de `generated/labor/*` en disco (nombre → texto). */
  generatedFiles: Map<string, string>;
  stats: CorpusStats;
  map: CorpusMap;
  editorial: EditorialBundle;
  golden: GoldenQuestion[];
  /** Ruta (`/labor/preguntas/q-0013`) → HTML construido. Vacío si no hay `dist/`. */
  html: Map<string, string>;
  srcDir: string;
  /** Ubicación del repo científico si hay acceso de solo lectura; `null` en CI sin acceso. */
  repo: string | null;
  sources: { path: string; text: string }[];
  files: { path: string; bytes: number }[];
}

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".astro",
  "reports",
  "coverage",
  ".vite",
]);

export function walkFiles(root: string, dir = root): { path: string; bytes: number }[] {
  const out: { path: string; bytes: number }[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walkFiles(root, p));
    else out.push({ path: relative(root, p).split("\\").join("/"), bytes: st.size });
  }
  return out;
}

function htmlRoutes(dist: string): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".html")) {
        const route =
          "/" +
          relative(dist, p)
            .split("\\")
            .join("/")
            .replace(/\.html$/, "")
            .replace(/\/?index$/, "");
        map.set(route === "/" ? "/" : route, readFileSync(p, "utf8"));
      }
    }
  };
  if (existsSync(dist)) walk(dist);
  return map;
}

export function loadContext(root: string): GateContext {
  const { contract, raw } = loadContract(root, "labor");
  const pin = loadPin(root, "labor");
  const dir = srcDir(root, pin);
  const norm = normalize({ root, pin, contract, dir });
  const generated = loadGenerated(root);
  const generatedFiles = new Map<string, string>();
  const gdir = join(root, "generated", "labor");
  for (const name of readdirSync(gdir))
    generatedFiles.set(name, readFileSync(join(gdir, name), "utf8"));

  let repo: string | null = null;
  try {
    const r = resolveRepoPath(root, "labor");
    if (existsSync(join(r, ".git"))) repo = r;
  } catch {
    repo = null;
  }

  const golden = (
    JSON.parse(
      readFileSync(
        join(root, "tests", "fixtures", "golden", "question-map-reconciled.json"),
        "utf8",
      ),
    ) as { questions: GoldenQuestion[] }
  ).questions;

  const sources: { path: string; text: string }[] = [];
  const files = walkFiles(root);
  for (const f of files) {
    if (/^(src|design)\/.*\.(astro|css|ts|mjs)$/.test(f.path))
      sources.push({ path: f.path, text: readFileSync(join(root, f.path), "utf8") });
  }

  return {
    root,
    pin,
    contract,
    contractRaw: raw,
    generated,
    generatedFiles,
    stats: norm.stats,
    map: norm.map,
    editorial: loadEditorial(root, "LAB-Q-0013"),
    golden,
    html: htmlRoutes(join(root, "dist")),
    srcDir: dir,
    repo,
    sources,
    files,
  };
}
