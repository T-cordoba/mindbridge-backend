import { IMessageRepository } from '../../../domain/repositories/IMessageRepository';
import { ISessionRepository } from '../../../domain/repositories/ISessionRepository';

const POSITIVE_EMOTIONS = new Set(['joy', 'gratitude', 'calm', 'hope', 'love', 'pride', 'relief']);
const NEGATIVE_EMOTIONS = new Set(['sadness', 'anxiety', 'fear', 'anger', 'frustration', 'guilt', 'shame', 'loneliness']);

interface EmotionStat { total: number; count: number }
interface AlertDay { max: number; sum: number; count: number }
interface WellbeingDay { posSum: number; posCount: number; negSum: number; negCount: number }

export class GetEmotionMetrics {
  constructor(
    private messageRepository: IMessageRepository,
    private sessionRepository: ISessionRepository
  ) {}

  async execute({ userId, days = 30 }: { userId: string; days?: number }) {
    const { sessions } = await this.sessionRepository.findByUserId(userId, { limit: 1000, offset: 0 });
    if (sessions.length === 0) return { emotions: [], alertTrend: [], wellbeingTrend: [], totalSessions: 0 };

    const sessionIds = sessions.map((s) => s.id);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const messages = await this.messageRepository.findAssistantMessagesSince(sessionIds, since);

    const emotionTotals: Record<string, EmotionStat> = {};
    const alertByDay: Record<string, AlertDay> = {};
    const wellbeingByDay: Record<string, WellbeingDay> = {};

    for (const msg of messages) {
      const day = msg.createdAt.toISOString().split('T')[0];

      if (msg.alertLevel > 0) {
        if (!alertByDay[day]) alertByDay[day] = { max: 0, sum: 0, count: 0 };
        alertByDay[day].max = Math.max(alertByDay[day].max, msg.alertLevel);
        alertByDay[day].sum += msg.alertLevel;
        alertByDay[day].count += 1;
      }

      if (!Array.isArray(msg.moodData)) continue;
      for (const [emotion, intensity] of msg.moodData) {
        if (emotion === 'unknown') continue;

        if (!emotionTotals[emotion]) emotionTotals[emotion] = { total: 0, count: 0 };
        emotionTotals[emotion].total += intensity;
        emotionTotals[emotion].count += 1;

        if (POSITIVE_EMOTIONS.has(emotion) || NEGATIVE_EMOTIONS.has(emotion)) {
          if (!wellbeingByDay[day]) wellbeingByDay[day] = { posSum: 0, posCount: 0, negSum: 0, negCount: 0 };
          if (POSITIVE_EMOTIONS.has(emotion)) {
            wellbeingByDay[day].posSum += intensity;
            wellbeingByDay[day].posCount += 1;
          } else {
            wellbeingByDay[day].negSum += intensity;
            wellbeingByDay[day].negCount += 1;
          }
        }
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
      .map(([date, { max, sum, count }]) => ({
        date,
        maxAlert: max,
        avgAlert: parseFloat((sum / count).toFixed(1)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const wellbeingTrend = Object.entries(wellbeingByDay)
      .map(([date, { posSum, posCount, negSum, negCount }]) => {
        const posAvg = posCount > 0 ? posSum / posCount : 0;
        const negAvg = negCount > 0 ? negSum / negCount : 0;
        return { date, score: parseFloat((posAvg - negAvg).toFixed(1)) };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      emotions,
      alertTrend,
      wellbeingTrend,
      totalSessions: sessions.length,
      analyzedMessages: messages.length,
    };
  }
}

export default GetEmotionMetrics;
