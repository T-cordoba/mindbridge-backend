export const EMOTIONS = Object.freeze({
  JOY: 'joy',
  GRATITUDE: 'gratitude',
  CALM: 'calm',
  HOPE: 'hope',
  LOVE: 'love',
  PRIDE: 'pride',
  RELIEF: 'relief',
  SADNESS: 'sadness',
  ANXIETY: 'anxiety',
  FEAR: 'fear',
  ANGER: 'anger',
  FRUSTRATION: 'frustration',
  GUILT: 'guilt',
  SHAME: 'shame',
  LONELINESS: 'loneliness',
  CONFUSION: 'confusion',
  NOSTALGIA: 'nostalgia',
  UNCERTAINTY: 'uncertainty',
  EXHAUSTION: 'exhaustion',
  EMPTINESS: 'emptiness',
  UNKNOWN: 'unknown',
});

export const VALID_EMOTIONS: Set<string> = new Set(Object.values(EMOTIONS));

export const isValid = (emotion: string): boolean => VALID_EMOTIONS.has(emotion);

export const sanitizeAnimo = (animo: unknown): [string, number][] => {
  if (!Array.isArray(animo)) return [['unknown', 0]];
  return (animo as [string, number][])
    .filter(([emotion, intensity]) => isValid(emotion) && typeof intensity === 'number')
    .map(([emotion, intensity]) => [emotion, Math.max(0, Math.min(10, Math.round(intensity)))]);
};
