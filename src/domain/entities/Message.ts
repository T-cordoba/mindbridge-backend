export type MessageRole = 'user' | 'assistant';

export interface MessageData {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  moodData: [string, number][] | null;
  alertLevel: number;
  createdAt: Date;
}

const VALID_ROLES = new Set<string>(['user', 'assistant']);

export class Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  moodData: [string, number][] | null;
  alertLevel: number;
  createdAt: Date;

  constructor({ id, sessionId, role, content, moodData, alertLevel, createdAt }: MessageData) {
    if (!VALID_ROLES.has(role)) throw new Error(`Invalid role: ${role}`);
    this.id = id;
    this.sessionId = sessionId;
    this.role = role as MessageRole;
    this.content = content;
    this.moodData = moodData || null;
    this.alertLevel = alertLevel || 0;
    this.createdAt = createdAt;
  }
}

export default Message;
