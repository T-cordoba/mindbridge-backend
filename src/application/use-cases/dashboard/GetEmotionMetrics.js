class GetEmotionMetrics {
  constructor(messageRepository, sessionRepository) {
    this.messageRepository = messageRepository;
    this.sessionRepository = sessionRepository;
  }

  async execute({ userId, days = 30 }) {
    const sessions = await this.sessionRepository.findByUserId(userId);
    if (sessions.length === 0) return { emotions: [], alertTrend: [], totalSessions: 0 };

    const sessionIds = sessions.map((s) => s.id);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.messageRepository.findAssistantMessagesSince(sessionIds, since);

    const emotionTotals = {};
    const alertByDay = {};

    for (const msg of messages) {
      const day = msg.createdAt.toISOString().split('T')[0];

      if (msg.alertLevel > 0) {
        alertByDay[day] = Math.max(alertByDay[day] || 0, msg.alertLevel);
      }

      if (!Array.isArray(msg.moodData)) continue;
      for (const [emotion, intensity] of msg.moodData) {
        if (!emotionTotals[emotion]) emotionTotals[emotion] = { total: 0, count: 0 };
        emotionTotals[emotion].total += intensity;
        emotionTotals[emotion].count += 1;
      }
    }

    const emotions = Object.entries(emotionTotals)
      .map(([emotion, { total, count }]) => ({
        emotion,
        avgIntensity: parseFloat((total / count).toFixed(1)),
        occurrences: count,
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    const alertTrend = Object.entries(alertByDay)
      .map(([date, maxAlert]) => ({ date, maxAlert }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      emotions,
      alertTrend,
      totalSessions: sessions.length,
      analyzedMessages: messages.length,
    };
  }
}

module.exports = GetEmotionMetrics;
