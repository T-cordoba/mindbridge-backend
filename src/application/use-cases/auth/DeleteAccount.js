class DeleteAccount {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async execute({ userId }) {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    await this.userRepository.delete(userId);
  }
}

module.exports = DeleteAccount;
