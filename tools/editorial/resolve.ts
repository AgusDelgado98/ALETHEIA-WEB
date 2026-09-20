import { entityIndex, type GeneratedCorpus } from "../corpus/load.ts";
import { canonicalJson } from "../corpus/util.ts";

/** Resuelve una referencia canónica `labor/<ID>#<campo>` a su texto. Devuelve `null` si no resuelve (G-REF-01). */
export function resolveRef(c: GeneratedCorpus, ref: string): string | null {
  if (ref.startsWith("vocab:claim_state:")) {
    const code = ref.slice("vocab:claim_state:".length);
    return c.claims.some((x) => x.epistemic_state === code) ? code : null;
  }
  if (ref.startsWith("vocab:question_resolution:")) {
    const code = ref.slice("vocab:question_resolution:".length);
    return c.questions.some((x) => x.resolution.value === code) ? code : null;
  }
  const [gid, field] = ref.split("#");
  if (gid === undefined || !gid.startsWith("labor/")) return null;
  const id = gid.slice("labor/".length);

  if (field !== undefined && field.startsWith("blocker:")) {
    const n = Number(field.slice("blocker:".length));
    const b = c.blockers.find((x) => x.claim_id === id && x.ordinal === n);
    return b === undefined ? null : `${b.label} -- ${b.text}`;
  }
  if (field !== undefined && field.startsWith("limitation:")) {
    const n = Number(field.slice("limitation:".length));
    const l = c.limitations.find((x) => x.owner_id === id && x.ordinal === n);
    return l === undefined ? null : l.text;
  }
  const hit = entityIndex(c).get(id);
  if (hit === undefined) return null;
  if (field === undefined) return canonicalJson(hit.item);
  const v = hit.item[field];
  if (v === undefined) return null;
  return typeof v === "string" ? v : canonicalJson(v);
}

/** Id derivado de una limitación a partir de su referencia `dueño#limitation:n`. */
export function limitationIdFromRef(c: GeneratedCorpus, ref: string): string | null {
  const [gid, field] = ref.split("#");
  if (gid === undefined || field === undefined || !field.startsWith("limitation:")) return null;
  const id = gid.replace(/^labor\//, "");
  const n = Number(field.slice("limitation:".length));
  return c.limitations.find((x) => x.owner_id === id && x.ordinal === n)?.id ?? null;
}
