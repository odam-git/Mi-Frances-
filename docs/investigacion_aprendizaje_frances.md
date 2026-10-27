# Resumen estructurado del informe de investigación

**Documento original:** `Aplicacion_Personalizada_para_Aprender_Frances.pdf` (37 pp.), conservado en esta misma carpeta.
**Título:** *Investigación y Especificación Técnica de un Sistema Adaptativo Personalizado para la Adquisición del Francés en Adultos Hispanohablantes.*
**Uso:** documento de referencia principal para las decisiones pedagógicas y técnicas de MI FRANCÉS. Cada hallazgo se vincula con la decisión que tomó la aplicación (columna «→ App»).

---

## 1. Tesis central

La retención a largo plazo y la transferencia al habla no salen de la exposición pasiva ni de la repetición mecánica, sino de combinar **codificación elaborativa multimodal** con **recuperación activa con dificultad deseable**, programada con **repetición espaciada**.

## 2. Hallazgos pedagógicos y su traducción a la aplicación

| # | Hallazgo (fuente citada en el informe) | → App |
|---|---|---|
| 1 | **Efecto del test** (Roediger y Karpicke, 2006): recuperar sin ver la respuesta retiene más que reestudiar. | Nunca se muestra la respuesta primero; todo repaso es pregunta → intento → retroalimentación. |
| 2 | **Estilos VAK refutados** (Pashler et al., 2008). La preferencia visual del usuario se aprovecha vía **codificación dual** (Paivio), no segregando. | Cada ítem combina texto + audio + escena visual + acción (arrastrar/ordenar) para todos los ítems. |
| 3 | **Palabra clave + recuperación = efecto catalítico** (Miyatsu y McDaniel, 2024): más del doble de recuerdo a una semana. Retención con KWM 72–88 % vs 28–46 %. | La asociación se presenta e inmediatamente se practica en recuperación activa dentro de la misma sesión. |
| 4 | **Efecto de lo bizarro solo en listas mixtas** (McDaniel, Einstein et al.). Si todo es absurdo, la ventaja desaparece. | Cognados transparentes (*café, table, ami*) usan **imagen directa**; las escenas absurdas se reservan a palabras opacas. Campo `tipo de asociación` por ítem. |
| 5 | **Seis fallos del método de palabra clave (C1–C6)**: no encontrar palabra clave, palabras abstractas, sobrecarga, escenas saturadas, y sobre todo **C6: recordar la escena y olvidar la palabra**. | Asociaciones prevalidadas (generación asistida), escenas de **máximo dos entidades**, y el **significado real protagoniza** la escena; la palabra clave es solo instrumento. |
| 6 | **Efecto de generación** (Slamecka y Graf): lo que el aprendiz genera se recuerda mejor. | El usuario puede aprobar, editar o crear su propia asociación (texto o foto propia). |
| 7 | **Desvanecimiento del mediador** (Crutcher y Ericsson): la mnemotecnia es andamio temporal. | Cuando la estabilidad de la tarjeta supera **14 días**, la escena deja de mostrarse en la retroalimentación. |
| 8 | **Nueva teoría del desuso** (Bjork y Bjork): olvidar no es borrar; recuperar con esfuerzo cuando la fuerza de recuperación cayó fortalece más. | **Protocolo de rescate en 4 escalones** antes de revelar la respuesta. |
| 9 | **Ilusión de competencia** (Koriat y Bjork, 2005): ver pista y respuesta juntas engaña. | Calificación automática (no autoevaluación); el uso de pistas baja la calificación. |
| 10 | **Cuatro ejes de Nation**: 25 % input comprensible, 25 % output, 25 % estudio deliberado (SRS/mnemotecnia), 25 % fluidez. | La sesión diaria incluye escucha/diálogo y producción escrita/oral, no solo tarjetas. |
| 11 | **Limitaciones de la mnemotecnia pura** (Gu, 2003): ignora polisemia, sintaxis, ortografía y pronunciación. | Cada ítem lleva ejemplo en contexto, nota gramatical e IPA. |
| 12 | **Animacidad** en el método de loci: dar vida a objetos inanimados aumenta el recuerdo. | Las escenas usan personajes animados (objetos con acción). |
| 13 | **Gamificación maladaptativa** (estudios sobre Duolingo; Loewen et al., 2019): ligas, rachas punitivas y XP desvían del aprendizaje y transfieren poco a la producción. | Sin ligas ni XP; racha con días de gracia; el progreso se mide por estabilidad de memoria, no por puntos. |

## 3. Método de Ramón Campayo: qué se adopta y qué se descarta

- **Se adopta:** visualización breve e intensa (4–5 s), priorización por frecuencia (núcleo de 600–800 palabras), casilleros mentales espaciales.
- **Se descarta:** la promesa de «un idioma en 7 días»; la **pronunciación figurada castellanizada** (p. ej. escribir «bón» por *bon* fosiliza una /n/ que destruye la vocal nasal); la omisión de la gramática.
- → App: no hay pronunciación figurada; se usa **audio + IPA** y notas articulatorias.

## 4. Fonética contrastiva para hispanohablantes

- **Vocales nasales** [ɛ̃] [ɑ̃] [ɔ̃] (y [œ̃]): sin consonante nasal final. *beau* [bo] vs *bon* [bɔ̃].
- **[y] vs [u]**: *tu* vs *tout*, *dessus* vs *dessous*.
- **Vocales redondeadas** [ø] [œ], **schwa** [ə], **semivocal** [ɥ] (*huit, lui*).
- **Regla de protección fonética:** si la palabra contiene un contraste crítico, **no se usa palabra clave española** que induzca mala pronunciación; se usa una nota articulatoria.
- → App: el campo `protección fonética` bloquea la pista fonética e indica la causa; las IPA se colorean (nasales en azul, redondeadas en ámbar).

## 5. Sesión diaria ideal (15–20 min, informe: 18 min)

| Bloque | Duración | Contenido |
|---|---|---|
| 1. Rescate y repaso acumulativo | ~4 min | 12–18 tarjetas vencidas; nunca se muestra la respuesta primero; rescate graduado. |
| 2. Codificación de ítems nuevos | ~5 min | **Máximo 5–7** ítems: escucha + IPA, repetición, escena, pausa de 5 s, ubicación en casillero. |
| 3. Práctica manipulativa intercalada | ~4.5 min | Arrastrar, ordenar frases, completar; mezcla de nuevos y antiguos; recuerdo libre sin pistas. |
| 4. Transferencia oral y situacional | ~4.5 min | Diálogo/situación usando al menos 3 palabras del día. |

## 6. Protocolo de rescate (palabra olvidada)

| Escalón | Pista | Calificación resultante |
|---|---|---|
| 1 (≈ +4 s) | Ubicación en el casillero mental y género (sin revelar palabra) | Hard (2) |
| 2 (≈ +7 s) | Escena visual muda | Hard/Again |
| 3 (≈ +10 s) | Palabra clave + esqueleto de letras (p. ej. `g _ _ e`) | Again (1) — «lapso asistido» |
| 4 (fallo / 2 lapsos) | Revelación + **recodificación obligatoria** (sanguijuela / *leech*) | Again (1) + abrir editor de asociación |

## 7. Algoritmo de repasos

- **FSRS** (Free Spaced Repetition Scheduler; modelo DSR: Dificultad, Estabilidad, Recuperabilidad), curva de olvido de ley de potencia; ~20–30 % menos repasos que SM-2 a igual retención (90 %).
- Implementación recomendada: librería **ts-fsrs**; pesos por defecto hasta acumular ≈1 000 repasos; optimización personal después.
- **Calificación automática** (no autoevaluación):
  - **Again (1):** respuesta incorrecta, o se necesitaron los escalones 3–4.
  - **Hard (2):** correcta tras el escalón 1, o más de 5 s.
  - **Good (3):** correcta al primer intento en 2–5 s.
  - **Easy (4):** correcta en menos de 2 s y sin pistas.
  - (El informe añade la puntuación fonética de Azure; la app la incorpora solo si se configura el servicio.)

## 8. Casilleros mentales (método de loci adaptado)

1. **Género:** cada escenario se divide en **Ala Cálida (masculinos, le/un)** y **Ala Fresca (femeninos, la/une)**.
2. **Verbos:** recorrido de **5 posiciones fijas** por verbo (infinitivo, raíz singular del presente, plural, participio y auxiliar, futuro).
3. **Galería de estructuras** para conectores B1–B2.
- Los casilleros son **apoyo opcional**, no requisito.

## 9. Diagnóstico inicial (informe)

Evitar exámenes de opción múltiple (el hispanohablante adivina por similitud). Medir: vocabulario productivo bidireccional por bandas de frecuencia; discriminación auditiva de pares mínimos; pronunciación base (Azure); velocidad de codificación imaginativa; disponibilidad diaria (fija 5–7 palabras nuevas/día).

## 10. Ruta MCER y metas medibles (sin certificar)

| Fase | Léxico activo (S > 21 d) | Metas orientativas |
|---|---|---|
| Hacia A1 consolidado | 0–650 familias | Sem. 2: ~80 palabras activas; Mes 1: ~200 y diálogo de 4 turnos |
| Hacia A2 funcional | 650–1 500 | Mes 3: ~550; *passé composé* vs *imparfait*; pronombres *y, en* |
| Hacia B1 | 1 500–2 800 | Condicional, subjuntivo tras conectores, relativos |
| Hacia B2 | 2 800–4 500+ | Argumentación oral sostenida |

Niveles **no** se desbloquean por puntos o rachas, sino por dominio y recuperación diferida.

## 11. Métricas de aprendizaje real

1. **Volumen de almacenamiento profundo:** ítems productivos con S ≥ 21 días.
2. **Retención diferida empírica:** aciertos al primer intento en tarjetas con intervalo > 14 días (objetivo 88–92 %).
3. **Acceso léxico directo:** ítems con S > 14 d recuperados en < 2 s sin pistas.
4. **Transferencia conversacional:** palabras usadas espontáneamente en conversación.

## 12. Arquitectura recomendada por el informe vs. decisión de la app

| Capa | Informe | Decisión MI FRANCÉS v1 | Motivo |
|---|---|---|---|
| Frontend | Next.js + TS + Tailwind | **Vite + React + TypeScript** (CSS propio) | Sitio estático: se publica gratis en GitHub Pages sin servidor; más simple de mantener. |
| Motor SRS | ts-fsrs | **ts-fsrs** | Igual. |
| Datos | Dexie (IndexedDB) + Supabase | **Dexie (IndexedDB)** + exportación/importación JSON | Local-first sin coste; Supabase queda como fase posterior (sincronización). |
| Audio | Azure Neural TTS | **Voz francesa del dispositivo** (Web Speech API) con interfaz de proveedor intercambiable; Azure opcional vía proxy | Funciona sin API de pago. |
| Pronunciación | Azure Pronunciation Assessment | **Transcripción del navegador** claramente identificada como *no* evaluación fonética; Azure opcional | No se afirma corrección fonética sin herramienta fiable. |
| Imágenes | LLM + Flux/DALL-E por palabra | **Escenas compuestas** con glifos reutilizables y animación CSS + foto propia opcional | Coste cero; resultado equivalente para la función mnemotécnica. |
| Tutor IA | LLM restringido al léxico | **Diálogos guiados sin conexión** + tutor IA opcional mediante proxy con clave en servidor | Funciones básicas sin pago. |

## 13. Riesgos señalados

- **Interferencia por palabras clave repetidas** → la app impide reutilizar la misma palabra clave en dos ítems.
- **Dependencia crónica del mediador** → desvanecimiento a S > 14 d.
- **Falsos negativos acústicos por ruido** → los fallos de reconocimiento de voz **no** se registran como fallos de memoria.

## 14. Costes estimados por el informe (uso personal, 20 min/día)

Azure Speech $0–1.40/mes · Azure TTS $0–0.50 · LLM $3.30 (pipeline) a $21 (tiempo real) · Imágenes IA ~$8.80 · Hosting $0 · **Total $12–14 USD/mes** con todos los servicios. **MI FRANCÉS v1 funciona con $0**; cada servicio es opcional.

## 15. Decisiones pendientes que el informe pide al usuario

1. Punto de partida (A0 o conocimientos previos) y variante (**fr-FR** asumido por defecto).
2. Lugares reales para los casilleros (la app trae una casa genérica editable).
3. Arquitectura de voz del tutor (modular económica vs tiempo real).
4. Variante del español para palabras clave (**español de México** asumido por defecto).

## 16. Puntos del informe tratados con cautela

- Cifras de retención (72–88 %, 20–30 %) y umbrales (2 s, 5 s, 14 d, 21 d) se usan como **parámetros configurables**, no como garantías.
- Algunas fuentes citadas son blogs o sitios comerciales; las decisiones se apoyan preferentemente en las fuentes académicas y en la documentación oficial.
- El informe atribuye a Azure evaluación a nivel de fonema IPA y prosodia; su disponibilidad exacta para fr-FR debe verificarse antes de contratar el servicio.

## 17. Contraste con documentación oficial (verificado el 27-oct-2026)

| Afirmación del informe | Verificación | Consecuencia |
|---|---|---|
| Usar ts-fsrs (FSRS-6) | `ts-fsrs` estable = **5.4.2** (FSRS-6, 21 pesos). El README de GitHub ya describe la **v6 beta** con otra API. Fuente: registry.npmjs.org/ts-fsrs | Se fija `ts-fsrs@5.4.2`. Las fechas son `Date` y se rehidratan al importar respaldos. |
| Azure evalúa fonemas IPA y prosodia | Para **fr-FR** hay puntuación de exactitud, fluidez, completitud y por fonema, pero **prosodia y nombres de fonema IPA solo en en-US**. Fuente: learn.microsoft.com (*pronunciation assessment*, *language support*) | La app no promete prosodia ni diagnóstico IPA en francés aunque se conecte Azure. |
| Capa gratuita Azure | F0: 5 h/mes de STT y 0.5 M caracteres/mes de TTS neural. Fuente: azure.microsoft.com/pricing | Coherente con el informe. |
| Reconocimiento de voz en iPhone | `webkitSpeechRecognition` existe en Safari iOS, pero **no funciona en una PWA instalada en la pantalla de inicio** (WebKit bug 225298); probablemente requiere red. | En la PWA instalada, la práctica oral usa **grabar → escuchar tu voz → comparar con el modelo**; la transcripción solo se ofrece donde existe. |
| Persistencia en iPhone | Las apps web añadidas a la pantalla de inicio quedan fuera del borrado de 7 días de Safari; `navigator.storage.persist()` existe desde iOS 17 (concesión heurística). Fuente: webkit.org/blog/10218, /14403 | Se recomienda instalar la app y se pide almacenamiento persistente; aun así, **respaldo exportable**. Los datos de la pestaña de Safari y de la app instalada probablemente están separados. |
| Suscripción vs. API | Una suscripción de claude.ai **no incluye** la API (se factura aparte en la Console). | El tutor IA es opcional y requiere clave de API en un servidor intermedio. |

No se tuvo acceso a Gemini; la verificación se hizo con búsqueda web y documentación oficial desde este entorno.
