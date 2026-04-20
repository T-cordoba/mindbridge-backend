class UpdateSessionTitle {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async execute({ sessionId, userId, title }) {
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';

    if (!normalizedTitle) throw new Error('Session title cannot be empty');
    if (normalizedTitle.length > 200) {
      throw new Error('Session title exceeds maximum length of 200 characters');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');

    return this.sessionRepository.update(sessionId, { title: normalizedTitle });
  }
}

module.exports = UpdateSessionTitle;