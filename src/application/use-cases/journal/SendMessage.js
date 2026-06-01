const { sanitizeAnimo } = require('../../../domain/value-objects/Emotion');
const { isCrisis, clamp } = require('../../../domain/value-objects/AlertLevel');

const MAX_MESSAGE_LENGTH = 600;
const SUMMARY_MIN_MESSAGES = 6;

class SendMessage {
  constructor(sessionRepository, messageRepository, aiService) {
    this.sessionRepository = sessionRepository;
    this.messageRepository = messageRepository;
    this.aiService = aiService;
  }

  _buildPriorContext(summary, moodData) {
    let ctx = `[PRIOR SESSION CONTEXT]: ${summary}`;
    if (Array.isArray(moodData) && moodData.length > 0) {
      const stateStr = moodData.map(([e, i]) => `${e}: ${i}`).join(', ');
      ctx += `\n[PRIOR EMOTIONAL STATE]: ${stateStr}`;
    }
    return ctx;
  }

  async _fetchPriorContext(userId, sessionId) {
    try {
      const priorSession = await this.sessionRepository.findLastCompletedByUserId(userId, sessionId);
      if (!priorSession?.summary) return null;
      const priorMessages = await this.messageRepository.findBySessionId(priorSession.id);
      const lastAssistant = [...priorMessages].reverse().find((m) => m.role === 'assistant');
      return this._buildPriorContext(priorSession.summary, lastAssistant?.moodData);
    } catch (err) {
      console.error('[SendMessage] Failed to fetch prior context:', err.message);
      return null;
    }
  }

  _generateSummaryAsync(sessionId, messages) {
    this.aiService.generateSummary(messages)
      .then((summary) => this.sessionRepository.update(sessionId, { summary }))
      .catch((err) => console.error('[SendMessage] Background summary failed:', err.message));
  }

  async execute({ sessionId, userId, content }) {
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

    const aiResponse = await this.aiService.chat({ messages: allMessages, userInput: content, currentAnimo, priorContext });

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
      this._generateSummaryAsync(sessionId, [...allMessages, userMessage, assistantMessage]);
    }

    let generatedTitle;
    if (isFirstMessage) {
      try {
        const title = await this.aiService.generateTitle(content);
        if (title) { await this.sessionRepository.update(sessionId, { title }); generatedTitle = title; }
      } catch (err) {
        console.error('[SendMessage] Title generation failed:', err.message);
      }
    }

    return { userMessage, assistantMessage, alertLevel, isBlocked: blocked, ...(generatedTitle ? { generatedTitle } : {}) };
  }

  async executeStream({ sessionId, userId, content, onReasoning, onText, signal }) {
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

    const aiResponse = await this.aiService.chatStream({
      messages: allMessages, userInput: content, currentAnimo, priorContext, onReasoning, onText, signal,
    });

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
      this._generateSummaryAsync(sessionId, [...allMessages, userMessage, assistantMessage]);
    }

    let generatedTitle;
    if (isFirstMessage) {
      try {
        const title = await this.aiService.generateTitle(content);
        if (title) { await this.sessionRepository.update(sessionId, { title }); generatedTitle = title; }
      } catch (err) {
        console.error('[SendMessage] Title generation failed:', err.message);
      }
    }

    return { userMessage, assistantMessage, alertLevel, isBlocked: blocked, ...(generatedTitle ? { generatedTitle } : {}) };
  }
}

module.exports = SendMessage;
