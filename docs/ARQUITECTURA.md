# Arquitectura de MI FRANCÉS

## Decisión general

**PWA estática, local-first.** Es una aplicación web que se instala en el iPhone y funciona sin conexión. Guarda todo en el dispositivo y se publica gratis en GitHub Pages (despliegue automático con GitHub Actions). No necesita backend para las funciones básicas. Los servicios de pago son opcionales y pasan por un servidor intermedio propio, que guarda las claves.

Diferencias con el informe (§9) y por qué:

| Informe | Decisión | Motivo |
|---|---|---|
| Next.js | Vite + React 19 + TypeScript | No hay renderizado en servidor; un sitio estático es más simple, más barato y se publica en GitHub Pages. |
| Tailwind | CSS propio con variables (tema claro/oscuro) | Menos dependencias; el diseño es pequeño y controlado. |
| @dnd-kit / Framer Motion | Arrastre propio con Pointer Events; animaciones CSS | Cero dependencias; funciona con dedo, ratón y teclado; respeta «reducir movimiento». |
| Supabase (sincronización) | IndexedDB (Dexie) + respaldo JSON | Coste cero y sin cuentas. Ruta futura: añadir Supabase sin cambiar el modelo de datos (ver más abajo). |
| Azure TTS / Pronunciation | Voz del dispositivo + transcripción del navegador (con la advertencia de que no evalúa la pronunciación) + Azure opcional vía proxy | Funciones básicas sin pago. Azure no ofrece prosodia ni IPA para fr-FR (verificado). |
| Imágenes generadas por IA para cada palabra | Escenas compuestas con glifos reutilizables (emoji del sistema) + animación CSS + fondo por género + foto propia | Coste cero, carga instantánea, sin almacenamiento; cumple la función mnemotécnica (protagonista = significado, máximo dos entidades). |
| ts-fsrs | **ts-fsrs 5.4.2** fijado (FSRS-6) | La v6 aún es beta y cambia la API. |

## Capas (separación contenido / lógica / interfaz)

```
mi-frances/
├── src/content/        CONTENIDO educativo (estático, revisado)
│   ├── types.ts           modelo: Item, Association, Scene, Unit…
│   ├── unit1.ts           50 ítems A1 (6 lecciones) con IPA, ejemplos, notas, asociaciones
│   ├── curriculum.ts      ruta A1→B2 y regla de dominio
│   ├── dialogues.ts       3 diálogos guiados
│   └── diagnostic.ts      palabras por banda de frecuencia y pares mínimos
├── src/engine/         LÓGICA de aprendizaje (pura, probada con pruebas unitarias)
│   ├── srs.ts             FSRS + calificación automática + sanguijuelas + desvanecimiento del mediador
│   ├── session.ts         constructor de la sesión diaria, reintentos, examen de dominio
│   ├── text.ts            normalización y corrección de respuestas (acentos, erratas, artículo)
│   ├── palace.ts          casilleros mentales
│   └── stats.ts           métricas de memoria real, racha, logros, dominio
├── src/db/             PERSISTENCIA (Dexie/IndexedDB) y respaldo JSON
├── src/services/       SERVICIOS: voz (TTS), reconocimiento/grabación, tutor (proxy)
├── src/state.tsx       estado global; todas las escrituras pasan por aquí
├── src/ui/             INTERFAZ: pantallas, ejercicios, componentes, estilos
├── server/             proxy OPCIONAL (Cloudflare Worker) con las claves como secretos
└── tests/              unitarias (vitest) y extremo a extremo (Playwright)
```

## Modelo de datos (IndexedDB `mi-frances`)

| Tabla | Contenido |
|---|---|
| `cards` | Dos tarjetas por ítem: `rec` (FR→ES, reconocer) y `prod` (ES→FR, producir). Estado FSRS (D, S, R, vencimiento), sanguijuela, última latencia, pistas usadas. |
| `reviews` | Registro de cada respuesta: ejercicio, destreza, acierto, veredicto, latencia, pistas, calificación, estabilidad antes y después. Distingue `recall` (actualiza FSRS) de práctica o reconocimiento (solo se registra). |
| `sessions` | Plan de pasos de la sesión, cursor (punto exacto para reanudar) y resultados. |
| `custom` | Asociaciones personales (palabra clave, escena, emoji, foto reducida). |
| `userItems` | Palabras creadas por el usuario. |
| `palaces` | Lugares, habitaciones (alas por género) y posiciones con la palabra colocada. |
| `kv` | Ajustes. |
| `audio` | Caché de audio neural (si se usa el proxy). |

## Algoritmo de repasos

- FSRS-6 (`ts-fsrs`) con retención objetivo configurable (85/90/95 %), pasos de aprendizaje del mismo día y *fuzz*.
- **Calificación automática** (informe §7.2): fallo o ≥ 3 pistas → *Again*; 1–2 pistas, errata o falta de artículo → *Hard*; latencia hasta la primera tecla > 6 s → *Hard*; < 2.5 s exacta → *Easy*; resto → *Good*. Los umbrales son algo más amplios que los del informe (2 s y 5 s) porque escribir en el teléfono es más lento.
- Tras un fallo, la tarjeta reaparece **3 pasos después** en la misma sesión (máximo 2 reintentos).
- **Sanguijuela:** 2 o más olvidos y un nuevo fallo → la app propone recodificar la asociación.
- **Desvanecimiento del mediador:** con estabilidad > 14 días, la escena deja de mostrarse en la retroalimentación.
- Los ejercicios de reconocimiento (relacionar, opción) y los de práctica (ordenar, recorrido, diálogo) **no** alteran FSRS; solo se registran. Así se evita inflar la memoria con el simple reconocimiento.

## Seguridad y privacidad

- La app no tiene claves. El servidor opcional guarda `ANTHROPIC_API_KEY` y `AZURE_SPEECH_KEY` como **secretos de Cloudflare**, exige una contraseña (`APP_TOKEN`) y limita el origen (CORS).
- Los datos personales nunca salen del dispositivo, salvo el texto que envíes al tutor de IA si lo activas.
- Una importación inválida se rechaza antes de tocar los datos; borrar e importar piden confirmación.

## Ruta para cuentas y sincronización (futuro)

1. Añadir Supabase (Auth + PostgreSQL) con las mismas tablas.
2. Sincronizar `reviews` como registro de solo-anexar y reconstruir `cards` (FSRS es determinista a partir del historial).
3. Mantener IndexedDB como caché local (offline-first).
4. Con más de 1 000 repasos, optimizar los pesos FSRS personales (`fsrs-optimizer`) a partir de `reviews`.

## Pruebas

- `npm test`: 26 pruebas del motor (contenido íntegro, corrección de respuestas, calificación, intervalos FSRS, sanguijuela, sesión, casilleros, racha).
- `npm run e2e`: 61 comprobaciones en Chromium con pantalla de iPhone. Recorre diagnóstico → sesión completa (codificación, arrastre real, ordenar, escucha, rescate con pistas, error deliberado, reintento, diálogo, escritura) → recarga a mitad de sesión y reanudación → persistencia tras cerrar → programación FSRS → biblioteca y asociación personal (con bloqueo de palabra clave repetida) → casilleros y recorrido → progreso → exportar, borrar, importar y rechazar un archivo inválido → ruta → accesibilidad básica → escritorio → ausencia de claves en el código publicado → consola sin errores.
- No se pudo probar en un iPhone físico ni con una voz francesa real (el navegador de pruebas no tiene voces), ni contra las API reales de Anthropic o Azure (no hay claves en este entorno).
