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
  GHOST_DATA,
  FIRE_DATA,
  FIRE_SPEED,
  COLORS,
  NEON_COLORS
} from '../constants';
import { Ball, Paddle, PixelType, GameState, GameView, Ghost, Projectile, Particle } from '../types';

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
    const maxCharacterWidth = dimensions.width * (dimensions.width < 640 ? 0.7 : 0.5);
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
    charGridRef.current = (lvl === 1 ? WIZARD_DATA : SPIDER_64_DATA).map(row => [...row]);
    
    const spawnAreas = [
      { x: 0.15, y: 0.25 }, { x: 0.35, y: 0.15 }, { x: 0.65, y: 0.15 },
      { x: 0.85, y: 0.25 }, { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }
    ];

    ghostsRef.current = spawnAreas.map((area, index) => {
      const baseScale = PIXEL_SIZE * 0.6;
      const scaleMultiplier = 0.6 + (index * 0.2);
      const gPixelSize = baseScale * scaleMultiplier;
      const gw = GHOST_DATA[0].length * gPixelSize;
      const gh = GHOST_DATA.length * gPixelSize;
      
      const ghost: Ghost = {
        id: `ghost-${index}`,
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
        fireCooldown: lvl >= 2 ? 180 : 0 
      };

      if (lvl === 4 && index === 3) {
        ghost.health = 30;
        ghost.maxHealth = 30;
      }

      return ghost;
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
    const currentPixelSize = getDynamicPixelSize(grid[0].length);

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.02;
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

      let overlappedGhostId: string | undefined = undefined;
      for (const ghost of ghosts) {
        if (ghost.isDead) continue;
        if (
          ball.x + ball.radius > ghost.x &&
          ball.x - ball.radius < ghost.x + ghost.width &&
          ball.y + ball.radius > ghost.y &&
          ball.y - ball.radius < ghost.y + ghost.height
        ) {
          overlappedGhostId = ghost.id;
          
          if (ghost.health !== undefined) {
            ghost.health -= 1;
            if (ghost.health <= 0) {
              ghost.isDead = true;
              createExplosion(ghost.x + ghost.width / 2, ghost.y + ghost.height / 2, COLORS.GHOST_BLUE);
              setGameState(prev => ({ ...prev, score: prev.score + 1000 }));
            }
          }

          if (ghost.isSmallest && ball.lastSpawnId !== ghost.id) {
            if (activeBalls.length + newSpawnedBalls.length < MAX_BALLS) {
              newSpawnedBalls.push({
                id: Date.now() + Math.random(),
                x: ball.x,
                y: ball.y,
                dx: (Math.random() - 0.5) * currentSpeed * 2,
                dy: -Math.abs(currentSpeed),
                radius: BALL_RADIUS,
                color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
                lastSpawnId: ghost.id
              });
              playSound('spawn');
            }
          }
          ball.lastSpawnId = ghost.id;
          ghost.isHit = !ghost.isHit;
          if (ghost.isHit) setGameState(prev => ({ ...prev, score: prev.score + 50 }));
          playSound('ghost');
          const ghostCenterX = ghost.x + ghost.width / 2;
          const ghostCenterY = ghost.y + ghost.height / 2;
          const dx = ball.x - ghostCenterX;
          const dy = ball.y - ghostCenterY;
          if (Math.abs(dx) / ghost.width > Math.abs(dy) / ghost.height) {
            ball.dx = Math.sign(dx) * currentSpeed;
            ball.dy = ((ball.y - ghostCenterY) / (ghost.height / 2)) * currentSpeed * 0.8;
          } else {
            ball.dy = Math.sign(dy) * currentSpeed;
            ball.dx = ((ball.x - ghostCenterX) / (ghost.width / 2)) * currentSpeed * 1.2;
          }
          ball.x += ball.dx; ball.y += ball.dy;
          break; 
        }
      }
      if (!overlappedGhostId) ball.lastSpawnId = undefined;

      const charWidth = grid[0].length * currentPixelSize;
      const charHeight = grid.length * currentPixelSize;
      const charX = (dimensions.width - charWidth) / 2;
      const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2));
      const gx = Math.floor((ball.x - charX) / currentPixelSize);
      const gy = Math.floor((ball.y - charY) / currentPixelSize);

      if (gx >= 0 && gx < grid[0].length && gy >= 0 && gy < grid.length) {
        if (grid[gy][gx] !== PixelType.EMPTY) {
          grid[gy][gx] = PixelType.EMPTY;
          const pixelCenterX = charX + gx * currentPixelSize + currentPixelSize / 2;
          const pixelCenterY = charY + gy * currentPixelSize + currentPixelSize / 2;
          if (Math.abs(ball.x - pixelCenterX) > Math.abs(ball.y - pixelCenterY)) ball.dx *= -1;
          else ball.dy *= -1;
          setGameState(prev => ({ ...prev, score: prev.score + 10 }));
          playSound('hit');
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
    ghostsRef.current.forEach((ghost, index) => {
      ghost.x += ghost.vx; ghost.y += ghost.vy;
      if (ghost.x <= 0) { ghost.vx = Math.abs(ghost.vx); ghost.x = 0; }
      else if (ghost.x + ghost.width >= dimensions.width) { ghost.vx = -Math.abs(ghost.vx); ghost.x = dimensions.width - ghost.width; }
      
      if (ghost.y <= 0) { ghost.vy = Math.abs(ghost.vy); ghost.y = 0; }
      else if (ghost.y + ghost.height >= dimensions.height * 0.7) { 
        ghost.vy = -Math.abs(ghost.vy); 
        ghost.y = dimensions.height * 0.7 - ghost.height; 
      }

      const isFiringGhost = 
        (gameState.level === 2 && ghost.isLargest) || 
        (gameState.level === 3 && (ghost.isLargest || index === 4)) ||
        (gameState.level === 4 && (ghost.isLargest || ghost.id === 'ghost-4' || ghost.id === 'ghost-3'));

      if (isFiringGhost) {
        if ((ghost.fireCooldown || 0) <= 0 && ballsRef.current.length >= 2) {
          projectilesRef.current.push({
            id: Date.now() + Math.random(),
            x: ghost.x + ghost.width / 2 - 7,
            y: ghost.y + ghost.height,
            vx: 0,
            vy: FIRE_SPEED,
            width: 15,
            height: 20
          });
          ghost.fireCooldown = 180; 
          playSound('spawn');
        }
      }
      if ((ghost.fireCooldown || 0) > 0) ghost.fireCooldown! -= 1;
    });

    const remaining = grid.flat().some(p => p !== PixelType.EMPTY);
    if (!remaining) {
      if (gameState.level < 4) {
        setGameState(prev => ({ ...prev, isLevelCleared: true, started: false }));
        if (deviceType === 'desktop') {
          playSound('win');
        } else {
          if ('vibrate' in navigator) navigator.vibrate(200);
        }
      } else {
        setGameState(prev => ({ ...prev, isWin: true, started: false }));
        if (deviceType === 'desktop') {
          playSound('win');
        } else {
          if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 300]);
        }
      }
    }
  }, [gameState.isPaused, gameState.started, gameState.view, gameState.speedMultiplier, gameState.level, gameState.isWin, gameState.isGameOver, gameState.isLevelCleared, getDynamicPixelSize, playSound, dimensions.width, dimensions.height, deviceType]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    if (gameState.view !== 'playing' && !gameState.isGameOver && !gameState.isWin && !gameState.isLevelCleared) return;

    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    const neonIndex = Math.floor(frameCounterRef.current / 8) % NEON_COLORS.length;
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

    ghostsRef.current.forEach(ghost => {
      const gGrid = GHOST_DATA;
      const gPixelSize = ghost.pixelSize;
      ctx.save();
      ctx.shadowBlur = (ghost.isHit || ghost.isSmallest || ghost.isLargest) ? 20 : 10;
      ctx.shadowColor = ghost.isSmallest ? neonColor : (ghost.isHit ? COLORS.GHOST_BLUE : COLORS.GHOST_PINK);
      for (let y = 0; y < gGrid.length; y++) {
        for (let x = 0; x < gGrid[y].length; x++) {
          const pixel = gGrid[y][x];
          if (pixel === PixelType.EMPTY) continue;
          if (pixel === PixelType.GHOST_BODY) {
            ctx.fillStyle = ghost.isSmallest ? neonColor : (ghost.isHit ? COLORS.GHOST_BLUE : COLORS.GHOST_PINK);
          } else {
            ctx.fillStyle = COLORS.GHOST_EYE;
          }
          ctx.fillRect(ghost.x + x * gPixelSize, ghost.y + y * gPixelSize, gPixelSize, gPixelSize);
        }
      }

      if (ghost.health !== undefined && ghost.maxHealth !== undefined) {
        const barW = ghost.width;
        const barH = 8;
        const barX = ghost.x;
        const barY = ghost.y - 18;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(barX, barY, barW, barH);
        
        const currentW = (ghost.health / ghost.maxHealth) * barW;
        ctx.fillStyle = '#FF3131'; // Barra de salud Roja (Neon Red)
        ctx.fillRect(barX, barY, currentW, barH);
        
        ctx.save();
        ctx.strokeStyle = '#00F3FF'; // Contorno Azul Brillante (Neon Blue)
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00F3FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.restore();
      }

      ctx.restore();
    });

    const grid = charGridRef.current;
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
        }
        ctx.fillRect(charX + x * currentPixelSize, charY + y * currentPixelSize, currentPixelSize, currentPixelSize);
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
        <h1 className="text-sm md:text-lg lg:text-2xl font-bold mb-2 tracking-widest text-blue-400">
          WIZARD BREAKER
        </h1>
        <div className="flex justify-between w-full max-w-4xl px-2 items-center">
          <div className="flex flex-col items-start uppercase text-[8px] md:text-[10px]">
             <span className="text-gray-500 mb-1">Speed: {Math.round(gameState.speedMultiplier * 100)}%</span>
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
            <p className="text-[10px] md:text-sm uppercase">Score: <span className="text-yellow-400">{gameState.score}</span></p>
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
            <h2 className="text-lg md:text-2xl mb-8 text-blue-300 uppercase tracking-widest animate-pulse">CHOOSE YOUR FATE</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <button
                onClick={() => initGame(1)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-[10px] md:text-xs transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
              >
                START QUEST
              </button>
              <button
                onClick={() => setView('levelSelect')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 text-[10px] md:text-xs transition-all border-b-4 border-purple-800 active:border-b-0 active:translate-y-1"
              >
                SELECT LEVEL
              </button>
            </div>
          </div>
        )}

        {gameState.view === 'levelSelect' && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center z-20 overflow-y-auto">
            <h2 className="text-lg md:text-2xl mb-12 text-yellow-400 uppercase tracking-widest">SELECT LEVEL</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl px-4">
              <button onClick={() => initGame(1)} className="group flex flex-col items-center p-6 bg-blue-900/30 border-2 border-blue-600 hover:bg-blue-600/20 transition-all rounded-lg">
                <span className="text-[10px] md:text-xs mb-2 text-white">LEVEL 1</span>
                <span className="text-[8px] text-blue-300">NO FIRE</span>
              </button>

              <button onClick={() => initGame(2)} className="group flex flex-col items-center p-6 bg-red-900/30 border-2 border-red-600 hover:bg-red-600/20 transition-all rounded-lg">
                <span className="text-[10px] md:text-xs mb-2 text-white">LEVEL 2</span>
                <span className="text-[8px] text-red-300">1 FIRE GHOST</span>
              </button>

              <button onClick={() => initGame(3)} className="group flex flex-col items-center p-6 bg-orange-900/30 border-2 border-orange-600 hover:bg-orange-600/20 transition-all rounded-lg">
                <span className="text-[10px] md:text-xs mb-2 text-white">LEVEL 3</span>
                <span className="text-[8px] text-orange-300">2 FIRE GHOSTS</span>
              </button>

              <button onClick={() => initGame(4)} className="group flex flex-col items-center p-6 bg-purple-900/30 border-2 border-purple-600 hover:bg-purple-600/20 transition-all rounded-lg">
                <span className="text-[10px] md:text-xs mb-2 text-white">LEVEL 4</span>
                <span className="text-[8px] text-purple-300">ELITE GHOST</span>
              </button>
            </div>
            <button
              onClick={() => setView('start')}
              className="mt-12 text-gray-500 hover:text-white text-[8px] md:text-[10px] uppercase underline underline-offset-4"
            >
              BACK TO MAIN
            </button>
          </div>
        )}

        {gameState.isPaused && gameState.view === 'playing' && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
            <h2 className="text-2xl md:text-4xl mb-8 text-yellow-400 animate-pulse tracking-widest">PAUSED</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button onClick={togglePauseLocal} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">RESUME</button>
              <button onClick={() => setView('start')} className="bg-red-600 hover:bg-red-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-red-800 active:border-b-0 active:translate-y-1">QUIT TO MENU</button>
            </div>
          </div>
        )}

        {gameState.isLevelCleared && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <h2 className="text-xl md:text-2xl mb-4 text-green-400 uppercase tracking-widest">LEVEL CLEARED!</h2>
            <p className="text-[10px] md:text-xs mb-8 text-gray-300">THE TRUE CHALLENGE AWAITS...</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button
                onClick={() => initGame(gameState.level + 1)}
                className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 text-xs transition-all border-b-4 border-green-800 active:border-b-0 active:translate-y-1"
              >
                PROCEED TO LEVEL {gameState.level + 1}
              </button>
              <button onClick={() => setView('levelSelect')} className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-3 text-[10px] transition-all border-b-4 border-gray-900 active:border-b-0 active:translate-y-1">RETURN TO MENU</button>
            </div>
          </div>
        )}

        {(gameState.isGameOver || gameState.isWin) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <h2 className={`text-xl md:text-2xl mb-4 ${gameState.isWin ? 'text-green-400' : 'text-red-500'} uppercase tracking-widest`}>
              {gameState.isWin ? 'QUEST COMPLETE!' : 'QUEST FAILED'}
            </h2>
            <p className="text-xs md:text-sm mb-8">FINAL SCORE: {gameState.score}</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button onClick={() => initGame(gameState.level)} className="bg-white text-black px-8 py-4 text-xs transition-all border-b-4 border-gray-400 active:border-b-0 active:translate-y-1">{gameState.isWin ? 'PLAY AGAIN' : 'RETRY QUEST'}</button>
              <button onClick={() => setView('start')} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1">RETURN TO MENU</button>
            </div>
          </div>
        )}
      </div>

      <div className="hidden md:flex p-4 text-[8px] text-gray-600 uppercase gap-8 border-t border-gray-900 w-full justify-center">
        <span>ARROWS: Move</span>
        <span>P / ESC: Pause</span>
        {gameState.view === 'playing' && <span>LVL: {gameState.level}</span>}
      </div>
    </div>
  );
};

export default Game;