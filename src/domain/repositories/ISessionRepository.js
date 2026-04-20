class ISessionRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByUserId(userId) { throw new Error('Not implemented'); }
  async create(sessionData) { throw new Error('Not implemented'); }
  async update(id, updates) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}

module.exports = ISessionRepository;
