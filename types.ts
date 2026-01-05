
// Define GameView for the different screens of the game
export type GameView = 'start' | 'playing' | 'levelSelect';

// Define GameState to track the overall progress and settings
export interface GameState {
  score: number;
  level: number;
  maxLevelCompleted: number; // New: tracking for the "OGRO BUCHON" letter collection
  isGameOver: boolean;
  isWin: boolean;
  isLevelCleared: boolean;
  started: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  view: GameView;
  kofiPhrase: string; // Dynamic phrase for the Ko-fi button
}

// Define Particle for visual effects like explosions and background atmosphere
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
  color: string;
  id: number;
  lastSpawnId?: string; // Prevents infinite spawning while overlapping
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  holes: { x: number; width: number }[]; // Track destroyed segments
}

export interface Ghost {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isHit: boolean;
  width: number;
  height: number;
  pixelSize: number;
  isSmallest?: boolean;
  isLargest?: boolean;
  fireCooldown?: number;
  health?: number;
  maxHealth?: number;
  isDead?: boolean;
  isFirefly?: boolean;
  isOgre?: boolean; // New property for level 5 ogres
}

export enum PixelType {
  EMPTY = 0,
  // Wizard colors
  WIZARD_CLOAK = 1,
  WIZARD_BEARD = 2,
  WIZARD_SKIN = 3,
  WIZARD_BROWN = 4,
  WIZARD_BLACK = 5,
  // Detailed Spider colors
  SPIDER_BODY_LIME = 6,
  SPIDER_BODY_GREEN = 7,
  SPIDER_BODY_DARK = 8,
  SPIDER_LEGS = 9,
  SPIDER_OUTLINE = 10,
  SPIDER_STRIPE = 11,
  SPIDER_HIGHLIGHT = 12,
  // Ghost colors
  GHOST_BODY = 13,
  GHOST_EYE = 14,
  // Toad colors
  TOAD_BODY = 15,
  TOAD_EYE = 16,
  TOAD_BELLY = 17,
  // Bat colors
  BAT_BODY = 18,
  BAT_WING = 19,
  // Firefly colors
  FIREFLY_BODY = 20,
  FIREFLY_GLOW = 21,
  // Swamp Rat colors (Detailed Shading)
  RAT_FUR_MID = 22,
  RAT_FUR_DARK = 27,
  RAT_FUR_LIGHT = 28,
  RAT_BELLY = 23,
  RAT_PINK = 29,
  RAT_EYE = 30,
  RAT_OUTLINE = 25,
  // Firefly wings
  FIREFLY_WING = 26,
  // Ogre colors
  OGRE_BODY = 31,
  OGRE_EYE = 32,
  // Level 6 specific
  METAL = 33,
  LAB_BLUE = 34,
  // Detailed Ogre Face (Shrek)
  OGRE_OUTLINE = 35,
  OGRE_FACE_MAIN = 36,
  OGRE_FACE_DARK = 37,
  OGRE_FACE_LIGHT = 38,
  OGRE_TEETH = 39,
  OGRE_SPOT = 40,
}
