/**
 * Comprobación de las 25 rutas públicas contra el host de producción.
 * Uso: node scripts/prod/validate.ts
 */
import { SITE_ORIGIN } from "../../src/lib/origin.ts";
import { contentPaths } from "../../src/lib/site.ts";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..", "..");
const origin = SITE_ORIGIN;
const paths = [...contentPaths(root), "/no-existe"];
const failures: string[] = [];

for (const path of paths) {
  const url = path === "/" ? `${origin}/` : `${origin}${path}`;
  const res = await fetch(url, { redirect: "manual" });
  const expectOk = path !== "/no-existe";
  if (expectOk && res.status !== 200) failures.push(`${path}: HTTP ${res.status} (esperado 200)`);
  if (!expectOk && res.status !== 404) failures.push(`${path}: HTTP ${res.status} (esperado 404)`);
  const text = await res.text();
  if (expectOk) {
    if (!text.includes('lang="es-AR"')) failures.push(`${path}: falta lang=es-AR`);
    if (!text.includes('rel="canonical"')) failures.push(`${path}: falta canonical`);
    if (text.includes("og:image") || text.includes("twitter:image"))
      failures.push(`${path}: imagen de compartir`);
    if (/localhost|127\.0\.0\.1/.test(text)) failures.push(`${path}: localhost`);
    if (/<script\b/i.test(text)) failures.push(`${path}: script de cliente`);
  }
  const csp = res.headers.get("content-security-policy");
  const hsts = res.headers.get("strict-transport-security");
  const nosniff = res.headers.get("x-content-type-options");
  if (expectOk) {
    if (csp === null || !csp.includes("script-src 'none'"))
      failures.push(`${path}: CSP ausente o sin script-src 'none'`);
    if (hsts === null) failures.push(`${path}: falta HSTS del host`);
    if (nosniff !== "nosniff") failures.push(`${path}: falta nosniff`);
  }
}

const robots = await fetch(`${origin}/robots.txt`);
const robotsText = await robots.text();
if (robots.status !== 200) failures.push(`robots.txt: HTTP ${robots.status}`);
if (!robotsText.includes("Disallow: /preguntar")) failures.push("robots.txt sin /preguntar");
const sitemap = await fetch(`${origin}/sitemap.xml`);
const sitemapText = await sitemap.text();
if (sitemap.status !== 200) failures.push(`sitemap.xml: HTTP ${sitemap.status}`);
if (sitemapText.includes("/preguntar") || sitemapText.includes("/404"))
  failures.push("sitemap indexa /preguntar o /404");

if (failures.length > 0) {
  for (const f of failures) console.error(`✗ ${f}`);
  process.exit(1);
}
console.log(`OK ${origin}: ${contentPaths(root).length} rutas públicas + 404`);
