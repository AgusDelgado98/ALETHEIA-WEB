// Spike measurement: static analysis of production output + real browser (Edge headless) runs.
// Usage: node measure.mjs   -> writes ../results/measure.json
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import zlib from "node:zlib";
import crypto from "node:crypto";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(import.meta.dirname, "..");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const axeSrc = fs.readFileSync(path.join(import.meta.dirname, "node_modules/axe-core/axe.min.js"), "utf8");
const content = JSON.parse(fs.readFileSync(path.join(ROOT, "shared/content.json"), "utf8"));

const TARGETS = [
  { id: "next-16.3.5", dir: "next/out", routes: { static: "/", interactive: "/rastro" } },
  { id: "next-16.3.5-pages-router-runtimeJS-false", dir: "next-pages/out", routes: { static: "/", interactive: "/rastro" } },
  { id: "astro-5.18.2", dir: "astro/dist", routes: { static: "/", interactive: "/rastro", vanilla: "/rastro-vanilla" } },
  { id: "astro-7.3.3", dir: "astro7/dist", routes: { static: "/", interactive: "/rastro", vanilla: "/rastro-vanilla" } },
];

const gz = (b) => zlib.gzipSync(b, { level: 9 }).length;
const br = (b) => zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
const sz = (b) => ({ raw: b.length, gzip: gz(b), brotli: br(b) });

function resolveFile(base, url) {
  const p = decodeURIComponent(url.split("?")[0].split("#")[0]);
  const cands = [p, p + ".html", p.replace(/\/$/, "") + "/index.html", p + "index.html"];
  for (const c of cands) {
    const f = path.join(base, c);
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  return null;
}

// ---- static analysis --------------------------------------------------------------------------
function jsClosure(base, entryUrls) {
  const seen = new Map();
  const queue = [...entryUrls];
  while (queue.length) {
    const u = queue.shift();
    if (seen.has(u)) continue;
    const f = resolveFile(base, u);
    if (!f) { seen.set(u, null); continue; }
    const buf = fs.readFileSync(f);
    seen.set(u, buf);
    const txt = buf.toString("utf8");
    // static imports only (dynamic import() is NOT part of the initial load)
    for (const m of txt.matchAll(/(?:^|[;}\s])(?:import|export)\s*(?:[\w*{}\s,$]*?\s*from\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g)) {
      queue.push(new URL(m[1], "http://x" + u).pathname);
    }
  }
  return seen;
}

function analyse(base, route) {
  const file = resolveFile(base, route);
  const html = fs.readFileSync(file);
  const txt = html.toString("utf8");
  const scripts = [...txt.matchAll(/<script\b([^>]*)>/g)].map((m) => m[1]);
  const extScripts = scripts.filter((a) => /\bsrc="/.test(a)).map((a) => ({
    src: a.match(/src="([^"]+)"/)[1], noModule: /noModule|nomodule/.test(a), async: /async/.test(a) }));
  const inlineScripts = [...txt.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const inlineStyles = [...txt.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  const css = [...txt.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const modPre = [...txt.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  const islands = [...txt.matchAll(/<astro-island\b([^>]*)>/g)].map((m) => ({
    component: (m[1].match(/component-url="([^"]+)"/) || [])[1], renderer: (m[1].match(/renderer-url="([^"]+)"/) || [])[1] }));
  // Astro island scripts are loaded lazily by the island custom element:
  const entry = [
    ...extScripts.filter((s) => !s.noModule).map((s) => s.src),
    ...modPre,
    ...islands.flatMap((i) => [i.component, i.renderer].filter(Boolean)),
  ];
  const closure = jsClosure(base, [...new Set(entry)]);
  const jsFiles = [...closure.entries()].filter(([, b]) => b).map(([u, b]) => ({ url: u, ...sz(b), ownMarker: /Profundidad del Rastro|Detalle/.test(b.toString("utf8")) }));
  const cssFiles = css.map((u) => { const b = fs.readFileSync(resolveFile(base, u)); return { url: u, ...sz(b) }; });
  const sum = (arr, k) => arr.reduce((a, x) => a + x[k], 0);
  const inlineJsBuf = Buffer.from(inlineScripts.join("\n"));
  const inlineCssBuf = Buffer.from(inlineStyles.join("\n"));
  const noModuleFiles = extScripts.filter((s) => s.noModule).map((s) => { const b = fs.readFileSync(resolveFile(base, s.src)); return { url: s.src, ...sz(b) }; });
  return {
    html: sz(html),
    external_js: { files: jsFiles.length, ...Object.fromEntries(["raw", "gzip", "brotli"].map((k) => [k, sum(jsFiles, k)])), list: jsFiles },
    external_js_legacy_nomodule_not_loaded_by_modern_browsers: noModuleFiles,
    inline_js_bytes: { ...sz(inlineJsBuf) },
    css_external: { files: cssFiles.length, ...Object.fromEntries(["raw", "gzip", "brotli"].map((k) => [k, sum(cssFiles, k)])), list: cssFiles },
    css_inline_bytes: { ...sz(inlineCssBuf) },
    islands: islands.length,
    hydration_scripts_in_html: extScripts.length + inlineScripts.length,
  };
}

// ---- server -----------------------------------------------------------------------------------
function serve(base) {
  const cache = new Map();
  const srv = http.createServer((req, res) => {
    const f = resolveFile(base, req.url);
    if (!f) { res.writeHead(404); return res.end("nf"); }
    const ext = path.extname(f);
    const type = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".txt": "text/plain" }[ext] || "application/octet-stream";
    const key = f;
    if (!cache.has(key)) cache.set(key, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }));
    res.writeHead(200, { "content-type": type, "content-encoding": "br", "cache-control": "no-store" });
    res.end(cache.get(key));
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv)));
}

// ---- browser ----------------------------------------------------------------------------------
const NEEDLES = [content.question.text, content.figure.value, content.figure.unit, "Lo que sí", "Lo que no", "Rastro", ...content.figure.encuadre.flat(), ...content.yes, ...content.no, ...content.rastro.flat(), content.resultLabel];

async function browserRun(browser, origin, route, { js, throttle }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2, isMobile: true });
  await page.setJavaScriptEnabled(js);
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  if (throttle) {
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type }));
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) r.transfer = e.encodedDataLength; });
  const errors = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.evaluateOnNewDocument(() => {
    window.__m = { cls: 0, lcp: 0, fcp: 0, longTasks: [] };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") window.__m.fcp = e.startTime; }).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.longTasks.push([e.startTime, e.duration]); }).observe({ type: "longtask", buffered: true });
  });
  await page.goto(origin + route, { waitUntil: "networkidle0", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 800));
  const text = await page.evaluate(() => document.body.innerText);
  const m = await page.evaluate(() => window.__m);
  const visible = await page.evaluate((needles) => {
    const t = document.body.innerText.toLowerCase();
    return needles.filter((n) => !t.includes(n.toLowerCase()));
  }, NEEDLES);
  const structure = await page.evaluate(() => ({
    landmarks: ["header", "main", "footer"].map((t) => document.querySelectorAll(t).length),
    h1: document.querySelectorAll("h1").length, h2: document.querySelectorAll("h2").length, svgWithRole: document.querySelectorAll("svg[role=img]").length,
    lang: document.documentElement.lang, buttons: document.querySelectorAll("button").length,
  }));
  const all = [...reqs.values()];
  const by = (pred) => all.filter(pred);
  const sumT = (a) => a.reduce((s, r) => s + (r.transfer || 0), 0);
  const tbt = m.longTasks.filter(([s]) => s >= m.fcp).reduce((s, [, d]) => s + Math.max(0, d - 50), 0);
  const out = {
    requests: all.length, transfer_total: sumT(all),
    transfer_js: sumT(by((r) => r.type === "Script")), js_requests: by((r) => r.type === "Script").length,
    transfer_css: sumT(by((r) => r.type === "Stylesheet")), transfer_html: sumT(by((r) => r.type === "Document")),
    fcp_ms: Math.round(m.fcp), lcp_ms: Math.round(m.lcp), cls: +m.cls.toFixed(4), tbt_ms: Math.round(tbt),
    missing_needles: visible, console_issues: errors, structure, textLen: text.length,
    text_sha: crypto.createHash("sha256").update(text.toLowerCase().replace(/\s+/g, " ").trim()).digest("hex").slice(0, 16),
  };
  let a11y = null;
  if (js && !throttle) {
    await page.evaluate(axeSrc);
    const r = await page.evaluate(async () => { const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] } }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })); });
    a11y = r;
    out.axe_violations = r;
    if (structure.buttons) {
      // keyboard + behaviour: tab to first button, press Enter on "Detalle"
      const before = await page.evaluate(() => [...document.querySelectorAll(".level-panel")].map((p) => !p.hidden));
      await page.keyboard.press("Tab");
      const focus1 = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
      await page.keyboard.press("Tab"); await page.keyboard.press("Enter");
      const after = await page.evaluate(() => ({ panels: [...document.querySelectorAll(".level-panel")].map((p) => !p.hidden), pressed: [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-pressed")) }));
      out.interaction = { panels_visible_before_after_hydration: before, first_tab_focus: focus1, after_tab_tab_enter: after };
    }
  }
  const html = await page.content();
  out.dom_signature = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<link[^>]*>/g, "").replace(/<meta[^>]*>/g, "").replace(/\s+(data-[\w-]+|class|id|style|aria-[\w]+)="[^"]*"/g, "").length;
  await page.close();
  return out;
}

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const results = { measured_at: new Date().toISOString(), method: {
  sizes: "static analysis of production output; gzip level 9 and brotli quality 11 computed with node:zlib; initial JS = <script src> (excluding nomodule legacy) + modulepreload + astro-island component/renderer URLs, plus static-import closure; dynamic import() excluded",
  browser: "Microsoft Edge headless via puppeteer-core; viewport 375x812 mobile; local server serving brotli; cache disabled; throttled profile = 150 ms RTT, 1.6 Mbps down, 4x CPU (Lighthouse-like mobile profile, emulated by CDP, NOT a Lighthouse run); 5 runs, median",
  transfer: "CDP encodedDataLength (bytes on the wire incl. headers) with brotli" }, targets: {} };

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ["--no-sandbox", "--disable-gpu"] });
for (const t of TARGETS) {
  const base = path.join(ROOT, t.dir);
  const srv = await serve(base);
  const origin = `http://127.0.0.1:${srv.address().port}`;
  results.targets[t.id] = { routes: {} };
  for (const [name, route] of Object.entries(t.routes)) {
    const st = analyse(base, route);
    const runsNoJs = await browserRun(browser, origin, route, { js: false, throttle: false });
    const one = await browserRun(browser, origin, route, { js: true, throttle: false });
    const th = [];
    for (let i = 0; i < 5; i++) th.push(await browserRun(browser, origin, route, { js: true, throttle: true }));
    results.targets[t.id].routes[name] = {
      route, static_analysis: st,
      no_js: { text_sha: runsNoJs.text_sha, js_requests: runsNoJs.js_requests, requests: runsNoJs.requests, missing_needles: runsNoJs.missing_needles, structure: runsNoJs.structure, buttons_visible_hint: runsNoJs.structure.buttons },
      js_on_unthrottled: one,
      js_on_throttled_median: {
        fcp_ms: median(th.map((r) => r.fcp_ms)), lcp_ms: median(th.map((r) => r.lcp_ms)), cls: median(th.map((r) => r.cls)), tbt_ms: median(th.map((r) => r.tbt_ms)),
        requests: median(th.map((r) => r.requests)), transfer_total: median(th.map((r) => r.transfer_total)), transfer_js: median(th.map((r) => r.transfer_js)),
        raw_fcp: th.map((r) => r.fcp_ms), raw_lcp: th.map((r) => r.lcp_ms), raw_tbt: th.map((r) => r.tbt_ms) },
    };
    console.log(t.id, name, "JS gz", st.external_js.gzip, "HTML gz", st.html.gzip, "noJS missing", runsNoJs.missing_needles.length, "axe", (one.axe_violations || []).length);
  }
  srv.close();
}
await browser.close();
fs.writeFileSync(path.join(ROOT, "results/measure.json"), JSON.stringify(results, null, 1));
console.log("written results/measure.json");
