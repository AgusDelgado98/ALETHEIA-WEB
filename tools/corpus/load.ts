import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ENTITY_FILES,
  Manifest,
  type EntityFileName,
  type ManifestT,
} from "../../schemas/corpus.ts";
import type { NormalizedCorpus } from "./normalize.ts";
import { sha256Hex } from "./util.ts";

/** Corpus web generado (`generated/<módulo>/`), validado contra los esquemas estrictos al cargar. */
export interface GeneratedCorpus extends NormalizedCorpus {
  manifest: ManifestT;
  /** sha256 del `manifest.json` tal como está en disco (se muestra en Procedencia). */
  manifestSha256: string;
}

export function loadGenerated(root: string, moduleId = "labor", dir?: string): GeneratedCorpus {
  const base = dir ?? join(root, "generated", moduleId);
  const out: Record<string, unknown[]> = {};
  for (const [name, schema] of Object.entries(ENTITY_FILES) as [
    EntityFileName,
    (typeof ENTITY_FILES)[EntityFileName],
  ][]) {
    const p = join(base, `${name}.json`);
    if (!existsSync(p)) throw new Error(`Falta ${p}: ejecutá npm run corpus:build`);
    const file = JSON.parse(readFileSync(p, "utf8")) as { items: unknown[] };
    out[name] = file.items.map((item, i) => {
      const r = schema.safeParse(item);
      if (!r.success) throw new Error(`${name}[${i}] no cumple su esquema: ${r.error.message}`);
      return r.data;
    });
  }
  const manifestRaw = readFileSync(join(base, "manifest.json"));
  const manifest = Manifest.parse(JSON.parse(manifestRaw.toString("utf8")));
  return {
    ...(out as unknown as NormalizedCorpus),
    manifest,
    manifestSha256: sha256Hex(manifestRaw),
  };
}

/** Índice de todas las entidades por `id` para resolver referencias. */
export function entityIndex(
  c: NormalizedCorpus,
): Map<string, { kind: EntityFileName; item: Record<string, unknown> }> {
  const idx = new Map<string, { kind: EntityFileName; item: Record<string, unknown> }>();
  for (const kind of Object.keys(ENTITY_FILES) as EntityFileName[]) {
    for (const item of c[kind] as unknown as Record<string, unknown>[]) {
      const id = String(item["id"]);
      if (idx.has(id)) throw new Error(`ID repetido entre entidades: ${id}`);
      idx.set(id, { kind, item });
    }
  }
  return idx;
}
