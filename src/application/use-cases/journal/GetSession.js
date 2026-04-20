class GetSession {
  constructor(sessionRepository, messageRepository) {
    this.sessionRepository = sessionRepository;
    this.messageRepository = messageRepository;
  }

  async execute({ sessionId, userId }) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');

    const messages = await this.messageRepository.findBySessionId(sessionId);
    return { session, messages };
  }
}

module.exports = GetSession;
