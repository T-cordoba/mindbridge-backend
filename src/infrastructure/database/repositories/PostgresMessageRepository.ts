import { Pool } from 'pg';
import { IMessageRepository, CreateMessageData } from '../../../domain/repositories/IMessageRepository';
import { Message, MessageRole } from '../../../domain/entities/Message';

export class PostgresMessageRepository extends IMessageRepository {
  constructor(private pool: Pool) {
    super();
  }

  private _map(row: Record<string, unknown> | null): Message | null {
    if (!row) return null;
    return new Message({
      id: row.id as string,
      sessionId: row.session_id as string,
      role: row.role as MessageRole,
      content: row.content as string,
      moodData: row.mood_data as [string, number][] | null,
      alertLevel: row.alert_level as number,
      createdAt: row.created_at as Date,
    });
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    return rows.map((r) => this._map(r)!);
  }

  async findRecentBySessionId(sessionId: string, limit = 10): Promise<Message[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT $2',
      [sessionId, limit]
    );
    return rows.reverse().map((r) => this._map(r)!);
  }

  async findAssistantMessagesSince(sessionIds: string[], since: Date): Promise<Message[]> {
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
    return rows.map((r) => this._map(r)!);
  }

  async create({ sessionId, role, content, moodData, alertLevel }: CreateMessageData): Promise<Message> {
    const { rows } = await this.pool.query(
      `INSERT INTO messages (session_id, role, content, mood_data, alert_level)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [sessionId, role, content, moodData ? JSON.stringify(moodData) : null, alertLevel || 0]
    );
    return this._map(rows[0])!;
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    await this.pool.query('DELETE FROM messages WHERE session_id = $1', [sessionId]);
  }
}

export default PostgresMessageRepository;
