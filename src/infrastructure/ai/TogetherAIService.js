const { SYSTEM_PROMPT, COMPRESSION_PROMPT } = require('./prompts');

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

    console.log(`[AI] Request attempt ${attempt} — ${messages.length} messages, jsonMode=${!!options.jsonMode}`);
    if (process.env.NODE_ENV === 'development') {
      console.log('[AI] Payload:', JSON.stringify(payload, null, 2));
    }

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    console.log(`[AI] Response status: ${response.status}`);
    console.log('[AI] Response body:', rawBody);

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

  _buildMessages(summary, history, userInput) {
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (summary) {
      messages.push({
        role: 'system',
        content: `[CONVERSATION SUMMARY]: ${summary}`,
      });
    }

    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content });
    }

    messages.push({ role: 'user', content: userInput });
    return messages;
  }

  async chat({ summary, messages, userInput }) {
    const builtMessages = this._buildMessages(summary, messages, userInput);
    const raw = await this._request(builtMessages, { jsonMode: true, maxTokens: 1500 });

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('[AI] Failed to parse JSON from model output:', raw);
      throw new Error('AI returned invalid JSON response');
    }

    if (!parsed.respuesta) {
      console.error('[AI] Missing "respuesta" field in parsed response:', parsed);
      throw new Error('AI response missing required "respuesta" field');
    }

    return {
      respuesta: parsed.respuesta,
      animo: Array.isArray(parsed.animo) ? parsed.animo : [['unknown', 0]],
      alerta: typeof parsed.alerta === 'number' ? parsed.alerta : 0,
    };
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
