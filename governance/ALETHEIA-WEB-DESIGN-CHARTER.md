# ALETHEIA WEB — DESIGN CHARTER

| | |
|---|---|
| **Versión** | 1.2 |
| **Estado** | FROZEN — decisiones visuales; modelo real de datos del Mapa (Enmienda 1.1, §20); `public_question` de las 18 preguntas aprobado editorialmente para V1 (Enmienda 1.2, §20.7) |
| **Fecha** | 2026-09-19 |
| **Referencia visual** | Prototipo V2.1 (`aletheia-web-proto-v2-1/`), aprobado como dirección visual |
| **Alcance** | Identidad y lenguaje visual de la Home y de los componentes que ya aparecen en ella |
| **Fuera de alcance** | Arquitectura técnica, pipeline de datos, contenido editorial final, Ask ALETHEIA, responsive (ver §18 *NOT FROZEN YET*) |
| **Cambios** | Solo por enmienda explícita y fechada (§19). No se modifica por iteración informal. Última: Enmienda 1.2, 2026-09-19 (solo §20.7 y los ajustes de §18 y §19). |

Este documento **no** congela WEB-0. Congela únicamente lo que ya se decidió mirando el prototipo.

---

## 1. Dirección: *Expediente abierto*

ALETHEIA se ve como un expediente que se puede abrir, anotar y seguir hasta su origen: silencioso, preciso, humano primero y metódico después.

**Principio rector de la interfaz:**

> una pregunta → una idea → una apertura → más profundidad

Nunca: muchos KPIs → muchos gráficos → muchos estados al mismo tiempo.

**Prueba de identidad (criterio de conformidad):** si se quita el logotipo, la interfaz debe seguir pareciendo ALETHEIA. Se verifica con la Apertura y el Rastro (`?nologo=1` en el prototipo). Si una pantalla solo se reconoce por el logo, no cumple.

---

## 2. Unidades públicas

| Unidad | Rol |
|---|---|
| **QUESTION** | Unidad pública principal de exploración. Todo recorrido empieza en una pregunta. |
| **CLAIM** | Unidad de afirmación y auditoría, **cuando existe**. |

**Regla de representación de preguntas y claims (congelada):**

1. El estado terminal visible de una pregunta **pertenece a la pregunta**. No se infiere del recuento agregado de claims.
2. Una pregunta puede tener **0, 1 o N claims**. `questions : claims` **no es 1:1** y la interfaz no puede fingir que lo es.
3. Con uno o más claims, se muestra la resolución de la pregunta y **un ■ por claim**, cada uno con su propio estado; cada claim se abre por separado.
4. Sin claim, se muestra explícitamente el **resultado documental** de la pregunta. Ese resultado **no se convierte en claim** y la ausencia de claim se ve (no desaparece).

La relación real pregunta ↔ claim del corpus congelado, las dos capas de estado y el vocabulario público están en **§20** (Enmienda 1.1).

---

## 3. Fundamentos visuales

### 3.1 Paleta

Marfil contemporáneo. Sin estética vintage, sin papel envejecido, sin textura.

| Token | Hex | Rol |
|---|---|---|
| `paper` | `#F5F4EF` | Fondo base |
| `paper-2` | `#ECEBE4` | Bandas de fondo alternadas |
| `ink` | `#181A1D` | Texto, trazos, glifos |
| `graphite` | `#565A5F` | Texto secundario |
| `hair` / `hair-2` | `#D9D7CE` / `#BDBAAE` | Filetes decorativos |
| `verd` | `#1E6A5E` | Verdigris (ver §10) |
| `verd-deep` | `#154F46` | Verdigris para texto de acción |

Sin gradientes. Sin sombras. Sin colores nuevos: cualquier color adicional requiere enmienda.

Ningún matiz único funciona como identidad partidaria: la paleta no usa amarillo, violeta, rojo ni celeste como color de marca.

### 3.2 Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Serif editorial | **Newsreader** (variable, eje óptico) | Ideas, preguntas, números, narrativa |
| Sans | **Instrument Sans** | Lectura, etiquetas, controles |
| Mono | **IBM Plex Mono** | Solo identificadores, hashes, cotas de alcance |

- Números en serif, cifras lining y tabulares. Formato `es-AR` (`+35,48 %`), signo menos tipográfico (`−`).
- No usar mayúsculas espaciadas como etiquetas. El wordmark es la única excepción.
- Líneas de lectura < 80 caracteres.
- Los tamaños del prototipo (desktop) son la **referencia**; los valores móviles no están congelados (§18).

### 3.3 Espacio y densidad

- Mucho espacio. La respiración es parte de la identidad.
- **Densidad inicial baja:** el hero no tiene números; la primera mitad de la Home muestra como máximo **una cifra a la vez** (dos durante la Apertura: la sellada y la revelada).
- **No se llena un vacío solo porque existe.** El silencio es un requisito, no un resto.
- Estructura por filetes de 1 px y espacio; no por cajas.

---

## 4. La Apertura (firma principal)

El gesto más reconocible del producto.

1. Toda cifra agregada nace **sellada**, y ya **cortada**: una ranura fina (~4 px) la atraviesa a media altura de los dígitos.
2. **Abrir** ensancha esa ranura (por scroll o por clic). Las mitades se separan y se atenúan; en la ranura aparece **otra lectura** del mismo dato, en verdigris.
3. La ranura abierta lleva dos filetes verdigris que se extienden más allá del Encuadre y un tinte de fondo apenas perceptible.
4. Al pasar el cursor por el número sellado, la ranura se entreabre (invitación).
5. La lectura revelada no agrega información nueva: explica la cifra en una frase corta.
6. Cada Apertura lleva su **Encuadre** (§5).

El verdigris aparece en la Apertura **porque es una acción de abrir/revelar**, no por su significado.

---

## 5. El Encuadre

Marcas de alcance alrededor de cifras y gráficos.

- **Marcas de esquina** (16 px, desplazadas 24 px hacia afuera).
- **Cota de alcance** debajo: `● fuente ───── período` (mono). Es la **metadata contextual mínima** permitida junto a una cifra: fuente y período/alcance. No se agregan más líneas de metadata suelta.
- Todo dato con valor pendiente se marca con `*` (convención de prototipo; no aplica a producción).

---

## 6. El hilo y la ranura

**Hilo** — une la evidencia. Su continuidad *es* información:

| Trazo | Significa |
|---|---|
| Sólido | Sostenido por la evidencia |
| Punteado | Enunciado o esperado, pero no alcanzado |
| **Cortado** (ranura) | La cadena deja de sostenerse |

**La ranura** `—| |—` es la marca de todo lo que se abre o se corta: el wordmark, el número sellado, la Apertura, el corte del hilo, el corte del Rastro, el glifo de Límite. Su geometría es la misma en todos los usos: dos filetes con topes.

Color de la ranura: **verdigris solo cuando es una acción de abrir/revelar** (Apertura); **tinta cuando expresa un estado o un límite** (Rastro, hilo de "no significa", mapa).

---

## 7. Sistema de seis glifos

Una sola familia geométrica, grilla de 24 px, peso óptico equivalente (verificado de 13 a 44 px).

| Glifo | Nombre | Significa |
|---|---|---|
| ● | Fuente | De dónde sale |
| ◆ | Objeto | Qué se mide |
| ▲ | Evidencia | Qué se vio |
| ▽ | Hipótesis | Qué se esperaba / pregunta sin resolver |
| ■ | Afirmación (claim) | Qué se afirma |
| —\| \|— | Límite | Dónde no se puede seguir |

Reglas:

1. El **relleno expresa el estado**: macizo = sostenido; discontinuo = enunciado pero no alcanzado.
2. Los glifos son **gramática interna** del Rastro y de componentes donde tienen contexto (cota, mapa, "sí/no significa"). **Nunca** son navegación ni algo que el usuario deba descifrar.
3. La **leyenda** de los seis glifos solo aparece en los niveles *Detalle* y *Auditoría* del Rastro. El usuario casual no tiene que aprenderla.
4. Todo glifo se acompaña de texto en su contexto; no comunica por sí solo.

---

## 8. Estados epistemológicos

Se codifican por **geometría, relleno, textura, continuidad y corte. Nunca por color.**

| Resultado | Forma |
|---|---|
| Observado en la fuente | Hilo sólido → ■ macizo |
| Refutado dentro del alcance | Hilo sólido → ■ de borde discontinuo (la expectativa no se alcanza) |
| Evidencia insuficiente | Hilo sólido → **corte** → hilo punteado → ■ hueco |
| No identificable | Zona **rayada**, sin hilo ni ■ |
| Bloqueada | Hilo sólido → **tope** ▎ |
| Abierta / no resuelta | Hilo punteado → ▽ hueco |

Los estados con claim usan ■; los estados sin claim **no** usan ■ (la ausencia es visible). Las etiquetas de texto acompañan siempre a la forma. La forma larga de la etiqueta es obligatoria ("Observado en la fuente", nunca "Observado").

*El vocabulario documental de las preguntas sin claim y las etiquetas públicas en español están definidos en §20.4 (Enmienda 1.1).*

---

## 9. Progressive disclosure

Niveles, en este orden, y solo a demanda del usuario:

| Nivel | Qué se ve |
|---|---|
| 0 | Identidad y una pregunta |
| 1 | Un dato (sellado) |
| 2 | Su apertura (otra lectura) |
| 3 | Lo que sí podemos decir / lo que esto no significa |
| 4 | El Rastro (Resumen → Detalle → Auditoría) y la metodología |

**La metodología está disponible en profundidad, nunca primero.** La capa humana siempre precede a la capa técnica.

---

## 10. Verdigris

> **verdigris = acción de abrir / revelar / elemento actualmente activo**

Usos permitidos: línea, tinte y número de la Apertura; "Abrir el número"; marca de una pregunta al abrirse o al pasar el cursor; foco de teclado; hover de enlaces de acción; fila o control activo.

Usos prohibidos: codificar estado epistemológico; distinguir preguntas cerradas entre sí; énfasis tipográfico; decoración; texto sobre relleno verdigris.

Verificación: todo uso de verdigris debe poder justificarse con una de las tres palabras de la regla (abrir, revelar, activo).

---

## 11. Componentes ya aprobados

### 11.1 Lo que sí podemos decir / Lo que esto no significa
- Títulos fijos, con esa redacción, como patrón de identidad del producto.
- Composición: la afirmación a la izquierda; un hilo baja de ella, **se corta** y sigue punteado junto a los límites; el título "no significa" nace en el corte.
- Cada límite es una frase concreta con su razón (mismo párrafo, razón en gris `graphite`). Se marca con el glifo de Límite.
- Ninguna ficha se publica sin al menos un límite.

### 11.2 Preguntas como puertas
- Las preguntas son **grandes puertas de entrada** en serif; el dato aparece **solo al abrir**.
- Una puerta abierta a la vez. Marca de apertura: dos filetes que se separan.
- Las puertas cerradas **no cambian de color** según su contenido.

### 11.3 El Rastro
- Núcleo **vertical**, leído **de la respuesta al origen**: afirmación → hipótesis → *corte* → evidencia → objeto → fuente.
- Por encima del corte, lo no alcanzado (punteado, glifos discontinuos); por debajo, lo sostenido (sólido).
- La ranura del Rastro repite la geometría de la Apertura, en tinta.
- Tres profundidades: **Resumen** (silencio en el margen), **Detalle** (límites y notas en el margen derecho, leyenda de glifos), **Auditoría** (identificadores y hashes en mono).

### 11.4 Mapa de preguntas
- Cada pregunta: texto · hilo · forma final. Las formas quedan alineadas a la derecha.
- Mantiene la lógica editorial: es un índice tipográfico, **no una grilla de KPIs**.
- Sin selección: se muestran todas las preguntas. Una fila se abre para mostrar su resolución y sus claims (§2).
- La leyenda explica que cada ■ es un claim, que puede haber más de uno por pregunta y que sin ■ no hay claim.
- Los datos son los del corpus reconciliado (§20): 18 preguntas en orden de `QUESTION_ID`, sin marcas de dato pendiente. La leyenda de la forma «abierta» dice «abierta, no ejecutada».

---

## 12. Marca

Wordmark `ALETHEIA` en serif (peso 500, tracking amplio) con **la ranura** a media altura de las mayúsculas. La ranura del logotipo es la misma pieza que atraviesa el número sellado.

---

## 13. Movimiento (principios)

- El movimiento **responde a una acción** (abrir, expandir, confirmar) o revela; no decora.
- Sin animaciones ornamentales ni entradas deslizantes por sección.
- `prefers-reduced-motion` se respeta siempre.
- *Tiempos, curvas y coreografía final: no congelados (§18).*

---

## 14. Prohibiciones

No se incorporan:

- fotografías;
- texturas o estética vintage;
- sellos;
- muros de KPIs, tarjetas (cards) de métricas o estética de dashboard;
- gradientes, sombras, colores nuevos;
- navegación adicional al recorrido principal (el riel lateral fue retirado);
- ilustraciones decorativas;
- metodología en primer plano;
- estados codificados por color.

---

## 15. Accesibilidad como restricción del sistema

La accesibilidad no es una fase posterior: es un requisito de conformidad de cada componente. Objetivo: **WCAG 2.2 AA**.

**Contraste medido de la paleta (ratio WCAG):**

| Token | sobre `paper` | sobre `paper-2` | Uso permitido |
|---|---|---|---|
| `ink` | 15,83 | 14,59 | Todo texto |
| `graphite` | 6,31 | 5,81 | Texto secundario, cualquier tamaño |
| `verd` | 5,82 | 5,36 | Texto y trazos de acción |
| `verd-deep` | 8,52 | 7,85 | Texto de acción |
| `mute` `#8B8F93` | 2,96 | 2,72 | **Prohibido para texto** (no llega a 3:1) |
| `hair-2` | 1,77 | 1,63 | **Solo filetes decorativos** |

`ink` sobre relleno `verd` da 2,72: **no se coloca texto sobre relleno verdigris**.

**Restricciones:**

1. **Nunca solo color:** todo estado se expresa por forma/relleno/textura y además por texto.
2. **Teclado:** todo lo interactivo es alcanzable y operable con teclado; foco visible (contorno verdigris de 2 px).
3. **Semántica:** los paneles cerrados no son focalizables (`inert`); los estados de apertura se exponen con `aria-expanded`.
4. **Gráficos:** cada gráfico tiene descripción textual; en producción, además, una **alternativa en tabla**.
5. **Lectura:** lenguaje llano; líneas < 80 caracteres; jerarquía tipográfica clara.
6. **Movimiento:** respeta `prefers-reduced-motion`; nada esencial ocurre solo por animación.
7. **Glifos:** decorativos o acompañados de texto; los que aportan información llevan nombre accesible en su contexto.

Pendiente de verificar en producción (no congelado): auditoría automática y manual completa, tamaños de objetivo táctil, lectores de pantalla sobre los componentes.

---

## 16. Copy: reglas de voz (solo las visuales)

- Español rioplatense, oraciones cortas, voz activa; el sistema nombra las cosas por lo que el usuario entiende.
- Los títulos de los componentes aprobados (§11) se mantienen con su redacción.
- Las etiquetas de estado usan siempre su forma larga.

---

## 17. Criterios de conformidad (checklist)

Una pantalla conforme a este Charter:

- [ ] Pasa la prueba sin logotipo (§1).
- [ ] No muestra más de una cifra a la vez en la primera mitad.
- [ ] Los estados se distinguen sin usar el color.
- [ ] Todo verdigris se justifica con *abrir / revelar / activo*.
- [ ] Toda cifra tiene su Encuadre con fuente y alcance.
- [ ] Todo límite se muestra junto al dato, no en un pie de página.
- [ ] La metodología no aparece antes que la respuesta.
- [ ] Ninguna pregunta se presenta como 1:1 con un claim ni convierte un resultado documental en claim.
- [ ] La resolución de la pregunta y el estado del claim se muestran como capas distintas; ningún estado documental aparece como estado de claim (§20.3).
- [ ] Un «observado» que no es una medición lleva su calificador en texto (§20.4).
- [ ] Cumple los contrastes de §15.
- [ ] No incorpora nada de la lista de §14.

---

## 18. NOT FROZEN YET

Lo siguiente **no** está congelado y puede cambiar sin enmendar este Charter:

1. **Datos definitivos del hero.** La cifra, la pregunta, el período y la fuente que abren la Apertura (`+35,48 %` → `+2,10 %` es demostración del lenguaje visual, no una decisión editorial). El hero tipográfico *sí* está aprobado; sus datos no.
2. **Contenido editorial final.** Redacción definitiva de lecturas, límites y resultados. Los textos del prototipo son ilustrativos. **Excepción cerrada por la Enmienda 1.2:** el `public_question` de las 18 preguntas del corpus LABOR está aprobado editorialmente para V1 (§20.7); no incluye los límites públicos de cada fila, los titulares de claims ni los datos del hero.
3. ~~**Datos del Mapa de preguntas.**~~ **CERRADO por la Enmienda 1.1 (2026-09-19):** reconciliación de solo lectura contra `ALETHEIA-LABOR @ aletheia-labor-v1.0.0` completada y aceptada como fuente canónica; ver §20. El redactado de las preguntas públicas quedó cerrado por la Enmienda 1.2 (ver ítem 2 y §20.7).
4. **Responsive / mobile.** Comportamiento del Encuadre, la cota, la ranura, el mapa (18 filas), el Rastro y la Apertura en pantallas chicas.
5. **Motion final.** Duraciones, curvas y coreografía (los principios de §13 sí están congelados).
6. **Implementación técnica.** Stack, componentes, estructura de repositorio y despliegue.
7. **Corpus pipeline.** Exportación desde el repo congelado, manifest, hashes, verificación.
8. **Ask ALETHEIA.** Integración visual y comportamiento; solo está previsto que use los mismos componentes y estados del sistema.
9. **Escalas tipográficas móviles** y valores exactos fuera de la referencia desktop.
10. **Versión en otros idiomas.**

---

## 19. Control de cambios

Toda modificación de este documento requiere una enmienda con fecha, motivo y aprobación explícita del autor. Las decisiones de la §18 se incorporan a este Charter solo mediante enmienda cuando se cierren.

| Versión | Fecha | Cambio |
|---|---|---|
| 1.0 | 2026-09-19 | Congelamiento de las decisiones visuales aprobadas en el prototipo V2.1. |
| 1.1 | 2026-09-19 | Enmienda: modelo real de datos del Mapa de preguntas (§20). Motivo: reconciliación contra `aletheia-labor-v1.0.0` completada. Aprobación: solicitada explícitamente por el autor en esa fecha. No cambia ninguna decisión visual. |
| 1.2 | 2026-09-19 | Enmienda: `public_question` de las 18 preguntas aprobado editorialmente para V1 tras auditoría contra `canonical_question` (`reconciliation/public-question-editorial-audit.md`): 9 sin cambios, 9 corregidas (2 por fallas semánticas, 7 por legibilidad). Aprobación: solicitada explícitamente por el autor en esa fecha. No cambia ninguna decisión visual, ningún ID, ningún estado ni ningún mapeo pregunta ↔ claim. |

**Referencias:** prototipo `aletheia-web-proto-v2-1/`; herramienta de reconciliación `lab-reconciliation/extract_lab_reconciliation_inputs.py`; datos reconciliados en `reconciliation/` (§20.1).

---

## 20. Modelo real de datos del Mapa de preguntas (Enmienda 1.1)

Esta sección incorpora el modelo de datos real. **No cambia ninguna decisión visual** de §1–§17: usa la gramática, los glifos, los estados por forma y la paleta ya congelados.

### 20.1 Fuente canónica

- Corpus: `ALETHEIA-LABOR @ aletheia-labor-v1.0.0` (commit `ca6a85e12b05df28e73e60ac406c90ad16352ed3`), leído solo desde el tag congelado. Reconciliación aceptada como fuente canónica.
- Artefactos en el prototipo: `reconciliation/question-map-reconciled.json` (fuente), `reconciliation/question-map-table.md`, `reconciliation/map-data.json` (dataset que renderiza el mapa) y los scripts que los generan. Pertenecen al prototipo web, no a `ALETHEIA-LABOR`.
- El mapa no se edita a mano: se regenera con `reconciliation/build_map_data.py`.

### 20.2 Relación Question / Claim

- **Questions and claims are not 1:1.** Una pregunta tiene `0..N` claims.
- Corpus congelado actual:

| Medida | Valor |
|---|---|
| Preguntas | 18 (régimen A 7 · B 6 · C 5) |
| Claims | 14 |
| Hipótesis | 9 (7 con claim; `LAB-HYP-0008` y `LAB-HYP-0009` sin claim) |
| Preguntas con ≥ 1 claim | 13 |
| Preguntas con 0 claims | 5: `Q-0006`, `Q-0007`, `Q-0011`, `Q-0015`, `Q-0017` |
| Preguntas con más de un claim | 1: `Q-0003` (`CLM-0002` nominal · `CLM-0004` real) |

- Estos números son datos del corpus y no reglas del diseño: si el corpus cambia, cambia el dataset, no el Charter.

### 20.3 Dos capas de estado (nunca se mezclan)

| Capa | Qué es | Valores en el corpus actual |
|---|---|---|
| **Resolución de la pregunta** | Cómo terminó la pregunta. Pertenece a la pregunta. | `OBSERVED_IN_SOURCE` (9) · `REFUTED_WITHIN_SCOPE` (1) · `INSUFFICIENT_EVIDENCE` (3) · `NOT_IDENTIFIABLE` (3) · `BLOCKED_BY_DESIGN` (1) · `OUTSIDE_LAB_A` (1) |
| **Estado epistemológico del claim** | Estado de ciclo de vida de una afirmación. Pertenece al claim. | `OBSERVED_IN_SOURCE` (10) · `REFUTED_WITHIN_SCOPE` (1) · `INSUFFICIENT_EVIDENCE` (3) · `ESTABLISHED_WITHIN_SCOPE` (0) · `CONVERGENT` (0) · `DIVERGENT` (0) |

Reglas:

1. `NOT_IDENTIFIABLE`, `BLOCKED_BY_DESIGN` y `OUTSIDE_LAB_A` son **estados documentales de pregunta**. No se convierten en estados de claim, no llevan ■ y no se cuentan como claims. `BLOCKED_BY_DESIGN` y `OUTSIDE_LAB_A` son etiquetas del cierre del régimen A, no estados de ciclo de vida.
2. La resolución de la pregunta **no se deduce** de contar claims ni se rebaja o eleva a partir de ellos.
3. No se inventa ningún estado. El mapa no puede mostrar `ESTABLISHED_WITHIN_SCOPE`, `CONVERGENT` ni `DIVERGENT` mientras el corpus registre 0.
4. El estado registrado en el ledger de preguntas (`OPERATIONALIZABLE_*`, `NOT_YET_OPERATIONAL`) no se reescribe ni se muestra como resultado.
5. **Ausencia no es negativo.** Solo `REFUTED_WITHIN_SCOPE` es un resultado negativo, y solo dentro de su alcance; `INSUFFICIENT_EVIDENCE`, `NOT_IDENTIFIABLE`, `BLOCKED_BY_DESIGN` y `OUTSIDE_LAB_A` son ausencias.
6. **Alcance de la refutación.** En `Q-0004`, `REFUTED_WITHIN_SCOPE` corresponde a la hipótesis `LAB-HYP-0003` dentro de su alcance específico (una variable indirecta, asalariados, dos trimestres de la EPH). No es una refutación general de la pregunta ni de la informalidad, y la fila lo dice.
7. **Observado como medición vs. como hallazgo documental.** `CLM-0008`, `CLM-0009`, `CLM-0010` y `CLM-0012` son `OBSERVED_IN_SOURCE`, pero no son mediciones del mercado laboral. Comparten la forma ■ macizo (mismo estado) y se distinguen **en texto** con el calificador «Hallazgo documental: no es una medición del mercado laboral». No se crea una forma nueva.

### 20.4 Vocabulario público (traducciones editoriales, no estados nuevos)

Las etiquetas son traducciones al español rioplatense de valores que ya existen en el corpus. El código original se conserva en el nivel de auditoría de la fila.

| Código del corpus | Capa | Etiqueta pública | Forma (§8) |
|---|---|---|---|
| `OBSERVED_IN_SOURCE` | claim / pregunta | Observado en la fuente | hilo sólido → ■ macizo |
| `OBSERVED_IN_SOURCE` (hallazgo) | claim / pregunta | Observado en la fuente + «Hallazgo documental: no es una medición del mercado laboral» | ■ macizo |
| `REFUTED_WITHIN_SCOPE` | claim | Refutado dentro de su alcance | ■ de borde discontinuo |
| `REFUTED_WITHIN_SCOPE` | pregunta | Refutada dentro de su alcance | ■ de borde discontinuo |
| `INSUFFICIENT_EVIDENCE` | claim / pregunta | Evidencia insuficiente | corte → punteado → ■ hueco |
| `NOT_IDENTIFIABLE` | pregunta | No identificable con las fuentes conocidas | zona rayada, sin ■ |
| `BLOCKED_BY_DESIGN` | pregunta | Bloqueada por diseño (sin métrica preregistrada) | hilo → tope ▎, sin ■ |
| `OUTSIDE_LAB_A` (+ `NO_DESIGN`) | pregunta | Abierta: no ejecutada (sin diseño de identificación) | hilo punteado → ▽, sin ■ |

Las etiquetas usan siempre su forma larga (§8, §16).

### 20.5 Preguntas sin claim

- Se muestra el resultado documental real de la pregunta con su forma propia (§8) y la frase «Sin claim. Es un resultado documental…». Nunca un ■.
- Se muestra en el panel el código registrado (`BLOCKED_BY_DESIGN`, `OUTSIDE_LAB_A`, `NOT_IDENTIFIABLE`) y, cuando existe, `NO_DESIGN`, junto con la marca «registrado en la pregunta, no en un claim».
- Los límites de la pregunta se muestran igual que en las que tienen claim (§11.1). No se fabrica un claim para completar la fila.
- Una hipótesis puede existir sin claim (`LAB-HYP-0008` en `Q-0015`, `LAB-HYP-0009` en `Q-0011`); tampoco eso se convierte en claim.

### 20.6 Soporte multi-claim

- Un ■ por claim al final del hilo, cada uno con **su** estado. `Q-0003` muestra dos.
- Al abrir la fila, cada claim aparece por separado: su ■, su rótulo («Claim 1 de 2 · Nominal»; «Claim 2 de 2 · Real, deflactado por IPC»), su enunciado con sus propias cifras, su `CLAIM_ID` y su enlace «Abrir el claim N».
- Nunca se fusionan en un estado ni en una cifra. Un texto fijo aclara que el resultado de la pregunta no se deduce de contarlos.
- Los rótulos «Nominal» y «Real, deflactado por IPC» salen del alcance de cada claim y no son estados.

### 20.7 Copy público

- Cada pregunta conserva `canonical_question` (texto del corpus, en inglés, sin tocar) y `public_question` (español).
- `editorial_transform = false`: traducción literal. `true`: redactado en lenguaje común (identificadores del vocabulario controlado o jerga reemplazados por palabras corrientes, o cláusulas reordenadas). Corpus actual: 12 `true`, 6 `false`.
- En ambos casos: no cambia el significado, no agrega causalidad, no amplía población ni período, no endurece la evidencia y no borra limitaciones.
- Con `editorial_transform = true`, la fila abierta muestra además «Enunciado público editorial. Canónico: …». En todos los casos el canónico queda en `data-canonical`.
- **Aprobación editorial (Enmienda 1.2).** El `public_question` de las 18 preguntas del corpus LABOR está **editorialmente aprobado para V1**, tras auditarlo contra `canonical_question` en seis dimensiones: equivalencia semántica, causalidad, población, período, tipo de medición y fuerza de la evidencia. Reporte: `reconciliation/public-question-editorial-audit.md`.
- **Reglas de equivalencia** (criterio de toda edición futura de un `public_question`): se permite simplificar jerga; no se permite quitar precisión sustantiva, ampliar población o período, introducir causalidad, endurecer la evidencia, convertir un proxy en medición directa, una categoría administrativa en relación económica, un stock en transición o flujo, ni una pregunta no identificable en una pregunta aparentemente respondible.
- Cambiar un `public_question` aprobado requiere repetir esa auditoría y una enmienda.

### 20.8 Registro por pregunta

`question_id` · `canonical_question` · `public_question` · `editorial_transform` · `regime` · `effective_resolution` · `claim_ids[]` · `claim_states[]` · `hypothesis_ids[]` · `public_result_class` · `public_label` · `limitations` · `source_of_truth`.

`public_result_class` distingue el origen de la resolución: `CLAIM_*` (la resuelve un claim: `CLAIM_OBSERVED_MEASUREMENT`, `CLAIM_OBSERVED_NON_MEASUREMENT`, `CLAIM_REFUTED_WITHIN_SCOPE`, `CLAIM_INSUFFICIENT_EVIDENCE`) o `DOC_*` (queda documentada en la pregunta, sin claim: `DOC_NOT_IDENTIFIABLE`, `DOC_BLOCKED_BY_DESIGN`, `DOC_OPEN_NOT_EXECUTED`).

### 20.9 Lo que esta enmienda no cambia

Apertura, Encuadre, Rastro, ranura, hilo, glifos, verdigris, densidad baja, preguntas como puertas, paleta, tipografía, prohibiciones (§14) y el hero (§18 ítem 1). La única modificación visible es el texto de la leyenda «abierta» → «abierta, no ejecutada».
