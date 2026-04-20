class Session {
  constructor({ id, userId, title, summary, messageCount, maxAlertLevel, isBlocked, createdAt, updatedAt }) {
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

module.exports = Session;
