# Servidor intermedio opcional (tutor de IA y voz neural)

La app funciona completa sin esto. Este pequeño servidor (un *Cloudflare Worker*, plan gratuito) sirve solo para:

- **Tutor de conversación con IA** (Claude, de Anthropic).
- **Voz neural francesa** (Azure AI Speech), en lugar de la voz del dispositivo.

Las claves se guardan como **secretos del servidor**. La app nunca las ve ni las guarda.

## Antes de empezar: qué cuentas necesitas

1. **Cloudflare** (gratis): https://dash.cloudflare.com/sign-up
2. **Anthropic API** (de pago por uso; tu suscripción a claude.ai **no** la incluye): https://console.anthropic.com → *API Keys* → crea una clave y carga saldo (US$5 alcanzan para meses de uso personal).
3. *(Opcional)* **Azure AI Speech**: https://portal.azure.com → crea un recurso «Speech» (nivel gratuito F0) → copia la *Key* y la *Region*.

## Pasos (unos 15 minutos)

Desde una computadora con Node 22+:

```bash
cd server
npm install
npx wrangler login                          # abre el navegador para entrar a Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY    # pega tu clave de Anthropic
npx wrangler secret put APP_TOKEN            # inventa una contraseña larga (la pondrás en la app)
npx wrangler secret put AZURE_SPEECH_KEY     # opcional
npx wrangler deploy
```

`deploy` te muestra una dirección como `https://mi-frances-proxy.TU-USUARIO.workers.dev`.

En la app: **Ajustes → Servicios externos**. Pega esa dirección y la contraseña (`APP_TOKEN`), toca **Guardar** y luego **Probar conexión**.

Si usas Azure, revisa también `AZURE_REGION` en `wrangler.toml` (por ejemplo `eastus` o `southcentralus`). Luego, en la app, elige *Fuente de audio → Voz neural*.

## Configuración (`wrangler.toml`)

| Variable | Para qué |
|---|---|
| `ALLOWED_ORIGIN` | Sitio autorizado a usar el servidor (tu GitHub Pages). |
| `MODEL` | Modelo del tutor. Por defecto `claude-opus-5-5` (el más capaz; esfuerzo bajo para conversar). Para gastar menos: `claude-haiku-5-5`. |
| `AZURE_REGION`, `AZURE_VOICE` | Región de tu recurso de Azure y voz francesa (`fr-FR-DeniseNeural` o `fr-FR-HenriNeural`). |

El tutor usa el **respaldo automático** de la API ante rechazos (`fallbacks: "default"`): si el modelo declina un mensaje, la API lo reintenta en otro modelo recomendado.

## Costes orientativos (uso personal, 20 min/día)

- **Tutor con `claude-opus-5-5`:** unos 30 diálogos/mes de ~6 turnos ≈ 0.4 M tokens de entrada y 40 k de salida ≈ **US$2–3/mes**. Con `claude-haiku-5-5`: centavos.
- **Azure TTS:** gratis hasta 0.5 M caracteres/mes. La app guarda cada audio en caché y no lo vuelve a pedir.
- **Cloudflare Workers:** gratis hasta 100 000 solicitudes diarias.

Precios verificados en octubre de 2026; consulta las páginas oficiales antes de contratar.

## Limitaciones

- La evaluación fonética de Azure (*Pronunciation Assessment*) existe para fr-FR, pero sin prosodia ni nombres de fonema IPA (solo en inglés). Aún no está integrada; es la siguiente mejora natural (ruta `/pron`).
- No se probó contra las API reales desde el entorno de desarrollo (no había claves). Sí se comprobaron el enrutamiento, la contraseña y los mensajes de «no configurado».
