class CreateSession {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async execute({ userId, title }) {
    const session = await this.sessionRepository.create({
      userId,
      title: title || 'Nueva sesión',
    });
    return session;
  }
}

module.exports = CreateSession;
