class Psychologist {
  constructor({ id, name, specialty, bio, avatarUrl, email, phone, location, priceRange, rating, languages, createdAt }) {
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

module.exports = Psychologist;
