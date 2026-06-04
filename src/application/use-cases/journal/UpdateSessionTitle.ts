import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { Session } from '../../../domain/entities/Session';

export class UpdateSessionTitle {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute({ sessionId, userId, title }: { sessionId: string; userId: string; title: unknown }): Promise<Session> {
    const normalizedTitle = typeof title === 'string' ? title.trim() : '';

    if (!normalizedTitle) throw new Error('Session title cannot be empty');
    if (normalizedTitle.length > 200) {
      throw new Error('Session title exceeds maximum length of 200 characters');
    }

    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');

    return (await this.sessionRepository.update(sessionId, { title: normalizedTitle }))!;
  }
}

export default UpdateSessionTitle;
