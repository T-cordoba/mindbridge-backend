const IMessageRepository = require('../../../domain/repositories/IMessageRepository');
const Message = require('../../../domain/entities/Message');

class PostgresMessageRepository extends IMessageRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _map(row) {
    if (!row) return null;
    return new Message({
      id: row.id,
      sessionId: row.session_id,
      role: row.role,
      content: row.content,
      moodData: row.mood_data,
      alertLevel: row.alert_level,
      createdAt: row.created_at,
    });
  }

  async findBySessionId(sessionId) {
    const { rows } = await this.pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return rows.map((r) => this._map(r));
  }

  async findRecentBySessionId(sessionId, limit = 10) {
    const { rows } = await this.pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2',
      [sessionId, limit]
    );
    return rows.reverse().map((r) => this._map(r));
  }

  async findAssistantMessagesSince(sessionIds, since) {
    if (!sessionIds.length) return [];
    const placeholders = sessionIds.map((_, i) => `$${i + 2}`).join(', ');
    const { rows } = await this.pool.query(
      `SELECT * FROM messages
       WHERE session_id IN (${placeholders})
         AND role = 'assistant'
         AND created_at >= $1
       ORDER BY created_at ASC`,
      [since, ...sessionIds]
    );
    return rows.map((r) => this._map(r));
  }

  async create({ sessionId, role, content, moodData, alertLevel }) {
    const { rows } = await this.pool.query(
      `INSERT INTO messages (session_id, role, content, mood_data, alert_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, role, content, moodData ? JSON.stringify(moodData) : null, alertLevel || 0]
    );
    return this._map(rows[0]);
  }

  async deleteBySessionId(sessionId) {
    await this.pool.query('DELETE FROM messages WHERE session_id = $1', [sessionId]);
  }
}

module.exports = PostgresMessageRepository;
