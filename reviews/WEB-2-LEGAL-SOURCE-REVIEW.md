# WEB-2 · revisión legal de Source (G-LEG-03)

**Estado: `COMPLETED`**

> Este documento vacío no satisface G-LEG-03.

No emitir opinión legal automática. Este archivo humano acompaña `reviews/WEB-2-LEGAL-SOURCE-REVIEW.yml`, que es el registro máquina. Completar el YAML; no basta con leer este Markdown.

- Commit: `1dbfbe78f2f7fc62a9dba49e70348574a75f8167`
- Production URL: https://aletheia-web-seven.vercel.app
- Package date: 2026-09-21
- Reviewer: Agustín Delgado
- Review date: 2026-09-21
- Signature: Agustín Delgado

Decisiones admitidas por Source (nada preseleccionado):

* `CLEARED`
* `CLEARED_WITH_CONDITIONS`
* `NOT_CLEARED`
* `REQUIRES_FURTHER_REVIEW`

## G-LEG-02

Contrato: atribuciones y licencias exigidas por cada Source mostrada, presentes en `/sobre` y en la cota.

El estado de G-LEG-02 lo determina el gate sobre el HTML de `/sobre` (`npm run gates`); el texto exigido por esta revisión figura abajo.

### Required public attribution changes

Campo YAML `required_public_attribution_changes`:

Agregar a /sobre (src/pages/sobre.astro, textos en editorial/site/ui.yml) una sección corta titulada «Atribuciones y licencias» con este texto exacto:

Atribuciones y licencias
La Cuenta de generación del ingreso e insumo de mano de obra (CGI-IMO) es una publicación del Instituto Nacional de Estadística y Censos (INDEC), registrada en el corpus de ALETHEIA con licencia CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). ALETHEIA-WEB no redistribuye los datos crudos de CGI-IMO: muestra el nombre de la publicación, su procedencia y texto editorial propio sobre resultados de ALETHEIA-LABOR. Ese texto es una presentación propia y no implica aval ni participación del INDEC. En la medida en que ALETHEIA-WEB publique material adaptado de CGI-IMO, ese material adaptado queda sujeto a CC BY-SA 4.0, incluida la condición ShareAlike.
Las demás fuentes mencionadas en este sitio no tienen licencia de redistribución registrada en el corpus. ALETHEIA-WEB no redistribuye sus datos crudos, no declara ni infiere una licencia o un permiso, y no implica aval de sus productores. Los nombres de publicación y de productor se muestran solo para identificar la procedencia. Cuando el corpus no registra un enlace verificable al publicador, el sitio lo indica.

Requisitos mecánicos de G-LEG-02 que el texto debe cumplir: contiene «INDEC», «CGI-IMO», «CC BY-SA 4.0» y la palabra «licencia»/«atribuciones»; el enlace oficial es https://creativecommons.org/licenses/by-sa/4.0/. La cota no cambia en esta fase.

## Caso CGI / CC BY-SA 4.0 (LAB-ROOT-0002)

Publicación: Cuenta de generacion del ingreso e insumo de mano de obra (CGI-IMO)
Productor: Instituto Nacional de Estadistica y Censos (INDEC)
Licencia registrada: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)

Decisión humana registrada en el YAML `cgi_cc_by_sa`:

* atribución a INDEC
* denominación CGI-IMO
* referencia a CC BY-SA 4.0
* link de licencia cuando proceda
* ShareAlike
* naturaleza de los derivados realmente publicados
* cambios necesarios en `/sobre`

Decisión sobre LAB-ROOT-0002: CLEARED_WITH_CONDITIONS.

## NOT_RECORDED

Toda Source/Root materializada con `recorded_license = NOT_RECORDED` conserva exactamente ese estado. No se convierte en permitido, prohibido, dominio público, fair use ni redistribuible. La decisión humana por ítem consta en el YAML.

## Inventario (decisión por ítem)

| ID | Materialización | Licencia registrada | Decisión |
|---|---|---|---|
| `LAB-ROOT-0001` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED_WITH_CONDITIONS |
| `LAB-ROOT-0002` | PUBLICLY_MATERIALIZED | CC BY-SA 4.0 | CLEARED_WITH_CONDITIONS |
| `LAB-ROOT-0003` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED_WITH_CONDITIONS |
| `LAB-ROOT-0004` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-ROOT-0005` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED_WITH_CONDITIONS |
| `LAB-ROOT-0006` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED_WITH_CONDITIONS |
| `LAB-ROOT-0007` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED_WITH_CONDITIONS |
| `LAB-SRC-0001` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0002` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0003` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0004` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0005` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0006` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0007` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0008` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0009` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0010` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-0011` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LAB-SRC-UNIDENTIFIED-COUNT` | NOT_PUBLICLY_MATERIALIZED | NOT_RECORDED | _vacío_ |
| `LABEL:OBSERVATORY_DESIGN` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED |
| `LABEL:PLATFORM_EVALUATION` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED |
| `LABEL:REGULATORY` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED |
| `LABEL:SOURCE_AVAILABILITY_REVIEW` | PUBLICLY_MATERIALIZED | NOT_RECORDED | CLEARED |

## Tipos de derivado

G-LEG-03 exige decisión por tipo de derivado. El clearance registrado consta en la tabla.

| Tipo | Clearance | Notas |
|---|---|---|
| `editorial_prose` | CLEARED_WITH_CONDITIONS | Solo prosa propia y auditada de ALETHEIA (editorial/); no reproducir texto de las publicaciones de terceros; conservar el scope y el estado epistémico de cada texto; el material adaptado de CGI-IMO queda cubierto por la atribución y la aclaración de ShareAlike de /sobre; un cambio de significado exige reauditoría (Editorial Contract §4.3). Esta revisión no aprueba los textos PENDING_AUTHOR_REVIEW. |
| `publication_names` | CLEARED_WITH_CONDITIONS | Mostrar nombre de publicación y productor tal como los registra el corpus, o glosa atada por maps_to, solo para identificar procedencia; no sugerir aval, afiliación ni permiso; CGI-IMO va acompañado de atribución a INDEC y referencia a CC BY-SA 4.0 en /sobre; no inventar URLs (original_url=null). |
| `epistemic_status_labels` | CLEARED | Vocabulario propio del proyecto (traducción de estados del ledger en editorial/site/states.yml); no incorpora material de terceros. |
| `structural_ui` | CLEARED | Copy y estructura propios del sitio (editorial/site/ui.yml); no incorpora material de terceros. |
| `disclaimers` | CLEARED | Avisos propios del sitio (ui.yml legal_* y about_*), incluido «No es asesoramiento legal, laboral ni estadístico.». La sección de atribuciones y licencias se cubre por G-LEG-02, no por este tipo. |
| `provenance_representations` | CLEARED_WITH_CONDITIONS | IDs, tag, commit, hashes y pregunta canónica en inglés del corpus congelado ALETHEIA-LABOR (material propio del proyecto); sin datos crudos de terceros; los nombres de publicaciones de terceros que aparezcan se tratan como publication_names (mismas condiciones); no sugerir licencias ni permisos que el corpus no registra. |
| `numerical_figures` | CLEARED | WEB-2 no publica cifras numéricas del corpus: 0 Figures (G-FIG-04 N/A en la corrida de gates sobre main). Si un release futuro publicara Figures, requiere nueva revisión. |
| `typography_ofl` | CLEARED | Tipografías autoalojadas bajo OFL-1.1: IBM Plex Mono, Instrument Sans y Newsreader; licencias versionadas en public/fonts/licenses/*-OFL.txt (website assets, no Source del corpus). |
| `preserved_keep_text` | CLEARED_WITH_CONDITIONS | /limites: glosa en español y PreservedResult.must_not canónico del corpus congelado (material propio del proyecto); no reproducir datos crudos ni texto extenso de terceros; conservar el alcance de cada límite sin ampliarlo; los nombres de fuentes se tratan como publication_names. |
| `governance_required_text` | CLEARED_WITH_CONDITIONS | /limites: glosa en español y título/prohibited_inference/reason canónicos de las relaciones GOVERNANCE_REQUIRED (material propio del proyecto); no presentar como resuelta ninguna relación pendiente; los nombres de fuentes (p. ej. SRT, no materializada como raíz pública) aparecen solo como denominación, sin implicar datos, licencia ni permiso. |

## Website assets (no son corpus Source)

Tipografías OFL-1.1 autoalojadas. Van en el inventario con tipo `website_asset`. No se firman como Source del corpus.
