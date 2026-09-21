import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistro, STATES } from "../src/lib/registro.ts";
import { FEATURED_QUESTION_IDS } from "../src/lib/site.ts";
import { loadGlosses } from "../tools/editorial/load.ts";
import { realContext, ROOT } from "./helpers.ts";

/** REGISTRO + FOLIO: datos del Registro y estructura del shell en `/`, en las 18 preguntas y en los documentos. */
const registro = loadRegistro(ROOT);
const rows = registro.groups.flatMap((g) => g.rows);
const ctx = realContext();
const html = ctx.html;
const home = html.get("/");
const q3 = html.get("/labor/preguntas/q-0003");
const built = home !== undefined && q3 !== undefined;
const FEATURED = new Set<string>(FEATURED_QUESTION_IDS);
const DOCS = ["/explorar", "/hallazgos", "/limites", "/metodo", "/versiones", "/sobre", "/404"];
const slug = (id: string): string => `/labor/preguntas/${id.replace(/^LAB-/, "").toLowerCase()}`;

describe("Registro (datos)", () => {
  it("las 18 preguntas reales, agrupadas por régimen A/B/C en el orden del ledger", () => {
    expect(rows).toHaveLength(18);
    expect(registro.groups.map((g) => g.regime)).toEqual(["A", "B", "C"]);
    expect(rows.map((r) => r.shortId)).toEqual(
      Array.from({ length: 18 }, (_, i) => String(i + 1).padStart(4, "0")),
    );
  });
  it("cada fila lleva un estado conocido, un código y un título corto no vacío", () => {
    const known = new Set(STATES.map((s) => s.state));
    for (const r of rows) {
      expect(known.has(r.state as (typeof STATES)[number]["state"]), r.id).toBe(true);
      expect(r.code, r.id).not.toBe(r.state);
      expect(r.title.trim(), r.id).not.toBe("");
    }
  });
  it("los títulos cortos son los de editorial/site/glosses.yml (nav_titles): 18, únicos, de una línea y cortos", () => {
    const nav = loadGlosses(ROOT).nav_titles;
    expect(Object.keys(nav).sort()).toEqual(rows.map((r) => r.id).sort());
    const titles = rows.map((r) => r.title);
    expect(new Set(titles).size).toBe(18);
    for (const r of rows) {
      expect(r.title, r.id).toBe(nav[r.id]?.text);
      expect([...r.title].length, r.id).toBeLessThanOrEqual(48);
      expect(r.title, r.id).not.toMatch(/[\n:?]/);
      expect(nav[r.id]?.maps_to, r.id).toEqual([`labor/${r.id}#canonical_title`]);
    }
  });
  it("las cinco fichas con lectura completa son las destacadas", () => {
    const tierA = rows.filter((r) => r.hasEditorial).map((r) => r.id);
    expect(new Set(tierA)).toEqual(FEATURED);
  });
});

describe.skipIf(!built)("shell en el HTML construido", () => {
  it("/ muestra Registro + carátula, sin scripts ni pregunta abierta", () => {
    const h = home ?? "";
    expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
    expect(h).toContain('class="carat"');
    expect(h).not.toContain("data-question-id=");
    expect(h).not.toContain("<script");
  });
  it("lectura completa: cinco filas marcadas, leyenda visible y ningún énfasis por peso", () => {
    const h = home ?? "";
    expect((h.match(/data-tier="A"/g) ?? []).length).toBe(5);
    expect(h).toContain('class="registro__read"');
    expect(h).toContain("lectura completa");
    const css = readFileSync(join(ROOT, "src", "styles", "shell.css"), "utf8");
    expect(css).not.toMatch(/data-tier="A"\]\s+\.row__t/);
  });
  it("la Home conserva el cierre y el corte: tag y commit abreviado en la barra de estado", () => {
    const h = home ?? "";
    expect(h).toContain(ctx.generated.manifest.pin.tag);
    expect(h).toContain(ctx.generated.manifest.pin.commit.slice(0, 7));
    expect(h).toContain("Corpus congelado");
    expect(h).toContain("Presentación web posterior");
    expect(h).toContain("ALETHEIA-LABOR está formalmente cerrado");
  });
  it("Q-0003 renderiza el mismo Registro con la fila 0003 seleccionada y el Folio abierto", () => {
    const h = q3 ?? "";
    expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
    expect(h).toMatch(/aria-current="page"[^>]*data-index-question="LAB-Q-0003"/);
    expect(h).toContain('data-question-id="LAB-Q-0003"');
    expect(h).toContain('data-claim-id="LAB-CLM-0002"');
    expect(h).toContain('data-claim-id="LAB-CLM-0004"');
    expect(h).not.toContain("<script");
  });
  it("el Folio no oculta que hay más límites: contador y enlace a la vista Límites", () => {
    const h = q3 ?? "";
    expect(h).toMatch(/\+<span data-num="count">\d+<\/span> más en Límites/);
    expect(h).toMatch(/Límites\s*<span class="n" data-num="count">\d+<\/span>/);
  });
  it("la cota muestra la licencia CC BY-SA registrada de CGI y enlaza a las atribuciones", () => {
    const h = q3 ?? "";
    expect(h).toContain("LAB-ROOT-0002");
    expect(h).toContain("CC BY-SA");
    expect(h).toContain('href="/sobre#atribuciones"');
  });
});

describe.skipIf(!built)("las 18 preguntas, todas con el shell Registro + Folio", () => {
  for (const r of rows) {
    it(`${r.id}: Folio, cuatro vistas, fila seleccionada y estado ${r.state}`, () => {
      const h = html.get(slug(r.id)) ?? "";
      expect(h, r.id).not.toBe("");
      expect(h).toContain('class="shell"');
      expect(h).toContain('data-view="folio"');
      expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
      expect(h).toMatch(new RegExp(`aria-current="page"[^>]*data-index-question="${r.id}"`));
      expect(h).toContain(`data-question-id="${r.id}"`);
      expect(h).toContain(`data-question-resolution="${r.state}"`);
      for (const id of ["v-lectura", "v-evidencia", "v-limites", "v-prov"]) {
        expect(h, id).toContain(`id="${id}"`);
        expect(h, id).toContain(`for="${id}"`);
      }
      expect(h).toMatch(/id="v-lectura"[^>]*checked/);
      for (const p of ["p-lectura", "p-evidencia", "p-limites", "p-prov"])
        expect(h, p).toContain(`id="${p}"`);
      expect(h).not.toContain("<script");
      // Las fichas mínimas no fabrican texto editorial: dicen que son mínimas y citan el título canónico.
      if (r.hasEditorial) expect(h).not.toContain("data-canonical-cite");
      else {
        expect(h).toContain("Ficha mínima");
        expect(h).toContain("data-canonical-cite");
      }
    });
  }
  it("cada pregunta con claims los muestra con su estado; las 5 sin claim lo dicen", () => {
    let sinClaim = 0;
    for (const q of ctx.generated.questions) {
      const h = html.get(slug(q.id)) ?? "";
      for (const cid of q.claim_ids) expect(h, cid).toContain(`data-claim-id="${cid}"`);
      if (q.claim_ids.length === 0) {
        sinClaim++;
        expect(h, q.id).toContain("Sin claim: no hay Rastro de claim.");
      }
    }
    expect(sinClaim).toBe(5);
  });
});

describe.skipIf(!built)("documentos en el mismo shell", () => {
  for (const route of DOCS) {
    it(`${route}: Registro persistente, panel de documento, un solo h1, sin scripts`, () => {
      const h = html.get(route) ?? "";
      expect(h, route).not.toBe("");
      expect(h).toContain('data-view="doc"');
      expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
      expect(h).toContain('class="doc"');
      expect(h).toContain('class="status"');
      expect((h.match(/<h1\b/g) ?? []).length).toBe(1);
      expect(h).not.toContain("<script");
      if (route !== "/404") {
        expect(h).toContain('class="docnav"');
        expect(h).toMatch(
          new RegExp(
            `aria-current="page"[^>]*href="${route}"|href="${route}"[^>]*aria-current="page"`,
          ),
        );
      }
    });
  }
  it("Hallazgos lista solo las cinco fichas destacadas y ninguna del régimen C", () => {
    const h = html.get("/hallazgos") ?? "";
    expect(h).toContain('data-featured="true"');
    expect((h.match(/data-finding-question=/g) ?? []).length).toBe(5);
    for (const id of FEATURED_QUESTION_IDS)
      expect(h, id).toContain(`data-finding-question="${id}"`);
    for (const q of ctx.generated.questions.filter((x) => !FEATURED.has(x.id)))
      expect(h.includes(`data-finding-question="${q.id}"`), q.id).toBe(false);
  });
  it("Explorar muestra las 18 preguntas completas, con su resolución y sus 14 claims", () => {
    const h = html.get("/explorar") ?? "";
    for (const q of ctx.generated.questions) {
      expect(h, q.id).toContain(`data-question-id="${q.id}"`);
      expect(h, q.id).toContain(`href="${slug(q.id)}"`);
    }
    expect((h.match(/data-claim-id=/g) ?? []).length).toBe(14);
  });
  it("la navegación superior marca Registro, Límites o Documentos según la ruta", () => {
    const cur = (route: string): string =>
      /<a[^>]*aria-current="page"[^>]*>\s*([^<]+?)\s*<\/a>/.exec(
        (html.get(route) ?? "").split('<nav class="bar__nav"')[1]?.split("</nav>")[0] ?? "",
      )?.[1] ?? "";
    expect(cur("/")).toBe("Registro");
    expect(cur("/labor/preguntas/q-0008")).toBe("Registro");
    expect(cur("/explorar")).toBe("Registro");
    expect(cur("/hallazgos")).toBe("Registro");
    expect(cur("/limites")).toBe("Límites");
    for (const r of ["/metodo", "/versiones", "/sobre"]) expect(cur(r)).toBe("Documentos");
  });
});
