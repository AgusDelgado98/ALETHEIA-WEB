import { defineConfig } from "astro/config";
import { SITE_ORIGIN } from "./src/lib/origin.ts";

// Sitio 100 % estático (WEB-0 §3). Sin integraciones de UI: las páginas de contenido no envían JavaScript.
// `format: "file"` + `trailingSlash: "never"` producen `/labor/preguntas/q-0013` (sin barra final) en hosts estáticos.
export default defineConfig({
  site: SITE_ORIGIN,
  output: "static",
  trailingSlash: "never",
  build: { format: "file" },
  devToolbar: { enabled: false },
});
