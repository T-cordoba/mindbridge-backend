/**
 * Interface contract for User persistence.
 * Concrete implementations live in infrastructure/database/repositories.
 */
class IUserRepository {
  async findById(id) { throw new Error('Not implemented'); }
  async findByEmail(email) { throw new Error('Not implemented'); }
  async create(userData) { throw new Error('Not implemented'); }
  async update(id, updates) { throw new Error('Not implemented'); }
  async delete(id) { throw new Error('Not implemented'); }
}

module.exports = IUserRepository;
