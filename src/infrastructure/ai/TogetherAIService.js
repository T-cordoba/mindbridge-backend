const { SYSTEM_PROMPT, COMPRESSION_PROMPT } = require('./prompts');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const LOG_CONTENT_PREVIEW = 220;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function truncateText(value, maxLength = LOG_CONTENT_PREVIEW) {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function cleanRequestPayload(payload) {
  return {
    model: payload.model,
    max_tokens: payload.max_tokens,
    temperature: payload.temperature,
    response_format: payload.response_format,
    messages: Array.isArray(payload.messages)
      ? payload.messages.map((message, index) => ({
          index,
          role: message.role,
          content: truncateText(message.content),
        }))
      : [],
  };
}

function cleanApiResponse(status, ok, rawBody) {
  const parsed = safeJsonParse(rawBody);
  if (!parsed) {
    return {
      status,
      ok,
      body: truncateText(rawBody, 500),
    };
  }

  return {
    status,
    ok,
    id: parsed.id,
    model: parsed.model,
    usage: parsed.usage,
    choices: Array.isArray(parsed.choices)
      ? parsed.choices.map((choice, index) => ({
          index,
          finish_reason: choice.finish_reason,
          role: choice.message?.role,
          content: truncateText(choice.message?.content),
        }))
      : [],
  };
}

class TogetherAIService {
  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY;
    this.model = process.env.TOGETHER_MODEL || 'openai/gpt-oss-20b';
    this.baseUrl = 'https://api.together.xyz/v1/chat/completions';
  }

  async _request(messages, options = {}, attempt = 1) {
    const payload = {
      model: this.model,
      messages,
      max_tokens: options.maxTokens || 350,
      temperature: options.temperature || 0.7,
      response_format: options.jsonMode ? { type: 'json_object' } : undefined,
    };

    console.log('[AI] Peticion del back:', JSON.stringify({
      attempt,
      jsonMode: !!options.jsonMode,
      payload: cleanRequestPayload(payload),
    }, null, 2));

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    console.log('[AI] Respuesta de la api:', JSON.stringify(cleanApiResponse(response.status, response.ok, rawBody), null, 2));

    if (!response.ok) {
      // Retry on 503/429
      if ((response.status === 503 || response.status === 429) && attempt <= MAX_RETRIES) {
        console.log(`[AI] Retrying in ${RETRY_DELAY_MS}ms (status ${response.status})...`);
        await sleep(RETRY_DELAY_MS * attempt);
        return this._request(messages, options, attempt + 1);
      }
      throw new Error(`Together AI API error ${response.status}: ${rawBody}`);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`Together AI returned non-JSON response: ${rawBody}`);
    }

    const content = data.choices?.[0]?.message?.content;
    const finishReason = data.choices?.[0]?.finish_reason;

    if (finishReason === 'length') {
      console.warn('[AI] finish_reason=length — model ran out of tokens during reasoning. Increase max_tokens.');
    }

    if (content == null || content === '') {
      throw new Error(`Together AI response has empty content (finish_reason=${finishReason}): ${rawBody}`);
    }
    return content;
  }

  _buildMessages(summary, history, userInput, currentAnimo) {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (summary) {
      messages.push({
        role: 'system',
        content: `[CONVERSATION SUMMARY]: ${summary}`,
      });
    }

    if (currentAnimo && currentAnimo.length > 0) {
      const animoStr = currentAnimo.map(([e, i]) => `${e}: ${i}`).join(', ');
      messages.push({
        role: 'system',
        content: `[CURRENT EMOTIONAL PORTRAIT]: ${animoStr}. This is the exact emotional baseline from the previous exchange. You MUST apply emotional inertia from these values — shift each emotion by ±2 maximum per exchange unless the user makes an explicit, dramatic emotional statement. Do not reset emotions that are not explicitly resolved.`,
      });
    }

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userInput });
    return messages;
  }

  _parseChat(raw) {
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }

    if (!parsed.respuesta || typeof parsed.respuesta !== 'string') return null;

    const isCrisis = parsed.respuesta.trim() === 'CRISIS_DETECTED';
    const isPlaceholder = !isCrisis && parsed.respuesta.trim().length < 10;
    if (isPlaceholder) return null;

    return {
      respuesta: parsed.respuesta,
      animo: Array.isArray(parsed.animo) ? parsed.animo : [['unknown', 0]],
      alerta: typeof parsed.alerta === 'number' ? parsed.alerta : 0,
    };
  }

  async chat({ summary, messages, userInput, currentAnimo }) {
    const builtMessages = this._buildMessages(summary, messages, userInput, currentAnimo);
    const MAX_CHAT_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_CHAT_ATTEMPTS; attempt++) {
      const raw = await this._request(builtMessages, { jsonMode: true, maxTokens: 1500 });
      const result = this._parseChat(raw);

      if (result) return result;

      console.warn(`[AI] chat() attempt ${attempt} produced an invalid or placeholder response — ${attempt < MAX_CHAT_ATTEMPTS ? 'retrying' : 'using safe fallback'}`);
      if (attempt < MAX_CHAT_ATTEMPTS) await sleep(1000 * attempt);
    }

    // All retries exhausted — return a safe hardcoded response so the user is never left stranded
    console.error('[AI] All chat() attempts failed. Returning safe fallback response.');
    return {
      respuesta: 'Estoy aquí contigo y lo que describes suena muy serio. No tienes que enfrentar esto solo/a — hay personas preparadas para ayudarte de verdad. En la sección "Red de apoyo" en la barra de navegación superior puedes encontrar contacto con profesionales de salud mental. ¿Puedes contarme un poco más sobre cómo te sientes ahora mismo?',
      animo: [['fear', 6], ['sadness', 6], ['anxiety', 5]],
      alerta: 4,
    };
  }

  async generateTitle(userContent) {
    const prompt = `Genera un título breve (máximo 5 palabras) en español que resuma el tema principal de este mensaje de diario emocional. Responde solo con el título, sin comillas ni puntuación extra.\n\nMensaje del usuario: "${userContent}"`;
    const messages = [{ role: 'user', content: prompt }];
    const title = await this._request(messages, { jsonMode: false, maxTokens: 1000, temperature: 0.7 });
    return title.trim();
  }

  async summarize(messages) {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const builtMessages = [
      { role: 'system', content: 'You are a clinical summarization assistant. Be concise and factual.' },
      { role: 'user', content: `${COMPRESSION_PROMPT}\n\n${conversation}` },
    ];

    const summary = await this._request(builtMessages, { jsonMode: false, maxTokens: 800, temperature: 0.3 });
    return summary.trim();
  }
}

module.exports = TogetherAIService;
