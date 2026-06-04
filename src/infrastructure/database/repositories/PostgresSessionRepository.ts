import { Pool } from 'pg';
import { ISessionRepository, CreateSessionData, UpdateSessionData, PaginatedSessions } from '../../../domain/repositories/ISessionRepository';
import { Session } from '../../../domain/entities/Session';

export class PostgresSessionRepository extends ISessionRepository {
  constructor(private pool: Pool) {
    super();
  }

  private _map(row: Record<string, unknown> | null): Session | null {
    if (!row) return null;
    return new Session({
      id: row.id as string,
      userId: row.user_id as string,
      title: row.title as string,
      summary: row.summary as string | null,
      messageCount: row.message_count as number,
      maxAlertLevel: row.max_alert_level as number,
      isBlocked: row.is_blocked as boolean,
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }

  async findById(id: string): Promise<Session | null> {
    const { rows } = await this.pool.query('SELECT * FROM sessions WHERE id = $1', [id]);
    return this._map(rows[0] || null);
  }

  async findLastCompletedByUserId(userId: string, excludeSessionId: string): Promise<Session | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sessions
       WHERE user_id = $1 AND id != $2 AND message_count > 0
       ORDER BY updated_at DESC LIMIT 1`,
      [userId, excludeSessionId]
    );
    return this._map(rows[0] || null);
  }

  async findByUserId(userId: string, { limit = 10, offset = 0 } = {}): Promise<PaginatedSessions> {
    const { rows: countRows } = await this.pool.query(
      'SELECT COUNT(*) FROM sessions WHERE user_id = $1',
      [userId]
    );
    const total = parseInt(countRows[0].count as string, 10);

    const { rows } = await this.pool.query(
      'SELECT * FROM sessions WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return { sessions: rows.map((r) => this._map(r)!), total };
  }

  async create({ userId, title }: CreateSessionData): Promise<Session> {
    const { rows } = await this.pool.query(
      `INSERT INTO sessions (user_id, title) VALUES ($1, $2) RETURNING *`,
      [userId, title || 'Nueva sesión']
    );
    return this._map(rows[0])!;
  }

  async update(id: string, updates: UpdateSessionData): Promise<Session | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
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
    return this._map(rows[0] || null);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [id]);
  }
}

export default PostgresSessionRepository;
