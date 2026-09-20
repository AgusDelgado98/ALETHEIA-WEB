import { DIRECTIVE, DIRECTIVE_KINDS } from "./directives.ts";

export interface LintIssue {
  gate: string;
  unit: string;
  severity: "error" | "warn";
  message: string;
}

/** IDs de entidad y versiones: excepciones versionadas de G-FIG-02 (Editorial Contract §6). */
const ID_EXCEPTIONS = [/\bLAB-[A-Z0-9]+(?:-[A-Z0-9]+)*-[0-9]{3,4}\b/g, /\bEP-[0-9]{4}-[A-Z]{3,}\b/g, /\bREL-[A-Z]+-[0-9]{3}\b/g, /\bKEEP-[0-9]{3}\b/g, /(?<=[v@])[0-9]+\.[0-9]+\.[0-9]+\b/g];

const NUMBER_WORDS = /(?<![\p{L}\p{N}])(dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|trece|catorce|quince|veinte|treinta|cuarenta|cincuenta|cien|ciento|mil|mill[oó]n|millones)(?![\p{L}\p{N}])/giu;

/** Verbos protegidos (Editorial Contract §8.1, lista heredada de LAB-S0 LANGUAGE_GUARDRAILS): G-EDI-03. */
const PROTECTED = /(?<![\p{L}\p{N}])(establece|establecen|establecido|establecida|establecidos|establecidas|confirma|confirman|demuestra|demuestran|prueba|pruebas|corrobora|corroboran|explica|explican|causa|causan|impulsa|impulsan)(?![\p{L}\p{N}])|consistente con|el mercado laboral argentino muestra/giu;

const CAUSAL_CONNECTORS = /(?<![\p{L}\p{N}])(porque|debido a|provoca|provocan|genera|generan|produce|producen|gracias a|por culpa de)(?![\p{L}\p{N}])/giu;

/** Lint de un texto editorial (con directivas sin resolver). Los errores bloquean; los `warn` van a revisión humana. */
export function lintText(unit: string, text: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (gate: string, severity: "error" | "warn", message: string): void => {
    issues.push({ gate, unit, severity, message });
  };

  for (const m of text.matchAll(DIRECTIVE)) {
    if (!(DIRECTIVE_KINDS as readonly string[]).includes(m[1] ?? "")) add("G-EDI-07", "error", `directiva fuera de la lista blanca: ${m[0]}`);
  }
  const stripped = text.replace(DIRECTIVE, "");

  let noIds = stripped;
  for (const re of ID_EXCEPTIONS) noIds = noIds.replace(re, "");
  if (/[0-9]/.test(noIds)) add("G-FIG-02", "error", `literal numérico fuera de una directiva: «${(noIds.match(/\S*[0-9]\S*/) ?? [""])[0]}»`);
  for (const m of noIds.matchAll(NUMBER_WORDS)) add("G-FIG-02", "error", `cantidad escrita a mano («${m[0]}»): usá {{count:…|words}}`);

  for (const m of stripped.matchAll(PROTECTED)) add("G-EDI-03", "error", `verbo protegido sin alcance explícito: «${m[0]}»`);
  // `TODO`/`TBD`/`XXX` van en mayúsculas (sensible a mayúsculas): «Todo eso…» es español corriente.
  if (/\*|\bTODO\b|\bTBD\b|\bXXX\b|\?\?\?/.test(stripped) || /lorem ipsum/i.test(stripped)) add("G-EDI-06", "error", "marcador de dato pendiente o placeholder");
  if (/<\/?[a-zA-Z]/.test(text)) add("G-EDI-07", "error", "HTML crudo en el texto editorial");
  for (const m of stripped.matchAll(CAUSAL_CONNECTORS)) add("G-EDI-04", "warn", `conector causal a revisar: «${m[0]}»`);
  return issues;
}

/** Claves que un archivo editorial de entidad NO puede tener (G-STA-04). */
export const BANNED_STATE_KEYS = ["state", "status", "epistemic_state", "claim_state", "resolution", "effective_resolution", "question_status", "verdict_state"];

export function findBannedKeys(value: unknown, path = "$"): string[] {
  const out: string[] = [];
  if (Array.isArray(value)) value.forEach((v, i) => out.push(...findBannedKeys(v, `${path}[${i}]`)));
  else if (typeof value === "object" && value !== null) {
    for (const [k, v] of Object.entries(value)) {
      if (BANNED_STATE_KEYS.includes(k)) out.push(`${path}.${k}`);
      out.push(...findBannedKeys(v, `${path}.${k}`));
    }
  }
  return out;
}
