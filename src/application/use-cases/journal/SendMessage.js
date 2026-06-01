const { sanitizeAnimo } = require('../../../domain/value-objects/Emotion');
const { isCrisis, clamp } = require('../../../domain/value-objects/AlertLevel');

const MAX_MESSAGE_LENGTH = 600;

class SendMessage {
  constructor(sessionRepository, messageRepository, aiService) {
    this.sessionRepository = sessionRepository;
    this.messageRepository = messageRepository;
    this.aiService = aiService;
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

    const aiResponse = await this.aiService.chat({ messages: allMessages, userInput: content, currentAnimo });

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

    const aiResponse = await this.aiService.chatStream({
      messages: allMessages, userInput: content, currentAnimo, onReasoning, onText, signal,
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
