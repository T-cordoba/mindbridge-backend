import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { User } from '../../../domain/entities/User';

interface UpdateProfileInput {
  userId: string;
  name?: string;
  email?: string;
}

export class UpdateProfile {
  constructor(private userRepository: IUserRepository) {}

  async execute({ userId, name, email }: UpdateProfileInput): Promise<User> {
    if (!name && !email) throw new Error('No fields to update');

    if (email) {
      const existing = await this.userRepository.findByEmail(email);
      if (existing && existing.id !== userId) throw new Error('Email already in use');
    }

    const updates: { name?: string; email?: string } = {};
    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();

    const user = await this.userRepository.update(userId, updates);
    if (!user) throw new Error('User not found');
    return user;
  }
}
