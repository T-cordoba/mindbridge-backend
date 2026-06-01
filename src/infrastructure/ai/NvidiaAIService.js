const { SYSTEM_PROMPT, COMPRESSION_PROMPT } = require('./prompts');

// Used by the non-streaming chat() fallback to enforce structured output
const CHAT_TOOL = {
  type: 'function',
  function: {
    name: 'generar_respuesta_emocional',
    description: 'Generate an empathetic emotional response and update the running emotional portrait.',
    parameters: {
      type: 'object',
      properties: {
        respuesta: {
          type: 'string',
          description: 'Empathetic response in Spanish. Set to exactly "CRISIS_DETECTED" (nothing else) when alerta = 5.',
        },
        animo: {
          type: 'array',
          description:
            'Running emotional portrait. Array of [emotion_key, intensity] pairs. ' +
            'Valid keys: joy, gratitude, calm, hope, love, pride, relief, sadness, anxiety, fear, ' +
            'anger, frustration, guilt, shame, loneliness, confusion, nostalgia, uncertainty, ' +
            'exhaustion, emptiness, unknown. intensity is 0–10. Only include emotions with intensity >= 2.',
          items: { type: 'array' },
        },
        alerta: {
          type: 'integer',
          minimum: 0,
          maximum: 5,
          description: '0=normal, 1=mild, 2=moderate, 3=elevated, 4=severe, 5=CRISIS (explicit self-harm/suicidal ideation only).',
        },
      },
      required: ['respuesta', 'animo', 'alerta'],
    },
  },
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const LOG_PREVIEW = 300;
const MAX_EMOTIONAL_DELTA = 2;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function truncateText(value, maxLength = LOG_PREVIEW) {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

function applyEmotionalInertia(previousAnimo, newAnimo) {
  if (!previousAnimo || previousAnimo.length === 0) return newAnimo;
  const prevMap = new Map(previousAnimo);
  return newAnimo.map(([emotion, intensity]) => {
    const prev = prevMap.get(emotion) ?? 0;
    const delta = intensity - prev;
    const clamped =
      Math.abs(delta) <= MAX_EMOTIONAL_DELTA
        ? intensity
        : prev + Math.sign(delta) * MAX_EMOTIONAL_DELTA;
    return [emotion, Math.round(Math.max(0, Math.min(10, clamped)))];
  });
}

// Scans streaming JSON content chunks and emits the value of "respuesta" progressively
class ResponseStreamer {
  constructor(onText) {
    this.onText = onText;
    this.buf = '';
    this.streaming = false;
    this.escapeNext = false;
    this.done = false;
  }

  push(fragment) {
    if (this.done) return;
    this.buf += fragment;
    this._flush();
  }

  _flush() {
    if (!this.streaming) {
      for (const pattern of ['"respuesta": "', '"respuesta":"']) {
        const idx = this.buf.indexOf(pattern);
        if (idx !== -1) {
          this.streaming = true;
          this.buf = this.buf.slice(idx + pattern.length);
          this.escapeNext = false;
          break;
        }
      }
      if (!this.streaming) {
        if (this.buf.length > 20) this.buf = this.buf.slice(-20);
        return;
      }
    }

    let out = '';
    let i = 0;
    while (i < this.buf.length) {
      const c = this.buf[i];
      if (this.escapeNext) {
        out += c === 'n' ? '\n' : c === 't' ? '\t' : c === 'r' ? '\r' : c;
        this.escapeNext = false;
      } else if (c === '\\') {
        this.escapeNext = true;
      } else if (c === '"') {
        if (out) this.onText(out);
        this.buf = this.buf.slice(i + 1);
        this.done = true;
        return;
      } else {
        out += c;
      }
      i++;
    }

    if (out) this.onText(out);
    this.buf = '';
  }
}

class NvidiaAIService {
  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY;
    this.model = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2.6';
    this.baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  }

  async _request(messages, options = {}, attempt = 1) {
    const payload = {
      model: this.model,
      messages,
      temperature: options.temperature ?? 1.0,
      top_p: 1.0,
      chat_template_kwargs: { thinking: !options.noThinking },
      ...(options.tools ? { tools: options.tools, tool_choice: options.toolChoice } : {}),
    };

    console.log('[AI] Request:', JSON.stringify({
      attempt,
      model: payload.model,
      thinking: payload.chat_template_kwargs.thinking,
      messages: payload.messages.map((m, i) => ({
        index: i,
        role: m.role,
        content: truncateText(typeof m.content === 'string' ? m.content : JSON.stringify(m.content)),
      })),
    }, null, 2));

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      if ((response.status === 503 || response.status === 429) && attempt <= MAX_RETRIES) {
        console.log(`[AI] Retrying in ${RETRY_DELAY_MS * attempt}ms (status ${response.status})...`);
        await sleep(RETRY_DELAY_MS * attempt);
        return this._request(messages, options, attempt + 1);
      }
      throw new Error(`NVIDIA API error ${response.status}: ${rawBody}`);
    }

    let data;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`NVIDIA API returned non-JSON: ${rawBody}`);
    }

    console.log('[AI] Response:', JSON.stringify({
      id: data.id,
      model: data.model,
      usage: data.usage,
      finish_reason: data.choices?.[0]?.finish_reason,
    }, null, 2));

    return data;
  }

  _buildMessages(history, userInput, currentAnimo, priorContext) {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (priorContext) {
      messages.push({ role: 'system', content: priorContext });
    }

    if (currentAnimo && currentAnimo.length > 0) {
      const animoStr = currentAnimo.map(([e, i]) => `${e}: ${i}`).join(', ');
      messages.push({
        role: 'system',
        content:
          `[CURRENT EMOTIONAL PORTRAIT]: ${animoStr}. ` +
          `Apply emotional inertia — max ±${MAX_EMOTIONAL_DELTA} per exchange unless ` +
          `the user makes a dramatic, explicit emotional statement.`,
      });
    }

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userInput });
    return messages;
  }

  // Non-streaming fallback — used for retries when stream fails
  async chat({ messages, userInput, currentAnimo, priorContext }) {
    const builtMessages = this._buildMessages(messages, userInput, currentAnimo, priorContext);
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await this._request(builtMessages, {
          temperature: 1.0,
          tools: [CHAT_TOOL],
          toolChoice: { type: 'function', function: { name: 'generar_respuesta_emocional' } },
        });

        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall) {
          console.warn(`[AI] chat() attempt ${attempt}: no tool_call in response`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        let parsed;
        try {
          parsed = JSON.parse(toolCall.function.arguments);
        } catch {
          console.warn(`[AI] chat() attempt ${attempt}: failed to parse tool arguments`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        const { respuesta, animo, alerta } = parsed;

        if (!respuesta || typeof respuesta !== 'string') {
          console.warn(`[AI] chat() attempt ${attempt}: missing respuesta`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        const isCrisis = respuesta.trim() === 'CRISIS_DETECTED';
        if (!isCrisis && respuesta.trim().length < 10) {
          console.warn(`[AI] chat() attempt ${attempt}: placeholder response`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        const rawAnimo = Array.isArray(animo) ? animo : [['unknown', 0]];
        return {
          respuesta,
          animo: applyEmotionalInertia(currentAnimo, rawAnimo),
          alerta: typeof alerta === 'number' ? alerta : 0,
        };
      } catch (err) {
        console.error(`[AI] chat() attempt ${attempt} error:`, err.message);
        if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
      }
    }

    console.error('[AI] All chat() attempts failed. Returning safe fallback.');
    return {
      respuesta: 'Estoy aquí contigo y lo que describes suena muy serio. No tienes que enfrentar esto solo/a — hay personas preparadas para ayudarte de verdad. En la sección "Red de apoyo" en la barra de navegación superior puedes encontrar contacto con profesionales de salud mental. ¿Puedes contarme un poco más sobre cómo te sientes ahora mismo?',
      animo: [['fear', 6], ['sadness', 6], ['anxiety', 5]],
      alerta: 4,
    };
  }

  // Streaming — native thinking via delta.reasoning_content, JSON response via delta.content
  async chatStream({ messages, userInput, currentAnimo, priorContext, onReasoning, onText, signal }) {
    const builtMessages = this._buildMessages(messages, userInput, currentAnimo, priorContext);
    const decoder = new TextDecoder();
    const streamer = new ResponseStreamer(onText);
    let fullContent = '';

    console.log('[AI] Stream request:', { model: this.model, messages: builtMessages.length });

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: this.model,
        messages: builtMessages,
        temperature: 1.0,
        top_p: 1.0,
        stream: true,
        chat_template_kwargs: { thinking: true },
      }),
      signal: signal ?? AbortSignal.timeout(180_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NVIDIA API stream error ${response.status}: ${body}`);
    }

    const reader = response.body.getReader();
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta;
          if (delta?.reasoning_content) onReasoning(delta.reasoning_content);
          if (delta?.content) {
            fullContent += delta.content;
            streamer.push(delta.content);
          }
        } catch { /* partial SSE chunk, safe to skip */ }
      }
    }

    if (!fullContent) throw new Error('Stream ended with no content');

    let parsed;
    try {
      parsed = JSON.parse(fullContent);
    } catch {
      throw new Error(`Failed to parse stream response: ${fullContent.slice(0, 200)}`);
    }

    const rawAnimo = Array.isArray(parsed.animo) ? parsed.animo : [['unknown', 0]];
    return {
      respuesta: parsed.respuesta ?? '',
      animo: applyEmotionalInertia(currentAnimo, rawAnimo),
      alerta: typeof parsed.alerta === 'number' ? parsed.alerta : 0,
    };
  }

  async generateSummary(messages) {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'MindBridge'}: ${m.content}`)
      .join('\n');

    const requestMessages = [{
      role: 'user',
      content: `${COMPRESSION_PROMPT}\n\n${conversation}`,
    }];

    const data = await this._request(requestMessages, { temperature: 0.5, noThinking: true });
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty summary response from NVIDIA API');
    return content.trim();
  }

  async generateTitle(userContent) {
    const messages = [{
      role: 'user',
      content:
        `Genera un título breve (máximo 5 palabras) en español que resuma el tema principal de este mensaje de diario emocional. ` +
        `Responde solo con el título, sin comillas ni puntuación extra.\n\nMensaje del usuario: "${userContent}"`,
    }];

    const data = await this._request(messages, { temperature: 0.7, noThinking: true });
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty title response from NVIDIA API');
    return content.trim();
  }
}

module.exports = NvidiaAIService;
