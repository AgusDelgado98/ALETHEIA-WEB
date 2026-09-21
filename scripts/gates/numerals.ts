import { formatFigureValue } from "../../tools/corpus/figures.ts";
import type { GateContext } from "./context.ts";
import { decodeEntities, stripCode, VOID } from "./html.ts";

/**
 * Validación del marcado numérico del HTML (ADR-WEB3-01 D5/D6). Un numeral solo es legítimo si su clase lo justifica
 * y, en el caso de una cifra de investigación, si lo autoriza el ARTEFACTO GENERADO, no el marcado:
 *
 *  - `data-figure="<id>"`: el ID existe en `generated/labor/figures.json`, la entrada de `figure_specs` es ELIGIBLE,
 *    el texto es exactamente `formatFigureValue(figura)` y aparece dentro de la pregunta y el claim de la Figure.
 *  - `data-num="canon"`: solo dentro de una cita canónica (`q[data-canonical-cite]`) y verbatim en el corpus generado.
 *    NUNCA se convierte en una Figure.
 *  - `data-num="ui" | "count"`: enteros. `id`, `date`, `hash`: sus patrones cerrados.
 *
 * `data-figure` NO es un escape hatch: `<span data-figure>123</span>` o `data-figure="fig.inventado"` fallan.
 */

export const NUMERAL_KINDS = ["id", "date", "count", "hash", "canon", "ui"] as const;

interface Ancestor {
  name: string;
  attrs: Record<string, string>;
}
interface Found {
  name: string;
  attrs: Record<string, string>;
  start: number;
  end: number;
  inner: string | null;
  ancestors: Ancestor[];
}

const TAG =
  /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;

function parseAttrs(src: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const a of src.matchAll(/([^\s=>/]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))
    attrs[a[1] ?? ""] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
  return attrs;
}

/** Elementos con `data-figure` o `data-num`, con sus ancestros. El HTML de Astro está bien formado. */
function scan(html: string): { found: Found[]; body: string } {
  const body = stripCode(html);
  const stack: Ancestor[] = [];
  const found: Found[] = [];
  for (const m of body.matchAll(TAG)) {
    const closing = m[1] === "/";
    const name = (m[2] ?? "").toLowerCase();
    if (closing) {
      if (VOID.has(name)) continue;
      while (stack.length > 0 && stack[stack.length - 1]!.name !== name) stack.pop();
      stack.pop();
      continue;
    }
    const attrs = parseAttrs(m[3] ?? "");
    const selfClosing = m[4] === "/" || VOID.has(name);
    if ("data-figure" in attrs || "data-num" in attrs) {
      const after = (m.index ?? 0) + m[0].length;
      const lt = body.indexOf("<", after);
      const close = `</${name}`;
      const plain = lt >= 0 && body.startsWith(close, lt);
      const endTag = plain ? body.indexOf(">", lt) : -1;
      found.push({
        name,
        attrs,
        start: m.index ?? 0,
        end: endTag >= 0 ? endTag + 1 : after,
        inner: plain ? decodeEntities(body.slice(after, lt)) : null,
        ancestors: stack.map((a) => ({ name: a.name, attrs: a.attrs })),
      });
    }
    if (!selfClosing) stack.push({ name, attrs });
  }
  return { found, body };
}

const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

const haystackCache = new WeakMap<object, string>();
/** Todas las cadenas de `generated/` (el corpus canónico), normalizadas. */
function corpusText(ctx: GateContext): string {
  const hit = haystackCache.get(ctx.generatedFiles);
  if (hit !== undefined) return hit;
  const parts: string[] = [];
  for (const t of ctx.generatedFiles.values())
    for (const s of t.match(/"((?:[^"\\]|\\.)*)"/g) ?? [])
      parts.push(norm(JSON.parse(s) as string));
  const out = parts.join("\n");
  haystackCache.set(ctx.generatedFiles, out);
  return out;
}

const ID_TOKENS: RegExp[] = [
  /fig\.LAB-CLM-[0-9]{4}\.[a-z0-9_]+/g,
  /aletheia-[a-z]+(?:-[a-z]+)*-v[0-9]+\.[0-9]+\.[0-9]+/g,
  /LAB-[A-Z0-9]+(?:-[A-Z0-9]+)*-[0-9]{3,4}/g,
  /EP-[0-9]{4}-[A-Z]{3,}/g,
  /REL-[A-Z]+-[0-9]{3}/g,
  /KEEP-[0-9]{3}/g,
  /Cuadro [0-9]+/g,
  /v?[0-9]+\.[0-9]+\.[0-9]+/g,
];

/** Comprueba la forma de un `data-num` según su clase. Devuelve un motivo o `null`. */
function classProblem(kind: string, text: string): string | null {
  const t = norm(text);
  switch (kind) {
    case "ui":
      return /^[0-9]+$/.test(t) ? null : "un numeral de interfaz es un entero, sin unidad ni signo";
    case "count":
      // conteo autorizado: entero, o su forma en palabras ({{count:…|words}})
      return /^[0-9]+$/.test(t) || /^[a-záéíóúñ]+$/.test(t)
        ? null
        : "un conteo es un entero (o su forma en palabras), sin unidad ni signo";
    case "hash":
      return /^[0-9a-f]{7,64}$/.test(t) ||
        /^aletheia-[a-z]+(?:-[a-z]+)*-v[0-9]+\.[0-9]+\.[0-9]+$/.test(t)
        ? null
        : "un hash es hexadecimal o un tag de versión";
    case "date":
      return /[%]|\bpp\b/.test(t) || !/[0-9]{4}/.test(t)
        ? "una fecha/período lleva un año y ninguna unidad"
        : null;
    case "id": {
      let rest = t;
      for (const re of ID_TOKENS) rest = rest.replace(re, " ");
      return /[0-9%]/.test(rest)
        ? "un identificador solo contiene IDs, versiones o nombres de cuadro"
        : null;
    }
    default:
      return null;
  }
}

export interface NumeralScan {
  failures: string[];
  /** HTML sin los elementos numéricos VÁLIDOS (los inválidos permanecen para que los demás gates los vean). */
  stripped: string;
  /** IDs de Figure renderizados correctamente, por orden de aparición. */
  figures: string[];
}

export function scanNumerals(route: string, html: string, ctx: GateContext): NumeralScan {
  const { found, body } = scan(html);
  const failures: string[] = [];
  const figures: string[] = [];
  const valid: [number, number][] = [];
  const corpus = corpusText(ctx);

  for (const el of found) {
    const isFigure = "data-figure" in el.attrs;
    const kind = el.attrs["data-num"];
    const where = `${route}: <${el.name}${isFigure ? " data-figure" : ""}${kind === undefined ? "" : ` data-num="${kind}"`}>`;
    if (isFigure && kind !== undefined) {
      failures.push(`${where} mezcla data-figure con data-num`);
      continue;
    }
    if (isFigure) {
      const id = el.attrs["data-figure"] ?? "";
      const text = el.inner === null ? null : norm(el.inner);
      if (el.name !== "span") {
        failures.push(`${where} data-figure solo se admite en <span>`);
        continue;
      }
      if (id === "") {
        failures.push(`${where} data-figure sin ID de Figure («${text ?? "…"}»)`);
        continue;
      }
      const spec = ctx.contract.figure_specs.find((s) => `fig.${s.claim_id}.${s.key}` === id);
      if (spec !== undefined && spec.status !== "ELIGIBLE") {
        failures.push(`${where} ${id} es ${spec.status}: no se publica`);
        continue;
      }
      const fig = ctx.generated.figures.find((x) => x.id === id);
      if (spec === undefined || fig === undefined) {
        failures.push(
          `${where} el ID «${id}» no existe en figure_specs ni en el artefacto generado`,
        );
        continue;
      }
      const expected = norm(formatFigureValue(fig));
      if (text === null || text !== expected) {
        failures.push(
          `${where} ${id}: el texto «${text ?? "contenido anidado"}» no es el valor registrado «${expected}»`,
        );
        continue;
      }
      const inQuestion = el.ancestors.some((a) => a.attrs["data-question-id"] === fig.question_id);
      const inClaim = el.ancestors.some((a) => a.attrs["data-claim-id"] === fig.claim_id);
      if (!inQuestion || !inClaim) {
        failures.push(
          `${where} ${id} aparece fuera de la pregunta ${fig.question_id} o del claim ${fig.claim_id} que la autoriza`,
        );
        continue;
      }
      if (el.ancestors.some((a) => "data-figure" in a.attrs || a.attrs["data-num"] !== undefined)) {
        failures.push(`${where} ${id} está anidada dentro de otro elemento numérico`);
        continue;
      }
      figures.push(id);
      valid.push([el.start, el.end]);
      continue;
    }
    // data-num: clase cerrada
    if (kind === undefined || !(NUMERAL_KINDS as readonly string[]).includes(kind)) {
      failures.push(`${where} clase numérica desconocida: «${kind ?? ""}»`);
      continue;
    }
    if (el.inner === null) {
      failures.push(`${where} el numeral no puede contener otros elementos`);
      continue;
    }
    if (kind === "canon") {
      const inCite = el.ancestors.some((a) => a.name === "q" && "data-canonical-cite" in a.attrs);
      if (!inCite) {
        failures.push(
          `${where} «${norm(el.inner)}»: un numeral canónico solo puede aparecer dentro de una cita canónica`,
        );
        continue;
      }
      if (el.ancestors.some((a) => "data-figure" in a.attrs)) {
        failures.push(
          `${where} «${norm(el.inner)}»: un numeral canónico no puede estar dentro de una Figure`,
        );
        continue;
      }
      if (!corpus.includes(norm(el.inner))) {
        failures.push(`${where} «${norm(el.inner)}» no figura literalmente en el corpus generado`);
        continue;
      }
    } else {
      const why = classProblem(kind, el.inner);
      if (why !== null) {
        failures.push(`${where} «${norm(el.inner)}»: ${why}`);
        continue;
      }
    }
    valid.push([el.start, el.end]);
  }

  let stripped = "";
  let last = 0;
  for (const [s, e] of valid.sort((a, b) => a[0] - b[0])) {
    if (s < last) continue;
    stripped += `${body.slice(last, s)} `;
    last = e;
  }
  stripped += body.slice(last);
  return { failures, stripped, figures };
}
