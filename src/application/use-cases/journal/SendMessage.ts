import { sanitizeAnimo } from '../../../domain/value-objects/Emotion';
import { isCrisis, clamp } from '../../../domain/value-objects/AlertLevel';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { IMessageRepository } from '../../../domain/repositories/IMessageRepository';
import { NvidiaAIService } from '../../../infrastructure/ai/NvidiaAIService';
import { Message } from '../../../domain/entities/Message';
import { Session } from '../../../domain/entities/Session';

const MAX_MESSAGE_LENGTH = 4000;
const SUMMARY_MIN_MESSAGES = 6;

const CRISIS_PHRASES = [
  'suicid', 'hacerme daño', 'quitarme la vida',
  'quiero morir', 'quisiera morir', 'quiero morirme',
  'no quiero seguir viviendo', 'no quiero vivir más',
  'acabar con mi vida', 'terminar con mi vida',
  'quiero matarme', 'me quiero matar', 'voy a matarme',
];
const CRISIS_EXCLUSIONS = ['me muero de', 'morir de', 'morir del', 'de susto', 'de risa', 'de vergüenza'];

function isExplicitCrisis(text: string): boolean {
  const lower = text.toLowerCase();
  if (CRISIS_EXCLUSIONS.some((exc) => lower.includes(exc))) return false;
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}

const INSTANT_CRISIS_RESPONSE = {
  respuesta: 'CRISIS_DETECTED',
  animo: [['sadness', 10], ['emptiness', 10]] as [string, number][],
  alerta: 5,
};

interface SendMessageResult {
  userMessage: Message;
  assistantMessage: Message;
  alertLevel: number;
  isBlocked: boolean;
  generatedTitle?: string;
}

interface StreamResult extends SendMessageResult {
  summaryJob: Promise<{ summary: string; title: string | null }> | null;
}

export class SendMessage {
  constructor(
    private sessionRepository: ISessionRepository,
    private messageRepository: IMessageRepository,
    private aiService: NvidiaAIService
  ) {}

  private _buildPriorContext(summary: string, moodData: [string, number][] | null | undefined): string {
    let ctx = `[PRIOR SESSION CONTEXT]: ${summary}`;
    if (Array.isArray(moodData) && moodData.length > 0) {
      const stateStr = moodData.map(([e, i]) => `${e}: ${i}`).join(', ');
      ctx += `\n[PRIOR EMOTIONAL STATE]: ${stateStr}`;
    }
    return ctx;
  }

  private async _fetchPriorContext(userId: string, sessionId: string): Promise<string | null> {
    try {
      const priorSession = await this.sessionRepository.findLastCompletedByUserId(userId, sessionId);
      if (!priorSession?.summary) return null;
      const priorMessages = await this.messageRepository.findBySessionId(priorSession.id);
      const lastAssistant = [...priorMessages].reverse().find((m) => m.role === 'assistant');
      return this._buildPriorContext(priorSession.summary, lastAssistant?.moodData);
    } catch (err) {
      console.error('[SendMessage] Failed to fetch prior context:', (err as Error).message);
      return null;
    }
  }

  private _startSummaryJob(sessionId: string, messages: Message[]): Promise<{ summary: string; title: string | null }> {
    const promise = this.aiService.generateSummary(messages)
      .then(({ summary, title }) => {
        const updates: { summary: string; title?: string } = { summary };
        if (title) updates.title = title;
        return this.sessionRepository.update(sessionId, updates).then(() => ({ summary, title }));
      });
    promise.catch((err) => console.error('[SendMessage] Background summary failed:', (err as Error).message));
    return promise;
  }

  async execute({ sessionId, userId, content }: { sessionId: string; userId: string; content: string }): Promise<SendMessageResult> {
    if (!content || content.trim().length === 0) throw new Error('Message cannot be empty');
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');
    if (session.isBlocked) throw new Error('Session is locked due to crisis detection');
    const isFirstMessage = (session.messageCount ?? 0) === 0;

    const allMessages = await this.messageRepository.findBySessionId(sessionId);
    const lastAssistantMsg = [...allMessages].reverse().find((m) => m.role === 'assistant');
    const currentAnimo = lastAssistantMsg?.moodData ?? null;

    const priorContext = isFirstMessage ? await this._fetchPriorContext(userId, sessionId) : null;
    const alertHistory = allMessages
      .filter((m) => m.role === 'assistant' && m.alertLevel > 0)
      .slice(-6)
      .map((m) => m.alertLevel);

    const aiResponse = isExplicitCrisis(content)
      ? INSTANT_CRISIS_RESPONSE
      : await this.aiService.chat({ messages: allMessages, userInput: content, currentAnimo, priorContext, alertHistory });

    const alertLevel = clamp(aiResponse.alerta ?? 0);
    const moodData = sanitizeAnimo(aiResponse.animo);
    const responseText = aiResponse.respuesta;

    const userMessage = await this.messageRepository.create({
      sessionId, role: 'user', content, moodData: null, alertLevel: 0,
    });
    const assistantMessage = await this.messageRepository.create({
      sessionId, role: 'assistant', content: responseText, moodData, alertLevel,
    });

    const newCount = allMessages.length + 2;
    const maxAlert = Math.max(session.maxAlertLevel || 0, alertLevel);
    const blocked = isCrisis(alertLevel);

    await this.sessionRepository.update(sessionId, {
      messageCount: newCount, maxAlertLevel: maxAlert, isBlocked: blocked,
    });

    if (newCount >= SUMMARY_MIN_MESSAGES && !session.summary) {
      this._startSummaryJob(sessionId, [...allMessages, userMessage, assistantMessage]);
    }

    let generatedTitle: string | undefined;
    if (isFirstMessage) {
      try {
        const title = await this.aiService.generateTitle(content, responseText);
        if (title) { await this.sessionRepository.update(sessionId, { title }); generatedTitle = title; }
      } catch (err) {
        console.error('[SendMessage] Title generation failed:', (err as Error).message);
      }
    }

    return { userMessage, assistantMessage, alertLevel, isBlocked: blocked, ...(generatedTitle ? { generatedTitle } : {}) };
  }

  async executeStream({
    sessionId, userId, content, onReasoning, onText, signal,
  }: {
    sessionId: string;
    userId: string;
    content: string;
    onReasoning: (chunk: string) => void;
    onText: (chunk: string) => void;
    signal?: AbortSignal;
  }): Promise<StreamResult> {
    if (!content || content.trim().length === 0) throw new Error('Message cannot be empty');
    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');
    if (session.isBlocked) throw new Error('Session is locked due to crisis detection');
    const isFirstMessage = (session.messageCount ?? 0) === 0;

    const allMessages = await this.messageRepository.findBySessionId(sessionId);
    const lastAssistantMsg = [...allMessages].reverse().find((m) => m.role === 'assistant');
    const currentAnimo = lastAssistantMsg?.moodData ?? null;

    const priorContext = isFirstMessage ? await this._fetchPriorContext(userId, sessionId) : null;
    const alertHistory = allMessages
      .filter((m) => m.role === 'assistant' && m.alertLevel > 0)
      .slice(-6)
      .map((m) => m.alertLevel);

    console.log('[SendMessage] DB ready, starting AI stream', { isFirstMessage, historyLen: allMessages.length });
    let aiResponse;
    if (isExplicitCrisis(content)) {
      aiResponse = INSTANT_CRISIS_RESPONSE;
    } else {
      try {
        aiResponse = await this.aiService.chatStream({
          messages: allMessages, userInput: content, currentAnimo, priorContext, alertHistory, onReasoning, onText, signal,
        });
      } catch (streamErr) {
        console.warn('[SendMessage] Stream failed, falling back to chat():', (streamErr as Error).message);
        aiResponse = await this.aiService.chat({
          messages: allMessages, userInput: content, currentAnimo, priorContext, alertHistory,
        });
      }
    }
    console.log('[SendMessage] AI response complete', { alerta: aiResponse.alerta });

    const alertLevel = clamp(aiResponse.alerta ?? 0);
    const moodData = sanitizeAnimo(aiResponse.animo);
    const responseText = aiResponse.respuesta;

    const userMessage = await this.messageRepository.create({
      sessionId, role: 'user', content, moodData: null, alertLevel: 0,
    });
    const assistantMessage = await this.messageRepository.create({
      sessionId, role: 'assistant', content: responseText, moodData, alertLevel,
    });

    const newCount = allMessages.length + 2;
    const maxAlert = Math.max(session.maxAlertLevel || 0, alertLevel);
    const blocked = isCrisis(alertLevel);

    await this.sessionRepository.update(sessionId, {
      messageCount: newCount, maxAlertLevel: maxAlert, isBlocked: blocked,
    });

    const summaryJob = (newCount >= SUMMARY_MIN_MESSAGES && !session.summary)
      ? this._startSummaryJob(sessionId, [...allMessages, userMessage, assistantMessage])
      : null;

    let generatedTitle: string | undefined;
    if (isFirstMessage) {
      try {
        const title = await this.aiService.generateTitle(content, responseText);
        if (title) { await this.sessionRepository.update(sessionId, { title }); generatedTitle = title; }
      } catch (err) {
        console.error('[SendMessage] Title generation failed:', (err as Error).message);
      }
    }

    return { userMessage, assistantMessage, alertLevel, isBlocked: blocked, summaryJob, ...(generatedTitle ? { generatedTitle } : {}) };
  }
}

export default SendMessage;
