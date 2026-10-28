# MI FRANCÉS — tu entrenador personal de francés

Aplicación web instalable (PWA) para aprender francés desde A1, con memoria visual, casilleros mentales, repetición espaciada (FSRS-6) y práctica oral y escrita. Funciona en iPhone y en computadora, **sin servidor y sin coste**. El tutor de IA y la voz neural son opcionales.

- **Abrir la app:** https://odam-git.github.io/Mi-Frances-/
- **Fundamento pedagógico:** [`docs/investigacion_aprendizaje_frances.md`](docs/investigacion_aprendizaje_frances.md) (resumen del informe original, conservado en `docs/`).
- **Arquitectura y decisiones:** [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

---

## 1. Usarla en tu iPhone

1. Abre el enlace en **Safari**.
2. Toca **Compartir** (cuadro con flecha) → **Agregar a pantalla de inicio** → **Agregar**.
3. Abre «Mi Francés» desde el ícono. Así funciona a pantalla completa y sin conexión, y tus datos quedan mejor protegidos.
4. **Sonido:** el iPhone en **modo silencio** también silencia la voz de la app. Quita el modo silencio y sube el volumen.
5. **Voz francesa:** en *Ajustes → Accesibilidad → Contenido leído → Voces → Francés*, descarga una voz «mejorada» (por ejemplo, Thomas o Amélie). Sin ella, la app funciona pero sin audio.
6. La primera vez, haz el **diagnóstico** (unos 5 min). Después, cada día, toca **Empezar**.

> El progreso que hagas en una pestaña de Safari y el de la app instalada se guardan **por separado**. Usa siempre la app instalada; si ya avanzaste en Safari, exporta un respaldo e impórtalo en la app.

## 2. Usarla en la computadora

Abre el mismo enlace en Chrome, Edge o Safari. En Chrome o Edge puedes instalarla con el ícono de «Instalar» de la barra de direcciones. Atajo: **Enter** comprueba la respuesta y pasa a la siguiente.

## 3. Tu sesión diaria (15–20 min, ajustable)

| Bloque | Qué haces | Por qué (informe) |
|---|---|---|
| 1. Rescate y repaso | Recuperas las palabras que el algoritmo programó para hoy, empezando por las más olvidadas. Nunca ves la respuesta primero; si te bloqueas, pides pistas en 4 escalones. | Efecto del test; nueva teoría del desuso |
| 2. Palabras nuevas (máx. 5–7) | Escuchas, ves la IPA, la escena memorable y 5 s de visualización; la colocas en un casillero. | Codificación dual, palabra clave + recuperación |
| 3. Práctica | Arrastras imágenes, ordenas frases, escuchas y recuperas sin pistas. | Generación, intercalado |
| 4. Escucha y conversación | Repites en voz alta, haces un diálogo guiado y escribes una frase tuya. | Cuatro ejes de Nation |
| 5. Cierre | Ves cuándo vuelve cada palabra. | — |

Con **5 minutos** haces una sesión breve (casi solo repaso). Si cierras la app a la mitad, al volver te ofrece **continuar exactamente donde te quedaste**.

## 4. Guardar, recuperar y respaldar tu progreso

- Todo se guarda **automáticamente en el dispositivo** después de cada respuesta (IndexedDB). No hay cuentas ni nube.
- **Respaldo:** *Ajustes → Tus datos → Exportar respaldo*. En iPhone elige **Guardar en Archivos** (o envíatelo por correo). Hazlo **cada semana**; la app te lo recuerda.
- **Restaurar o pasar a otro dispositivo:** *Ajustes → Importar respaldo* y elige el archivo `.json`. Reemplaza los datos del dispositivo (pide confirmación).
- **Limitación:** no hay sincronización automática entre iPhone y computadora. Elige un dispositivo principal y usa el respaldo para mover tu avance.

## 5. Qué hace y qué no hace

**Hace:** diagnóstico inicial; Unidad 1 (A1) con 50 palabras y expresiones revisadas, en 6 lecciones; audio con la voz del dispositivo; IPA coloreada (nasales en azul y vocales redondeadas en ámbar); escenas mnemotécnicas (directas para los cognados y absurdas solo para las palabras difíciles); asociaciones y fotos propias; casilleros mentales con alas por género, taller de verbos y escalera de números; recorrido mental; 4 tipos de recuperación más relacionar, ordenar, escuchar, hablar, diálogos y escritura libre; FSRS-6 con calificación automática; protocolo de rescate y detección de palabras «sanguijuela»; progreso por memoria real; racha con día de descanso; logros; respaldo.

**No hace (todavía):**
- **No evalúa tu pronunciación.** La transcripción del navegador dice qué entendió el reconocedor; no es un análisis fonético. En la app instalada en iPhone ni siquiera hay transcripción (limitación de Apple); allí te grabas y te comparas con el modelo.
- El audio es **síntesis de tu dispositivo**, no grabaciones de nativos.
- Contenido: por ahora solo A1-Unidad 1. Las unidades 2–7 (A1–B2) están en la ruta, con sus objetivos, pero aún sin contenido.
- No otorga certificaciones; los niveles son una estimación alineada con el MCER.

## 6. Funciones opcionales que requieren cuentas

| Función | Qué necesitas | Coste aproximado |
|---|---|---|
| Tutor de conversación con IA | Clave de API de Anthropic (se paga aparte de claude.ai) + servidor gratuito en Cloudflare | ~US$1–5/mes con 20 min diarios |
| Voz neural de Azure | Recurso «Speech» de Azure | Gratis hasta 0.5 M caracteres/mes |

Instrucciones paso a paso: [`server/README.md`](server/README.md). Las claves viven solo en ese servidor, nunca en la app ni en este repositorio.

## 7. Para desarrollar

Requisitos: Node 22+.

```bash
npm install
npm run dev        # servidor local en http://localhost:5173
npm test           # 26 pruebas unitarias del motor (vitest)
npm run build      # genera la app en dist/
npm run e2e        # 61 comprobaciones en Chromium con pantalla de iPhone (requiere build)
```

Para probar en el iPhone durante el desarrollo: `npm run dev -- --host` y abre la IP de tu computadora desde el iPhone (misma red Wi-Fi).

### Publicación

Cada cambio que llega a la rama `main` se compila, se prueba y se publica automáticamente en GitHub Pages (`.github/workflows/publicar.yml`, rama `gh-pages`). La app se actualiza sola en tus dispositivos la siguiente vez que la abres con conexión.
