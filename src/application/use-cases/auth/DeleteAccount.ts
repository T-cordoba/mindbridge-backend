import { IUserRepository } from '../../../domain/repositories/IUserRepository';

export class DeleteAccount {
  constructor(private userRepository: IUserRepository) {}

  async execute({ userId }: { userId: string }): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    await this.userRepository.delete(userId);
  }
}

export default DeleteAccount;
