import { Pool } from 'pg';
import { IPsychologistRepository } from '../../../domain/repositories/IPsychologistRepository';
import { Psychologist } from '../../../domain/entities/Psychologist';

export class PostgresPsychologistRepository extends IPsychologistRepository {
  constructor(private pool: Pool) {
    super();
  }

  private _map(row: Record<string, unknown> | null): Psychologist | null {
    if (!row) return null;
    return new Psychologist({
      id: row.id as string,
      name: row.name as string,
      specialty: row.specialty as string,
      bio: row.bio as string,
      avatarUrl: row.avatar_url as string | null,
      email: row.email as string,
      phone: row.phone as string,
      location: row.location as string,
      priceRange: row.price_range as string,
      rating: row.rating ? parseFloat(row.rating as string) : null,
      languages: row.languages as string,
      createdAt: row.created_at as Date,
    });
  }

  async findAll(): Promise<Psychologist[]> {
    const { rows } = await this.pool.query('SELECT * FROM psychologists ORDER BY rating DESC');
    return rows.map((r) => this._map(r)!);
  }

  async findById(id: string): Promise<Psychologist | null> {
    const { rows } = await this.pool.query('SELECT * FROM psychologists WHERE id = $1', [id]);
    return this._map(rows[0] || null);
  }
}

export default PostgresPsychologistRepository;
