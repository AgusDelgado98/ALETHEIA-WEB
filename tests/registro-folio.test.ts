import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadRegistro, MIGRATED_QUESTION_IDS, STATES } from "../src/lib/registro.ts";
import { realContext, ROOT } from "./helpers.ts";

/** Prototipo REGISTRO + FOLIO: datos del Registro y estructura del shell en `/` y en Q-0003. */
const registro = loadRegistro(ROOT);
const rows = registro.groups.flatMap((g) => g.rows);
const ctx = realContext();
const home = ctx.html.get("/");
const q3 = ctx.html.get("/labor/preguntas/q-0003");

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
  it("solo Q-0003 está migrada al shell nuevo", () => {
    expect(MIGRATED_QUESTION_IDS).toEqual(["LAB-Q-0003"]);
  });
});

describe.skipIf(home === undefined || q3 === undefined)("shell en el HTML construido", () => {
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
    expect(css).not.toMatch(/data-tier="A"]s+.row__t/);
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
  it("Q-0003 tiene cuatro vistas (radios + labels), Lectura por defecto, y todos los paneles en el HTML", () => {
    const h = q3 ?? "";
    for (const id of ["v-lectura", "v-evidencia", "v-limites", "v-prov"]) {
      expect(h, id).toContain(`id="${id}"`);
      expect(h, id).toContain(`for="${id}"`);
    }
    expect(h).toMatch(/id="v-lectura"[^>]*checked/);
    for (const p of ["p-lectura", "p-evidencia", "p-limites", "p-prov"])
      expect(h, p).toContain(`id="${p}"`);
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
  it("la barra de estado persiste con corpus congelado y presentación web", () => {
    for (const h of [home ?? "", q3 ?? ""]) {
      expect(h).toContain('class="status"');
      expect(h).toContain("Corpus congelado");
      expect(h).toContain("Presentación web posterior");
    }
  });
});
