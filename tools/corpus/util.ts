import { createHash } from "node:crypto";

/** sha256 en hexadecimal de bytes o de texto UTF-8. */
export function sha256Hex(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** sha1 de un blob de git: sha1("blob <bytes>\0" + contenido). Permite verificar un blob sin acceso al repo. */
export function gitBlobSha(data: Uint8Array): string {
  const header = Buffer.from(`blob ${data.length}\0`, "utf8");
  return createHash("sha1").update(header).update(data).digest("hex");
}

function canon(value: unknown, path: string): unknown {
  if (value === null) return null;
  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      if (!Number.isFinite(value)) throw new Error(`JSON no canónico: número no finito en ${path}`);
      return value;
    case "object": {
      if (Array.isArray(value)) return value.map((v, i) => canon(v, `${path}[${i}]`));
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as Record<string, unknown>).sort()) {
        const v = (value as Record<string, unknown>)[key];
        if (v === undefined) throw new Error(`JSON no canónico: undefined en ${path}.${key}`);
        out[key] = canon(v, `${path}.${key}`);
      }
      return out;
    }
    default:
      throw new Error(`JSON no canónico: tipo ${typeof value} en ${path}`);
  }
}

/**
 * JSON canónico (WEB-0 Data Contract §4.2): UTF-8, `\n`, claves ordenadas, sin espacios finales,
 * sin NaN/Infinity/undefined. Los arrays conservan su orden (el orden es responsabilidad del generador).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canon(value, "$"), null, 2) + "\n";
}

/** Normaliza saltos de línea para hashear fuentes de forma portable entre sistemas. */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n/g, "\n");
}

/** JSON Pointer (RFC 6901) para un índice de array de primer nivel. */
export function pointerIndex(index: number): string {
  return `/${index}`;
}

/** Corta un hash largo para IDs derivados. */
export function short8(hex: string): string {
  return hex.slice(0, 8);
}
