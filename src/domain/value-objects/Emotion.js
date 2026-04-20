const EMOTIONS = Object.freeze({
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

const VALID_EMOTIONS = new Set(Object.values(EMOTIONS));

const isValid = (emotion) => VALID_EMOTIONS.has(emotion);

const sanitizeAnimo = (animo) => {
  if (!Array.isArray(animo)) return [['unknown', 0]];
  return animo
    .filter(([emotion, intensity]) => isValid(emotion) && typeof intensity === 'number')
    .map(([emotion, intensity]) => [emotion, Math.max(0, Math.min(10, Math.round(intensity)))]);
};

module.exports = { EMOTIONS, VALID_EMOTIONS, isValid, sanitizeAnimo };
