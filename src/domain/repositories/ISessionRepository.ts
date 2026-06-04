import { Session } from '../entities/Session';

export interface CreateSessionData {
  userId: string;
  title?: string;
}

export interface UpdateSessionData {
  title?: string;
  summary?: string;
  messageCount?: number;
  maxAlertLevel?: number;
  isBlocked?: boolean;
}

export interface PaginatedSessions {
  sessions: Session[];
  total: number;
}

export abstract class ISessionRepository {
  abstract findById(id: string): Promise<Session | null>;
  abstract findByUserId(userId: string, opts?: { limit?: number; offset?: number }): Promise<PaginatedSessions>;
  abstract findLastCompletedByUserId(userId: string, excludeSessionId: string): Promise<Session | null>;
  abstract create(sessionData: CreateSessionData): Promise<Session>;
  abstract update(id: string, updates: UpdateSessionData): Promise<Session | null>;
  abstract delete(id: string): Promise<void>;
}
