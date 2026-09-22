import { describe, expect, it } from "vitest";
import {
  loadRegistro,
  PICKER_TOGGLE_ID,
  SINGLE_QUESTION_IDS,
  STATES,
} from "../src/lib/registro.ts";
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
const q13 = html.get("/labor/preguntas/q-0013");
const cierre = html.get("/cierre");
const built = home !== undefined && q3 !== undefined && q13 !== undefined && cierre !== undefined;
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

describe.skipIf(!built)(
  "ONE QUESTION AT A TIME: / es la entrada, sin las 18 preguntas ni IDs",
  () => {
    it("/ no expone ninguna pregunta, estado ni ID fuera del selector oculto", () => {
      const h = home ?? "";
      const outsidePicker = h.split('<div class="picker-mount">')[0] ?? h;
      expect(outsidePicker).not.toContain("data-question-id=");
      expect(outsidePicker).not.toContain("data-tier=");
      expect(outsidePicker).not.toMatch(/LAB-Q-\d{4}/);
      expect(h).not.toContain("<script");
      // el selector (18 preguntas) vive en el HTML, listo para abrirse, pero no domina la pantalla de entrada
      expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
      expect(h).toContain(`id="${PICKER_TOGGLE_ID}"`);
      expect(h).toContain('class="picker"');
    });
    it("/ comienza por Q-0003 y mantiene el selector como opción secundaria", () => {
      const h = home ?? "";
      expect(h).toContain('href="/labor/preguntas/q-0003" class="btn btn--primary"');
      expect(h).toMatch(new RegExp(`for="${PICKER_TOGGLE_ID}"[^>]*class="hero__choose"`));
      expect(h).toContain('href="/metodo"');
      expect(h).toContain('href="/sobre"');
    });
    it("la Home comunica el principio sin exponer metadatos técnicos", () => {
      const h = home ?? "";
      expect(h).toContain("decir solo lo que la evidencia permite sostener");
      expect(h).toContain("corpus cerrado");
      expect(h).toContain("La verdad depende del alcance de la evidencia");
      expect(h).not.toContain(ctx.generated.manifest.pin.commit.slice(0, 7));
    });
  },
);

describe.skipIf(!built)("ONE QUESTION AT A TIME: Q-0003, una capa a la vez", () => {
  it("progreso, pregunta, estado y respuesta siempre visibles; sin panel lateral persistente", () => {
    const h = q3 ?? "";
    expect(h).toContain('class="single ');
    expect(h).toContain('data-question-id="LAB-Q-0003"');
    expect(h).toMatch(/Pregunta\s*<span[^>]*>03<\/span>[\s\S]*?<span[^>]*>18<\/span>/i);
    expect(h).not.toContain('class="registro"');
  });
  it("el selector sigue disponible (18 preguntas, Q-0003 marcada) pero no ocupa la pantalla", () => {
    const h = q3 ?? "";
    expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
    expect(h).toMatch(/aria-current="page"[^>]*data-index-question="LAB-Q-0003"/);
    expect(h).toContain(`id="${PICKER_TOGGLE_ID}"`);
  });
  it("cuatro vistas, Respuesta por defecto y desarrollo completo en un panel amplio", () => {
    const h = q3 ?? "";
    for (const id of ["v-resumen", "v-evidencia", "v-limites", "v-prov"]) {
      expect(h, id).toContain(`id="${id}"`);
      expect(h, id).toContain(`for="${id}"`);
    }
    expect(h).toMatch(/id="v-resumen"[^>]*checked/);
    for (const p of ["p-resumen", "p-evidencia", "p-limites", "p-prov"])
      expect(h, p).toContain(`id="${p}"`);
    expect(h).toContain('data-claim-id="LAB-CLM-0002"');
    expect(h).toContain('data-claim-id="LAB-CLM-0004"');
    expect(h).toContain('class="development"');
    expect(h).toContain("Ver desarrollo completo");
    expect(h).not.toContain("<script");
  });
  it("los IDs, el commit y los hashes visibles aparecen solo en Procedencia", () => {
    const h = q3 ?? "";
    const prov = /<section class="panel" id="p-prov"[\s\S]*?<\/section>/.exec(h)?.[0] ?? "";
    const rest = h.replace(prov, "");
    expect(prov).toContain(ctx.generated.manifest.pin.commit);
    expect(prov).toContain(ctx.generated.manifestSha256);
    expect(prov).toContain("LAB-ROOT-0002");
    expect(rest).not.toContain(ctx.generated.manifest.pin.commit);
    expect(rest).not.toContain(ctx.generated.manifestSha256);
    expect(rest).not.toMatch(/class="mono" data-num="id">LAB-(?:CLM|ROOT|HYP|EVD)-/);
  });
  it("la cota (en Procedencia) muestra la licencia CC BY-SA registrada de CGI y enlaza a las atribuciones", () => {
    const h = q3 ?? "";
    expect(h).toContain("LAB-ROOT-0002");
    expect(h).toContain("CC BY-SA");
    expect(h).toContain('href="/sobre#atribuciones"');
  });
  it("recorrido secuencial: vuelve a Q-0002, sigue a Q-0004 y conserva el selector", () => {
    const h = q3 ?? "";
    expect(h).toContain('href="/labor/preguntas/q-0002" rel="prev"');
    expect(h).toContain('href="/labor/preguntas/q-0004" rel="next"');
    expect(h).toMatch(new RegExp(`for="${PICKER_TOGGLE_ID}"[^>]*class="btn btn--ghost"`));
  });
});

describe.skipIf(!built)("Q-0013 y cierre del recorrido", () => {
  it("Q-0013 declara evidencia insuficiente sin afirmar un efecto", () => {
    const h = q13 ?? "";
    expect(h).toContain('data-question-resolution="INSUFFICIENT_EVIDENCE"');
    expect(h).toContain("La evidencia no alcanza para responder esta pregunta");
    expect(h).toContain("No se calculó ningún efecto");
    expect(h).toContain('href="/labor/preguntas/q-0012" rel="prev"');
    expect(h).toContain('href="/labor/preguntas/q-0014" rel="next"');
  });
  it("el cierre es reflexivo y ofrece explorar, método y procedencia", () => {
    const h = cierre ?? "";
    expect(h).toContain("Esto es lo que pude sostener");
    expect(h).toContain(`for="${PICKER_TOGGLE_ID}"`);
    expect(h).toContain('href="/metodo"');
    expect(h).toContain('href="/versiones"');
  });
});

describe.skipIf(!built)("las 18 preguntas usan el recorrido guiado", () => {
  it("la lista de rutas guiadas cubre el corpus completo", () => {
    expect(SINGLE_QUESTION_IDS).toEqual(rows.map((row) => row.id));
  });

  for (const r of rows) {
    it(`${r.id}: una pregunta, cuatro capas, selector oculto y estado ${r.state}`, () => {
      const h = html.get(slug(r.id)) ?? "";
      expect(h, r.id).not.toBe("");
      expect(h).toContain('class="single');
      expect(h).not.toContain('class="shell"');
      expect(h).not.toContain('class="registro"');
      expect((h.match(/data-index-question=/g) ?? []).length).toBe(18);
      expect(h).toMatch(new RegExp(`aria-current="page"[^>]*data-index-question="${r.id}"`));
      expect(h).toContain(`data-question-id="${r.id}"`);
      expect(h).toContain(`data-question-resolution="${r.state}"`);
      for (const id of ["v-resumen", "v-evidencia", "v-limites", "v-prov"]) {
        expect(h, id).toContain(`id="${id}"`);
        expect(h, id).toContain(`for="${id}"`);
      }
      expect(h).toMatch(/id="v-resumen"[^>]*checked/);
      for (const p of ["p-resumen", "p-evidencia", "p-limites", "p-prov"])
        expect(h, p).toContain(`id="${p}"`);
      expect(h).not.toContain("<script");
      if (r.hasEditorial) expect(h).toContain("Ver desarrollo completo");
      else expect(h).toContain("No hay un desarrollo editorial adicional registrado");
    });
  }

  it("cada pregunta conserva los IDs en Procedencia; las 5 sin claim lo dicen", () => {
    let sinClaim = 0;
    for (const q of ctx.generated.questions) {
      const h = html.get(slug(q.id)) ?? "";
      const prov = /<section class="panel" id="p-prov"[\s\S]*?<\/section>/.exec(h)?.[0] ?? "";
      for (const cid of q.claim_ids) expect(prov, cid).toContain(cid);
      if (q.claim_ids.length === 0) {
        sinClaim++;
        expect(h, q.id).toContain("Sin claim: no hay Rastro de claim.");
      } else if (!rows.find((row) => row.id === q.id)?.hasEditorial) {
        expect(h, q.id).toContain("No hay un Rastro editorial adicional registrado");
      }
    }
    expect(sinClaim).toBe(5);
  });
});

describe.skipIf(!built)("documentos en el mismo shell", () => {
  for (const route of DOCS.filter(
    (route) => !["/metodo", "/versiones", "/sobre"].includes(route),
  )) {
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
  for (const route of ["/metodo", "/versiones", "/sobre"]) {
    it(`${route}: página enfocada, sin Registro persistente y con regreso a la investigación`, () => {
      const h = html.get(route) ?? "";
      expect(h).toContain('class="guide-doc"');
      expect(h).not.toContain('class="registro"');
      expect((h.match(/data-index-question=/g) ?? []).length).toBe(0);
      expect(h).toContain('href="/"');
      expect(h).toContain("Volver a la investigación");
      expect((h.match(/<h1\b/g) ?? []).length).toBe(1);
      expect(h).not.toContain("<script");
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
  it("la navegación superior vieja queda solo en las rutas todavía fuera de esta ronda", () => {
    const cur = (route: string): string =>
      /<a[^>]*aria-current="page"[^>]*>\s*([^<]+?)\s*<\/a>/.exec(
        (html.get(route) ?? "").split('<nav class="bar__nav"')[1]?.split("</nav>")[0] ?? "",
      )?.[1] ?? "";
    expect(cur("/explorar")).toBe("Registro");
    expect(cur("/hallazgos")).toBe("Registro");
    expect(cur("/limites")).toBe("Límites");
    for (const r of ["/metodo", "/versiones", "/sobre"]) expect(cur(r)).toBe("");
  });
});
