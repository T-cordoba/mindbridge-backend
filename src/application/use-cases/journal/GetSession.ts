import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { IMessageRepository } from '../../../domain/repositories/IMessageRepository';
import { Session } from '../../../domain/entities/Session';
import { Message } from '../../../domain/entities/Message';

interface GetSessionResult {
  session: Session;
  messages: Message[];
}

export class GetSession {
  constructor(
    private sessionRepository: ISessionRepository,
    private messageRepository: IMessageRepository
  ) {}

  async execute({ sessionId, userId }: { sessionId: string; userId: string }): Promise<GetSessionResult> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) throw new Error('Session not found');

    const messages = await this.messageRepository.findBySessionId(sessionId);
    return { session, messages };
  }
}

export default GetSession;
