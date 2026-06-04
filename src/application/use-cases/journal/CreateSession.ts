import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { Session } from '../../../domain/entities/Session';

export class CreateSession {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute({ userId, title }: { userId: string; title?: string }): Promise<Session> {
    return this.sessionRepository.create({ userId, title: title || 'Nueva sesión' });
  }
}

export default CreateSession;
