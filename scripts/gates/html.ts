/**
 * Utilidades mínimas para escanear el HTML estático que produce Astro (bien formado). No es un parser general:
 * alcanza para los gates G-FIG-03, G-UX-01/02/03/05 y G-EDI-08 sobre el contenido implementado.
 */

const VOID = new Set([
  "meta",
  "link",
  "br",
  "hr",
  "img",
  "input",
  "source",
  "path",
  "circle",
  "rect",
  "line",
  "polygon",
]);

/** Quita `<script>` y `<style>` (su contenido no es texto visible). */
export function stripCode(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");
}

/** Elimina los elementos marcados con `data-num` (identificadores, fechas, cantidades: numerales permitidos). */
export function stripAllowedNumerals(html: string): string {
  return html.replace(/<(span|code)\b[^>]*\bdata-num="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, " ");
}

/** Texto visible: contenido de los elementos sin etiquetas, con entidades básicas resueltas. */
export function visibleText(html: string): string {
  return decodeEntities(
    stripCode(html)
      .replace(/<head\b[\s\S]*?<\/head>/i, (m) =>
        (/<title>([\s\S]*?)<\/title>/i.exec(m)?.[0] ?? "").replace(/<\/?title>/gi, " "),
      )
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Nodos de texto individuales (útil para comprobar procedencia de cada cadena mostrada). */
export function textNodes(html: string): string[] {
  const body = /<body\b[\s\S]*<\/body>/i.exec(stripCode(html))?.[0] ?? stripCode(html);
  return body
    .split(/<[^>]+>/)
    .map((t) => decodeEntities(t).replace(/\s+/g, " ").trim())
    .filter((t) => t !== "");
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#([0-9]+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

export interface Tag {
  name: string;
  attrs: Record<string, string>;
  raw: string;
}

export function tags(html: string): Tag[] {
  const out: Tag[] = [];
  for (const m of stripCode(html).matchAll(
    /<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>/]+(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g,
  )) {
    const attrs: Record<string, string> = {};
    for (const a of (m[2] ?? "").matchAll(/([^\s=>/]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[a[1] ?? ""] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? "");
    }
    out.push({ name: (m[1] ?? "").toLowerCase(), attrs, raw: m[0] });
  }
  return out;
}

/** Atributos cuyo valor se muestra o se anuncia a personas (G-FIG-03 incluye atributos, no solo texto). */
export const HUMAN_ATTRS = ["aria-label", "alt", "title", "aria-description", "placeholder"];

export function humanAttributeValues(html: string): { tag: string; attr: string; value: string }[] {
  const out: { tag: string; attr: string; value: string }[] = [];
  for (const t of tags(html)) {
    for (const a of HUMAN_ATTRS) {
      const v = t.attrs[a];
      if (v !== undefined) out.push({ tag: t.name, attr: a, value: v });
    }
    if (
      t.name === "meta" &&
      (t.attrs["name"] === "description" || (t.attrs["property"] ?? "").startsWith("og:")) &&
      t.attrs["content"] !== undefined
    ) {
      out.push({ tag: "meta", attr: "content", value: t.attrs["content"] });
    }
  }
  // <title> de SVG y del documento
  for (const m of stripCode(html).matchAll(/<title>([\s\S]*?)<\/title>/gi))
    out.push({ tag: "title", attr: "text", value: decodeEntities(m[1] ?? "") });
  return out;
}

export function ids(html: string): Set<string> {
  return new Set(tags(html).flatMap((t) => (t.attrs["id"] === undefined ? [] : [t.attrs["id"]])));
}

export { VOID };
