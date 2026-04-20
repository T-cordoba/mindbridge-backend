const IPsychologistRepository = require('../../../domain/repositories/IPsychologistRepository');
const Psychologist = require('../../../domain/entities/Psychologist');

class PostgresPsychologistRepository extends IPsychologistRepository {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  _map(row) {
    if (!row) return null;
    return new Psychologist({
      id: row.id,
      name: row.name,
      specialty: row.specialty,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      email: row.email,
      phone: row.phone,
      location: row.location,
      priceRange: row.price_range,
      rating: row.rating ? parseFloat(row.rating) : null,
      languages: row.languages,
      createdAt: row.created_at,
    });
  }

  async findAll() {
    const { rows } = await this.pool.query('SELECT * FROM psychologists ORDER BY rating DESC');
    return rows.map((r) => this._map(r));
  }

  async findById(id) {
    const { rows } = await this.pool.query('SELECT * FROM psychologists WHERE id = $1', [id]);
    return this._map(rows[0]);
  }
}

module.exports = PostgresPsychologistRepository;
