
export interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  radius: number;
}

export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export enum PixelType {
  EMPTY = 0,
  WIZARD_CLOAK = 1,
  WIZARD_BEARD = 2,
  WIZARD_SKIN = 3,
  WIZARD_BROWN = 4,
  WIZARD_BLACK = 5,
}

export interface GameState {
  score: number;
  isGameOver: boolean;
  isWin: boolean;
  started: boolean;
  isPaused: boolean;
  speedMultiplier: number;
}
