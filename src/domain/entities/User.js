class User {
  constructor({ id, email, passwordHash, name, disclaimerAccepted, createdAt, updatedAt }) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name || null;
    this.disclaimerAccepted = disclaimerAccepted || false;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPublic() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      disclaimerAccepted: this.disclaimerAccepted,
      createdAt: this.createdAt,
    };
  }
}

module.exports = User;
