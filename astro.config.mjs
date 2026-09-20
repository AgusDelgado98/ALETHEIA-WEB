import { defineConfig } from "astro/config";

// Sitio 100 % estático (WEB-0 §3). Sin integraciones de UI hasta que un componente las necesite.
export default defineConfig({
  output: "static",
  devToolbar: { enabled: false },
});
