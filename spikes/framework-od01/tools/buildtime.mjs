// Cold production builds, 3 runs each. Usage: node buildtime.mjs -> ../results/build-time.json
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const NODE22 = path.join(ROOT, "tools/node22/node_modules/node/bin/node.exe");
const T = [
  { id: "next-16.3.5", dir: "next", node: process.execPath, cli: "node_modules/next/dist/bin/next", args: ["build"], out: "out", clean: [".next", "out"] },
  { id: "next-16.3.5-pages-router-runtimeJS-false", dir: "next-pages", node: process.execPath, cli: "node_modules/next/dist/bin/next", args: ["build"], out: "out", clean: [".next", "out"] },
  { id: "astro-5.18.2", dir: "astro", node: process.execPath, cli: "node_modules/astro/astro.js", args: ["build"], out: "dist", clean: ["dist", ".astro", "node_modules/.vite"] },
  { id: "astro-7.3.3", dir: "astro7", node: NODE22, cli: "node_modules/astro/bin/astro.mjs", args: ["build"], out: "dist", clean: ["dist", ".astro", "node_modules/.vite"] },
];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const res = {};
for (const t of T) {
  const cwd = path.join(ROOT, t.dir);
  const runs = [];
  for (let i = 0; i < 3; i++) {
    for (const c of t.clean) fs.rmSync(path.join(cwd, c), { recursive: true, force: true });
    const t0 = performance.now();
    const r = spawnSync(t.node, [t.cli, ...t.args], { cwd, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", ASTRO_TELEMETRY_DISABLED: "1", CI: "1" }, encoding: "utf8" });
    runs.push(+((performance.now() - t0) / 1000).toFixed(1));
    if (r.status !== 0) { console.error(t.id, "FAILED", r.stderr.slice(-800)); process.exit(1); }
  }
  const files = walk(path.join(cwd, t.out));
  res[t.id] = { cold_build_seconds: runs, median_seconds: [...runs].sort((a, b) => a - b)[1], output_files: files.length, output_bytes: files.reduce((s, f) => s + fs.statSync(f).size, 0),
    node: t.node === NODE22 ? "22.23.2 (isolated npm package)" : process.version };
  console.log(t.id, res[t.id]);
}
fs.writeFileSync(path.join(ROOT, "results/build-time.json"), JSON.stringify({ measured_at: new Date().toISOString(), note: "cold: .next/.astro/dist/.vite caches removed before every run; wall-clock; machine not idle-controlled", results: res }, null, 1));
