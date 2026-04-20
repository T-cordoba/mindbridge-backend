class DeleteSession {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async execute({ sessionId, userId }) {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');
    await this.sessionRepository.delete(sessionId);
  }
}

module.exports = DeleteSession;
