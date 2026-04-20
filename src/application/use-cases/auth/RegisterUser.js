const bcrypt = require('bcryptjs');
const User = require('../../../domain/entities/User');

class RegisterUser {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ email, password, name, disclaimerAccepted }) {
    if (!disclaimerAccepted) {
      throw new Error('Disclaimer must be accepted to use the journal');
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({ email, passwordHash, name, disclaimerAccepted });

    return user.toPublic();
  }
}

module.exports = RegisterUser;
