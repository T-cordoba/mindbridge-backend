class GetSessions {
  constructor(sessionRepository) {
    this.sessionRepository = sessionRepository;
  }

  async execute({ userId, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const { sessions, total } = await this.sessionRepository.findByUserId(userId, { limit, offset });
    return {
      sessions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

module.exports = GetSessions;
