export interface PsychologistData {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  location: string;
  priceRange: string;
  rating: number | null;
  languages: string;
  createdAt: Date;
}

export class Psychologist {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  avatarUrl: string | null;
  email: string;
  phone: string;
  location: string;
  priceRange: string;
  rating: number | null;
  languages: string;
  createdAt: Date;

  constructor({ id, name, specialty, bio, avatarUrl, email, phone, location, priceRange, rating, languages, createdAt }: PsychologistData) {
    this.id = id;
    this.name = name;
    this.specialty = specialty;
    this.bio = bio;
    this.avatarUrl = avatarUrl || null;
    this.email = email;
    this.phone = phone;
    this.location = location;
    this.priceRange = priceRange;
    this.rating = rating;
    this.languages = languages;
    this.createdAt = createdAt;
  }
}

export default Psychologist;
