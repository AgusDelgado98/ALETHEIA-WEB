import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GATES, RELEASE_GATES, runGate } from "../scripts/gates/gates.ts";
import type { GateContext } from "../scripts/gates/context.ts";
import { cloneCtx, realContext, ROOT, ROUTE } from "./helpers.ts";

const ctx = realContext();
const hasHtml = ctx.html.has(ROUTE);
const hasAllQuestionRoutes = Array.from({ length: 18 }, (_, i) =>
  ctx.html.has(`/labor/preguntas/q-${String(i + 1).padStart(4, "0")}`),
).every(Boolean);

describe("gates CORE_BUILD sobre el estado real", () => {
  it("ninguno falla", () => {
    const failed = GATES.map((g) => ({ id: g.id, r: g.run(ctx) })).filter(
      (x) => x.r.status === "FAIL",
    );
    expect(failed.map((x) => `${x.id}: ${x.r.failures.join(" | ")}`)).toEqual([]);
  });
  it("cubre las familias que el corte exige", () => {
    const ids = GATES.map((g) => g.id);
    for (const required of [
      "G-SRC-01",
      "G-SRC-02",
      "G-SRC-03",
      "G-GEN-01",
      "G-GEN-02",
      "G-SCH-01",
      "G-REF-04",
      "G-STA-01",
      "G-STA-03",
      "G-STA-04",
      "G-PRV-01",
      "G-PRV-02",
      "G-LIM-01",
      "G-LIM-02",
      "G-FIG-02",
      "G-FIG-03",
      "G-EDI-01",
      "G-EDI-02",
      "G-UX-01",
      "G-UX-04",
      "G-CNT-01",
      "M1-GOV-01",
    ]) {
      expect(ids, required).toContain(required);
    }
  });
});

describe("gates RELEASE", () => {
  it.skipIf(!hasHtml)(
    "los técnicos no fallan; G-LEG-03 permanece FAIL/OPEN; G-PERF-02 puede SKIP",
    () => {
      for (const g of RELEASE_GATES) {
        const r = g.run(ctx);
        if (g.id === "G-LEG-03") {
          expect(r.status, r.detail).toBe("FAIL");
          continue;
        }
        if (g.id === "G-PERF-02") {
          expect(["PASS", "SKIP"]).toContain(r.status);
          continue;
        }
        expect(r.status, `${g.id}: ${r.detail} ${r.failures.join(" | ")}`).toBe("PASS");
      }
    },
  );
});

describe("18 rutas de pregunta LABOR", () => {
  it.skipIf(!hasAllQuestionRoutes)(
    "dist incluye /labor/preguntas/q-0001 … q-0018 y G-UX-02 pasa",
    () => {
      for (let i = 1; i <= 18; i++) {
        const route = `/labor/preguntas/q-${String(i).padStart(4, "0")}`;
        expect(ctx.html.has(route), route).toBe(true);
      }
      const ux = runGate("G-UX-02", ctx);
      expect(ux.failures, ux.detail).toEqual([]);
      expect(ux.status).toBe("PASS");
    },
  );
  it.skipIf(!hasAllQuestionRoutes)(
    "Q-0003 renderiza 2 claims; las 5 sin claim no inventan data-claim-id",
    () => {
      const html = ctx.html.get("/labor/preguntas/q-0003") ?? "";
      expect(html).toContain('data-claim-id="LAB-CLM-0002"');
      expect(html).toContain('data-claim-id="LAB-CLM-0004"');
      for (const id of ["q-0006", "q-0007", "q-0011", "q-0015", "q-0017"]) {
        const h = ctx.html.get(`/labor/preguntas/${id}`) ?? "";
        expect(h.includes("data-question-id="), id).toBe(true);
        expect(h.includes("data-claim-id="), id).toBe(false);
      }
    },
  );
});

describe("mapa /explorar", () => {
  const MAP = "/explorar";
  it.skipIf(!ctx.html.has(MAP))(
    "18 preguntas, 18 enlaces válidos, 5 sin claim, Q-0003 con 2, sin undefined",
    () => {
      const html = ctx.html.get(MAP) ?? "";
      expect(html).not.toMatch(/\bundefined\b/);
      for (let i = 1; i <= 18; i++) {
        const n = String(i).padStart(4, "0");
        expect(html, n).toContain(`data-question-id="LAB-Q-${n}"`);
        expect(html, n).toContain(`href="/labor/preguntas/q-${n}"`);
      }
      expect(html).toContain('data-claim-id="LAB-CLM-0002"');
      expect(html).toContain('data-claim-id="LAB-CLM-0004"');
      expect([...html.matchAll(/Sin claim: no hay Rastro de claim\./g)]).toHaveLength(5);
      expect(runGate("G-UX-01", ctx).status).toBe("PASS");
      expect(runGate("G-UX-02", ctx).status).toBe("PASS");
      expect(runGate("G-UX-04", ctx).status).toBe("PASS");
    },
  );
});

/** Un fixture defectuoso: debe hacer fallar TODOS los gates indicados. Si un gate no falla, no está implementado. */
interface Fixture {
  name: string;
  gates: string[];
  mutate: (c: GateContext) => void;
  html?: boolean;
}

const page = (c: GateContext): string => c.html.get(ROUTE) ?? "";
const setPage = (c: GateContext, html: string): void => {
  c.html.set(ROUTE, html);
};
const inject = (c: GateContext, snippet: string): void =>
  setPage(c, page(c).replace("</main>", `${snippet}</main>`));

const FIXTURES: Fixture[] = [
  // ── estados y mapeo ──
  {
    name: "cambiar el estado de un claim en generated/",
    gates: ["G-STA-01", "G-GEN-05", "G-GEN-02"],
    mutate: (c) => {
      const clm = c.generated.claims.find((x) => x.id === "LAB-CLM-0011")!;
      clm.epistemic_state = "OBSERVED_IN_SOURCE";
      c.generatedFiles.set(
        "claims.json",
        (c.generatedFiles.get("claims.json") ?? "").replace(
          '"epistemic_state": "INSUFFICIENT_EVIDENCE"',
          '"epistemic_state": "OBSERVED_IN_SOURCE"',
        ),
      );
    },
  },
  {
    name: "BLOCKED_BY_DESIGN como estado de un Claim",
    gates: ["G-SCH-01", "G-STA-03", "G-STA-01"],
    mutate: (c) =>
      void ((
        c.generated.claims.find((x) => x.id === "LAB-CLM-0011") as { epistemic_state: string }
      ).epistemic_state = "BLOCKED_BY_DESIGN"),
  },
  {
    name: "agregar un claim a Q-0013 (mapeo 0..N roto)",
    gates: ["G-REF-04", "G-REF-01", "G-STA-02"],
    mutate: (c) =>
      void c.generated.questions.find((q) => q.id === "LAB-Q-0013")!.claim_ids.push("LAB-CLM-9999"),
  },
  {
    name: "agregar un claim a una pregunta sin claims (Q-0006)",
    gates: ["G-REF-04"],
    mutate: (c) => void c.map.questions["LAB-Q-0006"]!.claim_ids.push("LAB-CLM-0001"),
  },
  {
    name: "quitar LAB-CLM-0004 de Q-0003",
    gates: ["G-REF-04"],
    mutate: (c) => void (c.map.questions["LAB-Q-0003"]!.claim_ids = ["LAB-CLM-0002"]),
  },
  {
    name: "resolución de la pregunta distinta de la de su claim",
    gates: ["G-STA-02"],
    mutate: (c) =>
      void (c.generated.questions.find((q) => q.id === "LAB-Q-0013")!.resolution.value =
        "REFUTED_WITHIN_SCOPE"),
  },
  {
    name: "una ausencia presentada como resultado negativo",
    gates: ["G-STA-05"],
    mutate: (c) =>
      void (c.generated.claims.find((x) => x.id === "LAB-CLM-0011")!.absent_vs_negative =
        "NEGATIVE_WITHIN_SCOPE"),
  },
  {
    name: "claim huérfano (apunta a otra pregunta)",
    gates: ["G-REF-02"],
    mutate: (c) =>
      void (c.generated.claims.find((x) => x.id === "LAB-CLM-0011")!.question_id = "LAB-Q-0001"),
  },
  {
    name: "referencia a una evidencia inexistente",
    gates: ["G-REF-01"],
    mutate: (c) =>
      void c.generated.claims
        .find((x) => x.id === "LAB-CLM-0011")!
        .evidence_ids.push("LAB-EVD-9999"),
  },
  // ── provenance, esquemas, conteos ──
  {
    name: "hash inventado en recorded_hashes",
    gates: ["G-PRV-02"],
    mutate: (c) =>
      void c.generated.claims
        .find((x) => x.id === "LAB-CLM-0011")!
        .provenance.recorded_hashes.push({
          file: "x.xlsx",
          sha256: "0".repeat(64),
        }),
  },
  {
    name: "provenance con un commit distinto del pin",
    gates: ["G-PRV-01"],
    mutate: (c) => void (c.generated.hypotheses[0]!.provenance.commit = "1".repeat(40)),
  },
  {
    name: "vínculo raíz→fuente sin base",
    gates: ["G-PRV-03"],
    mutate: (c) => void (c.generated["evidence-roots"][0]!.source_link_status = "RESOLVED"),
  },
  {
    name: "ID derivado que no corresponde a su texto",
    gates: ["G-SCH-02"],
    mutate: (c) =>
      void (c.generated.limitations[0]!.text = c.generated.limitations[0]!.text + " (editado)"),
  },
  {
    name: "conteo del corpus distinto del contrato",
    gates: ["G-CNT-01"],
    mutate: (c) => void (c.stats.claims = 15),
  },
  {
    name: "entidad con un campo desconocido",
    gates: ["G-SCH-01"],
    mutate: (c) =>
      void ((c.generated.questions[0] as unknown as Record<string, unknown>)["extra"] = 1),
  },
  {
    name: "archivo generado con un timestamp de ejecución",
    gates: ["G-GEN-04"],
    mutate: (c) =>
      void c.generatedFiles.set(
        "questions.json",
        (c.generatedFiles.get("questions.json") ?? "") + '"2026-09-19T21:00:00Z"',
      ),
  },
  {
    name: "archivo generado con una ruta absoluta",
    gates: ["G-GEN-04"],
    mutate: (c) =>
      void c.generatedFiles.set(
        "questions.json",
        (c.generatedFiles.get("questions.json") ?? "") + '"C:\\\\Users\\\\agusd\\\\x"',
      ),
  },
  {
    name: "generated/ con un archivo alterado",
    gates: ["G-GEN-02", "G-CNT-02"],
    mutate: (c) =>
      void c.generatedFiles.set("claims.json", (c.generatedFiles.get("claims.json") ?? "") + " "),
  },
  {
    name: "golden: pregunta con otro conjunto de hipótesis",
    gates: ["G-GEN-05"],
    mutate: (c) => void (c.golden[0]!.HYPOTHESIS_IDS = ["LAB-HYP-9999"]),
  },
  // ── límites ──
  {
    name: "borrar la disposición de una limitación del claim",
    gates: ["G-LIM-02"],
    mutate: (c) =>
      void (c.editorial.limits.dispositions = c.editorial.limits.dispositions.filter(
        (d) => !d.limitation.endsWith("LAB-CLM-0011#limitation:1"),
      )),
  },
  {
    name: "clasificar como AUDIT_ONLY una limitación de clase SCOPE",
    gates: ["G-LIM-02"],
    mutate: (c) => {
      const d = c.editorial.limits.dispositions.find((x) =>
        x.limitation.endsWith("LAB-CLM-0011#limitation:5"),
      )!;
      d.disposition = "AUDIT_ONLY";
      d.waiver_reason = "no lo mostramos";
    },
  },
  {
    name: "SHOWN que remite a un texto público inexistente",
    gates: ["G-LIM-02"],
    mutate: (c) => void (c.editorial.limits.dispositions[0]!.public_refs = ["does_not_mean:zzz"]),
  },
  {
    name: "hipótesis con exposición previa sin divulgación",
    gates: ["G-LIM-03"],
    mutate: (c) =>
      void (c.generated.hypotheses.find((h) => h.id === "LAB-HYP-0006")!.prior_data_exposure =
        "DIRECT"),
  },
  // ── editorial ──
  {
    name: "cambiar el canónico sin reauditar (obsolescencia por hash)",
    gates: ["G-EDI-01"],
    mutate: (c) =>
      void (c.generated.claims.find((x) => x.id === "LAB-CLM-0011")!.scope_statement =
        c.generated.claims.find((x) => x.id === "LAB-CLM-0011")!.scope_statement +
        " Nuevo texto canónico."),
  },
  {
    name: "editar public_question sin nuevo registro",
    gates: ["G-EDI-02"],
    mutate: (c) =>
      void (c.editorial.question.public_question = c.editorial.question.public_question.replace(
        "efecto causal",
        "efecto",
      )),
  },
  {
    name: "editar un límite SHOWN sin nuevo registro",
    gates: ["G-LIM-05"],
    mutate: (c) =>
      void (c.editorial.units.find((u) => u.string_id.endsWith("does_not_mean.dnm-1"))!.text +=
        " Ya está."),
  },
  {
    name: "escribir «35,48 %» a mano en el editorial",
    gates: ["G-FIG-02", "G-FIG-05"],
    mutate: (c) => void (c.editorial.units[1]!.text = "El ingreso creció 35,48 % en el período"),
  },
  {
    name: "cantidad escrita a mano en palabras",
    gates: ["G-FIG-02"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Hay tres bloqueos"),
  },
  {
    name: "escribir «demuestra» en un texto",
    gates: ["G-EDI-03"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Esto demuestra que el umbral no importa"),
  },
  {
    name: "escribir «causa» en un texto",
    gates: ["G-EDI-03"],
    mutate: (c) => void (c.editorial.units[1]!.text = "El cambio causa un desplazamiento"),
  },
  {
    name: "TODO / placeholder en un texto",
    gates: ["G-EDI-06"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Texto pendiente TODO revisar"),
  },
  {
    name: "HTML crudo en un texto",
    gates: ["G-EDI-07"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Texto con <b>negrita</b>"),
  },
  {
    name: "directiva fuera de la lista blanca",
    gates: ["G-EDI-07"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Texto {{script:alert}}"),
  },
  {
    name: "referenciar una Relation PROHIBITED como afirmación",
    gates: ["G-EDI-05"],
    mutate: (c) => {
      const u = c.editorial.units.find((x) => x.section === "can_say")!;
      u.maps_to.push("labor/REL-PR-006#prohibited_inference");
    },
  },
  {
    name: "citar una Relation PROHIBITED por un campo que no es prohibited_inference",
    gates: ["G-EDI-05"],
    mutate: (c) =>
      void c.editorial.units
        .find((x) => x.section === "does_not_mean")!
        .maps_to.push("labor/REL-PR-008#reason"),
  },
  {
    name: "etiqueta pública para un código ausente",
    gates: ["G-STA-06"],
    mutate: (c) =>
      void (c.editorial.states.claim_state_labels["CONVERGENT"] = { id: "x", text: "Convergente" }),
  },
  {
    name: "«establecido» sin calificador",
    gates: ["G-STA-06"],
    mutate: (c) => void (c.editorial.units[1]!.text = "Es un resultado establecido"),
  },
  // ── HTML renderizado ──
  {
    name: 'href="#"',
    gates: ["G-UX-03"],
    html: true,
    mutate: (c) => inject(c, '<a href="#">ir</a>'),
  },
  {
    name: "«undefined» en un panel",
    gates: ["G-UX-01"],
    html: true,
    mutate: (c) => inject(c, "<p>undefined</p>"),
  },
  {
    name: "plantilla sin resolver",
    gates: ["G-UX-01"],
    html: true,
    mutate: (c) => inject(c, "<p>{{anchor:x}}</p>"),
  },
  {
    name: "un número dentro de un aria-label",
    gates: ["G-FIG-03"],
    html: true,
    mutate: (c) => inject(c, '<p aria-label="35,48 %">x</p>'),
  },
  {
    name: "una cifra suelta en el texto",
    gates: ["G-FIG-03"],
    html: true,
    mutate: (c) => inject(c, "<p>subió 35,48 % en el año</p>"),
  },
  {
    name: "«10 de 14 claims (71 %)»",
    gates: ["G-FIG-05", "G-FIG-03"],
    html: true,
    mutate: (c) => inject(c, "<p>10 de 14 claims (71 %)</p>"),
  },
  {
    name: "«2 fuentes independientes»",
    gates: ["G-PRV-06"],
    html: true,
    mutate: (c) => inject(c, "<p>2 fuentes independientes</p>"),
  },
  {
    name: "«11 establecidas» sin calificador",
    gates: ["G-STA-06"],
    html: true,
    mutate: (c) => inject(c, "<p>11 establecidas</p>"),
  },
  {
    name: "un <script> de tercero",
    gates: ["G-UX-05"],
    html: true,
    mutate: (c) => inject(c, '<script src="https://cdn.example.com/x.js"></script>'),
  },
  {
    name: "una isla cliente",
    gates: ["G-UX-05"],
    html: true,
    mutate: (c) => inject(c, "<astro-island></astro-island>"),
  },
  {
    name: "enlace interno a una página inexistente",
    gates: ["G-UX-02"],
    html: true,
    mutate: (c) => inject(c, '<a href="/labor/preguntas/q-9999">x</a>'),
  },
  {
    name: "ancla sin destino",
    gates: ["G-UX-02"],
    html: true,
    mutate: (c) => inject(c, '<a href="#nada">x</a>'),
  },
  {
    name: "enlace externo sin registro en el corpus",
    gates: ["G-PRV-03"],
    html: true,
    mutate: (c) => inject(c, '<a href="https://example.org/dato">fuente</a>'),
  },
  {
    name: "estado renderizado distinto del generado",
    gates: ["G-STA-04"],
    html: true,
    mutate: (c) =>
      setPage(
        c,
        page(c).replace(
          'data-claim-state="INSUFFICIENT_EVIDENCE"',
          'data-claim-state="OBSERVED_IN_SOURCE"',
        ),
      ),
  },
  {
    name: "cadena tipeada a mano en el HTML",
    gates: ["G-EDI-08"],
    html: true,
    mutate: (c) => inject(c, "<p>Texto escrito directamente en un componente</p>"),
  },
  {
    name: "quitar «Lo que esto NO significa» de la página",
    gates: ["G-LIM-01"],
    html: true,
    mutate: (c) => setPage(c, page(c).replaceAll("Lo que esto NO significa", "")),
  },
  {
    name: "ocultar un límite público de la página",
    gates: ["G-LIM-03"],
    html: true,
    mutate: (c) =>
      setPage(c, page(c).replaceAll("No significa que el cambio de umbrales no tenga efecto.", "")),
  },
  // ── estático / Charter ──
  {
    name: "literal de color en un componente",
    gates: ["G-UX-06"],
    mutate: (c) =>
      void c.sources.push({
        path: "src/components/X.astro",
        text: "<style>.a{color:#ff0000}</style>",
      }),
  },
  {
    name: "sombra en un componente",
    gates: ["G-UX-06"],
    mutate: (c) =>
      void c.sources.push({
        path: "src/components/X.astro",
        text: "<style>.a{box-shadow:0 0 4px var(--ink)}</style>",
      }),
  },
  {
    name: "degradado suave",
    gates: ["G-UX-06"],
    mutate: (c) =>
      void c.sources.push({
        path: "src/components/X.astro",
        text: "<style>.a{background:linear-gradient(red,blue)}</style>",
      }),
  },
  {
    name: "componente llamado KpiCard",
    gates: ["G-UX-06"],
    mutate: (c) => void c.sources.push({ path: "src/components/kpi.astro", text: "" }),
  },
  {
    name: "isla cliente en src/",
    gates: ["G-PERF-03"],
    mutate: (c) =>
      void c.sources.push({ path: "src/components/X.astro", text: "<Foo client:load />" }),
  },
  {
    name: "un .csv en el repo",
    gates: ["G-LEG-01"],
    mutate: (c) => void c.files.push({ path: "public/datos.csv", bytes: 100 }),
  },
  {
    name: "un archivo enorme en el repo",
    gates: ["G-LEG-01"],
    mutate: (c) => void c.files.push({ path: "public/x.bin", bytes: 3 * 1024 * 1024 }),
  },
  {
    name: "og:image en una página",
    gates: ["G-OG-01"],
    html: true,
    mutate: (c) =>
      setPage(
        c,
        page(c).replace("</head>", '<meta property="og:image" content="/x.png" /></head>'),
      ),
  },
  {
    name: "title duplicado entre dos rutas",
    gates: ["G-SEO-01"],
    html: true,
    mutate: (c) => {
      const html = page(c);
      if (html !== "") c.html.set("/hallazgos", html);
    },
  },
  {
    name: "enlace interno a una ruta inexistente",
    gates: ["G-LNK-01", "G-UX-02"],
    html: true,
    mutate: (c) => inject(c, '<a href="/no-existe">x</a>'),
  },
];

describe("fixtures defectuosos: cada gate debe FALLAR cuando debe", () => {
  for (const fx of FIXTURES) {
    const skip = fx.html === true && !hasHtml;
    it.skipIf(skip)(fx.name, () => {
      const c = cloneCtx(ctx);
      fx.mutate(c);
      for (const id of fx.gates) {
        const r = runGate(id, c);
        expect(r.status, `${id} debería fallar con «${fx.name}» (detalle: ${r.detail})`).toBe(
          "FAIL",
        );
      }
    });
  }
  it("hay fixtures rojos para cada gate no trivial", () => {
    const covered = new Set(FIXTURES.flatMap((f) => f.gates));
    for (const id of [
      "G-STA-01",
      "G-STA-02",
      "G-STA-03",
      "G-STA-04",
      "G-STA-05",
      "G-STA-06",
      "G-REF-01",
      "G-REF-02",
      "G-REF-04",
      "G-PRV-01",
      "G-PRV-02",
      "G-PRV-03",
      "G-LIM-01",
      "G-LIM-02",
      "G-LIM-03",
      "G-LIM-05",
      "G-FIG-02",
      "G-FIG-03",
      "G-FIG-05",
      "G-EDI-01",
      "G-EDI-02",
      "G-EDI-03",
      "G-EDI-05",
      "G-EDI-06",
      "G-EDI-07",
      "G-EDI-08",
      "G-UX-01",
      "G-UX-02",
      "G-UX-03",
      "G-UX-05",
      "G-UX-06",
      "G-PERF-03",
      "G-LEG-01",
      "G-GEN-02",
      "G-GEN-04",
      "G-GEN-05",
      "G-CNT-01",
      "G-CNT-02",
      "G-SCH-01",
      "G-SCH-02",
      "G-PRV-06",
      "G-SEO-01",
      "G-OG-01",
      "G-LNK-01",
    ]) {
      expect(covered.has(id), `sin fixture defectuoso para ${id}`).toBe(true);
    }
  });
});

describe("fixtures que necesitan disco", () => {
  it("un byte cambiado en corpus-src/ falla G-SRC-02 y G-SRC-03", () => {
    const dir = mkdtempSync(join(tmpdir(), "aletheia-src-"));
    cpSync(ctx.srcDir, dir, { recursive: true });
    const f = join(dir, "metadata/claims/claim-ledger.json");
    const buf = readFileSync(f);
    buf[100] = (buf[100]! + 1) % 256;
    writeFileSync(f, buf);
    const c = { ...cloneCtx(ctx), srcDir: dir, repo: null };
    expect(runGate("G-SRC-02", c).status).toBe("FAIL");
    expect(runGate("G-SRC-03", c).status).toBe("FAIL");
  });
  it("un byte cambiado en la gobernanza congelada falla M1-GOV-01", () => {
    const dir = mkdtempSync(join(tmpdir(), "aletheia-gov-"));
    cpSync(join(ROOT, "governance"), join(dir, "governance"), { recursive: true });
    const f = join(dir, "governance", "web-0", "WEB-0-MVP.md");
    writeFileSync(f, Buffer.concat([readFileSync(f), Buffer.from("x")]));
    expect(runGate("M1-GOV-01", { ...cloneCtx(ctx), root: dir }).status).toBe("FAIL");
  });
  it("apuntar el pin a otro commit falla G-SRC-01", () => {
    const c = cloneCtx(ctx);
    c.pin.commit = "2".repeat(40);
    expect(runGate("G-SRC-01", c).status).toBe("FAIL");
  });
  it("el pin humano y el pin por archivo deben coincidir", () => {
    expect(existsSync(join(ROOT, "pins", "labor.pin.json"))).toBe(true);
  });
});
