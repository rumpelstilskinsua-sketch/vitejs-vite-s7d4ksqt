
import { PixelType } from './types';

export const PADDLE_WIDTH = 120;
export const PADDLE_HEIGHT = 15;
export const PADDLE_SPEED = 8;
export const BALL_RADIUS = 6;
export const BALL_SPEED = 4; 
export const PIXEL_SIZE = 8; // Optimal for 32x32 grid

export const FIRE_SPEED = 1.5; 
export const FIRE_DATA: number[][] = [
  [0, 1, 0],
  [1, 2, 1],
  [1, 2, 1],
  [0, 1, 0]
];

// Level 1: Wizard sprite (32x32)
export const WIZARD_DATA: number[][] = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0], 
  [0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0], 
  [0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,0,0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,3,5,5,3,3,3,3,5,5,3,3,3,2,2,2,3,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,3,5,5,3,3,3,3,5,5,3,3,3,2,2,2,3,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,3,3,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,2,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,0,0,0,0,0,0],
  [0,0,3,3,3,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,0,0,0,0,0],
  [0,3,3,3,3,3,1,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1,1,1,1,1,1,0,0,0,0], 
  [0,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2,2,2,1,1,1,1,3,3,3,1,1,1,0,0,0,0], 
  [0,3,3,3,3,3,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,3,3,3,3,3,1,1,1,0,0,0],
  [0,3,3,3,3,3,1,1,1,2,2,2,2,2,2,2,1,1,1,1,1,3,3,3,3,3,1,1,1,0,0,0],
  [0,0,3,3,3,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,3,3,1,1,1,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,3,3,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,4,4,4,4,4,5,5,5,5,5,5,4,4,4,4,4,4,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,4,4,4,4,4,5,5,5,5,5,5,4,4,4,4,4,4,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,5,5,5,5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,5,5,5,5,5,5,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
  [0,0,0,0,0,0,1,1,1,1,1,5,5,5,5,5,5,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0],
];

// Level 7: Detailed Ogre Face (Not used now, replaced by Labyrinth with bottle)
export const OGRE_HEAD_DATA: number[][] = Array(40).fill(0).map((_, y) => 
  Array(40).fill(0).map((_, x) => {
    const dx = x - 20;
    const dy = y - 20;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (Math.abs(dy-2) < 3 && Math.abs(dx)-16 > 0 && Math.abs(dx)-16 < 4) return PixelType.OGRE_FACE_DARK;
    if (Math.abs(dy-2) < 5 && Math.abs(dx) > 17 && Math.abs(dx) < 21) return PixelType.OGRE_OUTLINE;
    if (dist < 15) {
        if (dist > 14) return PixelType.OGRE_OUTLINE;
        if (Math.abs(dy+4) < 2 && Math.abs(dx)-6 < 2 && Math.abs(dx)-6 >= -2) return PixelType.OGRE_OUTLINE;
        if (Math.abs(dx) < 3 && dy > -2 && dy < 3) return PixelType.OGRE_FACE_DARK;
        if (dy > 6 && dy < 12 && Math.abs(dx) < 12) {
            if (dy > 8 && dy < 10 && Math.abs(dx) < 8) return PixelType.OGRE_TEETH;
            return PixelType.OGRE_OUTLINE;
        }
        if ((x + y) % 7 === 0 && dist < 12) return PixelType.OGRE_SPOT;
        if (dy < -6 && Math.abs(dx) < 8) return PixelType.OGRE_FACE_LIGHT;
        return PixelType.OGRE_FACE_MAIN;
    }
    return 0;
  })
);

// Spider sprite for Level 2
export const SPIDER_64_DATA: number[][] = Array(32).fill(0).map((_, y) => 
  Array(32).fill(0).map((_, x) => {
    const dx = x - 16;
    const dy = y - 16;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 6) return PixelType.SPIDER_BODY_DARK;
    if (dist < 8) return PixelType.SPIDER_BODY_LIME;
    if (Math.abs(dx) > 6 && Math.abs(dy) < 2) return PixelType.SPIDER_LEGS;
    if (Math.abs(dy) > 6 && Math.abs(dx) < 2) return PixelType.SPIDER_LEGS;
    return 0;
  })
);

// Little Ghost sprite (11x11)
export const GHOST_DATA: number[][] = [
  [0,0,0,13,13,13,13,13,0,0,0],
  [0,0,13,13,13,13,13,13,13,0,0],
  [0,13,13,13,13,13,13,13,13,13,0],
  [13,13,13,13,13,13,13,13,13,13,13],
  [13,13,14,14,13,13,14,14,13,13,13],
  [13,13,14,14,13,13,14,14,13,13,13],
  [13,13,13,13,13,13,13,13,13,13,13],
  [13,13,13,13,13,13,13,13,13,13,13],
  [13,13,13,13,13,13,13,13,13,13,13],
  [13,13,13,13,13,13,13,13,13,13,13],
  [13,0,13,0,13,0,13,0,13,0,13]
];

// Happy Face / Happy Person Head (11x11) - 31: Head Skin, 32: Eyes/Smile
export const HAPPY_FACE_DATA: number[][] = [
  [0,0,0,31,31,31,31,31,0,0,0],
  [0,0,31,31,31,31,31,31,31,0,0],
  [0,31,31,31,31,31,31,31,31,31,0],
  [31,31,32,32,31,31,31,32,32,31,31],
  [31,31,32,32,31,31,31,32,32,31,31],
  [31,31,31,31,31,31,31,31,31,31,31],
  [31,32,31,31,31,31,31,31,31,32,31],
  [31,31,32,0,0,0,0,0,32,31,31],
  [0,31,31,32,32,32,32,32,31,31,0],
  [0,0,31,31,31,31,31,31,31,0,0],
  [0,0,0,31,31,31,31,31,0,0,0]
];

// Level 6: Metal Labyrinth (40x40)
export const LABYRINTH_DATA: number[][] = Array(40).fill(0).map((_, y) => 
  Array(40).fill(0).map((_, x) => {
    const isBorder = y <= 2 || y >= 37 || x <= 2 || x >= 37;
    const isTopEntrance = y <= 2 && x >= 17 && x <= 22;
    const isBottomEntrance = y >= 37 && x >= 17 && x <= 22;
    if (isBorder) {
      if (isTopEntrance || isBottomEntrance) return 0;
      return PixelType.METAL;
    }
    if (x > 2 && x < 37 && y > 2 && y < 37) return PixelType.LAB_BLUE;
    return 0;
  })
);

// Level 7: Labyrinth with Beer Bottle Silhouette
export const BOTTLE_LABYRINTH_DATA: number[][] = Array(40).fill(0).map((_, y) => 
  Array(40).fill(0).map((_, x) => {
    const isBorder = y <= 2 || y >= 37 || x <= 2 || x >= 37;
    const isTopEntrance = y <= 2 && x >= 17 && x <= 22;
    const isBottomEntrance = y >= 37 && x >= 17 && x <= 22;
    if (isBorder) {
      if (isTopEntrance || isBottomEntrance) return 0;
      return PixelType.METAL;
    }
    
    // Beer Bottle Silhouette logic
    const inNeckArea = (y >= 6 && y <= 16) && (x >= 18 && x <= 22);
    const inBodyArea = (y >= 16 && y <= 34) && (x >= 13 && x <= 27);
    
    // Silhouette Outline
    const isCapTop = (y === 6) && (x >= 18 && x <= 22);
    const isNeckSides = (y >= 6 && y <= 15) && (x === 18 || x === 22);
    const isShoulderLeft = (y >= 15 && y <= 19) && (x === 18 - (y - 15));
    const isShoulderRight = (y >= 15 && y <= 19) && (x === 22 + (y - 15));
    const isBodySides = (y >= 19 && y <= 34) && (x === 14 || x === 26);
    const isBottomLine = (y === 34) && (x >= 14 && x <= 26);
    
    if (isCapTop || isNeckSides || isShoulderLeft || isShoulderRight || isBodySides || isBottomLine) {
       return PixelType.WIZARD_BLACK;
    }

    if (x > 2 && x < 37 && y > 2 && y < 37) return PixelType.LAB_BLUE;
    return 0;
  })
);

export const COLORS = {
  PADDLE: '#FACC15',
  BALL: '#FFFFFF',
  WIZARD_BLUE: '#2563EB',
  WIZARD_BEARD: '#94A3B8',
  WIZARD_SKIN: '#FDBA74',
  WIZARD_BROWN: '#78350F',
  WIZARD_BLACK: '#020617',
  GHOST_PINK: '#FF007F',
  GHOST_BLUE: '#00F3FF',
  GHOST_EYE: '#FFFFFF',
  FIRE_ORANGE: '#FF4500', 
  FIRE_YELLOW: '#FFD700', 
  BG: '#051a05',
  SPIDER_BODY_LIME: '#39FF14',
  SPIDER_BODY_GREEN: '#16A34A',
  SPIDER_BODY_DARK: '#064E3B',
  SPIDER_LEGS: '#9CA3AF',
  TOAD_GREEN: '#4ADE80',
  TOAD_DARK: '#166534',
  TOAD_YELLOW: '#FEF08A',
  // Level 5 specific
  SWAMP_GREEN: '#39FF14',
  SWAMP_BLACK: '#001a00',
  FIREFLY_BODY: '#FFFF00',
  FIREFLY_GLOW: '#00FF00',
  // Swamp Rat colors
  RAT_FUR_MID: '#715E4D',
  RAT_FUR_DARK: '#46382E',
  RAT_FUR_LIGHT: '#9F8D7C',
  RAT_BELLY: '#D2B48C',
  RAT_PINK: '#FFC0CB',
  RAT_EYE: '#FF0000',
  RAT_OUTLINE: '#1A110A',
  // Firefly wing
  FIREFLY_WING: '#FFFFFF',
  // Ogre / Happy Face Colors
  OGRE_GREEN: '#39FF14',
  OGRE_BROWN: '#FFD180',
  OGRE_EYE: '#FFFFFF',
  // Level 6 Colors
  METAL_GREY: '#94A3B8',
  LAB_BLUE: '#0EA5E9',
  // Detailed Ogre Head
  OGRE_OUTLINE: '#141414',
  OGRE_FACE_MAIN: '#6d8c32',
  OGRE_FACE_DARK: '#475e2a',
  OGRE_FACE_LIGHT: '#99b244',
  OGRE_TEETH: '#f1f1f1',
  OGRE_SPOT: '#c5d481',
};

export const NEON_COLORS = [
  '#39FF14', // Neon Green
  '#FF007F', // Neon Pink
  '#00F3FF', // Neon Blue
  '#FAFF00', // Neon Yellow
  '#BC13FE', // Neon Purple
  '#FF5F1F', // Neon Orange
  '#FF3131', // Neon Red
];
