import { entityIndex, type GeneratedCorpus } from "../corpus/load.ts";

/**
 * Directivas del texto editorial (WEB-0 Editorial Contract §6). El editor no escribe números ni fechas:
 * escribe una directiva y el generador pone el valor, con su formato (función pura de valor + estilo).
 *   {{id:<ID de entidad>}}                  → el ID, en mono
 *   {{anchor:<ID de ancla>}}                → fecha o mes formateado es-AR
 *   {{count:<ID de claim>.blockers|words}}  → cantidad de bloqueos, en palabras
 */
export type Segment =
  | { t: "text"; v: string }
  | { t: "id"; v: string }
  | { t: "anchor"; v: string; id: string }
  | { t: "count"; v: string; of: string };

export const DIRECTIVE = /\{\{([a-z]+):([^}|]+)(?:\|([a-z]+))?\}\}/g;
export const DIRECTIVE_KINDS = ["id", "anchor", "count"] as const;

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WORDS = ["cero", "un", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez"];

/** Formato es-AR determinista, sin `Intl` ni locale del entorno. */
export function formatAnchor(valueRaw: string, style: "month-long" | "date-long"): string {
  const m = /^([0-9]{4})-([0-9]{2})(?:-([0-9]{2}))?$/.exec(valueRaw);
  if (m === null) throw new Error(`ancla con formato inválido: ${valueRaw}`);
  const month = MONTHS[Number(m[2]) - 1];
  if (month === undefined) throw new Error(`mes inválido: ${valueRaw}`);
  if (style === "month-long") return `${month} de ${m[1]}`;
  if (m[3] === undefined) throw new Error(`date-long exige día: ${valueRaw}`);
  return `${Number(m[3])} de ${month} de ${m[1]}`;
}

export class DirectiveError extends Error {}

export function parseSegments(text: string, c: GeneratedCorpus): Segment[] {
  const out: Segment[] = [];
  const idx = entityIndex(c);
  let last = 0;
  for (const m of text.matchAll(DIRECTIVE)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ t: "text", v: text.slice(last, start) });
    const [, kind, arg, opt] = m;
    if (kind === undefined || arg === undefined) throw new DirectiveError(`directiva mal formada: ${m[0]}`);
    if (!(DIRECTIVE_KINDS as readonly string[]).includes(kind)) throw new DirectiveError(`directiva fuera de la lista blanca: ${kind}`);
    if (kind === "id") {
      if (!idx.has(arg)) throw new DirectiveError(`{{id:${arg}}}: no existe en generated/`);
      out.push({ t: "id", v: arg });
    } else if (kind === "anchor") {
      const a = c.anchors.find((x) => x.id === arg);
      if (a === undefined) throw new DirectiveError(`{{anchor:${arg}}}: no existe en generated/`);
      out.push({ t: "anchor", v: formatAnchor(a.value_raw, a.display.style), id: arg });
    } else {
      const [claimId, what] = arg.split(".");
      if (what !== "blockers" || claimId === undefined) throw new DirectiveError(`{{count:${arg}}}: solo se admite <claim>.blockers`);
      const n = c.blockers.filter((b) => b.claim_id === claimId).length;
      if (n === 0) throw new DirectiveError(`{{count:${arg}}}: no hay bloqueos para ${claimId}`);
      out.push({ t: "count", v: opt === "words" ? (WORDS[n] ?? String(n)) : String(n), of: arg });
    }
    last = start + m[0].length;
  }
  if (last < text.length) out.push({ t: "text", v: text.slice(last) });
  return out;
}

/** Texto plano con las directivas ya resueltas (para hashes, lint del texto final y accesibilidad). */
export function plain(segments: readonly Segment[]): string {
  return segments.map((s) => s.v).join("");
}
