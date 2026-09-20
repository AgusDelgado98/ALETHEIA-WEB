import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../src/lib/origin.ts";
import { contentPaths } from "../src/lib/site.ts";
import { realContext } from "./helpers.ts";

const ctx = realContext();
const paths = contentPaths(ctx.root);

describe("WEB-2 producción", () => {
  it("el host de site no es un placeholder y cubre 25 rutas públicas", () => {
    expect(SITE_ORIGIN.startsWith("https://")).toBe(true);
    expect(SITE_ORIGIN).toContain("vercel.app");
    expect(SITE_ORIGIN).not.toMatch(/example\.|localhost|placeholder/i);
    expect(paths).toHaveLength(25);
    expect(paths[0]).toBe("/");
  });

  it.skipIf(!ctx.html.has("/"))(
    "canonical, OG textual, favicon y twitter:summary; sin imagen",
    () => {
      for (const route of paths) {
        const html = ctx.html.get(route) ?? "";
        expect(html, route).toContain('rel="canonical"');
        expect(html, route).toContain(SITE_ORIGIN);
        expect(html, route).toContain('property="og:title"');
        expect(html, route).toContain('property="og:description"');
        expect(html, route).toContain('property="og:type"');
        expect(html, route).toContain('name="twitter:card" content="summary"');
        expect(html, route).toContain('rel="icon" href="/favicon.svg"');
        expect(html.includes("og:image"), route).toBe(false);
        expect(html.includes("twitter:image"), route).toBe(false);
        expect(html.includes("summary_large_image"), route).toBe(false);
        expect(/localhost|127\.0\.0\.1/.test(html), route).toBe(false);
        expect(/<script\b/i.test(html), route).toBe(false);
      }
    },
  );

  it.skipIf(!ctx.html.has("/404"))("404 existe, noindex, y no entra al sitemap", () => {
    const html = ctx.html.get("/404") ?? "";
    expect(html).toContain("noindex");
    const sm = existsSync(join(ctx.root, "dist", "sitemap.xml"))
      ? readFileSync(join(ctx.root, "dist", "sitemap.xml"), "utf8")
      : "";
    expect(sm).not.toContain("/404");
    expect(sm).not.toContain("/preguntar");
    for (const p of paths) {
      const loc = p === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${p}`;
      expect(sm, p).toContain(`<loc>${loc}</loc>`);
    }
  });

  it("robots.txt construido apunta al sitemap real y excluye /preguntar", () => {
    const p = join(ctx.root, "dist", "robots.txt");
    if (!existsSync(p)) return;
    const t = readFileSync(p, "utf8");
    expect(t).toContain("Disallow: /preguntar");
    expect(t).toContain(`${SITE_ORIGIN}/sitemap.xml`);
  });
});
