
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_SPEED, 
  BALL_RADIUS, 
  BALL_SPEED, 
  PIXEL_SIZE, 
  WIZARD_DATA, 
  SPIDER_64_DATA,
  LABYRINTH_DATA,
  GHOST_DATA,
  HAPPY_FACE_DATA,
  FIRE_DATA,
  FIRE_SPEED,
  COLORS,
  NEON_COLORS
} from '../constants';
import { Ball, Paddle, PixelType, GameState, GameView, Ghost, Projectile, Particle } from '../types';
import KofiButton from './KofiButton';

interface TrailPoint {
  x: number;
  y: number;
  color: string;
}

const MAX_BALLS = 16;
const SPEED_STORAGE_KEY = 'wizard-breaker-speed-multiplier';

const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  const [gameState, setGameState] = useState<GameState>(() => {
    const savedSpeed = localStorage.getItem(SPEED_STORAGE_KEY);
    return {
      score: 0,
      level: 1,
      isGameOver: false,
      isWin: false,
      isLevelCleared: false,
      started: false,
      isPaused: false,
      speedMultiplier: savedSpeed ? parseFloat(savedSpeed) : 1.0,
      view: 'start'
    };
  });

  const getPaddleY = useCallback((h: number, type: string) => {
    if (type === 'mobile') return h * 0.79;
    if (type === 'tablet') return h * 0.75;
    return h - 60;
  }, []);

  const paddleRef = useRef<Paddle>({
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    color: COLORS.PADDLE,
    holes: [],
  });

  const ballsRef = useRef<Ball[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const trailRef = useRef<{ [key: number]: TrailPoint[] }>({});
  const charGridRef = useRef<number[][]>(WIZARD_DATA.map(row => [...row]));
  const ghostsRef = useRef<Ghost[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | undefined>(undefined);
  const frameCounterRef = useRef<number>(0);

  const getDynamicPixelSize = useCallback((gridWidth: number) => {
    const maxCharacterWidth = dimensions.width * (dimensions.width < 640 ? 0.85 : 0.65);
    const calculatedSize = maxCharacterWidth / gridWidth;
    return Math.min(PIXEL_SIZE, calculatedSize);
  }, [dimensions.width]);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const w = Math.min(clientWidth, 1024);
      const h = clientHeight;
      setDimensions({ width: w, height: h });
      
      let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (clientWidth < 640) type = 'mobile';
      else if (clientWidth < 1024) type = 'tablet';
      setDeviceType(type);

      if (gameState.started) {
        paddleRef.current.y = getPaddleY(h, type);
        paddleRef.current.x = Math.min(paddleRef.current.x, w - paddleRef.current.width);
      }
    }
  }, [gameState.started, getPaddleY]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    localStorage.setItem(SPEED_STORAGE_KEY, gameState.speedMultiplier.toString());
  }, [gameState.speedMultiplier]);

  const togglePauseLocal = useCallback(() => {
    setGameState(prev => {
      if (!prev.started || prev.isGameOver || prev.isWin || prev.isLevelCleared) return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const playSound = useCallback((type: 'paddle' | 'wall' | 'hit' | 'win' | 'lose' | 'select' | 'ghost' | 'spawn') => {
    if (!audioCtxRef.current || gameState.isPaused) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case 'select':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(); osc.stop(now + 0.05);
        break;
      case 'paddle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'wall':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        gainNode.gain.setValueAtTime(0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(); osc.stop(now + 0.05);
        break;
      case 'hit':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'spawn':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.15);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(); osc.stop(now + 0.15);
        break;
      case 'ghost':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(); osc.stop(now + 0.15);
        break;
      case 'win':
        osc.start(); osc.stop(now + 0.4);
        break;
      case 'lose':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.8);
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 0.8);
        osc.start(); osc.stop(now + 0.8);
        break;
    }
  }, [gameState.isPaused]);

  const createExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const drawDynamicBackground = (ctx: CanvasRenderingContext2D, w: number, h: number, level: number) => {
    let bgColor = '#110000';
    let gradientStart = 'rgba(17, 0, 0, 0)';
    let gradientMid = 'rgba(120, 20, 0, 0.2)';
    let gradientEnd = 'rgba(255, 69, 0, 0.4)';
    let particleColor1 = COLORS.FIRE_ORANGE;
    let particleColor2 = COLORS.FIRE_YELLOW;

    if (level === 2) {
      bgColor = '#000011';
      gradientMid = 'rgba(0, 20, 120, 0.2)';
      gradientEnd = 'rgba(0, 243, 255, 0.4)';
      particleColor1 = '#00F3FF';
      particleColor2 = '#0077FF';
    } else if (level === 3) {
      bgColor = '#001100';
      gradientMid = 'rgba(20, 120, 0, 0.2)';
      gradientEnd = 'rgba(57, 255, 20, 0.4)';
      particleColor1 = '#39FF14';
      particleColor2 = '#064E3B';
    } else if (level === 4) {
      bgColor = '#110011';
      gradientMid = 'rgba(255, 0, 255, 0.2)';
      gradientEnd = 'rgba(188, 19, 254, 0.4)';
      particleColor1 = '#FF007F';
      particleColor2 = '#BC13FE';
    } else if (level === 5 || level === 6) {
      bgColor = COLORS.SWAMP_BLACK;
      gradientMid = 'rgba(0, 50, 0, 0.3)';
      gradientEnd = 'rgba(57, 255, 20, 0.4)';
      particleColor1 = COLORS.SWAMP_GREEN;
      particleColor2 = '#002200';
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, h - 150, 0, h);
    gradient.addColorStop(0, gradientStart);
    gradient.addColorStop(0.5, gradientMid);
    gradient.addColorStop(1, gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, h - 150, w, 150);

    if (frameCounterRef.current % 15 === 0) {
      particlesRef.current.push({
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.4, 
        life: 1.0,
        color: Math.random() > 0.3 ? particleColor1 : particleColor2,
        size: Math.random() * 3 + 2
      });
    }
  };

  const initGame = useCallback((lvl: number = 1) => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const py = getPaddleY(dimensions.height, deviceType);
    paddleRef.current = {
      x: (dimensions.width - PADDLE_WIDTH) / 2,
      y: py,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      color: COLORS.PADDLE,
      holes: [],
    };
    
    const initialMultiplier = gameState.speedMultiplier;
    const initialId = Date.now();
    ballsRef.current = [{
      x: dimensions.width / 2,
      y: py - 40,
      dx: BALL_SPEED * initialMultiplier * (Math.random() > 0.5 ? 1 : -1),
      dy: -BALL_SPEED * initialMultiplier,
      radius: BALL_RADIUS,
      color: COLORS.BALL,
      id: initialId
    }];
    
    projectilesRef.current = [];
    trailRef.current = {};
    particlesRef.current = [];

    let levelData = WIZARD_DATA;
    if (lvl === 6) {
      levelData = LABYRINTH_DATA;
    } else if (lvl >= 2) {
      levelData = SPIDER_64_DATA;
    }
    charGridRef.current = levelData.map(row => [...row]);
    
    const spawnAreas = [
      { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.12 }, { x: 0.7, y: 0.12 },
      { x: 0.9, y: 0.2 }, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }
    ];

    ghostsRef.current = spawnAreas.map((area, index) => {
      const isOgreLevel = lvl === 5 || lvl === 6;
      const baseScale = PIXEL_SIZE * 0.5;
      const gPixelSize = baseScale * (1 + index * 0.2);
      
      const activeSpriteData = isOgreLevel ? HAPPY_FACE_DATA : GHOST_DATA;
      
      const gw = activeSpriteData[0].length * gPixelSize;
      const gh = activeSpriteData.length * gPixelSize;
      
      const enemy: Ghost = {
        id: `enemy-${index}`,
        x: dimensions.width * area.x - gw / 2,
        y: dimensions.height * area.y - gh / 2,
        vx: (Math.random() - 0.5) * (1.5 + Math.random() * 2),
        vy: (Math.random() - 0.5) * (1.5 + Math.random() * 2),
        isHit: false,
        width: gw,
        height: gh,
        pixelSize: gPixelSize,
        isSmallest: index === 0,
        isLargest: index === 5,
        fireCooldown: lvl >= 2 ? 180 : 0,
        isOgre: isOgreLevel
      };

      if ((lvl >= 4) && index === 5) {
        enemy.health = isOgreLevel ? (lvl === 6 ? 40 : 20) : 35;
        enemy.maxHealth = isOgreLevel ? (lvl === 6 ? 40 : 20) : 35;
      }

      return enemy;
    });

    setGameState(prev => ({ 
      ...prev, 
      level: lvl,
      score: lvl === 1 ? 0 : prev.score, 
      isGameOver: false, 
      isWin: false, 
      isLevelCleared: false,
      isPaused: false, 
      started: true,
      view: 'playing'
    }));
  }, [dimensions, deviceType, getPaddleY, gameState.speedMultiplier]);

  const setView = useCallback((view: GameView) => {
    playSound('select');
    ballsRef.current = [];
    projectilesRef.current = [];
    ghostsRef.current = [];
    trailRef.current = {};
    setGameState(prev => ({ 
      ...prev, 
      view,
      isGameOver: false,
      isWin: false,
      isLevelCleared: false,
      started: false,
      isPaused: false
    }));
  }, [playSound]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { 
    keysRef.current[e.code] = true; 
    if (e.code === 'KeyP' || e.code === 'Escape') togglePauseLocal();
  }, [togglePauseLocal]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => { keysRef.current[e.code] = false; }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (!gameState.started || gameState.isPaused || gameState.view !== 'playing') return;
    const touch = e.touches[0];
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      paddleRef.current.x = Math.max(0, Math.min(dimensions.width - paddleRef.current.width, relativeX - paddleRef.current.width / 2));
    }
  }, [gameState.started, gameState.isPaused, gameState.view, dimensions.width]);

  const update = useCallback(() => {
    if (gameState.isPaused || !gameState.started || gameState.view !== 'playing' || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared) return;

    frameCounterRef.current++;
    const paddle = paddleRef.current;
    const grid = charGridRef.current;
    const ghosts = ghostsRef.current;
    const currentSpeed = BALL_SPEED * gameState.speedMultiplier;
    const currentPixelSize = getDynamicPixelSize(grid[0]?.length || 1);

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.008;
      return p.life > 0;
    });

    if (keysRef.current['ArrowLeft']) paddle.x -= PADDLE_SPEED;
    if (keysRef.current['ArrowRight']) paddle.x += PADDLE_SPEED;
    paddle.x = Math.max(0, Math.min(dimensions.width - paddle.width, paddle.x));

    projectilesRef.current = projectilesRef.current.filter(p => {
      p.y += p.vy;
      if (ballsRef.current.length > 1) {
        let anyBallHit = false;
        ballsRef.current = ballsRef.current.filter(ball => {
          const dx = (p.x + p.width / 2) - ball.x;
          const dy = (p.y + p.height / 2) - ball.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < ball.radius + Math.max(p.width, p.height) / 2) {
             delete trailRef.current[ball.id];
             anyBallHit = true;
             return false;
          }
          return true;
        });
        if (anyBallHit) playSound('hit');
      }

      if (
        p.x < paddle.x + paddle.width &&
        p.x + p.width > paddle.x &&
        p.y < paddle.y + paddle.height &&
        p.y + p.height > paddle.y
      ) {
        const relativeX = p.x - paddle.x;
        paddle.holes.push({ x: relativeX, width: p.width });
        playSound('hit');
        return false;
      }
      return p.y < dimensions.height;
    });

    let activeBalls = [...ballsRef.current];
    const newSpawnedBalls: Ball[] = [];
    const ballsToRemove: number[] = [];

    for (let bIdx = 0; bIdx < activeBalls.length; bIdx++) {
      const ball = activeBalls[bIdx];
      if (!trailRef.current[ball.id]) trailRef.current[ball.id] = [];
      trailRef.current[ball.id].push({ x: ball.x, y: ball.y, color: ball.color });
      if (trailRef.current[ball.id].length > 15) trailRef.current[ball.id].shift();

      ball.x += ball.dx;
      ball.y += ball.dy;

      if (ball.x + ball.radius > dimensions.width) {
        ball.dx = -Math.abs(ball.dx); ball.x = dimensions.width - ball.radius; playSound('wall');
      } else if (ball.x - ball.radius < 0) {
        ball.dx = Math.abs(ball.dx); ball.x = ball.radius; playSound('wall');
      }
      if (ball.y - ball.radius < 0) {
        ball.dy = Math.abs(ball.dy); ball.y = ball.radius; playSound('wall');
      }

      if (ball.y + ball.radius > dimensions.height) {
        ballsToRemove.push(ball.id);
        continue;
      }

      if (
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width &&
        ball.dy > 0
      ) {
        const relativeX = ball.x - paddle.x;
        const hittingHole = paddle.holes.some(h => relativeX >= h.x && relativeX <= h.x + h.width);

        if (!hittingHole) {
          ball.dy = -Math.abs(currentSpeed);
          ball.y = paddle.y - ball.radius;
          const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
          let newDx = hitPos * currentSpeed * 1.5;
          if (Math.abs(newDx) < 0.8) newDx = (newDx >= 0 ? 0.8 : -0.8);
          ball.dx = newDx;
          ball.color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
          paddle.color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
          playSound('paddle');
        }
      }

      let overlappedEnemyId: string | undefined = undefined;
      for (const enemy of ghosts) {
        if (enemy.isDead) continue;
        if (
          ball.x + ball.radius > enemy.x &&
          ball.x - ball.radius < enemy.x + enemy.width &&
          ball.y + ball.radius > enemy.y &&
          ball.y - ball.radius < enemy.y + enemy.height
        ) {
          overlappedEnemyId = enemy.id;
          
          if (enemy.health !== undefined) {
            enemy.health -= 1;
            if (enemy.health <= 0) {
              enemy.isDead = true;
              createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.isOgre ? COLORS.OGRE_GREEN : COLORS.GHOST_BLUE);
              setGameState(prev => ({ ...prev, score: prev.score + 1000 }));
            }
          }

          if (enemy.isSmallest && ball.lastSpawnId !== enemy.id) {
            if (activeBalls.length + newSpawnedBalls.length < MAX_BALLS) {
              newSpawnedBalls.push({
                id: Date.now() + Math.random(),
                x: ball.x,
                y: ball.y,
                dx: (Math.random() - 0.5) * currentSpeed * 2,
                dy: -Math.abs(currentSpeed),
                radius: BALL_RADIUS,
                color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
                lastSpawnId: enemy.id
              });
              playSound('spawn');
            }
          }
          ball.lastSpawnId = enemy.id;
          enemy.isHit = !enemy.isHit; // Toggles color on each touch
          if (enemy.isHit) setGameState(prev => ({ ...prev, score: prev.score + 50 }));
          playSound('ghost');
          const centerX = enemy.x + enemy.width / 2;
          const centerY = enemy.y + enemy.height / 2;
          const dx = ball.x - centerX;
          const dy = ball.y - centerY;
          if (Math.abs(dx) / enemy.width > Math.abs(dy) / enemy.height) {
            ball.dx = Math.sign(dx) * currentSpeed;
            ball.dy = ((ball.y - centerY) / (enemy.height / 2)) * currentSpeed * 0.8;
          } else {
            ball.dy = Math.sign(dy) * currentSpeed;
            ball.dx = ((ball.x - centerX) / (enemy.width / 2)) * currentSpeed * 1.2;
          }
          ball.x += ball.dx; ball.y += ball.dy;
          break; 
        }
      }
      if (!overlappedEnemyId) ball.lastSpawnId = undefined;

      const charWidth = (grid[0]?.length || 0) * currentPixelSize;
      const charHeight = (grid?.length || 0) * currentPixelSize;
      if (charWidth > 0) {
        const charX = (dimensions.width - charWidth) / 2;
        const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2));
        
        // Refuerzo: Comprobación perimetral (4 puntos + centro)
        const checkPoints = [
          { x: ball.x, y: ball.y },
          { x: ball.x - ball.radius, y: ball.y },
          { x: ball.x + ball.radius, y: ball.y },
          { x: ball.x, y: ball.y - ball.radius },
          { x: ball.x, y: ball.y + ball.radius }
        ];

        let collisionProcessed = false;
        for (const pt of checkPoints) {
          if (collisionProcessed) break;
          const gx = Math.floor((pt.x - charX) / currentPixelSize);
          const gy = Math.floor((pt.y - charY) / currentPixelSize);

          if (gx >= 0 && gx < (grid[0]?.length || 0) && gy >= 0 && gy < grid.length) {
            const pVal = grid[gy][gx];
            if (pVal === PixelType.EMPTY) continue;

            const pixelCenterX = charX + gx * currentPixelSize + currentPixelSize / 2;
            const pixelCenterY = charY + gy * currentPixelSize + currentPixelSize / 2;
            const pDiffX = ball.x - pixelCenterX;
            const pDiffY = ball.y - pixelCenterY;

            if (pVal === PixelType.METAL) {
              if (Math.abs(pDiffX) > Math.abs(pDiffY)) {
                ball.dx = Math.abs(ball.dx) * (pDiffX > 0 ? 1 : -1);
                ball.x = pixelCenterX + (Math.sign(pDiffX) * (currentPixelSize / 2 + ball.radius + 1));
              } else {
                ball.dy = Math.abs(ball.dy) * (pDiffY > 0 ? 1 : -1);
                ball.y = pixelCenterY + (Math.sign(pDiffY) * (currentPixelSize / 2 + ball.radius + 1));
              }
              playSound('wall');
              collisionProcessed = true;
            } else {
              grid[gy][gx] = PixelType.EMPTY;
              if (Math.abs(pDiffX) > Math.abs(pDiffY)) ball.dx *= -1;
              else ball.dy *= -1;
              setGameState(prev => ({ ...prev, score: prev.score + 10 }));
              playSound('hit');
              collisionProcessed = true;
            }
          }
        }
      }
    }

    ballsToRemove.forEach(id => delete trailRef.current[id]);
    ballsRef.current = activeBalls.filter(b => !ballsToRemove.includes(b.id)).concat(newSpawnedBalls);
    
    if (ballsRef.current.length === 0) {
      setGameState(prev => ({ ...prev, isGameOver: true, started: false }));
      playSound('lose');
    }

    ghostsRef.current = ghosts.filter(g => !g.isDead);
    ghostsRef.current.forEach((enemy, index) => {
      enemy.x += enemy.vx; enemy.y += enemy.vy;
      if (enemy.x <= 0) { enemy.vx = Math.abs(enemy.vx); enemy.x = 0; }
      else if (enemy.x + enemy.width >= dimensions.width) { enemy.vx = -Math.abs(enemy.vx); enemy.x = dimensions.width - enemy.width; }
      
      if (enemy.y <= 0) { enemy.vy = Math.abs(enemy.vy); enemy.y = 0; }
      else if (enemy.y + enemy.height >= dimensions.height * 0.7) { 
        enemy.vy = -Math.abs(enemy.vy); 
        enemy.y = dimensions.height * 0.7 - enemy.height; 
      }

      const isFiringEnemy = 
        (gameState.level === 2 && enemy.isLargest) || 
        (gameState.level === 3 && (enemy.isLargest || index === 4)) ||
        (gameState.level === 4 && (enemy.isLargest || enemy.id === 'enemy-4' || enemy.id === 'enemy-3')) ||
        ((gameState.level === 5 || gameState.level === 6) && (enemy.id === 'enemy-4' || enemy.id === 'enemy-3'));

      if (isFiringEnemy) {
        if ((enemy.fireCooldown || 0) <= 0 && ballsRef.current.length >= 2) {
          projectilesRef.current.push({
            id: Date.now() + Math.random(),
            x: enemy.x + enemy.width / 2 - 7,
            y: enemy.y + enemy.height,
            vx: 0,
            vy: FIRE_SPEED,
            width: 15,
            height: 20
          });
          enemy.fireCooldown = 180; 
          playSound('spawn');
        }
      }
      if ((enemy.fireCooldown || 0) > 0) enemy.fireCooldown! -= 1;
    });

    const pixelsRemaining = grid.flat().filter(p => p !== PixelType.EMPTY && p !== PixelType.METAL).length;
    const isFigureCleared = pixelsRemaining === 0;
    
    if (isFigureCleared) {
      const isFinalLevel = gameState.level === 6;
      if (isFinalLevel) {
        setGameState(prev => ({ ...prev, isWin: true, started: false }));
      } else {
        setGameState(prev => ({ ...prev, isLevelCleared: true, started: false }));
      }

      if (deviceType !== 'desktop' && 'vibrate' in navigator) {
        navigator.vibrate(200);
      } else {
        playSound('win');
      }
    }
  }, [gameState.isPaused, gameState.started, gameState.view, gameState.speedMultiplier, gameState.level, gameState.isWin, gameState.isGameOver, gameState.isLevelCleared, getDynamicPixelSize, playSound, dimensions.width, dimensions.height, deviceType]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState.view === 'playing' && [1, 2, 3, 4, 5, 6].includes(gameState.level)) {
      drawDynamicBackground(ctx, dimensions.width, dimensions.height, gameState.level);
    } else {
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
    }

    if (gameState.view !== 'playing' && !gameState.isGameOver && !gameState.isWin && !gameState.isLevelCleared) return;

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    const neonIndex = Math.floor(frameCounterRef.current / 29) % NEON_COLORS.length;
    const neonColor = NEON_COLORS[neonIndex];

    projectilesRef.current.forEach(p => {
      const pScale = p.width / FIRE_DATA[0].length;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.FIRE_ORANGE;
      for(let y=0; y<FIRE_DATA.length; y++) {
        for(let x=0; x<FIRE_DATA[y].length; x++) {
          if(FIRE_DATA[y][x] === 0) continue;
          ctx.fillStyle = FIRE_DATA[y][x] === 1 ? COLORS.FIRE_ORANGE : COLORS.FIRE_YELLOW;
          ctx.fillRect(p.x + x * pScale, p.y + y * pScale, pScale, pScale);
        }
      }
      ctx.restore();
    });

    ghostsRef.current.forEach(enemy => {
      const activeGrid = enemy.isOgre ? HAPPY_FACE_DATA : GHOST_DATA;
      const gPixelSize = enemy.pixelSize;
      
      ctx.save();
      
      let bodyColor;
      if (enemy.isOgre) {
        if (enemy.isSmallest) {
          bodyColor = neonColor;
        } else {
          bodyColor = enemy.isHit ? COLORS.OGRE_BROWN : COLORS.OGRE_GREEN;
        }
        ctx.shadowBlur = (enemy.isHit || enemy.isSmallest) ? 25 : 15;
        ctx.shadowColor = bodyColor;
      } else {
        bodyColor = enemy.isSmallest ? neonColor : (enemy.isHit ? COLORS.GHOST_BLUE : COLORS.GHOST_PINK);
        ctx.shadowBlur = (enemy.isHit || enemy.isSmallest) ? 20 : 10;
        ctx.shadowColor = bodyColor;
      }

      for (let y = 0; y < activeGrid.length; y++) {
        for (let x = 0; x < activeGrid[y].length; x++) {
          const pixel = activeGrid[y][x];
          if (pixel === PixelType.EMPTY) continue;
          
          if (enemy.isOgre) {
            if (pixel === PixelType.OGRE_BODY) {
              ctx.fillStyle = bodyColor;
            } else {
              ctx.fillStyle = COLORS.OGRE_EYE;
            }
          } else {
            if (pixel === PixelType.GHOST_BODY) {
                ctx.fillStyle = bodyColor;
            } else {
                ctx.fillStyle = COLORS.GHOST_EYE;
            }
          }
          ctx.fillRect(enemy.x + x * gPixelSize, enemy.y + y * gPixelSize, gPixelSize, gPixelSize);
        }
      }

      if (enemy.health !== undefined && enemy.maxHealth !== undefined) {
        const barW = enemy.width;
        const barH = 8;
        const barX = enemy.x;
        const barY = enemy.y - 15;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        const currentW = (enemy.health / enemy.maxHealth) * barW;
        ctx.fillStyle = enemy.isOgre ? bodyColor : '#FF3131'; 
        ctx.fillRect(barX, barY, currentW, barH);
        ctx.save();
        ctx.strokeStyle = '#FFFFFF'; 
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.restore();
      }
      ctx.restore();
    });

    const grid = charGridRef.current;
    if (grid[0]?.length > 1) {
      const currentPixelSize = getDynamicPixelSize(grid[0].length);
      const charWidth = grid[0].length * currentPixelSize;
      const charHeight = grid.length * currentPixelSize;
      const charX = (dimensions.width - charWidth) / 2;
      const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2));

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          const pixel = grid[y][x];
          if (pixel === PixelType.EMPTY) continue;
          switch (pixel) {
            case PixelType.WIZARD_CLOAK: ctx.fillStyle = COLORS.WIZARD_BLUE; break;
            case PixelType.WIZARD_BEARD: ctx.fillStyle = COLORS.WIZARD_BEARD; break;
            case PixelType.WIZARD_SKIN: ctx.fillStyle = COLORS.WIZARD_SKIN; break;
            case PixelType.WIZARD_BROWN: ctx.fillStyle = COLORS.WIZARD_BROWN; break;
            case PixelType.WIZARD_BLACK: ctx.fillStyle = COLORS.WIZARD_BLACK; break;
            case PixelType.SPIDER_BODY_LIME: ctx.fillStyle = COLORS.SPIDER_BODY_LIME; break;
            case PixelType.SPIDER_BODY_GREEN: ctx.fillStyle = COLORS.SPIDER_BODY_GREEN; break;
            case PixelType.SPIDER_BODY_DARK: ctx.fillStyle = COLORS.SPIDER_BODY_DARK; break;
            case PixelType.SPIDER_LEGS: ctx.fillStyle = COLORS.SPIDER_LEGS; break;
            case PixelType.RAT_FUR_MID: ctx.fillStyle = COLORS.RAT_FUR_MID; break;
            case PixelType.RAT_FUR_DARK: ctx.fillStyle = COLORS.RAT_FUR_DARK; break;
            case PixelType.RAT_FUR_LIGHT: ctx.fillStyle = COLORS.RAT_FUR_LIGHT; break;
            case PixelType.RAT_BELLY: ctx.fillStyle = COLORS.RAT_BELLY; break;
            case PixelType.RAT_PINK: ctx.fillStyle = COLORS.RAT_PINK; break;
            case PixelType.RAT_EYE: ctx.fillStyle = COLORS.RAT_EYE; break;
            case PixelType.RAT_OUTLINE: ctx.fillStyle = COLORS.RAT_OUTLINE; break;
            case PixelType.METAL: ctx.fillStyle = COLORS.METAL_GREY; break;
            case PixelType.LAB_BLUE: ctx.fillStyle = COLORS.LAB_BLUE; break;
          }
          ctx.fillRect(charX + x * currentPixelSize, charY + y * currentPixelSize, currentPixelSize, currentPixelSize);
        }
      }
    }

    const paddle = paddleRef.current;
    ctx.save();
    ctx.fillStyle = paddle.color;
    if (paddle.color !== COLORS.PADDLE) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = paddle.color;
    }
    let startX = 0;
    const sortedHoles = [...paddle.holes].sort((a, b) => a.x - b.x);
    sortedHoles.forEach(hole => {
      if (hole.x > startX) {
        ctx.fillRect(paddle.x + startX, paddle.y, hole.x - startX, paddle.height);
      }
      startX = Math.max(startX, hole.x + hole.width);
    });
    if (startX < paddle.width) {
      ctx.fillRect(paddle.x + startX, paddle.y, paddle.width - startX, paddle.height);
    }
    ctx.restore();

    ballsRef.current.forEach(ball => {
      const points = trailRef.current[ball.id] || [];
      points.forEach((point, index) => {
        const alpha = (index + 1) / points.length;
        const size = ball.radius * 2 * (alpha * 0.7 + 0.3);
        ctx.save();
        ctx.fillStyle = point.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillRect(point.x - size/2, point.y - size/2, size, size);
        ctx.restore();
      });

      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color; 
      if (ball.color !== COLORS.BALL) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = ball.color;
      }
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    });

  }, [dimensions, gameState.level, gameState.view, gameState.isGameOver, gameState.isWin, gameState.isLevelCleared, getDynamicPixelSize]);

  const loop = useCallback(() => {
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [loop]);

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-gray-950 text-white font-['Press_Start_2P'] select-none">
      <div className="z-10 w-full p-4 flex flex-col items-center bg-gray-900/50 backdrop-blur-md border-b border-gray-800">
        <h1 className="text-sm md:text-lg lg:text-2xl font-bold mb-2 tracking-widest text-blue-400 text-center">
          ROMPEMAGOS
        </h1>
        <div className="flex justify-between w-full max-w-4xl px-2 items-center">
          <div className="flex flex-col items-start uppercase text-[8px] md:text-[10px]">
             <span className="text-gray-500 mb-1">Velocidad: {Math.round(gameState.speedMultiplier * 100)}%</span>
             <input 
              type="range" min="0.1" max="1.5" step="0.05" value={gameState.speedMultiplier}
              onChange={(e) => setGameState(prev => ({ ...prev, speedMultiplier: parseFloat(e.target.value) }))}
              className="w-20 md:w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            <button 
              onClick={togglePauseLocal} disabled={!gameState.started || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared}
              className={`p-2 rounded transition-all active:scale-95 ${(!gameState.started || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared) ? 'opacity-30' : 'bg-blue-600 hover:bg-blue-500 border-b-2 border-blue-800'}`}
            >
              {gameState.isPaused ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              )}
            </button>
            <p className="text-[10px] md:text-sm uppercase">Puntaje: <span className="text-yellow-400">{gameState.score}</span></p>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden touch-none"
        onTouchMove={handleTouch}
        onTouchStart={handleTouch}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="max-w-full max-h-full shadow-2xl bg-black"
        />

        {gameState.view === 'start' && !gameState.isGameOver && !gameState.isWin && !gameState.isLevelCleared && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center z-20">
            <h2 className="text-lg md:text-2xl mb-8 text-blue-300 uppercase tracking-widest animate-pulse">ELIGE TU DESTINO</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs items-stretch">
              <button
                onClick={() => initGame(1)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-[10px] md:text-xs transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
              >
                INICIAR MISIÓN
              </button>
              <button
                onClick={() => setView('levelSelect')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 text-[10px] md:text-xs transition-all border-b-4 border-purple-800 active:border-b-0 active:translate-y-1"
              >
                SELECCIONAR NIVEL
              </button>
              <div className="mt-4 flex justify-center">
                <KofiButton />
              </div>
            </div>
          </div>
        )}

        {gameState.view === 'levelSelect' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-20 overflow-y-auto">
            <h2 className="text-lg md:text-2xl mb-12 text-yellow-400 uppercase tracking-widest">SELECCIONAR NIVEL</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4 pb-8">
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <button 
                  key={l}
                  onClick={() => initGame(l)} 
                  className={`group flex flex-col items-center p-6 bg-opacity-30 border-2 transition-all rounded-lg ${
                    l === 1 ? 'bg-blue-900 border-blue-600 hover:bg-blue-600/20' :
                    l === 2 ? 'bg-red-900 border-red-600 hover:bg-red-600/20' :
                    l === 3 ? 'bg-orange-900 border-orange-600 hover:bg-orange-600/20' :
                    l === 4 ? 'bg-purple-900 border-purple-600 hover:bg-purple-600/20' :
                    l === 5 ? 'bg-green-900 border-green-600 hover:bg-green-600/20' :
                    'bg-slate-900 border-slate-500 hover:bg-slate-600/20'
                  }`}
                >
                  <span className="text-[10px] md:text-xs mb-2 text-white">NIVEL {l}</span>
                  <span className="text-[8px] uppercase">
                    {l === 1 ? 'MISIÓN DE LAVA' :
                     l === 2 ? 'ENERGÍA FRÍA' :
                     l === 3 ? 'LODO TÓXICO' :
                     l === 4 ? 'FANTASMA ÉLITE' :
                     l === 5 ? 'SONRISA DEL PANTANO' :
                     'EL LABERINTO FINAL'}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setView('start')}
              className="mt-6 text-gray-500 hover:text-white text-[8px] md:text-[10px] uppercase underline underline-offset-4"
            >
              VOLVER AL INICIO
            </button>
          </div>
        )}

        {gameState.isPaused && gameState.view === 'playing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
            <h2 className="text-2xl md:text-4xl mb-8 text-yellow-400 animate-pulse tracking-widest">PAUSADO</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button onClick={togglePauseLocal} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">REANUDAR</button>
              <button onClick={() => setView('start')} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1">SALIR AL MENÚ</button>
            </div>
          </div>
        )}

        {gameState.isLevelCleared && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <h2 className="text-xl md:text-2xl mb-4 text-green-400 uppercase tracking-widest">¡NIVEL COMPLETADO!</h2>
            <p className="text-[10px] md:text-xs mb-8 text-gray-300">EL DESAFÍO FINAL TE ESPERA...</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button
                onClick={() => initGame(gameState.level + 1)}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 text-xs transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
              >
                IR AL NIVEL {gameState.level + 1}
              </button>
              <button onClick={() => setView('levelSelect')} className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 text-[10px] transition-all border-b-4 border-gray-900 active:border-b-0 active:translate-y-1">VOLVER AL MENÚ</button>
            </div>
          </div>
        )}

        {(gameState.isGameOver || gameState.isWin) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <h2 className={`text-xl md:text-2xl mb-4 ${gameState.isWin ? 'text-green-400' : 'text-red-500'} uppercase tracking-widest text-center px-4`}>
              {gameState.isWin ? '¡BENDICIÓN DE LAS CARAS FELICES! MISIÓN COMPLETADA' : 'MISIÓN FALLIDA'}
            </h2>
            <p className="text-xs md:text-sm mb-8">PUNTAJE FINAL: {gameState.score}</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4 items-stretch">
              <button onClick={() => initGame(gameState.level)} className="bg-white text-black px-8 py-4 text-xs transition-all border-b-4 border-gray-400 active:border-b-0 active:translate-y-1">{gameState.isWin ? 'JUGAR DE NUEVO' : 'REINTENTAR'}</button>
              <button onClick={() => setView('start')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">VOLVER AL MENÚ</button>
              <div className="mt-4 flex justify-center">
                <KofiButton />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex p-4 text-[8px] text-gray-600 uppercase gap-8 border-t border-gray-900 w-full justify-center">
        <span>FLECHAS: Moverse</span>
        <span>P / ESC: Pausar</span>
        {gameState.view === 'playing' && <span>NIVEL: {gameState.level}</span>}
      </div>
    </div>
  );
};

export default Game;
