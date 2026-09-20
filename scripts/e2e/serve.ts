import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { extname, join, normalize } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Servidor estático local para las pruebas de navegador. Resuelve `/ruta` → `ruta.html` (como un host con
 * cleanUrls) y comprime con brotli para medir la transferencia real. Rechaza salir de `dist/`.
 */
export function serveDist(dist: string): Promise<{ server: Server; origin: string }> {
  const cache = new Map<string, Buffer>();
  const server = createServer((req, res) => {
    const url = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
    const rel = normalize(url).replace(/^([/\\])+/, "");
    let file = join(dist, rel);
    if (!file.startsWith(dist)) {
      res.writeHead(403).end();
      return;
    }
    for (const cand of [file, `${file}.html`, join(file, "index.html")]) {
      if (existsSync(cand) && statSync(cand).isFile()) {
        file = cand;
        break;
      }
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404, { "content-type": "text/plain" }).end("not found");
      return;
    }
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    const compressible = !file.endsWith(".woff2");
    let body: Buffer = readFileSync(file);
    const headers: Record<string, string> = { "content-type": type, "cache-control": "no-store" };
    if (compressible) {
      let cached = cache.get(file);
      if (cached === undefined) {
        cached = brotliCompressSync(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } });
        cache.set(file, cached);
      }
      body = cached;
      headers["content-encoding"] = "br";
    }
    res.writeHead(200, headers).end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` }),
    );
  });
}
