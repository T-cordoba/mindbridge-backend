const IUserRepository = require('../../../domain/repositories/IUserRepository');
const User = require('../../../domain/entities/User');

class PostgresUserRepository extends IUserRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _map(row) {
    if (!row) return null;
    return new User({
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      name: row.name,
      disclaimerAccepted: row.disclaimer_accepted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id) {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return this._map(rows[0]);
  }

  async findByEmail(email) {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return this._map(rows[0]);
  }

  async create({ email, passwordHash, name, disclaimerAccepted }) {
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, password_hash, name, disclaimer_accepted)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [email, passwordHash, name || null, disclaimerAccepted]
    );
    return this._map(rows[0]);
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.disclaimerAccepted !== undefined) { fields.push(`disclaimer_accepted = $${i++}`); values.push(updates.disclaimerAccepted); }
    if (!fields.length) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return this._map(rows[0]);
  }

  async delete(id) {
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

module.exports = PostgresUserRepository;
