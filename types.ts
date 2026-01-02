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
}

export type GameView = 'start' | 'levelSelect' | 'playing';

export interface GameState {
  score: number;
  level: number;
  isGameOver: boolean;
  isWin: boolean;
  isLevelCleared: boolean;
  started: boolean;
  isPaused: boolean;
  speedMultiplier: number;
  view: GameView;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}