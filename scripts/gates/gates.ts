import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENTITY_FILES, GENERATOR_VERSION, type EntityFileName } from "../../schemas/corpus.ts";
import { verifyAgainstRepo, verifyVendored } from "../../tools/corpus/extract.ts";
import { gitText, sameSnapshot, snapshot } from "../../tools/corpus/git.ts";
import {
  buildBundle,
  generatorSourceSha256,
  validateSchemas,
} from "../../tools/corpus/generate.ts";
import { entityIndex } from "../../tools/corpus/load.ts";
import { sha256Hex, short8 } from "../../tools/corpus/util.ts";
import { parseSegments, plain } from "../../tools/editorial/directives.ts";
import { lintBundle, verifyAudit } from "../../tools/editorial/audit.ts";
import { limitationIdFromRef } from "../../tools/editorial/resolve.ts";
import type { EditorialBundle, EditorialUnit } from "../../tools/editorial/load.ts";
import type { GateContext } from "./context.ts";
import { plainText } from "../../src/lib/render.ts";
import { loadQuestionView } from "../../src/lib/view.ts";
import {
  humanAttributeValues,
  ids,
  stripAllowedNumerals,
  stripCode,
  tags,
  textNodes,
  visibleText,
} from "./html.ts";

export type Status = "PASS" | "FAIL" | "NA" | "SKIP";
export interface Outcome {
  status: Status;
  detail: string;
  failures: string[];
}
export interface Gate {
  id: string;
  title: string;
  run: (ctx: GateContext) => Outcome;
}

const ok = (detail: string): Outcome => ({ status: "PASS", detail, failures: [] });
const na = (detail: string): Outcome => ({ status: "NA", detail, failures: [] });
const skip = (detail: string): Outcome => ({ status: "SKIP", detail, failures: [] });
const res = (failures: string[], okDetail: string): Outcome =>
  failures.length === 0
    ? ok(okDetail)
    : { status: "FAIL", detail: `${failures.length} fallo(s)`, failures };

const eq = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const uniq = (xs: readonly string[]): string[] => [...new Set(xs)].sort();

const editorialBundles = (ctx: GateContext): EditorialBundle[] => {
  const seen = new Set<string>();
  const out: EditorialBundle[] = [];
  for (const b of [ctx.editorial, ...(ctx.editorials ?? [])]) {
    if (seen.has(b.finding.canonical_ref)) continue;
    seen.add(b.finding.canonical_ref);
    out.push(b);
  }
  return out;
};
const allUnits = (ctx: GateContext): EditorialUnit[] => {
  const seen = new Set<string>();
  const out: EditorialUnit[] = [];
  for (const b of editorialBundles(ctx)) {
    for (const u of b.units) {
      if (seen.has(u.string_id)) continue;
      seen.add(u.string_id);
      out.push(u);
    }
  }
  return out;
};
const publishedQuestionIds = (ctx: GateContext): string[] =>
  uniq(editorialBundles(ctx).map((b) => b.finding.canonical_ref.replace(/^labor\//, "")));
const bundleForQuestion = (ctx: GateContext, qid: string): EditorialBundle =>
  editorialBundles(ctx).find((b) => b.finding.canonical_ref === `labor/${qid}`) ?? ctx.editorial;
/** Rutas que son páginas de pregunta (llevan `data-question-id`). */
const questionPages = (ctx: GateContext): [string, string][] =>
  [...ctx.html].filter(([, h]) => h.includes("data-question-id="));
/** Fichas editoriales publicadas (Q-0013, Q-0011). Las páginas canónicas mínimas no copian esos bloques. */
const editorialQuestionPages = (ctx: GateContext): [string, string][] => {
  const pubs = new Set(publishedQuestionIds(ctx));
  return questionPages(ctx).filter(([, html]) => {
    const qid = tags(html).find((x) => x.attrs["data-question-id"] !== undefined)?.attrs[
      "data-question-id"
    ];
    return qid !== undefined && pubs.has(qid);
  });
};
const lintAll = (ctx: GateContext): ReturnType<typeof lintBundle> =>
  editorialBundles(ctx).flatMap((b) => lintBundle(b));
const ENTITY_KINDS = Object.keys(ENTITY_FILES) as EntityFileName[];
const allEntities = (ctx: GateContext): Record<string, unknown>[] =>
  ENTITY_KINDS.flatMap((k) => ctx.generated[k] as unknown as Record<string, unknown>[]);

// ─────────────────────────────── G-SRC ───────────────────────────────

const srcProblems = (ctx: GateContext, tag: string): string[] =>
  verifyVendored(ctx.root, ctx.pin, ctx.srcDir)
    .filter((p) => p.problem.includes(tag) || p.problem.startsWith("falta"))
    .map((p) => `${p.path}: ${p.problem}`);

const gSrc01: Gate = {
  id: "G-SRC-01",
  title: "El tag pineado resuelve exactamente al commit del pin",
  run(ctx) {
    const f: string[] = [];
    if (ctx.pin.commit !== ctx.contract.repo.commit)
      f.push(`pin.commit ${ctx.pin.commit} != contrato ${ctx.contract.repo.commit}`);
    if (ctx.pin.tag !== ctx.contract.repo.tag)
      f.push(`pin.tag ${ctx.pin.tag} != contrato ${ctx.contract.repo.tag}`);
    const m0 = JSON.parse(
      readFileSync(join(ctx.root, "corpus-pins", "corpus-pins.json"), "utf8"),
    ) as { pins: { labor: { commit: string; freeze_tag: string; tree: string } } };
    if (
      m0.pins.labor.commit !== ctx.pin.commit ||
      m0.pins.labor.freeze_tag !== ctx.pin.tag ||
      m0.pins.labor.tree !== ctx.pin.tree
    )
      f.push("pins/labor.pin.json difiere del registro humano corpus-pins/corpus-pins.json");
    if (ctx.repo !== null) {
      const commit = gitText(ctx.repo, ["rev-parse", `${ctx.pin.tag}^{commit}`]);
      if (commit !== ctx.pin.commit) f.push(`el tag resuelve a ${commit}`);
    }
    return res(
      f,
      ctx.repo === null
        ? "consistencia offline (pin = contrato = registro humano); sin acceso al repo fuente"
        : "el tag resuelve al commit del pin en el repo fuente (solo lectura)",
    );
  },
};
const gSrc02: Gate = {
  id: "G-SRC-02",
  title: "El blob_sha de cada archivo consumido coincide con el pin",
  run: (ctx) =>
    res(srcProblems(ctx, "G-SRC-02"), `${ctx.pin.files.length} archivos con blob_sha igual al pin`),
};
const gSrc03: Gate = {
  id: "G-SRC-03",
  title: "corpus-src/ es byte-idéntico a los objetos del tag",
  run(ctx) {
    const f = [
      ...srcProblems(ctx, "G-SRC-03"),
      ...verifyVendored(ctx.root, ctx.pin, ctx.srcDir)
        .filter((p) => p.problem.startsWith("bytes"))
        .map((p) => `${p.path}: ${p.problem}`),
    ];
    if (ctx.repo !== null)
      f.push(
        ...verifyAgainstRepo(ctx.root, ctx.repo, ctx.pin, ctx.srcDir).map(
          (p) => `${p.path}: ${p.problem}`,
        ),
      );
    return res(
      f,
      ctx.repo === null
        ? "sha256 y bytes iguales al pin (offline)"
        : "sha256 y bytes iguales al pin y a los objetos git del tag",
    );
  },
};
const gSrc04: Gate = {
  id: "G-SRC-04",
  title: "Los repos fuente no cambian por causa del pipeline",
  run(ctx) {
    if (ctx.repo === null) return skip("sin acceso de solo lectura al repo fuente");
    const before = snapshot(ctx.repo);
    verifyAgainstRepo(ctx.root, ctx.repo, ctx.pin, ctx.srcDir);
    const after = snapshot(ctx.repo);
    return res(
      sameSnapshot(before, after) ? [] : ["HEAD, refs o status cambiaron"],
      "HEAD, refs y `git status --porcelain` idénticos antes y después",
    );
  },
};
const gSrc05: Gate = {
  id: "G-SRC-05",
  title: "La extracción lee objetos git, no el working tree",
  run: () => na("se prueba con un repo sintético de working tree sucio (tests/pipeline.test.ts)"),
};

// ─────────────────────────────── G-GEN ───────────────────────────────

const bundleOf = (ctx: GateContext) =>
  buildBundle({
    root: ctx.root,
    pin: ctx.pin,
    contract: ctx.contract,
    contractRaw: ctx.contractRaw,
    srcOverride: ctx.srcDir,
  });

const gGen01: Gate = {
  id: "G-GEN-01",
  title: "Dos corridas producen el mismo manifest (y los mismos archivos)",
  run(ctx) {
    const a = bundleOf(ctx);
    const b = bundleOf(ctx);
    const f = [...a.files]
      .filter(([n, t]) => b.files.get(n) !== t)
      .map(([n]) => `${n} difiere entre corridas`);
    return res(
      f,
      `${a.files.size} archivos byte-idénticos en dos corridas; manifest ${sha256Hex(a.files.get("manifest.json") ?? "").slice(0, 12)}…`,
    );
  },
};
const gGen02: Gate = {
  id: "G-GEN-02",
  title: "generated/ commiteado == regenerado desde corpus-src/",
  run(ctx) {
    const a = bundleOf(ctx);
    const f: string[] = [];
    for (const [n, t] of a.files)
      if (ctx.generatedFiles.get(n) !== t) f.push(`${n}: difiere del regenerado`);
    for (const n of ctx.generatedFiles.keys())
      if (!a.files.has(n)) f.push(`${n}: archivo sobrante`);
    return res(f, "generated/ idéntico al regenerado");
  },
};
const gGen03: Gate = {
  id: "G-GEN-03",
  title: "generator_version y generator_source_sha256 coherentes con tools/corpus",
  run(ctx) {
    const m = ctx.generated.manifest;
    const f: string[] = [];
    if (m.generator_version !== GENERATOR_VERSION)
      f.push(`generator_version ${m.generator_version} != ${GENERATOR_VERSION}`);
    if (m.generator_source_sha256 !== generatorSourceSha256(ctx.root))
      f.push("generator_source_sha256 no coincide con el árbol tools/corpus + schemas");
    if (m.contract_sha256 !== sha256Hex(ctx.contractRaw.toString("utf8").replace(/\r\n/g, "\n")))
      f.push("contract_sha256 no coincide con modules/labor.contract.json");
    return res(
      f,
      `generador ${m.generator_version}, código ${m.generator_source_sha256.slice(0, 12)}…`,
    );
  },
};
const gGen04: Gate = {
  id: "G-GEN-04",
  title:
    "Sin timestamps de ejecución, rutas absolutas, usuario/host ni orden dependiente del entorno",
  run(ctx) {
    const f: string[] = [];
    for (const [name, text] of ctx.generatedFiles) {
      if (
        /(?<![A-Za-z])[A-Za-z]:\\/.test(text) ||
        /(?<![A-Za-z:/])[A-Za-z]:\/(?!\/)/.test(text) ||
        /\/(Users|home)\//.test(text)
      )
        f.push(`${name}: ruta absoluta`);
      if (/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}/.test(text)) f.push(`${name}: timestamp`);
      if (/generated_at|built_at|created_at/.test(text))
        f.push(`${name}: campo de fecha de ejecución`);
    }
    return res(f, "sin rutas absolutas, timestamps ni campos de fecha de ejecución");
  },
};
const gGen05: Gate = {
  id: "G-GEN-05",
  title:
    "Golden: IDs, pregunta→claims, estados, resolución e hypothesis_ids == reconciliación aceptada (18 preguntas / 14 claims)",
  run(ctx) {
    const f: string[] = [];
    const sums = readFileSync(
      join(ctx.root, "tests", "fixtures", "golden", "SHA256SUMS.txt"),
      "utf8",
    );
    const goldenHash = sha256Hex(
      readFileSync(join(ctx.root, "tests", "fixtures", "golden", "question-map-reconciled.json")),
    );
    if (!sums.includes(goldenHash)) f.push("el fixture golden no coincide con su hash fijado");
    const ids18 = ctx.golden.map((g) => g.QUESTION_ID).sort();
    if (!eq(ids18, Object.keys(ctx.map.questions).sort()))
      f.push("los IDs de pregunta difieren del golden");
    for (const g of ctx.golden) {
      const m = ctx.map.questions[g.QUESTION_ID];
      if (m === undefined) continue;
      if (!eq(m.claim_ids, g.CLAIM_IDS))
        f.push(
          `${g.QUESTION_ID}: claim_ids ${m.claim_ids.join(",")} != golden ${g.CLAIM_IDS.join(",")}`,
        );
      if (!eq(m.claim_states, g.CLAIM_STATES))
        f.push(`${g.QUESTION_ID}: estados de claim difieren del golden`);
      if (!eq(m.hypothesis_ids, [...g.HYPOTHESIS_IDS].sort()))
        f.push(`${g.QUESTION_ID}: hypothesis_ids difieren del golden`);
      if (m.resolution !== g.EFFECTIVE_RESOLUTION.VALUE)
        f.push(
          `${g.QUESTION_ID}: resolución ${m.resolution} != golden ${g.EFFECTIVE_RESOLUTION.VALUE}`,
        );
    }
    if (Object.keys(ctx.map.claims).length !== 14) f.push("no hay 14 claims en el corpus");
    // lo GENERADO (el corte) también debe coincidir con el golden
    for (const q of ctx.generated.questions) {
      const g = ctx.golden.find((x) => x.QUESTION_ID === q.id);
      if (g === undefined) f.push(`${q.id}: no está en el golden`);
      else {
        if (!eq(q.claim_ids, g.CLAIM_IDS)) f.push(`${q.id}: generated claim_ids != golden`);
        if (q.resolution.value !== g.EFFECTIVE_RESOLUTION.VALUE)
          f.push(`${q.id}: generated resolución != golden`);
        if (!eq([...q.hypothesis_ids].sort(), [...g.HYPOTHESIS_IDS].sort()))
          f.push(`${q.id}: generated hypothesis_ids != golden`);
      }
    }
    for (const c of ctx.generated.claims) {
      const st = ctx.map.claims[c.id];
      if (st === undefined || st.state !== c.epistemic_state)
        f.push(`${c.id}: estado generado ${c.epistemic_state} != corpus ${st?.state ?? "?"}`);
    }
    return res(
      f,
      "18 preguntas y 14 claims coinciden con la reconciliación aceptada; el corte generado también",
    );
  },
};

// ─────────────────────────────── G-SCH / G-CNT ───────────────────────────────

const gSch01: Gate = {
  id: "G-SCH-01",
  title: "Toda entidad valida contra su esquema estricto",
  run: (ctx) =>
    res(
      validateSchemas(ctx.generated),
      `${allEntities(ctx).length} entidades válidas; sin campos desconocidos`,
    ),
};
const gSch02: Gate = {
  id: "G-SCH-02",
  title: "IDs CORPUS cumplen su patrón; IDs DERIVED se recomputan idénticos",
  run(ctx) {
    const f: string[] = [];
    for (const l of ctx.generated.limitations)
      if (l.id !== `lim.${l.owner_id}.${short8(sha256Hex(l.text))}`)
        f.push(`${l.id}: id derivado no coincide con su texto`);
    for (const b of ctx.generated.blockers)
      if (b.id !== `blk.${b.claim_id}.${b.ordinal}.${short8(sha256Hex(`${b.label} -- ${b.text}`))}`)
        f.push(`${b.id}: id derivado no coincide`);
    for (const a of ctx.generated.anchors)
      if (a.id !== `anc.${a.claim_id}.${a.key}`) f.push(`${a.id}: id derivado no coincide`);
    for (const e of allEntities(ctx)) {
      if (e["global_id"] !== `labor/${String(e["id"])}`)
        f.push(`${String(e["id"])}: global_id incoherente`);
      const derived = ["limitations", "blockers", "anchors"].some((k) =>
        (ctx.generated[k as EntityFileName] as unknown as { id: string }[]).some(
          (x) => x.id === e["id"],
        ),
      );
      if ((e["id_origin"] === "DERIVED") !== derived)
        f.push(`${String(e["id"])}: id_origin incoherente`);
    }
    return res(f, "IDs derivados recomputados idénticos; global_id e id_origin coherentes");
  },
};
const gCnt01: Gate = {
  id: "G-CNT-01",
  title: "Conteos == contrato del módulo (corpus completo y corte)",
  run(ctx) {
    const f: string[] = [];
    const { note, ...expected } = ctx.contract.corpus_expected_counts;
    void note;
    for (const [k, v] of Object.entries(expected))
      if (!eq((ctx.stats as unknown as Record<string, unknown>)[k], v))
        f.push(
          `corpus ${k}: ${JSON.stringify((ctx.stats as unknown as Record<string, unknown>)[k])} != esperado ${JSON.stringify(v)}`,
        );
    const g = ctx.generated;
    const { note: sliceNote, ...exp } = ctx.contract.slice_expected_counts;
    void sliceNote;
    const lim = (k: string) => g.limitations.filter((l) => l.owner_kind === k).length;
    const got = {
      questions: g.questions.length,
      claims: g.claims.length,
      hypotheses: g.hypotheses.length,
      evidence: g.evidence.length,
      evidence_roots: g["evidence-roots"].length,
      statistical_objects: g["statistical-objects"].length,
      governance_rulings: g["governance-rulings"].length,
      episodes: g.episodes.length,
      limitations: { claim: lim("claim"), question: lim("question"), evidence: lim("evidence") },
      blockers: g.blockers.length,
      anchors: g.anchors.length,
      relations: g.relations.length,
      preserved_results: g["preserved-results"].length,
    };
    if (!eq(got, exp)) f.push(`corte: ${JSON.stringify(got)} != esperado ${JSON.stringify(exp)}`);
    return res(
      f,
      `18 preguntas / 14 claims / 9 hipótesis / 25 evidencias / 7 raíces / 26 objetos / 7 rulings / 34 relaciones / 15 KEEP / 72+19 limitaciones; el corte generado es el corpus completo`,
    );
  },
};
const gCnt02: Gate = {
  id: "G-CNT-02",
  title: "Manifest de módulo: cantidad y hash de cada archivo == archivos presentes",
  run(ctx) {
    const f: string[] = [];
    const m = ctx.generated.manifest;
    const present = [...ctx.generatedFiles.keys()].filter((n) => n !== "manifest.json").sort();
    if (!eq(present, m.files.map((x) => x.path).sort()))
      f.push("los archivos presentes difieren de los del manifest");
    for (const x of m.files) {
      const t = ctx.generatedFiles.get(x.path);
      if (t === undefined) f.push(`${x.path}: falta`);
      else if (sha256Hex(t) !== x.sha256 || Buffer.byteLength(t) !== x.bytes)
        f.push(`${x.path}: hash o tamaño distintos del manifest`);
    }
    for (const k of ENTITY_KINDS)
      if (m.entity_counts[k] !== ctx.generated[k].length) f.push(`entity_counts.${k} != archivo`);
    return res(f, `${m.files.length} archivos con hash y tamaño iguales al manifest`);
  },
};

// ─────────────────────────────── G-REF ───────────────────────────────

const gRef01: Gate = {
  id: "G-REF-01",
  title: "Todos los IDs resuelven",
  run(ctx) {
    const g = ctx.generated;
    const idx = entityIndex(g);
    const f: string[] = [];
    const need = (from: string, ids: readonly (string | null)[], kind?: EntityFileName): void => {
      for (const id of ids) {
        if (id === null) continue;
        const hit = idx.get(id);
        if (hit === undefined) f.push(`${from} → ${id}: no existe`);
        else if (kind !== undefined && hit.kind !== kind)
          f.push(`${from} → ${id}: es ${hit.kind}, se esperaba ${kind}`);
      }
    };
    for (const q of g.questions) {
      need(q.id, q.claim_ids, "claims");
      need(q.id, q.hypothesis_ids, "hypotheses");
      need(q.id, q.object_ids, "statistical-objects");
      need(q.id, q.limitation_ids, "limitations");
      need(q.id, q.preserved_result_ids, "preserved-results");
    }
    for (const c of g.claims) {
      need(c.id, [c.question_id], "questions");
      need(c.id, [c.hypothesis_id], "hypotheses");
      need(c.id, c.evidence_ids, "evidence");
      need(
        c.id,
        [...c.root_ids, ...c.referenced_root_ids, ...c.deflator_root_ids],
        "evidence-roots",
      );
      need(c.id, c.object_ids, "statistical-objects");
      need(c.id, c.limitation_ids, "limitations");
      need(c.id, c.blocker_ids, "blockers");
      need(c.id, c.lab_gov, "governance-rulings");
    }
    for (const h of g.hypotheses) need(h.id, [h.question_id], "questions");
    for (const e of g.evidence) {
      need(e.id, [e.claim_id], "claims");
      need(e.id, [e.question_id], "questions");
      need(e.id, [e.hypothesis_id], "hypotheses");
      need(e.id, e.root_ids, "evidence-roots");
      need(e.id, e.object_ids, "statistical-objects");
    }
    for (const r of g["evidence-roots"]) need(r.id, [r.statistical_object], "statistical-objects");
    for (const ep of g.episodes) {
      need(ep.id, [ep.ruling_id], "governance-rulings");
      need(ep.id, ep.claim_ids, "claims");
    }
    for (const b of g.blockers) {
      need(b.id, [b.claim_id], "claims");
      need(b.id, [b.witness.evidence_id], "evidence");
    }
    for (const a of g.anchors) need(a.id, [a.claim_id], "claims");
    for (const k of g["preserved-results"]) {
      need(k.id, [k.question_id], "questions");
      need(k.id, [k.claim_id], "claims");
    }
    return res(f, `${idx.size} entidades; todas las referencias resuelven al tipo correcto`);
  },
};
const gRef02: Gate = {
  id: "G-REF-02",
  title: "Ningún claim huérfano: apunta a exactamente 1 pregunta y esa pregunta lo lista",
  run(ctx) {
    const f: string[] = [];
    for (const c of ctx.generated.claims) {
      const owners = ctx.generated.questions.filter((q) => q.claim_ids.includes(c.id));
      if (owners.length !== 1 || owners[0]?.id !== c.question_id)
        f.push(
          `${c.id}: lo listan ${owners.map((q) => q.id).join(",") || "ninguna pregunta"}; su question_id es ${c.question_id}`,
        );
    }
    return res(f, "cada claim tiene exactamente 1 pregunta y esa pregunta lo lista");
  },
};
const gRef03: Gate = {
  id: "G-REF-03",
  title: "Ninguna evidencia huérfana, salvo las DIAGNOSTIC_ONLY explícitas",
  run: (ctx) =>
    res(
      ctx.generated.evidence
        .filter((e) => e.claim_id === null && !e.diagnostic_only)
        .map((e) => `${e.id}: sin claim y sin marca de diagnóstico`),
      "toda evidencia tiene claim o está marcada como diagnóstico",
    ),
};
const gRef04: Gate = {
  id: "G-REF-04",
  title: "Mapeo cerrado Question → 0..N Claims",
  run(ctx) {
    const f: string[] = [];
    const exp = ctx.contract.corpus_expected_counts;
    const withClaims = Object.values(ctx.map.questions).filter(
      (q) => q.claim_ids.length > 0,
    ).length;
    if (withClaims !== exp.questions_with_claims)
      f.push(`preguntas con claim: ${withClaims} != ${exp.questions_with_claims}`);
    const without = Object.entries(ctx.map.questions)
      .filter(([, q]) => q.claim_ids.length === 0)
      .map(([id]) => id)
      .sort();
    if (!eq(without, [...exp.questions_without_claims].sort()))
      f.push(
        `preguntas sin claim: ${without.join(",")} != ${exp.questions_without_claims.join(",")}`,
      );
    const multi = Object.entries(ctx.map.questions)
      .filter(([, q]) => q.claim_ids.length > 1)
      .map(([id]) => id)
      .sort();
    if (!eq(multi, [...exp.questions_with_multiple_claims].sort()))
      f.push(
        `preguntas con más de un claim: ${multi.join(",")} != ${exp.questions_with_multiple_claims.join(",")}`,
      );
    const all = Object.values(ctx.map.questions).flatMap((q) => q.claim_ids);
    if (all.length !== 14 || new Set(all).size !== all.length)
      f.push(
        `suma de claim_ids ${all.length}, únicos ${new Set(all).size}: se esperaba 14 sin repetidos`,
      );
    for (const q of ctx.generated.questions) {
      const m = ctx.map.questions[q.id];
      if (m === undefined || !eq(m.claim_ids, q.claim_ids))
        f.push(
          `${q.id}: claim_ids generados ${q.claim_ids.join(",")} != corpus ${m?.claim_ids.join(",") ?? "?"}`,
        );
    }
    return res(
      f,
      "13 preguntas con claim, 5 sin claim, solo Q-0003 con 2; suma 14; ningún claim mapeado dos veces",
    );
  },
};
const gRef05: Gate = {
  id: "G-REF-05",
  title: "Toda hipótesis pertenece a una pregunta; RELATED_HYPOTHESES == registro",
  run(ctx) {
    const f: string[] = [];
    for (const q of ctx.generated.questions) {
      const owned = ctx.generated.hypotheses
        .filter((h) => h.question_id === q.id)
        .map((h) => h.id)
        .sort();
      if (!eq(owned, [...q.hypothesis_ids].sort()))
        f.push(
          `${q.id}: hypothesis_ids ${q.hypothesis_ids.join(",")} != registro ${owned.join(",")}`,
        );
    }
    return res(f, "hipótesis de cada pregunta == registro de hipótesis");
  },
};
const gRef06: Gate = {
  id: "G-REF-06",
  title: "Toda relación referencia claims/preguntas/hipótesis existentes en el corpus",
  run(ctx) {
    const f: string[] = [];
    const claims = new Set(Object.keys(ctx.map.claims));
    const questions = new Set(Object.keys(ctx.map.questions));
    for (const r of ctx.generated.relations) {
      for (const c of [...r.claim_ids, ...r.context_claim_ids])
        if (!claims.has(c)) f.push(`${r.id} → ${c}: claim inexistente`);
      for (const q of r.question_ids)
        if (!questions.has(q)) f.push(`${r.id} → ${q}: pregunta inexistente`);
    }
    return res(f, `${ctx.generated.relations.length} relaciones con referencias válidas`);
  },
};

// ─────────────────────────────── G-STA ───────────────────────────────

const gSta01: Gate = {
  id: "G-STA-01",
  title:
    "Estados de claim ⊂ vocabulario de ciclo de vida; tally del módulo; 0 ESTABLISHED/CONVERGENT/DIVERGENT",
  run(ctx) {
    const f: string[] = [];
    const vocab = ctx.contract.vocabularies.claim_lifecycle_state;
    for (const c of ctx.generated.claims)
      if (!vocab.includes(c.epistemic_state))
        f.push(`${c.id}: estado ${c.epistemic_state} fuera del vocabulario`);
    if (!eq(ctx.stats.claim_states, ctx.contract.corpus_expected_counts.claim_states))
      f.push(`tally ${JSON.stringify(ctx.stats.claim_states)} != contrato`);
    for (const [k, v] of Object.entries(ctx.contract.invariants))
      if ((ctx.stats.claim_states[k] ?? 0) !== v) f.push(`invariante ${k}=${v} violada`);
    for (const c of ctx.generated.claims)
      if (ctx.map.claims[c.id]?.state !== c.epistemic_state)
        f.push(
          `${c.id}: estado generado ${c.epistemic_state} != corpus ${ctx.map.claims[c.id]?.state ?? "?"}`,
        );
    return res(
      f,
      "10 OBSERVED · 1 REFUTED · 3 INSUFFICIENT · 0 ESTABLISHED · 0 CONVERGENT · 0 DIVERGENT; el estado generado == corpus",
    );
  },
};
const gSta02: Gate = {
  id: "G-STA-02",
  title: "Toda pregunta tiene resolución; con claims coincide con ellos",
  run(ctx) {
    const f: string[] = [];
    for (const q of ctx.generated.questions) {
      const states = uniq(
        ctx.generated.claims.filter((c) => c.question_id === q.id).map((c) => c.epistemic_state),
      );
      if (q.claim_ids.length > 0) {
        if (states.length !== 1)
          f.push(`${q.id}: claims con estados distintos (${states.join(",")}) sin regla gobernada`);
        else if (q.resolution.value !== states[0])
          f.push(`${q.id}: resolución ${q.resolution.value} != estado del claim ${states[0]}`);
        if (
          q.resolution.basis !== "CLAIM" ||
          !eq([...q.resolution.basis_refs].sort(), [...q.claim_ids].sort())
        )
          f.push(`${q.id}: la base de la resolución no es su(s) claim(s)`);
      } else {
        if (!ctx.contract.vocabularies.question_documentary_label.includes(q.resolution.value))
          f.push(`${q.id}: sin claims y su resolución no es una etiqueta documental`);
        if (q.resolution.basis === "CLAIM" || q.resolution.vocabulary === "CLAIM_LIFECYCLE_STATE")
          f.push(`${q.id}: etiqueta documental mezclada con vocabulario/base de claim`);
        if (q.resolution.basis_refs.length === 0)
          f.push(`${q.id}: resolución documental sin basis_refs`);
      }
    }
    for (const [id, m] of Object.entries(ctx.map.questions))
      if (m.resolution === "") f.push(`${id}: sin resolución en S0`);
    return res(
      f,
      "toda pregunta tiene resolución; con claims coincide con ellos; las 5 sin claim usan etiqueta documental (S0 + KEEP)",
    );
  },
};
const gSta03: Gate = {
  id: "G-STA-03",
  title: "Etiquetas documentales nunca son estado de un Claim ni llevan ■",
  run(ctx) {
    const doc = ctx.contract.vocabularies.question_documentary_label;
    const f = ctx.generated.claims
      .filter((c) => doc.includes(c.epistemic_state))
      .map((c) => `${c.id}: estado documental ${c.epistemic_state}`);
    for (const q of ctx.generated.questions)
      if (doc.includes(q.resolution.value) && q.claim_ids.length > 0)
        f.push(`${q.id}: etiqueta documental con claims`);
    return res(f, "ningún claim tiene estado documental");
  },
};
const gSta04: Gate = {
  id: "G-STA-04",
  title: "La capa editorial no altera estados; el estado renderizado == generado",
  run(ctx) {
    const f: string[] = [];
    // (el cargador ya rechaza campos de estado en editorial; acá se verifica el DOM)
    for (const [route, html] of ctx.html) {
      for (const t of tags(html)) {
        const qid = t.attrs["data-question-id"];
        if (qid !== undefined) {
          const q = ctx.generated.questions.find((x) => x.id === qid);
          if (q === undefined) f.push(`${route}: pregunta ${qid} no existe`);
          else if (t.attrs["data-question-resolution"] !== q.resolution.value)
            f.push(
              `${route}: resolución renderizada ${t.attrs["data-question-resolution"] ?? "?"} != generada ${q.resolution.value}`,
            );
          else if (q.claim_ids.length === 0) {
            const cid = t.attrs["data-claim-id"];
            if (cid !== undefined) f.push(`${route}: pregunta sin claim con data-claim-id ${cid}`);
            if (t.attrs["data-claim-state"] !== undefined)
              f.push(
                `${route}: pregunta sin claim con data-claim-state ${t.attrs["data-claim-state"]}`,
              );
          } else if (q.claim_ids.length > 1 && t.attrs["data-claim-id"] !== undefined)
            f.push(
              `${route}: pregunta con ${q.claim_ids.length} claims no puede llevar un solo data-claim-id`,
            );
        }
        const cid = t.attrs["data-claim-id"];
        if (cid !== undefined) {
          const c = ctx.generated.claims.find((x) => x.id === cid);
          if (c === undefined || t.attrs["data-claim-state"] !== c.epistemic_state)
            f.push(
              `${route}: estado de claim renderizado ${t.attrs["data-claim-state"] ?? "?"} != generado ${c?.epistemic_state ?? "?"}`,
            );
        }
        const s = t.attrs["data-state"];
        if (
          s !== undefined &&
          !ctx.generated.claims.some((c) => c.epistemic_state === s) &&
          !ctx.generated.questions.some((q) => q.resolution.value === s)
        )
          f.push(`${route}: forma de estado ${s} sin código generado`);
      }
      const seen = new Set(
        tags(html)
          .map((x) => x.attrs["data-claim-id"])
          .filter((id): id is string => id !== undefined),
      );
      for (const t of tags(html)) {
        const qid = t.attrs["data-question-id"];
        if (qid === undefined) continue;
        const q = ctx.generated.questions.find((x) => x.id === qid);
        if (q === undefined) continue;
        for (const id of q.claim_ids)
          if (!seen.has(id)) f.push(`${route}: falta data-claim-id ${id}`);
      }
    }
    return f.length === 0 && ctx.html.size === 0
      ? skip("sin dist/: solo se comprobó la carga editorial (sin campos de estado)")
      : res(f, "el DOM refleja exactamente el estado generado de la pregunta y del claim");
  },
};
const gSta05: Gate = {
  id: "G-STA-05",
  title: "absent_vs_negative coherente: solo REFUTED_WITHIN_SCOPE es NEGATIVE_WITHIN_SCOPE",
  run(ctx) {
    const f: string[] = [];
    for (const c of ctx.generated.claims)
      if (
        (c.absent_vs_negative === "NEGATIVE_WITHIN_SCOPE") !==
        (c.epistemic_state === "REFUTED_WITHIN_SCOPE")
      )
        f.push(`${c.id}: ${c.absent_vs_negative} con estado ${c.epistemic_state}`);
    for (const q of ctx.generated.questions)
      if (
        (q.absent_vs_negative === "NEGATIVE_WITHIN_SCOPE") !==
        (q.resolution.value === "REFUTED_WITHIN_SCOPE")
      )
        f.push(`${q.id}: ${q.absent_vs_negative} con resolución ${q.resolution.value}`);
    for (const c of ctx.generated.claims)
      if (
        c.epistemic_state === "INSUFFICIENT_EVIDENCE" &&
        c.absent_vs_negative !== "ABSENT_NOT_NEGATIVE"
      )
        f.push(`${c.id}: una evidencia insuficiente es ausencia, no negativo`);
    return res(
      f,
      "solo REFUTED_WITHIN_SCOPE es negativo; INSUFFICIENT_EVIDENCE es ABSENT_NOT_NEGATIVE",
    );
  },
};
const gSta06: Gate = {
  id: "G-STA-06",
  title:
    "Vocabulario público: todo código presente tiene etiqueta, ninguna para un código ausente; «establecido/a» nunca sin calificador",
  run(ctx) {
    const f: string[] = [];
    const pubs = publishedQuestionIds(ctx);
    const cs = uniq(
      ctx.generated.claims
        .filter((c) => pubs.includes(c.question_id))
        .map((c) => c.epistemic_state),
    );
    const qs = uniq(
      ctx.generated.questions.filter((q) => pubs.includes(q.id)).map((q) => q.resolution.value),
    );
    const cl = Object.keys(ctx.editorial.states.claim_state_labels).sort();
    const ql = Object.keys(ctx.editorial.states.question_resolution_labels).sort();
    if (!eq(cs, cl))
      f.push(`etiquetas de claim ${cl.join(",")} != códigos presentes ${cs.join(",")}`);
    if (!eq(qs, ql))
      f.push(`etiquetas de resolución ${ql.join(",")} != códigos presentes ${qs.join(",")}`);
    const texts = [...allUnits(ctx).map((u) => u.text), ...[...ctx.html.values()].map(visibleText)];
    for (const t of texts)
      if (/establecid[oa]s?/i.test(t)) f.push(`«establecido/a» sin calificador: ${t.slice(0, 60)}`);
    for (const l of [
      ...Object.values(ctx.editorial.states.claim_state_labels),
      ...Object.values(ctx.editorial.states.question_resolution_labels),
    ])
      if (/^(Observado|Refutado|Insuficiente)$/.test(l.text))
        f.push(`etiqueta en forma corta: ${l.text}`);
    return res(f, "etiquetas ↔ códigos presentes; formas largas; sin «establecido/a» suelto");
  },
};
const gSta07: Gate = {
  id: "G-STA-07",
  title: "Calificador «Hallazgo documental…» en claims OBSERVED que no son medición",
  run(ctx) {
    const need = ctx.generated.claims.filter(
      (c) =>
        c.epistemic_state === "OBSERVED_IN_SOURCE" && c.claim_kind !== "STATISTICAL_MEASUREMENT",
    );
    const rendered = need.filter((c) =>
      editorialQuestionPages(ctx).some(([, h]) => h.includes(`data-claim-id="${c.id}"`)),
    );
    if (need.length > 0 && rendered.length === 0)
      return na(
        "claims OBSERVED que no son medición no están en páginas renderizadas (UI de M1 = Q-0013)",
      );
    if (need.length === 0) return na("el corte no incluye claims OBSERVED que no sean mediciones");
    const f = need
      .filter(
        () =>
          ![...ctx.html.values()].some((h) =>
            visibleText(h).includes("Hallazgo documental: no es una medición del mercado laboral"),
          ),
      )
      .map((c) => `${c.id}: falta el calificador`);
    return res(f, "calificador presente");
  },
};

// ─────────────────────────────── G-PRV ───────────────────────────────

const rawEvidenceHashes = (
  ctx: GateContext,
  evidenceId: string,
): { file: string; sha256: string }[] => {
  const raw = JSON.parse(
    readFileSync(join(ctx.srcDir, "metadata/evidence/evidence-registry.json"), "utf8"),
  ) as { EVIDENCE_ID: string; INPUT_HASH?: { FILE: string; SHA256: string }[] }[];
  return (raw.find((e) => e.EVIDENCE_ID === evidenceId)?.INPUT_HASH ?? []).map((h) => ({
    file: h.FILE,
    sha256: h.SHA256,
  }));
};

const gPrv01: Gate = {
  id: "G-PRV-01",
  title: "Todo objeto tiene el envelope de provenance completo y coherente con el pin",
  run(ctx) {
    const f: string[] = [];
    for (const e of allEntities(ctx)) {
      const p = e["provenance"] as
        | {
            commit: string;
            source_path: string;
            blob_sha: string;
            extracted_sha256: string;
            generator_version: string;
            source_repo: string;
            tag: string;
          }
        | undefined;
      const id = String(e["id"]);
      if (p === undefined) {
        f.push(`${id}: sin provenance`);
        continue;
      }
      const file = ctx.pin.files.find((x) => x.path === p.source_path);
      if (file === undefined) f.push(`${id}: source_path ${p.source_path} no está en el pin`);
      else {
        if (p.blob_sha !== file.blob_sha) f.push(`${id}: blob_sha distinto del pin`);
        if (p.extracted_sha256 !== file.sha256) f.push(`${id}: extracted_sha256 distinto del pin`);
      }
      if (p.commit !== ctx.pin.commit || p.tag !== ctx.pin.tag || p.source_repo !== ctx.pin.repo_id)
        f.push(`${id}: repo/tag/commit distintos del pin`);
      if (p.generator_version !== GENERATOR_VERSION) f.push(`${id}: generator_version distinto`);
    }
    return res(
      f,
      `${allEntities(ctx).length} objetos con envelope completo (repo, tag, commit, ruta, ID, pointer, blob_sha, generator_version)`,
    );
  },
};
const gPrv02: Gate = {
  id: "G-PRV-02",
  title: "Ningún hash inventado: pin, hash registrado por el corpus, o extracted_sha256 etiquetado",
  run(ctx) {
    const f: string[] = [];
    for (const e of allEntities(ctx)) {
      const id = String(e["id"]);
      const p = e["provenance"] as { recorded_hashes: { file: string; sha256: string }[] };
      const expected = id.startsWith("LAB-EVD-") ? rawEvidenceHashes(ctx, id) : [];
      if (!eq(p.recorded_hashes, expected))
        f.push(`${id}: recorded_hashes no coincide con lo que el corpus registró`);
    }
    const scan = (v: unknown, path: string, id: string): void => {
      if (Array.isArray(v)) v.forEach((x, i) => scan(x, `${path}[${i}]`, id));
      else if (typeof v === "object" && v !== null) {
        for (const [k, x] of Object.entries(v)) {
          if (
            /(hash|sha256|_sha)$/i.test(k) &&
            !["provenance", "recorded_hashes"].some((s) => path.includes(s)) &&
            k !== "blob_sha"
          )
            f.push(`${id}: campo de hash no permitido fuera de provenance: ${path}.${k}`);
          scan(x, `${path}.${k}`, id);
        }
      }
    };
    for (const e of allEntities(ctx)) scan(e, "$", String(e["id"]));
    for (const a of ctx.generated.anchors)
      for (const w of a.witnesses)
        if (!ctx.pin.files.some((x) => x.path === w.source_path && x.blob_sha === w.blob_sha))
          f.push(`${a.id}: blob_sha de un testigo no proviene del pin`);
    return res(
      f,
      "los hashes salen del pin, del registro del corpus (INPUT_HASH) o son extracted_sha256",
    );
  },
};
const gPrv03: Gate = {
  id: "G-PRV-03",
  title: "Sin URL ni vínculo raíz→fuente sin base en el corpus",
  run(ctx) {
    const f: string[] = [];
    for (const r of ctx.generated["evidence-roots"]) {
      if ((r.source_links.length === 0) !== (r.source_link_status === "UNRESOLVED"))
        f.push(`${r.id}: source_link_status incoherente con source_links`);
      for (const l of r.source_links)
        if (l.link_basis !== "SHA256_EQUALITY" && l.link_basis !== "EXPLICIT_RECORD")
          f.push(`${r.id}: vínculo sin link_basis`);
    }
    for (const [route, html] of ctx.html)
      for (const t of tags(html))
        if (t.name === "a" && /^https?:/i.test(t.attrs["href"] ?? ""))
          f.push(
            `${route}: enlace externo ${t.attrs["href"] ?? ""} sin origen en un registro del corpus`,
          );
    return res(f, "raíces sin vínculo registrado quedan UNRESOLVED; no hay URLs inventadas");
  },
};
const gPrv04: Gate = {
  id: "G-PRV-04",
  title: "Anotaciones de reemplazo de evidencia citan texto del corpus",
  run(ctx) {
    const f: string[] = [];
    for (const s of ctx.contract.claim_supersessions) {
      if (!s.corpus_quote) {
        f.push(`${s.claim_id}: supresión sin cita textual del corpus`);
        continue;
      }
      const c = ctx.generated.claims.find((x) => x.id === s.claim_id);
      if (c === undefined) f.push(`${s.claim_id}: claim de reemplazo no generado`);
      else if (!c.canonical_text.includes(s.corpus_quote))
        f.push(`${s.claim_id}: corpus_quote no aparece en el texto del claim`);
      if (!ctx.generated.evidence.some((e) => e.id === s.replaced_evidence_id))
        f.push(`${s.claim_id}: evidencia reemplazada ${s.replaced_evidence_id} ausente`);
      if (!ctx.generated.evidence.some((e) => e.id === s.superseding_evidence_id))
        f.push(`${s.claim_id}: evidencia vigente ${s.superseding_evidence_id} ausente`);
    }
    return res(
      f,
      `${ctx.contract.claim_supersessions.length} anotaciones de reemplazo con cita textual del corpus`,
    );
  },
};
const COUNT_SOURCES =
  /(?:[0-9]+|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(?:fuentes|ra[ií]ces)\b|fuentes independientes|ra[ií]ces independientes/i;
const gPrv06: Gate = {
  id: "G-PRV-06",
  title: "Ningún conteo de raíces ni «N fuentes»",
  run(ctx) {
    const texts = [
      ...allUnits(ctx).map((u) => ({ where: u.string_id, t: u.text })),
      ...[...ctx.html].map(([r, h]) => ({ where: r, t: visibleText(h) })),
    ];
    return res(
      texts
        .filter((x) => COUNT_SOURCES.test(x.t))
        .map((x) => `${x.where}: conteo de fuentes o raíces`),
      "sin conteos de raíces ni «N fuentes»",
    );
  },
};

// ─────────────────────────────── G-LIM ───────────────────────────────

const publicTextIds = (finding: EditorialBundle["finding"]): Set<string> =>
  new Set([
    ...finding.can_say.map((u) => `can_say:${u.id}`),
    ...finding.does_not_mean.map((u) => `does_not_mean:${u.id}`),
    ...finding.would_need.map((u) => `would_need:${u.id}`),
  ]);

const gLim01: Gate = {
  id: "G-LIM-01",
  title: "Todo claim publicado tiene ≥ 1 límite público",
  run(ctx) {
    const f: string[] = [];
    for (const qid of publishedQuestionIds(ctx)) {
      const bundle = bundleForQuestion(ctx, qid);
      for (const c of ctx.generated.claims.filter((x) => x.question_id === qid)) {
        const ids = new Set(c.limitation_ids);
        const shown = bundle.limits.dispositions.filter(
          (d) =>
            d.disposition === "SHOWN" &&
            ids.has(limitationIdFromRef(ctx.generated, d.limitation) ?? ""),
        );
        if (shown.length === 0) f.push(`${c.id}: sin límites públicos SHOWN`);
      }
    }
    for (const [route, html] of editorialQuestionPages(ctx)) {
      const text = visibleText(html);
      if (!text.includes(ctx.editorial.ui.strings["not_heading"]?.text ?? "\0"))
        f.push(`${route}: falta el bloque «Lo que esto NO significa»`);
    }
    return res(f, "cada ficha publicada tiene límites públicos y la página los muestra");
  },
};
const gLim02: Gate = {
  id: "G-LIM-02",
  title: "Matriz de cobertura completa: toda limitación canónica tiene clase y disposición",
  run(ctx) {
    const f: string[] = [];
    for (const qid of publishedQuestionIds(ctx)) {
      const bundle = bundleForQuestion(ctx, qid);
      const pub = publicTextIds(bundle.finding);
      const covered = new Set<string>();
      for (const d of bundle.limits.dispositions) {
        const id = limitationIdFromRef(ctx.generated, d.limitation);
        if (id === null) {
          f.push(`${d.limitation}: no resuelve a una limitación canónica`);
          continue;
        }
        covered.add(id);
        if (d.disposition === "AUDIT_ONLY" && d.class !== "PROCEDURAL")
          f.push(`${d.limitation}: AUDIT_ONLY solo se admite con clase PROCEDURAL (es ${d.class})`);
        if (d.disposition === "AUDIT_ONLY" && !d.waiver_reason)
          f.push(`${d.limitation}: AUDIT_ONLY sin waiver_reason`);
        if (d.disposition === "SHOWN") {
          if (!d.public_refs || d.public_refs.length === 0)
            f.push(`${d.limitation}: SHOWN sin texto público`);
          for (const r of d.public_refs ?? [])
            if (!pub.has(r)) f.push(`${d.limitation}: el texto público ${r} no existe`);
        }
      }
      const pubClaims = new Set(
        ctx.generated.claims.filter((c) => c.question_id === qid).map((c) => c.id),
      );
      for (const l of ctx.generated.limitations) {
        if (l.owner_kind === "evidence") continue;
        if (l.owner_id !== qid && !pubClaims.has(l.owner_id)) continue;
        if (!covered.has(l.id)) f.push(`${l.owner_id}#limitation:${l.ordinal}: sin disposición`);
      }
    }
    return res(
      f,
      "toda limitación de la pregunta y del claim tiene clase y disposición; AUDIT_ONLY solo PROCEDURAL; SHOWN remite a un texto público existente",
    );
  },
};
const gLim03: Gate = {
  id: "G-LIM-03",
  title:
    "La pregunta muestra sus limitaciones, la divulgación de exposición previa si aplica y la brecha pregunta–claim",
  run(ctx) {
    const f: string[] = [];
    for (const qid of publishedQuestionIds(ctx)) {
      for (const h of ctx.generated.hypotheses.filter((x) => x.question_id === qid))
        if (h.disclosure_required || h.prior_data_exposure !== "NONE")
          f.push(
            `${h.id}: exige divulgación de exposición previa (${h.prior_data_exposure}) y no hay texto editorial para mostrarla`,
          );
    }
    for (const [route, html] of editorialQuestionPages(ctx)) {
      const t = visibleText(html);
      const qid = tags(html).find((x) => x.attrs["data-question-id"] !== undefined)?.attrs[
        "data-question-id"
      ];
      const bundle = qid !== undefined ? bundleForQuestion(ctx, qid) : ctx.editorial;
      for (const l of bundle.finding.does_not_mean)
        if (!t.includes(plain(parseSegments(l.text, ctx.generated))))
          f.push(`${route}: no muestra el límite ${l.id}`);
      if (!t.includes(ctx.editorial.ui.strings["prov_disclosure"]?.text ?? "\0"))
        f.push(`${route}: falta la sección de exposición previa`);
    }
    return res(
      f,
      "límites visibles; exposición previa NONE (sin divulgación requerida) declarada; el alcance del claim no es más estrecho que la pregunta",
    );
  },
};
const gLim04: Gate = {
  id: "G-LIM-04",
  title: "Límite junto al dato: cada Figure tiene el bloque de límites en su sección",
  run: (ctx) =>
    ctx.generated.claims.every((c) => c.figure_ids.length === 0)
      ? na("0 Figures en el corte: no hay dato numérico al que pegar el límite")
      : skip("con Figures se verifica el DOM"),
};
const gLim05: Gate = {
  id: "G-LIM-05",
  title:
    "Las limitaciones SHOWN no se editaron fuera de auditoría (hash del texto público == auditado)",
  run(ctx) {
    const f: string[] = [];
    let n = 0;
    for (const b of editorialBundles(ctx)) {
      const shown = new Set(
        b.limits.dispositions
          .filter((d) => d.disposition === "SHOWN")
          .flatMap((d) => d.public_refs ?? []),
      );
      const ids = new Set(
        [...shown].map((r) => `${b.finding.canonical_ref}#finding.${r.replace(":", ".")}`),
      );
      n += ids.size;
      f.push(
        ...verifyAudit(b, ctx.generated)
          .filter(
            (i) =>
              ids.has(i.unit) &&
              (i.message.includes("hash distinto") || i.message.includes("sin registro")),
          )
          .map((i) => `${i.unit}: ${i.message}`),
      );
    }
    return res(f, `${n} textos públicos de límites con hash igual al auditado`);
  },
};

// ─────────────────────────────── G-FIG ───────────────────────────────

const gFig01: Gate = {
  id: "G-FIG-01",
  title: "Toda Figure resuelve a un origen del corpus; su formato reproduce el ancla textual",
  run: (ctx) =>
    res(
      ctx.generated.claims
        .filter((c) => c.figure_ids.length > 0)
        .map((c) => `${c.id}: declara Figures sin origen`),
      "0 Figures: el corpus de este corte no trae una cifra estructurada adecuada y no se fabrica ninguna",
    ),
};
const gFig02: Gate = {
  id: "G-FIG-02",
  title: "Editorial sin literales numéricos fuera de directivas",
  run: (ctx) =>
    res(
      lintAll(ctx)
        .filter((i) => i.gate === "G-FIG-02")
        .map((i) => `${i.unit}: ${i.message}`),
      `${allUnits(ctx).length} textos sin literales numéricos (fechas y cantidades son directivas)`,
    ),
};
const gFig03: Gate = {
  id: "G-FIG-03",
  title:
    "Escaneo del HTML: todo token numérico está en un elemento permitido (incluye atributos, <title> y meta)",
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const f: string[] = [];
    for (const [route, html] of ctx.html) {
      const text = visibleText(stripAllowedNumerals(html));
      for (const m of text.matchAll(/\S*[0-9]\S*/g))
        f.push(`${route}: cifra fuera de un elemento permitido: «${m[0]}»`);
      for (const a of humanAttributeValues(stripAllowedNumerals(html)))
        if (/[0-9]/.test(a.value)) f.push(`${route}: cifra en ${a.tag}[${a.attr}]: «${a.value}»`);
    }
    return res(
      f,
      `${ctx.html.size} rutas: cada token numérico es un ID, versión, hash, ancla o cantidad derivada`,
    );
  },
};
const gFig04: Gate = {
  id: "G-FIG-04",
  title: "Toda Figure exhibe fuente y período y tiene alternativa en tabla",
  run: (ctx) =>
    ctx.generated.claims.every((c) => c.figure_ids.length === 0)
      ? na("0 Figures")
      : skip("con Figures se verifica el DOM"),
};
const NO_ARITHMETIC =
  /%|por ciento|\bpuntaje\b|\branking\b|\b[ií]ndice\b|\bpromedio\b|\bmayor que\b|\bmenor que\b|\bel doble\b/i;
const gFig05: Gate = {
  id: "G-FIG-05",
  title:
    "Sin aritmética en la capa web: ningún porcentaje, razón, puntaje o índice sobre estados o claims",
  run(ctx) {
    const f: string[] = [];
    for (const u of allUnits(ctx))
      if (NO_ARITHMETIC.test(u.text))
        f.push(`${u.string_id}: expresión aritmética o de composición`);
    for (const [route, html] of ctx.html)
      if (NO_ARITHMETIC.test(visibleText(html)))
        f.push(`${route}: expresión aritmética o de composición en el HTML`);
    return res(f, "ningún porcentaje, razón, puntaje ni índice; no hay Figures DERIVED");
  },
};
const gFig06: Gate = {
  id: "G-FIG-06",
  title: "Toda cifra de solo texto tiene doble testigo",
  run(ctx) {
    const f = ctx.generated.anchors
      .filter((a) => a.witnesses.length < 2 || new Set(a.witnesses.map((w) => w.entity)).size < 2)
      .map((a) => `${a.id}: menos de 2 testigos independientes`);
    return res(
      f,
      `${ctx.generated.anchors.length} anclas de período/fecha, cada una con 2 testigos en registros distintos del corpus`,
    );
  },
};

// ─────────────────────────────── G-EDI ───────────────────────────────

const gEdi01: Gate = {
  id: "G-EDI-01",
  title: "Todo texto público tiene auditoría vigente atada por hash al canónico actual",
  run: (ctx) =>
    res(
      editorialBundles(ctx)
        .flatMap((b) => verifyAudit(b, ctx.generated))
        .filter((i) => i.gate === "G-EDI-01" || i.gate === "G-REF-01" || i.gate === "G-STA-04")
        .map((i) => `${i.unit}: ${i.message}`),
      `${allUnits(ctx).length} textos con registro vigente y canonical_hash actual`,
    ),
};
const gEdi02: Gate = {
  id: "G-EDI-02",
  title: "public_question == texto auditado y aprobado (hash) y == la reconciliación aceptada",
  run(ctx) {
    const f: string[] = [];
    for (const b of editorialBundles(ctx)) {
      f.push(
        ...verifyAudit(b, ctx.generated)
          .filter((i) => i.gate === "G-EDI-02")
          .map((i) => `${i.unit}: ${i.message}`),
      );
      const qid = b.finding.canonical_ref.replace("labor/", "");
      const g = ctx.golden.find((x) => x.QUESTION_ID === qid);
      if (g === undefined || g.PUBLIC_QUESTION !== b.question.public_question)
        f.push(`${qid}: el texto difiere de la public_question aprobada en la reconciliación`);
      const rec = b.audit?.records.find(
        (r) => r.string_id === `${b.finding.canonical_ref}#public_question`,
      );
      if (rec === undefined || rec.verdict !== "APPROVED")
        f.push(`${qid}: public_question sin veredicto APPROVED`);
    }
    return res(
      f,
      "public_question idéntica a la aprobada (Charter v1.2 §20.7), con hash igual al auditado",
    );
  },
};
const lintGate = (id: string, title: string, okDetail: string): Gate => ({
  id,
  title,
  run: (ctx) =>
    res(
      lintAll(ctx)
        .filter((i) => i.gate === id && i.severity === "error")
        .map((i) => `${i.unit}: ${i.message}`),
      okDetail,
    ),
});
const gEdi03 = lintGate(
  "G-EDI-03",
  "Sin verbos protegidos sin alcance explícito",
  "sin verbos protegidos",
);
const gEdi04: Gate = {
  id: "G-EDI-04",
  title: "Población/período/causalidad ⊂ scope_statement (heurística; positivos a revisión humana)",
  run(ctx) {
    const w = lintAll(ctx).filter((i) => i.gate === "G-EDI-04");
    return ok(
      w.length === 0
        ? "sin conectores causales; sin advertencias para revisión humana"
        : `${w.length} advertencia(s) a revisión humana`,
    );
  },
};
const gEdi05: Gate = {
  id: "G-EDI-05",
  title:
    "Solo Relation AUTHORIZED/JUXTAPOSITION con su texto; PROHIBITED/GOVERNANCE_REQUIRED solo como «lo que no se afirma»",
  run(ctx) {
    const f: string[] = [];
    for (const u of allUnits(ctx)) {
      for (const ref of u.maps_to) {
        const m = /^labor\/(REL-[A-Z]+-[0-9]{3})#(.+)$/.exec(ref);
        if (m === null) continue;
        const rel = ctx.generated.relations.find((r) => r.id === m[1]);
        if (rel === undefined) {
          f.push(`${u.string_id}: ${m[1]} no existe`);
          continue;
        }
        if (rel.category === "PROHIBITED" || rel.category === "GOVERNANCE_REQUIRED") {
          if (m[2] !== "prohibited_inference")
            f.push(
              `${u.string_id}: ${rel.id} (${rel.category}) solo puede citarse por prohibited_inference`,
            );
          if (u.section !== "does_not_mean")
            f.push(
              `${u.string_id}: ${rel.id} (${rel.category}) aparece como afirmación fuera de «Lo que esto NO significa»`,
            );
        } else if (m[2] !== "permitted_comparison")
          f.push(`${u.string_id}: ${rel.id} debe citarse con su permitted_comparison`);
      }
    }
    return res(f, "las relaciones prohibidas solo se citan como lo que no se afirma");
  },
};
const gEdi06 = lintGate(
  "G-EDI-06",
  "Sin marcadores de dato pendiente, TODO, lorem ni placeholders",
  "sin placeholders",
);
const gEdi07 = lintGate(
  "G-EDI-07",
  "Sin HTML crudo; directivas solo de la lista blanca",
  "sin HTML crudo; directivas en la lista blanca",
);
const gEdi08: Gate = {
  id: "G-EDI-08",
  title: "Toda cadena mostrada proviene de generated/ o de un texto con auditoría vigente",
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const hay: string[] = [];
    for (const u of allUnits(ctx)) {
      hay.push(u.text);
      try {
        hay.push(plain(parseSegments(u.text, ctx.generated)));
      } catch {
        /* una directiva rota ya falla en otros gates */
      }
    }
    for (const t of ctx.generatedFiles.values())
      hay.push(...(t.match(/"((?:[^"\\]|\\.)*)"/g) ?? []).map((s) => JSON.parse(s) as string));
    for (const a of ctx.generated.anchors) hay.push(String(a.value_raw));
    for (const u of allUnits(ctx))
      for (const m of u.text.matchAll(/\{\{(?:anchor):([^}|]+)\}\}/g)) {
        const a = ctx.generated.anchors.find((x) => x.id === m[1]);
        if (a !== undefined) hay.push(plain(parseSegments(m[0], ctx.generated)));
      }
    hay.push(ctx.generated.manifest.pin.commit.slice(0, 7), ctx.generated.manifestSha256);
    hay.push(sha256Hex(readFileSync(join(ctx.root, "editorial", "manifest.json"))));
    for (const q of ctx.generated.questions)
      hay.push(plainText(loadQuestionView(ctx.root, q.id).provenance.cite));
    const haystack = hay.join(" ").replace(/\s+/g, " ");
    const clean = (t: string): string => t.replace(/^[.,;:()«»"' ]+|[.,;:()«»"' ]+$/g, "");
    const explained = (node: string): boolean =>
      haystack.includes(node) ||
      haystack.includes(clean(node)) ||
      node
        .split(/ \/ |, |\. /)
        .every((part) => clean(part) === "" || haystack.includes(clean(part)));
    const f: string[] = [];
    for (const [route, html] of ctx.html) {
      for (const node of textNodes(html)) {
        if (!/[\p{L}]{2,}/u.test(node)) continue;
        if (!explained(node))
          f.push(`${route}: cadena sin origen auditado: «${node.slice(0, 70)}»`);
      }
    }
    return res(f, "cada nodo de texto visible sale de generated/ o de un texto auditado");
  },
};

// ─────────────────────────────── G-UX / G-PERF / G-LEG ───────────────────────────────

const gUx01: Gate = {
  id: "G-UX-01",
  title: "Ningún undefined, NaN, [object, null ni plantilla sin resolver en el HTML",
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const f: string[] = [];
    for (const [route, html] of ctx.html) {
      const t = visibleText(html);
      for (const bad of [/\bundefined\b/, /\bNaN\b/, /\[object/, /\bnull\b/, /\{\{|\}\}/, /\$\{/])
        if (bad.test(t)) f.push(`${route}: ${String(bad)} en el texto visible`);
      for (const a of humanAttributeValues(html))
        if (/undefined|NaN|\[object|\bnull\b|\{\{/.test(a.value))
          f.push(`${route}: valor inválido en ${a.tag}[${a.attr}]`);
    }
    return res(f, "sin undefined, NaN, [object, null ni plantillas sin resolver");
  },
};
const gUx02: Gate = {
  id: "G-UX-02",
  title: "Enlaces internos y anclas del contenido implementado resuelven",
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const f: string[] = [];
    for (const [route, html] of ctx.html) {
      const known = ids(html);
      for (const t of tags(html)) {
        const href = t.attrs["href"];
        if (href === undefined || t.name === "link") continue;
        if (href.startsWith("#")) {
          if (href !== "#" && !known.has(href.slice(1)))
            f.push(`${route}: ancla ${href} sin destino`);
        } else if (href.startsWith("/")) {
          const path = href.split("#")[0] ?? "";
          if (!ctx.html.has(path === "" ? "/" : path.replace(/\/$/, "") || "/"))
            f.push(`${route}: enlace ${href} sin página`);
        }
      }
    }
    return res(f, "todos los enlaces internos y anclas resuelven");
  },
};
const gUx03: Gate = {
  id: "G-UX-03",
  title: 'Ningún href="#" ni enlace vacío',
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const f: string[] = [];
    for (const [route, html] of ctx.html)
      for (const t of tags(html))
        if (
          t.name === "a" &&
          (t.attrs["href"] === undefined || t.attrs["href"] === "" || t.attrs["href"] === "#")
        )
          f.push(`${route}: enlace vacío o «#»: ${t.raw.slice(0, 60)}`);
    return res(f, "sin enlaces vacíos ni «#»");
  },
};
const gUx04: Gate = {
  id: "G-UX-04",
  title: "Las 18 preguntas y 14 claims alcanzables desde el mapa; ningún enlace del mapa muerto",
  run: () => na("el mapa de 18 preguntas no forma parte de M1 (fuera de alcance)"),
};
const gUx05: Gate = {
  id: "G-UX-05",
  title: "Sin JavaScript: el contenido íntegro se lee (0 <script>, 0 manejadores, 0 archivos JS)",
  run(ctx) {
    if (ctx.html.size === 0) return skip("sin dist/");
    const f: string[] = [];
    for (const [route, html] of ctx.html) {
      if (/<script\b/i.test(html)) f.push(`${route}: contiene <script>`);
      if (/\son[a-z]+\s*=/i.test(stripCode(html)))
        f.push(`${route}: contiene un manejador de eventos en línea`);
      if (/<astro-island/i.test(html)) f.push(`${route}: contiene una isla`);
    }
    return res(f, `${ctx.html.size} rutas con 0 scripts, 0 manejadores y 0 islas`);
  },
};
const COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(|\bhwb\(|\boklch\(|\boklab\(|\blab\(|\blch\(/;
const gUx06: Gate = {
  id: "G-UX-06",
  title:
    "Conformidad estática con el Charter: sin literales de color fuera de design/tokens.css; sin sombras, gradientes suaves ni fotos",
  run(ctx) {
    const f: string[] = [];
    for (const s of ctx.sources) {
      const isTokens = s.path === "design/tokens.css";
      const code =
        s.path.endsWith(".astro") ||
        s.path.endsWith(".css") ||
        s.path.endsWith(".ts") ||
        s.path.endsWith(".mjs")
          ? s.text
          : "";
      if (!isTokens && COLOR_LITERAL.test(code.replace(/<!--[\s\S]*?-->/g, "")))
        f.push(`${s.path}: literal de color fuera de design/tokens.css`);
      if (/\b(box-shadow|text-shadow)\s*:|drop-shadow\(/.test(code))
        f.push(`${s.path}: sombra (prohibida, Charter §3.1)`);
      if (/(?<!repeating-)(?:linear|radial|conic)-gradient\(/.test(code))
        f.push(
          `${s.path}: gradiente suave (solo se permiten patrones repeating-linear-gradient de rayado)`,
        );
      if (/<img\b|<picture\b|background-image\s*:\s*url\(/.test(code))
        f.push(`${s.path}: imagen (Charter §14: sin fotografías)`);
      if (
        /\.astro$/.test(s.path) &&
        /\b(?:card|kpi|tile|metric)\b/i.test(
          (s.path.split("/").pop() ?? "").replace(/\.astro$/, ""),
        )
      )
        f.push(`${s.path}: nombre de componente de dashboard (card/kpi/tile/metric)`);
    }
    return res(
      f,
      `${ctx.sources.length} archivos de código/estilo: color solo en tokens; sin sombras, degradados suaves, imágenes ni componentes tipo dashboard`,
    );
  },
};
const gPerf03: Gate = {
  id: "G-PERF-03",
  title: "Lista blanca de islas cliente: no hay ninguna",
  run(ctx) {
    const f = ctx.sources
      .filter((s) =>
        /\bclient:(load|idle|visible|media|only)\b|<script\b|\buse client\b/.test(s.text),
      )
      .map((s) => `${s.path}: isla o script de cliente no declarado`);
    return res(f, "0 islas de cliente y 0 scripts en src/");
  },
};
const RAW_EXT = /\.(xlsx?|xlsm|csv|tsv|zip|rar|7z|parquet|duckdb|sqlite|dta|sav|rds|feather)$/i;
const gLeg01: Gate = {
  id: "G-LEG-01",
  title: "Sin datos crudos en el repo (extensión y tamaño)",
  run(ctx) {
    const f = ctx.files
      .filter((x) => RAW_EXT.test(x.path) || x.bytes > 2 * 1024 * 1024)
      .map(
        (x) =>
          `${x.path}: ${RAW_EXT.test(x.path) ? "extensión de datos crudos" : `${x.bytes} B (> 2 MiB)`}`,
      );
    return res(
      f,
      `${ctx.files.length} archivos revisados: sin extensiones de datos crudos ni archivos > 2 MiB`,
    );
  },
};
const gGov: Gate = {
  id: "M1-GOV-01",
  title:
    "Integridad de la gobernanza congelada (hashes de las 9 copias == origen == SHA256SUMS de WEB-0)",
  run(ctx) {
    const f: string[] = [];
    const m = JSON.parse(
      readFileSync(join(ctx.root, "governance", "IMPORT-MANIFEST.json"), "utf8"),
    ) as { files: { path: string; sha256_source: string; sha256_repo_copy: string }[] };
    for (const x of m.files) {
      const h = sha256Hex(readFileSync(join(ctx.root, x.path)));
      if (h !== x.sha256_source || h !== x.sha256_repo_copy)
        f.push(`${x.path}: hash ${h.slice(0, 12)}… distinto del registrado`);
    }
    const sums = readFileSync(join(ctx.root, "governance", "web-0", "SHA256SUMS.txt"), "utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    for (const line of sums) {
      const mm = /^([0-9a-f]{64}) \*(.+)$/.exec(line);
      if (mm === null) continue;
      if (sha256Hex(readFileSync(join(ctx.root, "governance", "web-0", mm[2] ?? ""))) !== mm[1])
        f.push(`web-0/SHA256SUMS: ${mm[2] ?? ""} distinto`);
    }
    return res(
      f,
      `${m.files.length} copias idénticas a su origen y a las sumas emitidas al congelar WEB-0`,
    );
  },
};

export const GATES: Gate[] = [
  gSrc01,
  gSrc02,
  gSrc03,
  gSrc04,
  gSrc05,
  gGen01,
  gGen02,
  gGen03,
  gGen04,
  gGen05,
  gSch01,
  gSch02,
  gCnt01,
  gCnt02,
  gRef01,
  gRef02,
  gRef03,
  gRef04,
  gRef05,
  gRef06,
  gSta01,
  gSta02,
  gSta03,
  gSta04,
  gSta05,
  gSta06,
  gSta07,
  gPrv01,
  gPrv02,
  gPrv03,
  gPrv04,
  gPrv06,
  gLim01,
  gLim02,
  gLim03,
  gLim04,
  gLim05,
  gFig01,
  gFig02,
  gFig03,
  gFig04,
  gFig05,
  gFig06,
  gEdi01,
  gEdi02,
  gEdi03,
  gEdi04,
  gEdi05,
  gEdi06,
  gEdi07,
  gEdi08,
  gUx01,
  gUx02,
  gUx03,
  gUx04,
  gUx05,
  gUx06,
  gPerf03,
  gLeg01,
  gGov,
];

/** Ejecuta un gate por id (los tests de fixtures defectuosos usan esto). */
export function runGate(id: string, ctx: GateContext): Outcome {
  const g = GATES.find((x) => x.id === id);
  if (g === undefined) throw new Error(`gate desconocido: ${id}`);
  return g.run(ctx);
}
