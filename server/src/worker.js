// Servidor intermedio OPCIONAL de MI FRANCÉS (Cloudflare Worker, plan gratuito).
// Rutas:
//   POST /tutor  → tutor de conversación con Claude (requiere ANTHROPIC_API_KEY).
//   POST /tts    → voz neural francesa de Azure (requiere AZURE_SPEECH_KEY).
//   GET  /health → indica qué servicios están configurados (sin revelar claves).
// Las claves son secretos del Worker: nunca llegan al navegador ni al repositorio.
import Anthropic from '@anthropic-ai/sdk';

const json = (data, status, cors) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });

function corsHeaders(env, request) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed = (env.ALLOWED_ORIGIN ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed[0] ?? '',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token',
    Vary: 'Origin'
  };
}

function tutorSystem({ level, knownWords, targetWords, situation }) {
  return [
    'Eres un tutor de francés paciente y cálido para un adulto hispanohablante de México (abogado).',
    `Nivel del estudiante: ${level || 'A1 inicial'}. Usa frases cortas y francés estándar de Francia.`,
    'Habla principalmente en francés. Usa SOLO vocabulario de la lista de palabras conocidas, más palabras gramaticales básicas (articles, pronoms, être, avoir). Si necesitas otra palabra, añade su traducción entre paréntesis en español.',
    `Palabras conocidas: ${(knownWords ?? []).join(', ') || '(pocas aún)'}.`,
    targetWords?.length ? `Palabras objetivo de hoy: ${targetWords.join(', ')}. Formula preguntas que obliguen al estudiante a usarlas.` : '',
    situation ? `Situación del juego de rol: ${situation}` : 'Propón una situación cotidiana sencilla.',
    'Formato de cada respuesta (texto plano, sin Markdown):',
    'Línea 1: tu respuesta en francés (1–2 frases) terminando con una pregunta para seguir la conversación.',
    'Si el estudiante cometió un error, añade una línea que empiece con «Corrección:» con la forma correcta y una explicación muy breve en español. Corrige solo lo importante, en tono constructivo.',
    'Si el estudiante escribe en español o pide ayuda, añade una línea que empiece con «Ayuda:» en español.',
    'No evalúes la pronunciación: solo ves texto.'
  ].filter(Boolean).join('\n');
}

async function handleTutor(request, env, cors) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'El tutor no está configurado (falta ANTHROPIC_API_KEY).' }, 501, cors);
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 40) {
    return json({ error: 'Solicitud inválida.' }, 400, cors);
  }
  const messages = body.messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) }));

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  try {
    const response = await client.beta.messages.create({
      model: env.MODEL || 'claude-opus-5-5',
      max_tokens: 2000,
      // Conversación breve: esfuerzo bajo = respuestas rápidas y baratas.
      output_config: { effort: 'low' },
      // Si el modelo rechaza la petición, el servidor la reintenta en el modelo de respaldo recomendado.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: tutorSystem(body),
      messages
    });
    if (response.stop_reason === 'refusal') {
      return json({ error: 'El tutor no pudo responder a ese mensaje. Prueba a reformularlo.' }, 200, cors);
    }
    const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return json({ text, usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } }, 200, cors);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return json({ error: 'Clave de API inválida.' }, 502, cors);
    if (error instanceof Anthropic.RateLimitError) return json({ error: 'Demasiadas solicitudes; espera un momento.' }, 429, cors);
    if (error instanceof Anthropic.APIError) return json({ error: `Error del servicio de IA (${error.status}).` }, 502, cors);
    return json({ error: 'No se pudo contactar al servicio de IA.' }, 502, cors);
  }
}

const escapeXml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

async function handleTts(request, env, cors) {
  if (!env.AZURE_SPEECH_KEY) return json({ error: 'La voz neural no está configurada (falta AZURE_SPEECH_KEY).' }, 501, cors);
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === 'string' ? body.text.slice(0, 400) : '';
  if (!text) return json({ error: 'Texto vacío.' }, 400, cors);
  const rate = Math.round(((Number(body.rate) || 1) - 1) * 100);
  const ssml = `<speak version="1.0" xml:lang="fr-FR"><voice name="${env.AZURE_VOICE || 'fr-FR-DeniseNeural'}"><prosody rate="${rate}%">${escapeXml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${env.AZURE_REGION || 'eastus'}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': env.AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'mi-frances-proxy'
    },
    body: ssml
  });
  if (!res.ok) return json({ error: `Azure TTS respondió ${res.status}.` }, 502, cors);
  return new Response(res.body, { status: 200, headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000', ...cors } });
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(env, request);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const { pathname } = new URL(request.url);
    if (pathname === '/health') {
      return json({ tutor: !!env.ANTHROPIC_API_KEY, tts: !!env.AZURE_SPEECH_KEY, model: env.MODEL || 'claude-opus-5-5' }, 200, cors);
    }
    // Contraseña compartida para que nadie más gaste tu saldo.
    if (env.APP_TOKEN && request.headers.get('X-App-Token') !== env.APP_TOKEN) return json({ error: 'Token de la app incorrecto.' }, 401, cors);
    if (request.method === 'POST' && pathname === '/tutor') return handleTutor(request, env, cors);
    if (request.method === 'POST' && pathname === '/tts') return handleTts(request, env, cors);
    return json({ error: 'Ruta no encontrada.' }, 404, cors);
  }
};
