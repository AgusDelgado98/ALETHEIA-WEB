# Spike OD-01 — Next.js vs Astro (evidencia cruda)

Resultado y decisión: [`docs/adr/OD-01-framework-decision.md`](../../docs/adr/OD-01-framework-decision.md). Esta carpeta **no forma parte del build** ni de los gates del repo (excluida de `tsconfig`, ESLint y Prettier).

| Ruta | Contenido |
|---|---|
| `candidates/next`, `next-pages`, `astro`, `astro7` | Código de la página de prueba en cada candidato, con `package.json` de versiones exactas (sin `node_modules`, builds ni lockfiles) |
| `shared/` | Contenido (`content.json`, salido de `public_question` de LAB-Q-0004 y de sus limitaciones) y CSS idénticos |
| `tools/measure.mjs`, `tools/buildtime.mjs` | Análisis estático + medición en Edge headless; builds en frío |
| `results/measure.json` | Resultados crudos (tamaños raw/gzip/brotli por archivo, red, FCP/LCP/CLS/TBT, axe, teclado, sin JS) |
| `results/build-time.json` | Tiempos de build en frío (3 corridas) |
| `results/environment.json` | Versiones exactas, entorno y auditoría |

## Reproducir

Los scripts esperan el layout original del spike (candidatos al nivel superior). Sobre un directorio temporal **fuera de este repo**:

```bash
mkdir ..\ALETHEIA-WEB-FRAMEWORK-SPIKE && cd ..\ALETHEIA-WEB-FRAMEWORK-SPIKE
# copiar candidates\* a la raíz, más shared\ y tools\ ; luego, en cada candidato:
#   npm install (con Node 22 para astro7) y su build
cd tools && npm install && node measure.mjs && node buildtime.mjs
```

`astro7` requiere Node ≥ 22.12. `measure.mjs` necesita Microsoft Edge (ruta al ejecutable en el script).

## Advertencias

- Las medidas de tamaño son deterministas; los tiempos (FCP/LCP/TBT/build) dependen de la máquina y son orientativos.
- Astro 7.3.3 se midió con un Node 22 aislado (paquete npm `node@22.23.2`, una sola persona mantenedora): sirve para validar localmente, **no debe usarse como dependencia del repo**.
- `next-pages` compila solo con el chequeo de tipos desactivado (`unstable_runtimeJS` no está en el tipo oficial).
