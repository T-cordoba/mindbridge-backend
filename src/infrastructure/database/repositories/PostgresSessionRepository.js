const ISessionRepository = require('../../../domain/repositories/ISessionRepository');
const Session = require('../../../domain/entities/Session');

class PostgresSessionRepository extends ISessionRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _map(row) {
    if (!row) return null;
    return new Session({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      summary: row.summary,
      messageCount: row.message_count,
      maxAlertLevel: row.max_alert_level,
      isBlocked: row.is_blocked,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async findById(id) {
    const { rows } = await this.pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return this._map(rows[0]);
  }

  async findLastCompletedByUserId(userId, excludeSessionId) {
    const { rows } = await this.pool.query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND id != $2 AND message_count > 0
       ORDER BY updated_at DESC LIMIT 1`,
      [userId, excludeSessionId]
    );
    return this._map(rows[0]);
  }

  async findByUserId(userId, { limit = 10, offset = 0 } = {}) {
    const { rows: countRows } = await this.pool.query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countRows[0].count, 10);

    const { rows } = await this.pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return { sessions: rows.map((r) => this._map(r)), total };
  }

  async create({ userId, title }) {
    const { rows } = await this.pool.query(
      `INSERT INTO sessions (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, title || 'Nueva sesión']
    );
    return this._map(rows[0]);
  }

  async update(id, updates) {
    const fields = [];
    const values = [];
    let i = 1;
    if (updates.title !== undefined) { fields.push(`title = $${i++}`); values.push(updates.title); }
    if (updates.summary !== undefined) { fields.push(`summary = $${i++}`); values.push(updates.summary); }
    if (updates.messageCount !== undefined) { fields.push(`message_count = $${i++}`); values.push(updates.messageCount); }
    if (updates.maxAlertLevel !== undefined) { fields.push(`max_alert_level = $${i++}`); values.push(updates.maxAlertLevel); }
    if (updates.isBlocked !== undefined) { fields.push(`is_blocked = $${i++}`); values.push(updates.isBlocked); }
    if (!fields.length) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE sessions SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return this._map(rows[0]);
  }

  async delete(id) {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }
}

module.exports = PostgresSessionRepository;
