import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadContext, type GateContext } from "../scripts/gates/context.ts";

export const ROOT = resolve(import.meta.dirname, "..");
export const ROUTE = "/labor/preguntas/q-0013";

let cached: GateContext | undefined;
/** Contexto real de gates (cargado una vez por archivo de test). */
export function realContext(): GateContext {
  cached ??= loadContext(ROOT);
  return cached;
}

/** Copia profunda de lo que los fixtures mutan; los `Map`/`Buffer` se comparten porque los gates no los mutan. */
export function cloneCtx(ctx: GateContext): GateContext {
  return {
    ...ctx,
    generated: structuredClone(ctx.generated),
    generatedFiles: new Map(ctx.generatedFiles),
    stats: structuredClone(ctx.stats),
    map: structuredClone(ctx.map),
    editorial: structuredClone(ctx.editorial),
    golden: structuredClone(ctx.golden),
    html: new Map(ctx.html),
    sources: structuredClone(ctx.sources),
    files: structuredClone(ctx.files),
  };
}

export function tempCopy(rel: string): string {
  const dir = mkdtempSync(join(tmpdir(), "aletheia-test-"));
  cpSync(join(ROOT, rel), join(dir, rel), { recursive: true });
  return dir;
}
