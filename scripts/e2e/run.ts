import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import AxeBuilder from "@axe-core/playwright";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import { loadContext } from "../gates/context.ts";
import { plain } from "../../tools/editorial/directives.ts";
import { parseSegments } from "../../tools/editorial/directives.ts";
import { canonicalJson } from "../../tools/corpus/util.ts";
import { serveDist } from "./serve.ts";

/**
 * Pruebas de navegador de la ruta de M1 (Edge headless vía playwright-core; sin descargar navegadores).
 * Verifica: contenido íntegro SIN JavaScript, 0 JS enviado, axe, teclado y foco visible, reduced-motion,
 * reflow a 320 px, verdigris solo en abrir/activo, y mide HTML/CSS/fuentes. No declara WCAG AA (Charter §15).
 * Uso: node scripts/e2e/run.ts
 */
const root = resolve(import.meta.dirname, "..", "..");
const dist = join(root, "dist");
const EDGE =
  process.env["EDGE_PATH"] ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const ROUTE = "/labor/preguntas/q-0013";
const VERD = ["rgb(30, 106, 94)", "rgb(21, 79, 70)"];

const ctxData = loadContext(root);
const publishedQid = ctxData.editorial.finding.canonical_ref.replace(/^labor\//, "");
const publishedQuestion = ctxData.generated.questions.find((q) => q.id === publishedQid)!;
const publishedClaims = ctxData.generated.claims.filter((c) => c.question_id === publishedQid);
const publishedClaim = publishedClaims[0]!;
const failures: string[] = [];
const report: Record<string, unknown> = {};
const check = (ok: boolean, msg: string): void => {
  if (!ok) failures.push(msg);
};

// ── lo que la página DEBE decir (todo sale de generated/ + editorial/, nunca escrito acá) ──
const e = ctxData.editorial;
const resolved = (t: string): string => plain(parseSegments(t, ctxData.generated));
const needles: string[] = [
  e.question.public_question,
  resolved(e.finding.title.text),
  resolved(e.finding.intro.text),
  resolved(e.finding.scope.text),
  ...e.finding.can_say.map((u) => resolved(u.text)),
  ...e.finding.does_not_mean.map((u) => resolved(u.text)),
  ...e.finding.would_need.map((u) => resolved(u.text)),
  e.states.fixed.absence_not_negative.text,
  e.states.claim_state_labels["INSUFFICIENT_EVIDENCE"]!.text,
  e.ui.strings["say_heading"]!.text,
  e.ui.strings["not_heading"]!.text,
  e.ui.strings["need_heading"]!.text,
  e.ui.strings["trail_heading"]!.text,
  e.ui.strings["cut_title"]!.text,
  ...publishedClaims.map((c) => c.id),
];

const norm = (s: string): string => s.replace(/\s+/g, " ").trim();

async function newPage(ctx: BrowserContext): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto(origin + ROUTE, { waitUntil: "networkidle" });
  return page;
}

const { server, origin } = await serveDist(dist);
const browser = await chromium.launch({ executablePath: EDGE, headless: true });
try {
  // ═════════ 1. SIN JAVASCRIPT ═════════
  {
    const ctx = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 1440, height: 900 },
    });
    const reqs: { type: string; url: string }[] = [];
    ctx.on("request", (r) => reqs.push({ type: r.resourceType(), url: r.url() }));
    const page = await newPage(ctx);
    const text = norm(await page.evaluate(() => document.body.innerText));
    const missing = needles.filter((n) => !text.toLowerCase().includes(norm(n).toLowerCase()));
    check(missing.length === 0, `sin JS falta contenido: ${missing.join(" | ").slice(0, 300)}`);
    check(reqs.filter((r) => r.type === "script").length === 0, "sin JS se pidió un script");
    // los radios del Rastro funcionan sin JS (CSS puro)
    const before = await page.locator(".cn__m.d3").first().isVisible();
    await page.locator("label[for=depth-3]").click();
    const after = await page.locator(".cn__m.d3").first().isVisible();
    check(!before && after, "sin JS el Rastro no cambia de profundidad");
    await page.locator("summary").click();
    check(
      await page.locator("details").evaluate((d) => (d as HTMLDetailsElement).open),
      "sin JS <details> no abre",
    );
    report["no_js"] = {
      needles_checked: needles.length,
      missing: missing.length,
      script_requests: 0,
      radios_work: before === false && after,
      details_work: true,
    };
    await ctx.close();
  }

  // ═════════ 2. CON JS HABILITADO: qué se envía ═════════
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    const reqs = new Map<string, { url: string; type: string; transfer: number }>();
    cdp.on("Network.requestWillBeSent", (ev) =>
      reqs.set(ev.requestId, { url: ev.request.url, type: ev.type ?? "", transfer: 0 }),
    );
    cdp.on("Network.loadingFinished", (ev) => {
      const r = reqs.get(ev.requestId);
      if (r !== undefined) r.transfer = ev.encodedDataLength;
    });
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
    });
    page.on("pageerror", (er) => errors.push(er.message));
    await page.goto(origin + ROUTE, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const all = [...reqs.values()];
    const sum = (t: string): number =>
      all.filter((r) => r.type === t).reduce((n, r) => n + r.transfer, 0);
    const files = readdirSync(join(dist, "_astro")).filter((n) => n.endsWith(".css"));
    const cssGz = files.reduce(
      (n, f) => n + gzipSync(readFileSync(join(dist, "_astro", f)), { level: 9 }).length,
      0,
    );
    const html = readFileSync(join(dist, "labor", "preguntas", "q-0013.html"));
    const fontFiles = readdirSync(join(dist, "fonts")).filter((n) => n.endsWith(".woff2"));
    const fontBytes = fontFiles.reduce((n, f) => n + statSync(join(dist, "fonts", f)).size, 0);
    const jsFiles = (function walk(d: string): string[] {
      return readdirSync(d).flatMap((n) =>
        statSync(join(d, n)).isDirectory()
          ? walk(join(d, n))
          : n.endsWith(".js") || n.endsWith(".mjs")
            ? [n]
            : [],
      );
    })(dist);
    report["route_weight"] = {
      route: ROUTE,
      js_requests: all.filter((r) => r.type === "Script").length,
      js_bytes_transferred: sum("Script"),
      js_files_in_dist: jsFiles.length,
      requests_total: all.length,
      request_types: Object.fromEntries(
        [...new Set(all.map((r) => r.type))].map((t) => [
          t,
          all.filter((r) => r.type === t).length,
        ]),
      ),
      html_bytes_raw: html.length,
      html_bytes_gzip: gzipSync(html, { level: 9 }).length,
      css_files: files.length,
      css_bytes_gzip: cssGz,
      fonts_files: fontFiles.length,
      fonts_bytes: fontBytes,
      transfer_total_brotli_bytes_incl_headers: all.reduce((n, r) => n + r.transfer, 0),
      third_party_requests: all.filter((r) => !r.url.startsWith(origin)).length,
      console_errors_or_warnings: errors,
    };
    check(all.filter((r) => r.type === "Script").length === 0, "la ruta envía JavaScript");
    check(jsFiles.length === 0, "dist/ contiene archivos JS");
    check(
      all.every((r) => r.url.startsWith(origin)),
      "hay solicitudes a otro origen",
    );
    check(errors.length === 0, `errores o avisos de consola: ${errors.join(" | ")}`);

    // 2b. estado renderizado == generado
    const dom = await page.evaluate(() => {
      const a = document.querySelector("article")!;
      return {
        q: a.getAttribute("data-question-resolution"),
        c: a.getAttribute("data-claim-state"),
        id: a.getAttribute("data-claim-id"),
      };
    });
    check(
      dom.q === publishedQuestion.resolution.value &&
        dom.c === publishedClaim.epistemic_state &&
        dom.id === publishedClaim.id,
      "el estado del DOM difiere del generado",
    );

    // ═════════ 3. ACCESIBILIDAD AUTOMÁTICA (axe) ═════════
    const axeRun = async (
      label: string,
    ): Promise<{
      label: string;
      violations: { id: string; impact: string | null | undefined; nodes: number }[];
    }> => {
      const r = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
        .analyze();
      return {
        label,
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
        })),
      };
    };
    const axe = [await axeRun("resumen")];
    await page.locator("label[for=depth-2]").click();
    axe.push(await axeRun("detalle"));
    await page.locator("label[for=depth-3]").click();
    axe.push(await axeRun("auditoria"));
    await page.locator("summary").click();
    axe.push(await axeRun("auditoria + procedencia abierta"));
    report["axe"] = {
      tags: "wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice",
      states: axe,
      total_violations: axe.reduce((n, s) => n + s.violations.length, 0),
      note: "la prueba automática cubre solo parte de WCAG; no se declara WCAG 2.2 AA (responsive y lectores de pantalla pendientes, G-A11Y-05/06)",
    };
    for (const s of axe)
      check(
        s.violations.length === 0,
        `axe (${s.label}): ${s.violations.map((v) => `${v.id}×${v.nodes}`).join(", ")}`,
      );

    // ═════════ 4. SEMÁNTICA Y ESTRUCTURA ═════════
    await page.locator("label[for=depth-1]").click();
    await page.locator("summary").click(); // cierra
    const sem = await page.evaluate(() => {
      const heads = [...document.querySelectorAll("h1,h2,h3")].map((h) => Number(h.tagName[1]));
      const jumps = heads.filter((h, i) => i > 0 && h - heads[i - 1]! > 1).length;
      const states = [...document.querySelectorAll(".state")].map((s) => ({
        hasLabel: (s.querySelector(".state__label")?.textContent ?? "").trim().length > 0,
        aria: (s.querySelector("svg")?.getAttribute("aria-label") ?? "").length > 0,
      }));
      return {
        lang: document.documentElement.lang,
        h1: document.querySelectorAll("h1").length,
        landmarks: {
          header: document.querySelectorAll("header").length,
          main: document.querySelectorAll("main").length,
          nav: document.querySelectorAll("nav").length,
        },
        heading_levels: heads,
        heading_jumps: jumps,
        states,
        lists_ok: [...document.querySelectorAll("li")].every(
          (li) => li.parentElement && ["UL", "OL"].includes(li.parentElement.tagName),
        ),
        duplicate_ids: (() => {
          const ids = [...document.querySelectorAll("[id]")].map((x) => x.id);
          return ids.length - new Set(ids).size;
        })(),
      };
    });
    report["semantics"] = sem;
    check(
      sem.lang === "es-AR" &&
        sem.h1 === 1 &&
        sem.landmarks.main === 1 &&
        sem.heading_jumps === 0 &&
        sem.duplicate_ids === 0,
      "estructura semántica incorrecta (lang, h1, main, saltos de encabezado o ids duplicados)",
    );
    check(
      sem.states.length >= 3 && sem.states.every((s) => s.hasLabel && s.aria),
      "un estado se expresa solo por forma (falta etiqueta de texto o nombre accesible)",
    );

    // ═════════ 5. TECLADO Y FOCO VISIBLE ═════════
    const stops: { tag: string; text: string; outline: string }[] = [];
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      const s = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const lab = el.tagName === "INPUT" ? document.querySelector(`label[for="${el.id}"]`) : null;
        const target = (lab ?? el) as HTMLElement;
        const cs = getComputedStyle(target);
        return {
          tag:
            el.tagName.toLowerCase() +
            (el.getAttribute("type") ? `[${el.getAttribute("type")}]` : ""),
          text: (target.textContent ?? "").trim().slice(0, 30),
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        };
      });
      stops.push(s);
    }
    const focusable = stops.filter((s) => s.tag !== "body");
    const skipVisible = await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      return true;
    });
    void skipVisible;
    report["keyboard"] = { tab_stops: focusable };
    check(
      focusable[0]?.text === e.ui.strings["skip_link"]!.text,
      "el primer foco no es el enlace de salto",
    );
    check(
      focusable.every((s) => /solid 2px rgb\(30, 106, 94\)/.test(s.outline)),
      `algún foco sin contorno verdigris de 2 px: ${JSON.stringify(focusable.filter((s) => !/solid 2px rgb\(30, 106, 94\)/.test(s.outline)))}`,
    );
    // flechas cambian la profundidad; Enter/Espacio abren el <details>
    await page.locator("#depth-1").focus();
    await page.keyboard.press("ArrowRight");
    check(await page.locator("#depth-2").isChecked(), "ArrowRight no cambió la profundidad");
    await page.locator("summary").focus();
    await page.keyboard.press("Enter");
    check(
      await page.locator("details").evaluate((d) => (d as HTMLDetailsElement).open),
      "Enter no abrió la procedencia",
    );
    await page.keyboard.press("Space");
    check(
      !(await page.locator("details").evaluate((d) => (d as HTMLDetailsElement).open)),
      "Espacio no cerró la procedencia",
    );

    // ═════════ 6. VERDIGRIS SOLO PARA ABRIR / REVELAR / ACTIVO ═════════
    await page.locator("label[for=depth-1]").click();
    await page.mouse.move(0, 0);
    const verd = await page.evaluate((verds) => {
      const out: string[] = [];
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        const props: [string, string][] = [
          ["color", cs.color],
          ["border-top", cs.borderTopStyle === "none" ? "" : cs.borderTopColor],
          ["border-bottom", cs.borderBottomStyle === "none" ? "" : cs.borderBottomColor],
          ["background", cs.backgroundColor],
          ["fill", cs.fill],
          ["stroke", cs.stroke],
        ];
        for (const [p, v] of props)
          if (verds.includes(v))
            out.push(
              `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").split(" ")[0]} ${p}`,
            );
      }
      return out;
    }, VERD);
    report["verdigris_uses_at_rest"] = verd;
    check(
      verd.every((u) => u.startsWith("label.")),
      `verdigris fuera de «control activo»: ${verd.filter((u) => !u.startsWith("label.")).join(", ")}`,
    );

    // ═════════ 7. REFLOW y LÍNEA DE LECTURA ═════════
    const reflow: Record<string, unknown> = {};
    for (const w of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.locator("label[for=depth-3]").click();
      await page.locator("summary").click();
      const r = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      reflow[String(w)] = { ...r, horizontal_scroll: r.scrollWidth > r.clientWidth + 1 };
      await page.locator("summary").click();
      await page.locator("label[for=depth-1]").click();
    }
    report["reflow"] = {
      ...reflow,
      note: "comprobación básica de que no hay scroll horizontal; el responsive final sigue pendiente (Charter §18.4, G-A11Y-05)",
    };
    for (const w of ["320", "375", "768", "1440"])
      check(
        (reflow[w] as { horizontal_scroll: boolean }).horizontal_scroll === false,
        `scroll horizontal a ${w} px`,
      );
    await page.setViewportSize({ width: 1440, height: 900 });
    const measure = await page.evaluate(() => {
      let max = 0;
      let where = "";
      const walker = document.createTreeWalker(
        document.querySelector("main")!,
        NodeFilter.SHOW_TEXT,
      );
      for (let n = walker.nextNode(); n !== null; n = walker.nextNode()) {
        const t = n.textContent ?? "";
        if (t.trim().length < 40) continue;
        const lines = new Map<number, number>();
        for (let i = 0; i < t.length; i++) {
          const range = document.createRange();
          range.setStart(n, i);
          range.setEnd(n, i + 1);
          const rect = range.getClientRects()[0];
          if (rect === undefined) continue;
          const key = Math.round(rect.top);
          lines.set(key, (lines.get(key) ?? 0) + 1);
        }
        const perLine = Math.max(0, ...lines.values());
        if (perLine > max) {
          max = perLine;
          where = n.parentElement?.className || n.parentElement?.tagName || "";
        }
      }
      return { max_chars_per_line: max, where };
    });
    report["line_length"] = {
      ...measure,
      limit: 80,
      note: "caracteres reales por línea visual en la ventana de 1440 px",
    };
    check(
      measure.max_chars_per_line < 80,
      `línea de lectura de ${measure.max_chars_per_line} caracteres en ${measure.where}`,
    );
    await ctx.close();
  }

  // ═════════ 8. prefers-reduced-motion ═════════
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce" });
    const page = await newPage(ctx);
    const d = await page.evaluate(() => {
      const els = [...document.querySelectorAll("*")];
      const durations = els.map(
        (e) =>
          parseFloat(getComputedStyle(e).transitionDuration.split(",")[0] ?? "0") +
          parseFloat(getComputedStyle(e).animationDuration.split(",")[0] ?? "0"),
      );
      return {
        max_duration_s: Math.max(...durations),
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      };
    });
    report["reduced_motion"] = d;
    check(
      d.reduced && d.max_duration_s <= 0.001,
      `reduced-motion no elimina las duraciones (${d.max_duration_s}s)`,
    );
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close();
}

mkdirSync(join(root, "reports"), { recursive: true });
writeFileSync(
  join(root, "reports", "e2e.json"),
  canonicalJson({ route: ROUTE, failures, ...report }),
  "utf8",
);
console.log(JSON.stringify(report, null, 1));
if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} fallo(s) de navegador:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(
  "\n✓ e2e OK: contenido íntegro sin JS, 0 JS enviado, axe sin violaciones, teclado y foco visibles, reduced-motion, sin scroll horizontal",
);
