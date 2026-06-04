import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';

export class DeleteSession {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute({ sessionId, userId }: { sessionId: string; userId: string }): Promise<void> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');
    await this.sessionRepository.delete(sessionId);
  }
}

export default DeleteSession;
