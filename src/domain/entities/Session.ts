export interface SessionData {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  messageCount: number;
  maxAlertLevel: number;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Session {
  id: string;
  userId: string;
  title: string;
  summary: string | null;
  messageCount: number;
  maxAlertLevel: number;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor({ id, userId, title, summary, messageCount, maxAlertLevel, isBlocked, createdAt, updatedAt }: SessionData) {
    this.id = id;
    this.userId = userId;
    this.title = title || 'Nueva sesión';
    this.summary = summary || null;
    this.messageCount = messageCount || 0;
    this.maxAlertLevel = maxAlertLevel || 0;
    this.isBlocked = isBlocked || false;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}

export default Session;
