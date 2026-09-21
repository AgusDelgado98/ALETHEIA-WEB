# WEB-2 · aprobación editorial por lote (no ejecutada)

**No se ejecuta en esta fase.** Ningún verdict cambia.

El mecanismo ya existente es `editorial/labor/audit/*.review.yml`:

1. `defaults.verdict` aplica a todas las unidades del bundle sin override.
2. `overrides[string_id]` puede fijar verdict, reviewer, date y notes por unidad.
3. `npm run editorial:seal` **agrega** registros atados a `text_hash` / `canonical_hash`.
4. `npm run editorial:build` actualiza `editorial/manifest.json`.

Una aprobación colectiva futura solo es válida si conserva:

* lista exacta de `string_id` (las 383 pendientes, o un subconjunto por familia);
* `text_hash` y `canonical_hash` de cada una (hash de conjunto actual: `afd3b49fc6a7cfc9512079a02cf7b29d1ae435943d2e001fefebdf21a24f675b`);
* reviewer / author reales;
* fecha ISO;
* verdict `APPROVED` o `REVISED_AND_APPROVED`;
* overrides / excepciones;
* vínculo al manifest.

No es válido un simple `all approved` sin identificación de unidades.

No tocar registros que ya están `APPROVED` o `REVISED_AND_APPROVED` (las 18 `public_question`).

Si el material editorial cambia, `REVIEW INVALIDATED BY DRIFT` y hay que volver a sellar con nueva revisión.
