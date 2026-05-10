/**
 * Level Requirements Formula (HARD MODE)
 * Level 1: 0 XP (Wagered)
 * Level 2: 1,000 XP
 * Level 3: 4,000 XP
 * Level 4: 9,000 XP
 * Level 5: 16,000 XP
 * Formula: Level = floor(sqrt(XP / 1000)) + 1
 * Inverse: XP_for_Level = (Level - 1)^2 * 1000
 */

export const LEVEL_FORMULA_X = 1000;

export function getLevelFromXP(xp: number): number {
  if (xp <= 0) return 1;
  const level = Math.floor(Math.sqrt(xp / LEVEL_FORMULA_X)) + 1;
  return Math.min(100, level);
}

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow(level - 1, 2) * LEVEL_FORMULA_X;
}

export function getLevelProgress(xp: number): {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  progressPercent: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
} {
  const level = getLevelFromXP(xp);
  const currentLevelStartXP = getXPForLevel(level);
  const nextLevelStartXP = getXPForLevel(level + 1);
  
  const xpInCurrentLevel = xp - currentLevelStartXP;
  const xpRequiredForNextLevel = nextLevelStartXP - currentLevelStartXP;
  
  const progressPercent = level >= 100 
    ? 100 
    : Math.min(100, (xpInCurrentLevel / xpRequiredForNextLevel) * 100);

  return {
    level,
    currentXP: xp,
    nextLevelXP: nextLevelStartXP,
    progressPercent,
    xpInCurrentLevel,
    xpRequiredForNextLevel
  };
}

export const LEVEL_TITLES: Record<number, string> = {
  1: "Rookie",
  10: "Gambler",
  25: "High Roller",
  50: "Elite",
  75: "Legend",
  100: "IMMORTAL"
};

export function getLevelTitle(level: number): string {
  const thresholds = Object.keys(LEVEL_TITLES).map(Number).sort((a, b) => b - a);
  const tier = thresholds.find(t => level >= t) || 1;
  return LEVEL_TITLES[tier];
}
