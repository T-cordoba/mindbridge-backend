import { Message, MessageRole } from '../entities/Message';

export interface CreateMessageData {
  sessionId: string;
  role: MessageRole;
  content: string;
  moodData: [string, number][] | null;
  alertLevel?: number;
}

export abstract class IMessageRepository {
  abstract findBySessionId(sessionId: string): Promise<Message[]>;
  abstract findRecentBySessionId(sessionId: string, limit?: number): Promise<Message[]>;
  abstract findAssistantMessagesSince(sessionIds: string[], since: Date): Promise<Message[]>;
  abstract create(messageData: CreateMessageData): Promise<Message>;
  abstract deleteBySessionId(sessionId: string): Promise<void>;
}
