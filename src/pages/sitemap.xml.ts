import type { APIRoute } from "astro";
import { SITE_ORIGIN } from "../lib/origin.ts";
import { contentPaths } from "../lib/site.ts";

export const GET: APIRoute = () => {
  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...contentPaths(process.cwd()).map((path) => {
      const loc = path === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${path}`;
      return `  <url><loc>${loc}</loc></url>`;
    }),
    `</urlset>`,
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
