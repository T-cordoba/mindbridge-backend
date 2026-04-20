const { sanitizeAnimo } = require('../../../domain/value-objects/Emotion');
const { isCrisis, clamp } = require('../../../domain/value-objects/AlertLevel');

const MAX_MESSAGE_LENGTH = 600;
const COMPRESSION_THRESHOLD = parseInt(process.env.COMPRESSION_THRESHOLD || '20', 10);
const CONTEXT_WINDOW = parseInt(process.env.CONTEXT_WINDOW || '10', 10);

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
    const recentMessages = allMessages.slice(-CONTEXT_WINDOW);

    const lastAssistantMsg = [...allMessages].reverse().find((m) => m.role === 'assistant');
    const currentAnimo = lastAssistantMsg?.moodData ?? null;

    const aiResponse = await this.aiService.chat({
      summary: session.summary,
      messages: recentMessages,
      userInput: content,
      currentAnimo,
    });

    const alertLevel = clamp(aiResponse.alerta ?? 0);
    const moodData = sanitizeAnimo(aiResponse.animo);
    const responseText = aiResponse.respuesta;

    const userMessage = await this.messageRepository.create({
      sessionId,
      role: 'user',
      content,
      moodData: null,
      alertLevel: 0,
    });

    const assistantMessage = await this.messageRepository.create({
      sessionId,
      role: 'assistant',
      content: responseText,
      moodData,
      alertLevel,
    });

    const newCount = allMessages.length + 2;
    const maxAlert = Math.max(session.maxAlertLevel || 0, alertLevel);
    const blocked = isCrisis(alertLevel);

    await this.sessionRepository.update(sessionId, {
      messageCount: newCount,
      maxAlertLevel: maxAlert,
      isBlocked: blocked,
    });

    // Trigger async compression without blocking response
    const needsCompression = newCount > COMPRESSION_THRESHOLD && !session.summary && allMessages.length >= CONTEXT_WINDOW;
    if (needsCompression) {
      const oldMessages = allMessages.slice(0, -CONTEXT_WINDOW);
      setImmediate(() => this._compressContext(sessionId, oldMessages));
    }

    let generatedTitle;
    if (isFirstMessage) {
      try {
        const title = await this.aiService.generateTitle(content);
        if (title) {
          await this.sessionRepository.update(sessionId, { title });
          generatedTitle = title;
        }
      } catch (err) {
        console.error('[SendMessage] Title generation failed:', err.message);
      }
    }

    return { userMessage, assistantMessage, alertLevel, isBlocked: blocked, ...(generatedTitle ? { generatedTitle } : {}) };
  }

  async _compressContext(sessionId, oldMessages) {
    try {
      const summary = await this.aiService.summarize(oldMessages);
      await this.sessionRepository.update(sessionId, { summary });
    } catch (err) {
      console.error('[SendMessage] Context compression failed:', err.message);
    }
  }
}

module.exports = SendMessage;
