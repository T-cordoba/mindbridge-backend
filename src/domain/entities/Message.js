const VALID_ROLES = new Set(['user', 'assistant']);

class Message {
  constructor({ id, sessionId, role, content, moodData, alertLevel, createdAt }) {
    if (!VALID_ROLES.has(role)) throw new Error(`Invalid role: ${role}`);
    this.id = id;
    this.sessionId = sessionId;
    this.role = role;
    this.content = content;
    this.moodData = moodData || null;
    this.alertLevel = alertLevel || 0;
    this.createdAt = createdAt;
  }
}

module.exports = Message;
