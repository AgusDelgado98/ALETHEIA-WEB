import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";
import { serveDist } from "./serve.ts";

/**
 * Reporte (no editorial) de los títulos cortos del Registro: cuáles se truncan con puntos suspensivos a 1366.
 * No cambia ni aprueba ningún texto. Uso: node scripts/e2e/registro-titles.ts → docs/redesign/REGISTRO-TITLES-REPORT.md
 */
const root = resolve(import.meta.dirname, "..", "..");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const { server, origin } = await serveDist(join(root, "dist"));
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  await page.goto(origin + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>(".row")].map((a) => {
      const t = a.querySelector<HTMLElement>(".row__t")!;
      return {
        id: a.dataset["indexQuestion"] ?? "",
        title: t.textContent ?? "",
        tier: a.dataset["tier"] ?? "",
        truncated: t.scrollWidth > t.clientWidth + 1,
        visibleW: Math.round(t.clientWidth),
        fullW: Math.round(t.scrollWidth),
      };
    }),
  );
  const line = (r: (typeof rows)[number]): string => {
    const n = r.id.replace("LAB-Q-", "");
    const src = `\`editorial/site/glosses.yml\` → \`nav_titles.${r.id}\` (\`nav-q${n}\`; auditoría \`labor/${r.id}#nav_title\`)`;
    return `| ${r.id} | ${r.title} | ${r.truncated ? `Sí (${r.visibleW} de ${r.fullW} px)` : "No"} | ${[...r.title].length} | ${src} |`;
  };
  const cut = rows.filter((r) => r.truncated).length;
  const md = `# Registro · títulos cortos de navegación (reporte, 1366 px)

Reporte generado por \`scripts/e2e/registro-titles.ts\` sobre la Home construida, a 1366×768 (el Registro mide igual a 1366×650).
Son textos editoriales nuevos (\`nav_titles\`), derivados de la pregunta pública de cada ficha: no la reemplazan ni cambian su estado.
**Todos están \`PENDING_AUTHOR_REVIEW\`; su aprobación es una decisión humana.** Ninguno usa cifras, verbos de causa ni el estado.

**${cut} de ${rows.length} se truncan** con puntos suspensivos en el Registro a 1366 px.

| ID | Título corto de navegación | ¿Truncado a 1366? | Longitud (caracteres) | Fuente editorial |
|---|---|---|---|---|
${rows.map(line).join("\n")}
`;
  writeFileSync(join(root, "docs", "redesign", "REGISTRO-TITLES-REPORT.md"), md, "utf8");
  console.log(md);
} finally {
  await browser.close();
  server.close();
}
