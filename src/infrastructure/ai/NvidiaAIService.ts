import { SYSTEM_PROMPT, COMPRESSION_PROMPT } from './prompts';

interface ChatMessage {
  role: string;
  content: string;
}

interface AIResponse {
  respuesta: string;
  animo: [string, number][];
  alerta: number;
}

interface ChatOptions {
  messages: Array<{ role: string; content: string; moodData?: [string, number][] | null }>;
  userInput: string;
  currentAnimo: [string, number][] | null;
  priorContext: string | null;
  alertHistory: number[];
}

interface StreamChatOptions extends ChatOptions {
  onReasoning: (chunk: string) => void;
  onText: (chunk: string) => void;
  signal?: AbortSignal;
}

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

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function stripCodeFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
}

function normalizeKeys(raw: string): string {
  return raw
    .replace(/"respuesta[^"]*"\s*:/g, '"respuesta":')
    .replace(/"animo[^"]*"\s*:/g, '"animo":')
    .replace(/"alerta[^"]*"\s*:/g, '"alerta":');
}

function truncateText(value: unknown, maxLength = LOG_PREVIEW): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

function applyEmotionalInertia(
  previousAnimo: [string, number][] | null,
  newAnimo: [string, number][]
): [string, number][] {
  if (!previousAnimo || previousAnimo.length === 0) return newAnimo;
  const prevMap = new Map(previousAnimo);
  return newAnimo.map(([emotion, intensity]) => {
    const prev = prevMap.get(emotion) ?? 0;
    const delta = intensity - prev;
    const clamped =
      Math.abs(delta) <= MAX_EMOTIONAL_DELTA
        ? intensity
        : prev + Math.sign(delta) * MAX_EMOTIONAL_DELTA;
    return [emotion, Math.round(Math.max(0, Math.min(10, clamped)))] as [string, number];
  });
}

class ResponseStreamer {
  private buf = '';
  private streaming = false;
  private escapeNext = false;
  private done = false;

  constructor(private onText: (text: string) => void) {}

  push(fragment: string): void {
    if (this.done) return;
    this.buf += fragment;
    this._flush();
  }

  private _flush(): void {
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

export class NvidiaAIService {
  private apiKey: string | undefined;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY;
    this.model = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2.6';
    this.baseUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
  }

  private async _request(messages: ChatMessage[], options: Record<string, unknown> = {}, attempt = 1): Promise<Record<string, unknown>> {
    const payload: Record<string, unknown> = {
      model: this.model,
      messages,
      temperature: (options.temperature as number) ?? 1.0,
      top_p: 1.0,
      chat_template_kwargs: { thinking: !options.noThinking },
      ...(options.tools ? { tools: options.tools, tool_choice: options.toolChoice } : {}),
    };

    console.log('[AI] Request:', JSON.stringify({
      attempt,
      model: payload.model,
      thinking: (payload.chat_template_kwargs as Record<string, unknown>).thinking,
      messages: (payload.messages as ChatMessage[]).map((m, i) => ({
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

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawBody);
    } catch {
      throw new Error(`NVIDIA API returned non-JSON: ${rawBody}`);
    }

    console.log('[AI] Response:', JSON.stringify({
      id: (data as Record<string, unknown>).id,
      model: (data as Record<string, unknown>).model,
      usage: (data as Record<string, unknown>).usage,
      finish_reason: ((data as Record<string, unknown>).choices as Array<Record<string, unknown>>)?.[0]?.finish_reason,
    }, null, 2));

    return data;
  }

  private _buildMessages(
    history: Array<{ role: string; content: string }>,
    userInput: string,
    currentAnimo: [string, number][] | null,
    priorContext: string | null,
    alertHistory: number[]
  ): ChatMessage[] {
    const messages: ChatMessage[] = [{ role: 'system', content: SYSTEM_PROMPT }];

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

    if (alertHistory && alertHistory.length > 0) {
      messages.push({
        role: 'system',
        content:
          `[ALERT HISTORY THIS SESSION]: ${alertHistory.join(', ')}. ` +
          `If the pattern shows sustained or escalating distress, progressively increase your warmth, concern, and encouragement toward professional support.`,
      });
    }

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userInput });
    return messages;
  }

  async chat({ messages, userInput, currentAnimo, priorContext, alertHistory }: ChatOptions): Promise<AIResponse> {
    const builtMessages = this._buildMessages(messages, userInput, currentAnimo, priorContext, alertHistory);
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const data = await this._request(builtMessages, {
          temperature: 1.0,
          tools: [CHAT_TOOL],
          toolChoice: { type: 'function', function: { name: 'generar_respuesta_emocional' } },
        });

        const choices = data.choices as Array<Record<string, unknown>>;
        const toolCall = (choices?.[0]?.message as Record<string, unknown>)?.tool_calls as Array<Record<string, unknown>>;
        if (!toolCall?.[0]) {
          console.warn(`[AI] chat() attempt ${attempt}: no tool_call in response`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(normalizeKeys((toolCall[0].function as Record<string, unknown>).arguments as string));
        } catch {
          console.warn(`[AI] chat() attempt ${attempt}: failed to parse tool arguments`);
          if (attempt < MAX_ATTEMPTS) { await sleep(1000 * attempt); continue; }
          break;
        }

        const { respuesta, animo, alerta } = parsed as { respuesta: string; animo: [string, number][]; alerta: number };

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

        const rawAnimo = Array.isArray(animo) ? animo : [['unknown', 0]] as [string, number][];
        return {
          respuesta,
          animo: applyEmotionalInertia(currentAnimo, rawAnimo),
          alerta: typeof alerta === 'number' ? alerta : 0,
        };
      } catch (err) {
        console.error(`[AI] chat() attempt ${attempt} error:`, (err as Error).message);
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

  async chatStream({ messages, userInput, currentAnimo, priorContext, alertHistory, onReasoning, onText, signal }: StreamChatOptions): Promise<AIResponse> {
    const builtMessages = this._buildMessages(messages, userInput, currentAnimo, priorContext, alertHistory);
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
        chat_template_kwargs: { thinking: false },
      }),
      signal: signal ?? AbortSignal.timeout(45_000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NVIDIA API stream error ${response.status}: ${body}`);
    }

    const reader = response.body!.getReader();
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
          const chunk = JSON.parse(raw) as Record<string, unknown>;
          const delta = (chunk.choices as Array<Record<string, unknown>>)?.[0]?.delta as Record<string, unknown>;
          if (delta?.reasoning_content) onReasoning(delta.reasoning_content as string);
          if (delta?.content) {
            fullContent += delta.content as string;
            streamer.push(delta.content as string);
          }
        } catch { /* partial SSE chunk, safe to skip */ }
      }
    }

    if (!fullContent) throw new Error('Stream ended with no content');

    let parsed: Record<string, unknown>;
    const cleaned = normalizeKeys(stripCodeFences(fullContent));
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(`Failed to parse stream response: ${fullContent.slice(0, 200)}`);
    }

    const rawAnimo = Array.isArray(parsed.animo) ? parsed.animo as [string, number][] : [['unknown', 0]] as [string, number][];
    return {
      respuesta: (parsed.respuesta as string) ?? '',
      animo: applyEmotionalInertia(currentAnimo, rawAnimo),
      alerta: typeof parsed.alerta === 'number' ? parsed.alerta : 0,
    };
  }

  async generateSummary(messages: Array<{ role: string; content: string }>): Promise<{ summary: string; title: string | null }> {
    const conversation = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'MindBridge'}: ${m.content}`)
      .join('\n');

    const requestMessages = [{
      role: 'user',
      content: `${COMPRESSION_PROMPT}\n\n${conversation}`,
    }];

    const data = await this._request(requestMessages, { temperature: 0.5, noThinking: true });
    const choices = data.choices as Array<Record<string, unknown>>;
    const raw = ((choices?.[0]?.message as Record<string, unknown>)?.content as string)?.trim();
    if (!raw) throw new Error('Empty summary response from NVIDIA API');

    try {
      const parsed = JSON.parse(stripCodeFences(raw)) as { summary?: string; title?: string };
      if (!parsed.summary) throw new Error('Missing summary field');
      return { summary: parsed.summary.trim(), title: parsed.title?.trim() || null };
    } catch {
      console.warn('[AI] generateSummary: response was not valid JSON, storing as plain text');
      return { summary: raw, title: null };
    }
  }

  async generateTitle(userContent: string, assistantContent = ''): Promise<string> {
    const context = assistantContent
      ? `Mensaje del usuario: "${userContent}"\nRespuesta del asistente: "${assistantContent.slice(0, 300)}"`
      : `Mensaje del usuario: "${userContent}"`;

    const messages = [{
      role: 'user',
      content:
        `Genera un título breve (máximo 5 palabras) en español que capture el tema emocional principal de este inicio de sesión de diario. ` +
        `Responde solo con el título, sin comillas ni puntuación extra.\n\n${context}`,
    }];

    const data = await this._request(messages, { temperature: 0.7, noThinking: true });
    const choices = data.choices as Array<Record<string, unknown>>;
    const content = (choices?.[0]?.message as Record<string, unknown>)?.content as string;
    if (!content) throw new Error('Empty title response from NVIDIA API');
    return content.trim().slice(0, 100);
  }
}

export default NvidiaAIService;
