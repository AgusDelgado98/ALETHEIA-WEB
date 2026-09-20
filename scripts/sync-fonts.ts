import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { canonicalJson, sha256Hex } from "../tools/corpus/util.ts";

/**
 * Fuentes finales del Charter (§3.2), autoalojadas. Licencia SIL OFL 1.1 (permite autoalojar y redistribuir con
 * la licencia). Origen reproducible: paquetes npm `@fontsource*` con versión exacta y lockfile con integridad.
 * Se copia SOLO el subconjunto latino (Spanish incluido) y los ejes/pesos usados (B-FONT ≤ 160 KB).
 * Uso: node scripts/sync-fonts.ts [--lock]   (--lock reescribe design/fonts.lock.json)
 */
const root = resolve(import.meta.dirname, "..");
const FONTS = [
  {
    pkg: "@fontsource-variable/newsreader",
    file: "newsreader-latin-wght-normal.woff2",
    out: "newsreader-latin-wght.woff2",
    family: "Newsreader",
    license: "LICENSE",
  },
  {
    pkg: "@fontsource-variable/instrument-sans",
    file: "instrument-sans-latin-wght-normal.woff2",
    out: "instrument-sans-latin-wght.woff2",
    family: "Instrument Sans",
    license: "LICENSE",
  },
  {
    pkg: "@fontsource/ibm-plex-mono",
    file: "ibm-plex-mono-latin-400-normal.woff2",
    out: "ibm-plex-mono-latin-400.woff2",
    family: "IBM Plex Mono",
    license: "LICENSE",
  },
];

const lockPath = join(root, "design", "fonts.lock.json");
const writeLock = process.argv.includes("--lock");
const outDir = join(root, "public", "fonts");
const licDir = join(outDir, "licenses");
mkdirSync(licDir, { recursive: true });

const lock: {
  fonts: {
    pkg: string;
    version: string;
    family: string;
    out: string;
    bytes: number;
    sha256: string;
    license: string;
  }[];
} = { fonts: [] };
for (const f of FONTS) {
  const pkgDir = join(root, "node_modules", f.pkg);
  const version = (
    JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as { version: string }
  ).version;
  const licenseName = (
    JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as { license: string }
  ).license;
  const src = join(pkgDir, "files", f.file);
  const data = readFileSync(src);
  copyFileSync(src, join(outDir, f.out));
  copyFileSync(join(pkgDir, f.license), join(licDir, `${f.family.replace(/ /g, "-")}-OFL.txt`));
  lock.fonts.push({
    pkg: f.pkg,
    version,
    family: f.family,
    out: f.out,
    bytes: data.length,
    sha256: sha256Hex(data),
    license: licenseName,
  });
}

if (writeLock) {
  writeFileSync(lockPath, canonicalJson(lock), "utf8");
  console.log(`design/fonts.lock.json escrito (${lock.fonts.length} fuentes)`);
} else {
  if (!existsSync(lockPath))
    throw new Error("falta design/fonts.lock.json (node scripts/sync-fonts.ts --lock)");
  if (readFileSync(lockPath, "utf8") !== canonicalJson(lock))
    throw new Error("las fuentes instaladas difieren de design/fonts.lock.json");
  console.log("fuentes verificadas contra design/fonts.lock.json");
}
console.log(
  lock.fonts.map((x) => `${x.out} ${x.bytes} B`).join("\n"),
  `\ntotal ${lock.fonts.reduce((n, x) => n + x.bytes, 0)} B`,
);
