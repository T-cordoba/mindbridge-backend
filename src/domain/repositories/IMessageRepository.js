class IMessageRepository {
  async findBySessionId(sessionId) { throw new Error('Not implemented'); }
  async findRecentBySessionId(sessionId, limit) { throw new Error('Not implemented'); }
  async create(messageData) { throw new Error('Not implemented'); }
  async deleteBySessionId(sessionId) { throw new Error('Not implemented'); }
}

module.exports = IMessageRepository;
