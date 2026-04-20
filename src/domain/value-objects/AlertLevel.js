const ALERT_LEVELS = Object.freeze({
  NORMAL: 0,
  MILD: 1,
  MODERATE: 2,
  ELEVATED: 3,
  SEVERE: 4,
  CRISIS: 5,
});

const isCrisis = (level) => level >= ALERT_LEVELS.CRISIS;

const clamp = (level) => Math.max(0, Math.min(5, Math.round(level)));

module.exports = { ALERT_LEVELS, isCrisis, clamp };
