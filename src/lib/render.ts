import type { Segment } from "../../tools/editorial/directives.ts";

/**
 * Partes renderizables. Todo token numérico visible es una parte con `kind` (id, ancla, cantidad, hash,
 * versión…): así el escaneo de G-FIG-03 puede distinguir un identificador de una cifra tipeada.
 */
export type NumeralKind = "id" | "date" | "count" | "hash" | "canon" | "ui";

/**
 * `data-figure` (cifra de investigación) NO es una clase de `Part`: solo la emite `FigureValue`, a partir de una
 * Figure ELIGIBLE del artefacto generado (ADR-WEB3-01 D5/D6).
 */
export type Part = { t: "text"; v: string } | { t: "num"; kind: NumeralKind; v: string };

const TOKEN =
  /aletheia-[a-z]+(?:-[a-z]+)*-v[0-9]+\.[0-9]+\.[0-9]+|LAB-[A-Z0-9]+(?:-[A-Z0-9]+)*-[0-9]{3,4}|EP-[0-9]{4}-[A-Z]{3,}|REL-[A-Z]+-[0-9]{3}|KEEP-[0-9]{3}|Cuadro [0-9]+|v[0-9]+\.[0-9]+\.[0-9]+|(?<=commit )[0-9a-f]{7,40}/g;

/** Marca como identificador los IDs, versiones y nombres de cuadro que aparecen en un texto canónico. */
export function markTokens(text: string): Part[] {
  const out: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ t: "text", v: text.slice(last, i) });
    const v = m[0];
    out.push({
      t: "num",
      kind: /^[0-9a-f]{7,40}$/.test(v) ? "hash" : "id",
      v,
    });
    last = i + v.length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/**
 * Numerales de un texto canónico citado (`data-num="canon"`). NO son Figures y no habilitan ninguna cifra de
 * investigación: solo pueden aparecer dentro de una cita canónica (`CanonicalCite`, `lang="en"`).
 */
export function markAllNumerals(text: string): Part[] {
  const out: Part[] = [];
  for (const p of markTokens(text)) {
    if (p.t === "num") {
      out.push(p);
      continue;
    }
    let last = 0;
    for (const m of p.v.matchAll(/\S*[0-9]\S*/g)) {
      const i = m.index ?? 0;
      if (i > last) out.push({ t: "text", v: p.v.slice(last, i) });
      out.push({ t: "num", kind: "canon", v: m[0] });
      last = i + m[0].length;
    }
    if (last < p.v.length) out.push({ t: "text", v: p.v.slice(last) });
  }
  return out;
}

/** Segmentos de directivas → partes (los valores ya vienen resueltos desde generated/). */
export function fromSegments(segments: readonly Segment[]): Part[] {
  return segments.flatMap((s): Part[] => {
    if (s.t === "text") return [{ t: "text", v: s.v }];
    if (s.t === "id") return [{ t: "num", kind: "id", v: s.v }];
    if (s.t === "anchor") return [{ t: "num", kind: "date", v: s.v }];
    return [{ t: "num", kind: "count", v: s.v }];
  });
}

/**
 * Separa la primera oración de un texto (Charter §11.1: cada límite es una frase concreta con su razón en gris,
 * en el mismo párrafo). Si no hay una segunda oración devuelve todo como principal.
 */
export function splitFirstSentence(parts: readonly Part[]): { main: Part[]; reason: Part[] } {
  const main: Part[] = [];
  const reason: Part[] = [];
  let done = false;
  for (const p of parts) {
    if (done) {
      reason.push(p);
      continue;
    }
    if (p.t === "text") {
      const i = p.v.indexOf(". ");
      if (i >= 0) {
        main.push({ t: "text", v: p.v.slice(0, i + 1) });
        const rest = p.v.slice(i + 2);
        if (rest !== "") reason.push({ t: "text", v: rest });
        done = true;
        continue;
      }
    }
    main.push(p);
  }
  return { main, reason };
}

export const plainText = (parts: readonly Part[]): string => parts.map((p) => p.v).join("");
