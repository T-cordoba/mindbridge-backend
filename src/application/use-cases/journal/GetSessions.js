class GetSessions {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async execute({ userId }) {
    return this.sessionRepository.findByUserId(userId);
  }
}

module.exports = GetSessions;
