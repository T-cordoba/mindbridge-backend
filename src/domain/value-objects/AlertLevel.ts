export const ALERT_LEVELS = Object.freeze({
  NORMAL: 0,
  MILD: 1,
  MODERATE: 2,
  ELEVATED: 3,
  SEVERE: 4,
  CRISIS: 5,
});

export const isCrisis = (level: number): boolean => level >= ALERT_LEVELS.CRISIS;

export const clamp = (level: number): number => Math.max(0, Math.min(5, Math.round(level)));
