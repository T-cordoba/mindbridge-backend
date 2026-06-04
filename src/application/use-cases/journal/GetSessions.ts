import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';
import { Session } from '../../../domain/entities/Session';

interface GetSessionsResult {
  data: Session[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export class GetSessions {
  constructor(private sessionRepository: ISessionRepository) {}

  async execute({ userId, page = 1, limit = 10 }: { userId: string; page?: number; limit?: number }): Promise<GetSessionsResult> {
    const offset = (page - 1) * limit;
    const { sessions, total } = await this.sessionRepository.findByUserId(userId, { limit, offset });
    return {
      data: sessions,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

export default GetSessions;
