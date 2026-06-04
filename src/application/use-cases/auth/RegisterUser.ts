import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  disclaimerAccepted: boolean | string;
}

export class RegisterUser {
  constructor(private userRepository: IUserRepository) {}

  async execute({ email, password, name, disclaimerAccepted }: RegisterInput) {
    if (!disclaimerAccepted) {
      throw new Error('Disclaimer must be accepted to use the journal');
    }

    const existing = await this.userRepository.findByEmail(email);
    if (existing) throw new Error('Email already registered');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userRepository.create({ email, passwordHash, name, disclaimerAccepted: true });

    return user.toPublic();
  }
}

export default RegisterUser;
