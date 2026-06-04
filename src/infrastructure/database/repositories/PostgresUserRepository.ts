import { Pool } from 'pg';
import { IUserRepository, CreateUserData, UpdateUserData, PaginatedUsers } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';

export class PostgresUserRepository extends IUserRepository {
  constructor(private pool: Pool) {
    super();
  }

  private _map(row: Record<string, unknown> | null): User | null {
    if (!row) return null;
    return new User({
      id: row.id as string,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      name: row.name as string | null,
      disclaimerAccepted: row.disclaimer_accepted as boolean,
      role: (row.role as string) || 'user',
      createdAt: row.created_at as Date,
      updatedAt: row.updated_at as Date,
    });
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return this._map(rows[0] || null);
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return this._map(rows[0] || null);
  }

  async findAll({ limit, offset }: { limit: number; offset: number }): Promise<PaginatedUsers> {
    const { rows: countRows } = await this.pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countRows[0].count as string, 10);
    const { rows } = await this.pool.query(
      'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalPages = Math.ceil(total / limit);
    const page = Math.floor(offset / limit) + 1;
    return {
      data: rows.map((r) => this._map(r)!),
      meta: { total, page, limit, totalPages },
    };
  }

  async create({ email, passwordHash, name, disclaimerAccepted, role }: CreateUserData): Promise<User> {
    const { rows } = await this.pool.query(
      `INSERT INTO users (email, password_hash, name, disclaimer_accepted, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [email, passwordHash, name || null, disclaimerAccepted, role || 'user']
    );
    return this._map(rows[0])!;
  }

  async update(id: string, updates: UpdateUserData): Promise<User | null> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    if (updates.name !== undefined) { fields.push(`name = $${i++}`); values.push(updates.name); }
    if (updates.disclaimerAccepted !== undefined) { fields.push(`disclaimer_accepted = $${i++}`); values.push(updates.disclaimerAccepted); }
    if (updates.role !== undefined) { fields.push(`role = $${i++}`); values.push(updates.role); }
    if (!fields.length) return this.findById(id);
    fields.push(`updated_at = NOW()`);
    values.push(id);
    const { rows } = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return this._map(rows[0] || null);
  }

  async delete(id: string): Promise<void> {
    await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

export default PostgresUserRepository;
