import { describe, expect, it } from "vitest";
import { plainText } from "../src/lib/render.ts";
import { loadSite } from "../src/lib/site.ts";
import { loadQuestionView, questionSlug } from "../src/lib/view.ts";
import { MINIMAL_GLOSS_QUESTION_IDS } from "../tools/editorial/load.ts";
import { realContext, ROOT } from "./helpers.ts";

describe("glosas públicas WEB-2R", () => {
  it("las 13 fichas mínimas usan título español y conservan el canónico inglés", () => {
    for (const id of MINIMAL_GLOSS_QUESTION_IDS) {
      const v = loadQuestionView(ROOT, id);
      expect(v.hasEditorial, id).toBe(false);
      expect(plainText(v.title), id).not.toBe(v.canonicalTitle);
      expect(v.canonicalTitle, id).toMatch(/[A-Za-z]/);
      expect(plainText(v.title), id).not.toMatch(
        /Composition of|Cross-source|Divergence between|Does formalization|Change in the distribution|What can and cannot|Observable proxies|Distribution of protections|Which dimensions|Can AI-in-hiring|What biases|Can population-level|Divergence between describing/,
      );
      expect(plainText(v.scope), id).toBe(plainText(v.title));
    }
  });
  it("Q-0012 glosa REGULATORY sin inventar Source IDs ni normas", () => {
    const v = loadQuestionView(ROOT, "LAB-Q-0012");
    expect(v.claims[0]?.source).toBe("REGULATORY");
    expect(v.sourceGloss).toMatch(/mapeo regulatorio/i);
    expect(v.sourceGloss).not.toMatch(/LAB-SRC-/);
    expect(v.sourceGloss).not.toMatch(/ley |decreto |resolución ministerial/i);
  });
  it("/limites muestra glosa española y conserva el inglés canónico", () => {
    const site = loadSite(ROOT);
    expect(site.governance).toHaveLength(6);
    expect(site.preserved).toHaveLength(15);
    for (const g of site.governance) {
      expect(plainText(g.titlePublic), g.id).toMatch(/Gobernanza requerida/i);
      expect(plainText(g.titleParts), g.id).toMatch(/Governance required/i);
      expect(plainText(g.inferencePublic), g.id).not.toBe("");
      expect(plainText(g.inference), g.id).toBeTruthy();
    }
    for (const k of site.preserved) {
      expect(plainText(k.mustNotPublic), k.id).toMatch(/^En términos públicos:|^No /);
      expect(plainText(k.mustNot), k.id).toMatch(/^Do not /);
    }
  });
  it.skipIf(!realContext().html.has("/limites"))(
    "HTML: 13 fichas y /limites conservan el inglés canónico junto a la glosa",
    () => {
      const ctx = realContext();
      const lim = ctx.html.get("/limites") ?? "";
      expect(lim).toContain("Gobernanza requerida");
      expect(lim).toContain("Governance required");
      expect(lim).toContain('data-canonical-cite="true"');
      expect(lim).toContain("Do not generalize beyond two quarters");
      expect(lim).toContain("En términos públicos:");
      for (const id of MINIMAL_GLOSS_QUESTION_IDS) {
        const html = ctx.html.get(`/labor/preguntas/${questionSlug(id)}`) ?? "";
        const v = loadQuestionView(ROOT, id);
        expect(html, id).toContain(plainText(v.title));
        expect(html, id).toContain(v.canonicalTitle);
        expect(html, id).toContain('data-canonical-cite="true"');
        expect(html, id).not.toMatch(/LAB-SRC-000[4-9]|LAB-SRC-001[01]/);
      }
      const q12 = ctx.html.get("/labor/preguntas/q-0012") ?? "";
      expect(q12).toContain("REGULATORY");
      expect(q12).toMatch(/mapeo regulatorio/i);
      expect(q12).not.toContain("LAB-SRC-");
    },
  );
});
