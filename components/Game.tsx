import { 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_SPEED, 
  BALL_RADIUS, 
  BALL_SPEED, 
  PIXEL_SIZE, 
  LEVEL_1_DATA, 
  LEVEL_2_DATA,
  LEVEL_3_DATA,
  LEVEL_5_DATA,
  LEVEL_6_DATA,
  LEVEL_7_DATA,
  LEVEL_8_DATA,
  LEVEL_9_DATA,
  LEVEL_10_DATA,
  LEVEL_12_DATA,
  LEVEL_13_DATA,
  SPIDER_64_DATA,
  LABYRINTH_DATA,
  GHOST_DATA,
  HAPPY_FACE_DATA,
  FIRE_DATA,
  FIRE_SPEED,
  COLORS,
  NEON_COLORS,
  BOTTLE_LABYRINTH_DATA,
  SHREK_FACE_DATA,
  KOFI_PHRASES
} from '../constants';
import { Ball, Paddle, PixelType, GameState, GameView, Ghost, Projectile, Particle } from '../types';
import KofiButton from './KofiButton';
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface TrailPoint {
  x: number;
  y: number;
  color: string;
}

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

const MAX_BALLS = 16;
const SPEED_STORAGE_KEY = 'wizard-breaker-speed-multiplier';
const COMPLETED_LEVELS_KEY = 'ogro-buchon-completed-levels-list';
const OGRA_PASSWORD = "NATITA113354";
const NATITA_PASSWORD = "NATITA113354";

export const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  // Password modal state
  const [activeSpecialModal, setActiveSpecialModal] = useState<'ogra' | 'natita' | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const getRandomKofiPhrase = useCallback(() => {
    return KOFI_PHRASES[Math.floor(Math.random() * KOFI_PHRASES.length)];
  }, []);

  const [gameState, setGameState] = useState<GameState>(() => {
    const savedSpeed = localStorage.getItem(SPEED_STORAGE_KEY);
    const savedLevels = localStorage.getItem(COMPLETED_LEVELS_KEY);
    return {
      score: 0,
      level: 1,
      completedLevels: savedLevels ? JSON.parse(savedLevels) : [],
      isGameOver: false,
      isWin: false,
      isLevelCleared: false,
      started: false,
      isPaused: false,
      speedMultiplier: savedSpeed ? parseFloat(savedSpeed) : 1.0,
      view: 'start',
      kofiPhrase: KOFI_PHRASES[Math.floor(Math.random() * KOFI_PHRASES.length)]
    };
  });

  const playClickSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine'; 
      osc.frequency.setValueAtTime(300, now); 
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.15); 

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (err) {
      console.warn("No se pudo generar el sonido de clic Bloop:", err);
    }
  }, []);

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
  const charGridRef = useRef<number[][]>(LEVEL_1_DATA.map(row => [...row]));
  const ghostsRef = useRef<Ghost[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const firefliesRef = useRef<Firefly[]>([]);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | undefined>(undefined);
  const frameCounterRef = useRef<number>(0);
  const floatXRef = useRef<number>(0);

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
    if (dimensions.width > 0 && firefliesRef.current.length === 0) {
      const flies: Firefly[] = [];
      for (let i = 0; i < 40; i++) {
        flies.push({
          x: Math.random() * dimensions.width,
          y: Math.random() * dimensions.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 2 + 1,
          phase: Math.random() * Math.PI * 2
        });
      }
      firefliesRef.current = flies;
    }
  }, [dimensions]);

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
    if (type === 'select') {
      playClickSound();
      return;
    }

    if (!audioCtxRef.current || gameState.isPaused) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
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
  }, [gameState.isPaused, playClickSound]);

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
    let bgColor = '#051a05';
    let gradientStart = 'rgba(5, 26, 5, 0)';
    let gradientMid = 'rgba(57, 255, 20, 0.1)';
    let gradientEnd = 'rgba(57, 255, 20, 0.3)';
    let particleColor1 = COLORS.SWAMP_GREEN;
    let particleColor2 = '#317700';

    if (level >= 1 && level <= 10) {
      bgColor = '#051a05';
      gradientMid = 'rgba(57, 255, 20, 0.15)';
      gradientEnd = 'rgba(57, 255, 20, 0.4)';
      particleColor1 = COLORS.SWAMP_GREEN;
      particleColor2 = '#317700';
    } else if (level === 11 || level === 12 || level === 13) {
      bgColor = '#001a00';
      gradientMid = 'rgba(57, 255, 20, 0.2)';
      gradientEnd = 'rgba(57, 255, 20, 0.5)';
      particleColor1 = COLORS.OGRE_GREEN;
      particleColor2 = COLORS.OGRE_SPOT;
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
    
    playClickSound();

    const py = getPaddleY(dimensions.height, deviceType);
    const currentPaddleWidth = (lvl === 9 || lvl === 10) ? PADDLE_WIDTH / 2 : PADDLE_WIDTH;
    paddleRef.current = {
      x: (dimensions.width - currentPaddleWidth) / 2,
      y: py,
      width: currentPaddleWidth,
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

    let levelData = LEVEL_1_DATA;
    if (lvl === 13) {
      levelData = LEVEL_13_DATA;
    } else if (lvl === 12) {
      levelData = LEVEL_12_DATA;
    } else if (lvl === 11) {
      levelData = SHREK_FACE_DATA;
    } else if (lvl === 10) {
      levelData = LEVEL_10_DATA;
    } else if (lvl === 9) {
      levelData = LEVEL_9_DATA;
    } else if (lvl === 8) {
      levelData = LEVEL_8_DATA;
    } else if (lvl === 7) {
      levelData = LEVEL_7_DATA;
    } else if (lvl === 6) {
      levelData = LEVEL_6_DATA;
    } else if (lvl === 5) {
      levelData = LEVEL_5_DATA;
    } else if (lvl === 4) {
      levelData = LEVEL_1_DATA;
    } else if (lvl === 3) {
      levelData = LEVEL_3_DATA;
    } else if (lvl === 2) {
      levelData = LEVEL_2_DATA;
    } else {
      levelData = LEVEL_1_DATA;
    }
    
    charGridRef.current = levelData.map(row => [...row]);
    
    const spawnAreas = [
      { x: 0.1, y: 0.2 }, { x: 0.3, y: 0.12 }, { x: 0.7, y: 0.12 },
      { x: 0.9, y: 0.2 }, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }
    ];

    ghostsRef.current = spawnAreas.map((area, index) => {
      const isOgreLevel = (lvl === 11 || lvl === 12 || lvl === 13);
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
        enemy.health = isOgreLevel ? 40 : 35;
        enemy.maxHealth = isOgreLevel ? 40 : 35;
      }

      return enemy;
    });

    setGameState(prev => ({ 
      ...prev, 
      level: lvl,
      score: (lvl === 1 || lvl === 12 || lvl === 13) ? 0 : prev.score, 
      isGameOver: false, 
      isWin: false, 
      isLevelCleared: false,
      isPaused: false, 
      started: true,
      view: 'playing'
    }));
  }, [dimensions, deviceType, getPaddleY, gameState.speedMultiplier, playClickSound]);

  const handleValidatePassword = () => {
    const targetPassword = activeSpecialModal === 'ogra' ? OGRA_PASSWORD : NATITA_PASSWORD;
    const targetLevel = activeSpecialModal === 'ogra' ? 12 : 13;
    
    if (passwordInput === targetPassword) {
      playSound('spawn');
      setActiveSpecialModal(null);
      setPasswordInput("");
      setPasswordError("");
      initGame(targetLevel);
    } else {
      playSound('hit');
      setPasswordError("Código inválido");
    }
  };

  const setView = useCallback((view: GameView) => {
    playClickSound();
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
      isPaused: false,
      kofiPhrase: (view === 'start' || view === 'levelSelect') ? getRandomKofiPhrase() : prev.kofiPhrase
    }));
  }, [playClickSound, getRandomKofiPhrase]);

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
    const time = Date.now() * 0.001;
    const floatX = (gameState.level >= 1 && gameState.level <= 10) ? Math.sin(time) * 15 : 0;
    floatXRef.current = floatX;

    firefliesRef.current.forEach(fly => {
      fly.x += fly.vx;
      fly.y += fly.vy;
      if (fly.x < 0) fly.x = dimensions.width;
      if (fly.x > dimensions.width) fly.x = 0;
      if (fly.y < 0) fly.y = dimensions.height;
      if (fly.y > dimensions.height) fly.y = 0;
      fly.phase += 0.05;
    });

    if (gameState.isPaused || !gameState.started || gameState.view !== 'playing' || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared) return;

    frameCounterRef.current++;
    const paddle = paddleRef.current;
    const grid = charGridRef.current;
    const ghosts = ghostsRef.current;
    const currentSpeed = BALL_SPEED * gameState.speedMultiplier;
    const currentPixelSize = getDynamicPixelSize(grid[0]?.length || 1);

    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.life -= 0.03; 
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

    // Physics Sub-stepping logic for levels 5-10
    const subSteps = (gameState.level >= 5 && gameState.level <= 10) ? 4 : 1;
    const MAX_VELOCITY = 20; // Emergency clamp

    for (let bIdx = 0; bIdx < activeBalls.length; bIdx++) {
      const ball = activeBalls[bIdx];
      
      // Clamp speeds for safety (emergency only)
      ball.dx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, ball.dx));
      ball.dy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, ball.dy));

      if (!trailRef.current[ball.id]) trailRef.current[ball.id] = [];
      trailRef.current[ball.id].push({ x: ball.x, y: ball.y, color: ball.color });
      if (trailRef.current[ball.id].length > 15) trailRef.current[ball.id].shift();

      for (let step = 0; step < subSteps; step++) {
        let collisionStep = false;
        
        // Move fractional amount per step
        ball.x += ball.dx / subSteps;
        ball.y += ball.dy / subSteps;

        // Wall collisions
        if (ball.x + ball.radius > dimensions.width) {
          ball.dx = -Math.abs(ball.dx); ball.x = dimensions.width - ball.radius; playSound('wall');
          collisionStep = true;
        } else if (ball.x - ball.radius < 0) {
          ball.dx = Math.abs(ball.dx); ball.x = ball.radius; playSound('wall');
          collisionStep = true;
        }
        if (ball.y - ball.radius < 0) {
          ball.dy = Math.abs(ball.dy); ball.y = ball.radius; playSound('wall');
          collisionStep = true;
        }

        if (ball.y + ball.radius > dimensions.height) {
          ballsToRemove.push(ball.id);
          collisionStep = true;
          break; // Stop steps if ball out of bounds
        }

        // Paddle collision
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
            playSound('paddle');
            collisionStep = true;
          }
        }

        // Ghost collision
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
            enemy.isHit = !enemy.isHit; 
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
            ball.x += ball.dx / subSteps; // Small push back
            collisionStep = true;
            break; 
          }
        }
        if (!overlappedEnemyId) ball.lastSpawnId = undefined;

        // Grid collision (Bricks/Obstacles)
        const charWidth = (grid[0]?.length || 0) * currentPixelSize;
        const charHeight = (grid?.length || 0) * currentPixelSize;
        if (charWidth > 0) {
          const charX = (dimensions.width - charWidth) / 2 + floatXRef.current;
          const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2));
          
          const checkPoints = [
            { x: ball.x, y: ball.y },
            { x: ball.x - ball.radius, y: ball.y },
            { x: ball.x + ball.radius, y: ball.y },
            { x: ball.x, y: ball.y - ball.radius },
            { x: ball.x, y: ball.y + ball.radius }
          ];

          let gridCollisionProcessed = false;
          for (const pt of checkPoints) {
            if (gridCollisionProcessed) break;
            const gxInt = Math.floor((pt.x - charX) / currentPixelSize);
            const gyInt = Math.floor((pt.y - charY) / currentPixelSize);

            if (gyInt >= 0 && gyInt < grid.length) {
              const row = grid[gyInt];
              if (gxInt >= 0 && gxInt < row.length) {
                const pVal = row[gxInt];
                if (pVal === undefined || pVal === PixelType.EMPTY) continue;

                const pixelCenterX = charX + gxInt * currentPixelSize + currentPixelSize / 2;
                const pixelCenterY = charY + gyInt * currentPixelSize + currentPixelSize / 2;
                const pDiffX = ball.x - pixelCenterX;
                const pDiffY = ball.y - pixelCenterY;

                if (pVal === PixelType.METAL) {
                  const overlapX = (currentPixelSize / 2 + ball.radius) - Math.abs(pDiffX);
                  const overlapY = (currentPixelSize / 2 + ball.radius) - Math.abs(pDiffY);
                  
                  if (overlapX < overlapY) {
                    ball.dx = Math.sign(pDiffX) * Math.abs(ball.dx);
                    ball.x = pixelCenterX + Math.sign(pDiffX) * (currentPixelSize / 2 + ball.radius + 0.5);
                  } else {
                    ball.dy = Math.sign(pDiffY) * Math.abs(ball.dy);
                    ball.y = pixelCenterY + Math.sign(pDiffY) * (currentPixelSize / 2 + ball.radius + 0.5);
                  }
                  playSound('wall');
                  gridCollisionProcessed = true;
                  collisionStep = true;
                } else if (pVal > 0) {
                  if (grid[gyInt][gxInt] !== PixelType.EMPTY) {
                    grid[gyInt][gxInt] = PixelType.EMPTY;
                  }
                  const overlapX = (currentPixelSize / 2 + ball.radius) - Math.abs(pDiffX);
                  const overlapY = (currentPixelSize / 2 + ball.radius) - Math.abs(pDiffY);
                  
                  if (overlapX < overlapY) {
                    ball.dx = Math.sign(pDiffX) * Math.abs(ball.dx);
                    ball.x = pixelCenterX + Math.sign(pDiffX) * (currentPixelSize / 2 + ball.radius + 0.1);
                  } else {
                    ball.dy = Math.sign(pDiffY) * Math.abs(ball.dy);
                    ball.y = pixelCenterY + Math.sign(pDiffY) * (currentPixelSize / 2 + ball.radius + 0.1);
                  }
                  
                  setGameState(prev => ({ ...prev, score: prev.score + 10 }));
                  playSound('hit');
                  gridCollisionProcessed = true;
                  collisionStep = true;
                }
              }
            }
          }
        }
        
        if (collisionStep) break;
      }
    }

    ballsToRemove.forEach(id => delete trailRef.current[id]);
    ballsRef.current = activeBalls.filter(b => !ballsToRemove.includes(b.id)).concat(newSpawnedBalls);
    
    if (ballsRef.current.length === 0) {
      setGameState(prev => ({ 
        ...prev, 
        isGameOver: true, 
        started: false,
        kofiPhrase: getRandomKofiPhrase()
      }));
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
        (gameState.level >= 2 && enemy.isLargest) || 
        (gameState.level >= 3 && (enemy.isLargest || index === 4)) ||
        (gameState.level >= 4 && (enemy.isLargest || enemy.id === 'enemy-4' || enemy.id === 'enemy-3'));

      if (isFiringEnemy) {
        const overrideFire = 
          ((gameState.level === 8 || gameState.level === 9) && enemy.isLargest) || 
          (gameState.level === 10 && (enemy.isLargest || index === 4));
          
        const canFire = ballsRef.current.length >= 2 || overrideFire;
        if ((enemy.fireCooldown || 0) <= 0 && canFire) {
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
      const isFinalLevel = gameState.level === 11 || gameState.level === 12 || gameState.level === 13;
      const alreadyCompleted = gameState.completedLevels.includes(gameState.level);
      const nextLevels = alreadyCompleted ? gameState.completedLevels : [...gameState.completedLevels, gameState.level];
      localStorage.setItem(COMPLETED_LEVELS_KEY, JSON.stringify(nextLevels));

      if (isFinalLevel) {
        setGameState(prev => ({ ...prev, isWin: true, started: false, completedLevels: nextLevels, kofiPhrase: getRandomKofiPhrase() }));
      } else {
        setGameState(prev => ({ ...prev, isLevelCleared: true, started: false, completedLevels: nextLevels }));
      }
      playSound('win');
    }
  }, [gameState.isPaused, gameState.started, gameState.view, gameState.speedMultiplier, gameState.level, gameState.completedLevels, gameState.isWin, gameState.isGameOver, gameState.isLevelCleared, getDynamicPixelSize, playSound, dimensions.width, dimensions.height, deviceType, getRandomKofiPhrase]);

  const drawProgressPhrase = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const phrase = "OGRO BUCHON";
    const isMobile = deviceType === 'mobile';
    let titleFontSize = isMobile ? 24 : 48;
    let letterSpacing = isMobile ? 6 : 12;
    let titleWidth = (phrase.length * titleFontSize) + ((phrase.length - 1) * letterSpacing);
    const maxTitleWidth = w * 0.92;
    if (titleWidth > maxTitleWidth) {
      const scale = maxTitleWidth / titleWidth;
      titleFontSize = Math.floor(titleFontSize * scale);
      letterSpacing = Math.floor(letterSpacing * scale);
      titleWidth = (phrase.length * titleFontSize) + ((phrase.length - 1) * letterSpacing);
    }
    let startX = (w - titleWidth) / 2;
    const startY = h * 0.18;
    ctx.save();
    ctx.font = `${titleFontSize}px 'Press Start 2P'`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let nonSpaceCount = 0;
    for (let i = 0; i < phrase.length; i++) {
      const char = phrase[i];
      if (char === ' ') { startX += titleFontSize + letterSpacing; continue; }
      nonSpaceCount++;
      const isUnlocked = gameState.completedLevels.includes(nonSpaceCount);
      if (isUnlocked) {
        ctx.fillStyle = '#ccff00';
        ctx.shadowBlur = isMobile ? 8 : 15;
        ctx.shadowColor = '#ccff00';
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = '#555555'; 
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 0.5; 
      }
      ctx.fillText(char, startX, startY);
      startX += titleFontSize + letterSpacing;
    }
    ctx.restore();
    ctx.save();
    ctx.fillStyle = '#AAAAAA';
    ctx.textAlign = 'center';
    if (w < 600) {
      const line1 = "COMPLETA LOS NIVELES PARA DESBLOQUEAR LAS LETRAS";
      const line2 = "Y RESCATAR AL OGRO EN EL NIVEL 11";
      let subtitleFontSize = 10;
      ctx.font = `${subtitleFontSize}px 'Press Start 2P'`;
      const maxSubWidth = w * 0.92;
      let m1 = ctx.measureText(line1).width;
      let m2 = ctx.measureText(line2).width;
      let longest = Math.max(m1, m2);
      if (longest > maxSubWidth) {
        subtitleFontSize = Math.floor(subtitleFontSize * (maxSubWidth / longest));
        subtitleFontSize = Math.max(subtitleFontSize, 6);
        ctx.font = `${subtitleFontSize}px 'Press Start 2P'`;
      }
      const lineSpacing = subtitleFontSize + 10;
      const baseSubY = startY + 35;
      ctx.fillText(line1, w / 2, baseSubY);
      ctx.fillText(line2, w / 2, baseSubY + lineSpacing);
    } else {
      const subText = "COMPLETA LOS NIVELES PARA DESBLOQUEAR LAS LETRAS Y RESCATAR AL OGRO EN EL NIVEL 11";
      let subtitleFontSize = 14; 
      ctx.font = `${subtitleFontSize}px 'Press Start 2P'`;
      const maxSubWidth = w * 0.92;
      let measuredWidth = ctx.measureText(subText).width;
      if (measuredWidth > maxSubWidth) {
        subtitleFontSize = Math.floor(subtitleFontSize * (maxSubWidth / measuredWidth));
        subtitleFontSize = Math.max(subtitleFontSize, 8);
        ctx.font = `${subtitleFontSize}px 'Press Start 2P'`;
      }
      ctx.fillText(subText, w / 2, startY + 60);
    }
    ctx.restore();
  }, [gameState.completedLevels, deviceType]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (gameState.view === 'playing' && (gameState.level <= 11 || gameState.level === 12 || gameState.level === 13)) {
      drawDynamicBackground(ctx, dimensions.width, dimensions.height, gameState.level);
    } else {
      ctx.fillStyle = COLORS.BG;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);
      firefliesRef.current.forEach(fly => {
        const flicker = (Math.sin(fly.phase) + 1) / 2;
        ctx.save();
        ctx.fillStyle = `rgba(204, 255, 0, ${flicker * 0.8})`;
        ctx.beginPath();
        ctx.arc(fly.x, fly.y, fly.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      if (gameState.view === 'start') { drawProgressPhrase(ctx, dimensions.width, dimensions.height); }
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
      if (!p) return;
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
      ctx.save();
      const activeGrid = enemy.isOgre ? HAPPY_FACE_DATA : GHOST_DATA;
      const gPixelSize = enemy.pixelSize;
      let bodyColor;
      if (enemy.isOgre) {
        bodyColor = enemy.isSmallest ? neonColor : (enemy.isHit ? COLORS.OGRE_BROWN : COLORS.OGRE_GREEN);
        ctx.shadowBlur = (enemy.isHit || enemy.isSmallest) ? 25 : 15;
        ctx.shadowColor = bodyColor;
      } else {
        if ((gameState.level >= 1 && gameState.level <= 10) && !enemy.isSmallest) {
          bodyColor = enemy.isHit ? COLORS.ACID_LIME_YELLOW : COLORS.SWAMP_BROWN;
        } else {
          bodyColor = enemy.isSmallest ? neonColor : (enemy.isHit ? COLORS.GHOST_BLUE : COLORS.GHOST_PINK);
        }
        ctx.shadowBlur = (enemy.isHit || enemy.isSmallest) ? 20 : 10;
        ctx.shadowColor = bodyColor;
      }
      for (let y = 0; y < activeGrid.length; y++) {
        for (let x = 0; x < activeGrid[y].length; x++) {
          const pixel = activeGrid[y][x];
          if (pixel === PixelType.EMPTY) continue;
          if (enemy.isOgre) {
            if (pixel === PixelType.OGRE_BODY) ctx.fillStyle = bodyColor;
            else ctx.fillStyle = COLORS.OGRE_EYE;
          } else {
            if (pixel === PixelType.GHOST_BODY) ctx.fillStyle = bodyColor;
            else ctx.fillStyle = COLORS.GHOST_EYE;
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
        ctx.fillStyle = enemy.isOgre ? (enemy.isHit ? COLORS.OGRE_BROWN : COLORS.OGRE_GREEN) : '#FF3131'; 
        ctx.fillRect(barX, barY, currentW, barH);
        ctx.strokeStyle = '#FFFFFF'; 
        ctx.strokeRect(barX, barY, barW, barH);
      }
      ctx.restore();
    });
    const grid = charGridRef.current;
    if (grid[0]?.length > 1) {
      const currentPixelSize = getDynamicPixelSize(grid[0].length);
      const charWidth = grid[0].length * currentPixelSize;
      const charHeight = grid.length * currentPixelSize;
      const charX = (dimensions.width - charWidth) / 2 + floatXRef.current;
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
            case PixelType.METAL: ctx.fillStyle = COLORS.METAL_GREY; break;
            case PixelType.LAB_BLUE: ctx.fillStyle = COLORS.LAB_BLUE; break;
            case PixelType.OGRE_OUTLINE: ctx.fillStyle = COLORS.OGRE_OUTLINE; break;
            case PixelType.OGRE_FACE_MAIN: ctx.fillStyle = COLORS.OGRE_FACE_MAIN; break;
            case PixelType.OGRE_FACE_DARK: ctx.fillStyle = COLORS.OGRE_FACE_DARK; break;
            case PixelType.OGRE_FACE_LIGHT: ctx.fillStyle = COLORS.OGRE_FACE_LIGHT; break;
            case PixelType.OGRE_TEETH: ctx.fillStyle = COLORS.OGRE_TEETH; break;
            case PixelType.OGRE_SPOT: ctx.fillStyle = COLORS.OGRE_SPOT; break;
            case PixelType.RAT_PINK: ctx.fillStyle = COLORS.RAT_PINK; break;
            case PixelType.TOAD_EYE: ctx.fillStyle = "#FFFF00"; break; // Crown Yellow
          }
          ctx.fillRect(charX + x * currentPixelSize, charY + y * currentPixelSize, currentPixelSize, currentPixelSize);
        }
      }
    }
    const paddle = paddleRef.current;
    ctx.save();
    ctx.fillStyle = paddle.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.color;
    let pstartX = 0;
    const sortedHoles = [...paddle.holes].sort((a, b) => a.x - b.x);
    sortedHoles.forEach(hole => {
      if (hole.x > pstartX) { ctx.fillRect(paddle.x + pstartX, paddle.y, hole.x - pstartX, paddle.height); }
      pstartX = Math.max(pstartX, hole.x + hole.width);
    });
    if (pstartX < paddle.width) { ctx.fillRect(paddle.x + pstartX, paddle.y, paddle.width - pstartX, paddle.height); }
    ctx.restore();
    ballsRef.current.forEach(ball => {
      const points = trailRef.current[ball.id] || [];
      points.forEach((point, index) => {
        const alpha = (index + 1) / points.length;
        const size = ball.radius * 2 * (alpha * 0.7 + 0.3);
        ctx.save();
        ctx.fillStyle = point.color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fillRect(point.x - size / 2, point.y - size / 2, size, size);
        ctx.restore();
      });
      ctx.save();
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ball.color; 
      if (ball.color !== COLORS.BALL) { ctx.shadowBlur = 15; ctx.shadowColor = ball.color; }
      ctx.fill();
      ctx.closePath();
      ctx.restore();
    });
  }, [dimensions, gameState.level, gameState.view, gameState.isGameOver, gameState.isWin, gameState.isLevelCleared, getDynamicPixelSize, frameCounterRef.current, drawProgressPhrase]);

  const loop = useCallback(() => { update(); draw(); animationFrameRef.current = requestAnimationFrame(loop); }, [update, draw]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [loop]);

  const getLevelButtonStyle = (l: number) => {
    if (l === 11) {
      return { animation: 'rainbow-border 4s linear infinite', borderWidth: '4px', borderStyle: 'solid', backgroundColor: 'rgba(0, 0, 0, 0.4)', boxShadow: '0 0 15px rgba(255, 255, 255, 0.2)' };
    }
    const t = (l - 1) / 9;
    const r = Math.round(57 + (15 - 57) * t);
    const g = Math.round(255 + (61 - 255) * t);
    const b = Math.round(20 + (15 - 20) * t);
    return { borderColor: `rgb(${r}, ${g}, ${b})`, borderWidth: '4px', borderStyle: 'solid', backgroundColor: 'rgba(0, 0, 0, 0.4)' };
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-[#051a05] text-white font-['Press_Start_2P'] select-none">
      <style>{`
        @keyframes rainbow-border {
          0% { border-color: #ff0000; }
          17% { border-color: #ff8800; }
          33% { border-color: #ffff00; }
          50% { border-color: #00ff00; }
          67% { border-color: #0000ff; }
          83% { border-color: #8800ff; }
          100% { border-color: #ff0000; }
        }
        @keyframes golden-glow {
          0% { box-shadow: 0 0 2px #ffd700; }
          50% { box-shadow: 0 0 6px #ffd700, 0 0 9px #ffd700; }
          100% { box-shadow: 0 0 2px #ffd700; }
        }
      `}</style>
      <div className="z-10 w-full p-4 flex flex-col items-center bg-green-950/70 backdrop-blur-md border-b-4 border-green-900">
        <h1 className="text-sm md:text-lg lg:text-2xl font-bold mb-2 tracking-widest text-center drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]" style={{ color: '#a3e635' }}>EL OGRO BUCHON</h1>
        <div className="flex justify-between w-full max-w-4xl px-2 items-center">
          <div className="flex flex-col items-start uppercase text-[8px] md:text-[10px]">
             <span className="text-lime-600 mb-1">Velocidad: {Math.round(gameState.speedMultiplier * 100)}%</span>
             <input type="range" min="0.1" max="1.5" step="0.05" value={gameState.speedMultiplier} onChange={(e) => setGameState(prev => ({ ...prev, speedMultiplier: parseFloat(e.target.value) }))} className="w-20 md:w-32 h-1 bg-green-900 rounded-lg appearance-none cursor-pointer accent-lime-500" />
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            <button onClick={togglePauseLocal} disabled={!gameState.started || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared} className={`p-2 rounded transition-all active:scale-95 ${(!gameState.started || gameState.isWin || gameState.isGameOver || gameState.isLevelCleared) ? 'opacity-30' : 'bg-green-700 hover:bg-green-600 border-b-4 border-green-900'}`}>{gameState.isPaused ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}</button>
            <p className="text-[10px] md:text-sm uppercase text-lime-300">Puntaje: <span className="text-yellow-400">{gameState.score}</span></p>
          </div>
        </div>
      </div>
      <div ref={containerRef} className="relative flex-1 w-full flex items-center justify-center overflow-hidden touch-none" onTouchMove={handleTouch} onTouchStart={handleTouch}>
        <canvas ref={canvasRef} width={dimensions.width} height={dimensions.height} className="max-w-full max-h-full shadow-2xl bg-black" />
        {gameState.view === 'start' && !gameState.isGameOver && !gameState.isWin && !gameState.isLevelCleared && (
          <div className="absolute inset-0 bg-green-950/20 flex flex-col items-center justify-center p-8 text-center z-20">
            <div className="mt-[22%] md:mt-[20%] flex flex-col items-center">
              <h2 className="text-lg md:text-2xl mb-8 text-lime-300 uppercase tracking-widest animate-pulse drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">ENTRA AL PANTANO</h2>
              <div className="flex flex-col gap-4 w-full max-w-xs items-stretch">
                <button
                  onClick={() => initGame(1)}
                  className="bg-green-950 hover:bg-green-900 text-white px-8 py-4 text-[10px] md:text-xs font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  INICIAR MISIÓN 🕹️
                </button>
                <button
                  onClick={() => setView('levelSelect')}
                  className="bg-green-950 hover:bg-green-900 text-white px-8 py-4 text-[10px] md:text-xs font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  SELECCIONAR NIVEL 📜
                </button>
                <div className="mt-4 flex justify-center scale-110"><KofiButton phrase={gameState.kofiPhrase} /></div>
              </div>
            </div>
          </div>
        )}
        {gameState.view === 'levelSelect' && (
          <div className="absolute inset-0 bg-green-950/40 flex flex-col items-center justify-start pt-[50px] pb-[25px] px-8 text-center z-20 overflow-y-auto overflow-x-hidden scroll-smooth">
            <h2 className="text-lg md:text-2xl mb-6 text-yellow-400 uppercase tracking-widest drop-shadow-[2px_2px_0px_rgba(0,0,0,1)] flex-shrink-0">SELECCIONAR NIVEL</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl px-4 pb-12">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((l) => {
                const requiredLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                const isLvl11Locked = l === 11 && !requiredLevels.every(lvl => gameState.completedLevels.includes(lvl));
                return (<button key={l} disabled={isLvl11Locked} onClick={() => initGame(l)} style={getLevelButtonStyle(l)} className={`group flex flex-col items-center p-6 transition-all rounded-none shadow-[4px_4px_0px_rgba(0,0,0,0.5)] ${isLvl11Locked ? 'cursor-not-allowed opacity-80' : 'hover:scale-105 active:scale-95'}`}><span className="text-[10px] md:text-xs mb-2 text-[#FFFFFF] font-bold">{`NIVEL ${l}`}</span><span className="text-[8px] uppercase tracking-tight" style={{ color: '#a3e635' }}>{l === 1 ? 'EL CHALÁN 🧹' : l === 2 ? 'RECIÉN LLEGADO 🎒' : l === 3 ? 'EL PLEBE 🧢' : l === 4 ? 'SOCIO DEL PANTANO 🤝' : l === 5 ? 'MANO DERECHA 🤜' : l === 6 ? 'EL MERO MERO 🤠' : l === 7 ? 'EL PATRÓN 👔' : l === 8 ? 'JEFE DE JEFES 🐯' : l === 9 ? 'EL CAPO MAYOR 🧿' : l === 10 ? 'LEYENDA VIVIENTE 👑' : isLvl11Locked ? '🔒 MODO BELICÓN BLOQUEADO' : '🔥 MODO BELICÓN ACTIVADO'}</span></button>);
              })}
              {/* Special Level 12 Button (Ogra) */}
              <button 
                onClick={() => { playSound('select'); setActiveSpecialModal('ogra'); }}
                style={{ border: '4px solid #ffd700', animation: 'golden-glow 2s infinite', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                className="group flex flex-col items-center p-6 transition-all rounded-none shadow-[4px_4px_0px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95"
              >
                <span className="text-[10px] md:text-xs mb-2 text-yellow-400 font-bold">NIVEL ESPECIAL</span>
                <span className="text-[8px] uppercase tracking-tight text-white">RESCATA A LA OGRA 👸</span>
              </button>
              {/* Special Level 13 Button (Natita) */}
              <button 
                onClick={() => { playSound('select'); setActiveSpecialModal('natita'); }}
                style={{ border: '4px solid #ffd700', animation: 'golden-glow 2s infinite', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
                className="group flex flex-col items-center p-6 transition-all rounded-none shadow-[4px_4px_0px_rgba(255,215,0,0.3)] hover:scale-105 active:scale-95"
              >
                <span className="text-[10px] md:text-xs mb-2 text-yellow-400 font-bold">NIVEL ESPECIAL</span>
                <span className="text-[8px] uppercase tracking-tight text-white">RESCATA AL NATITA 👦</span>
              </button>
            </div>
            <button onClick={() => setView('start')} className="mt-6 mb-2 text-lime-600 hover:text-white text-[8px] md:text-[10px] uppercase underline underline-offset-4 flex-shrink-0">VOLVER AL INICIO</button>
          </div>
        )}

        {/* Password Modal */}
        {activeSpecialModal && (
          <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
            <div className="bg-green-950 border-4 border-yellow-500 p-8 max-w-sm w-full flex flex-col items-center shadow-[0_0_50px_rgba(255,215,0,0.4)]">
              <h2 className="text-sm md:text-base text-yellow-400 mb-6 text-center">INGRESA EL CÓDIGO SECRETO</h2>
              <input 
                type="text" 
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value.toUpperCase());
                  setPasswordError("");
                }}
                className="w-full bg-black border-2 border-green-700 p-3 text-center text-xs mb-2 text-lime-400 focus:outline-none focus:border-yellow-500 transition-colors uppercase"
                placeholder="CÓDIGO"
              />
              {passwordError && <p className="text-red-500 text-[8px] mb-4 uppercase">{passwordError}</p>}
              <div className="flex flex-col gap-3 w-full mt-4">
                <button 
                  onClick={handleValidatePassword}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-4 text-[10px] font-bold border-4 border-[#FFFF00] rounded-none transition-all active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center"
                >
                  VALIDAR
                </button>
                <a 
                  onClick={() => playSound('select')}
                  href="https://ko-fi.com/s/bd26f06f93" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-[8px] font-bold border-4 border-[#00FFFF] rounded-none transition-all active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] text-center flex items-center justify-center gap-2"
                >
                  CONSIGUE EL CÓDIGO AQUÍ ☕
                </a>
                <button 
                  onClick={() => {
                    playSound('select');
                    setActiveSpecialModal(null);
                    setPasswordInput("");
                    setPasswordError("");
                  }}
                  className="text-gray-400 hover:text-white text-[8px] uppercase mt-2 underline"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState.isPaused && gameState.view === 'playing' && (
          <div className="absolute inset-0 bg-green-950/70 flex flex-col items-center justify-center z-20">
            <h2 className="text-2xl md:text-4xl mb-8 text-yellow-400 animate-pulse tracking-widest drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">PAUSA</h2>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              <button
                onClick={togglePauseLocal}
                className="bg-green-950 hover:bg-green-900 text-white px-8 py-4 text-xs md:text-sm font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                REANUDAR ▶️
              </button>
              <button
                onClick={() => setView('start')}
                className="bg-red-950 hover:bg-red-900 text-white px-8 py-4 text-xs md:text-sm font-bold transition-all border-4 border-[#ff3131] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                SALIR ❌
              </button>
            </div>
          </div>
        )}
        {gameState.isLevelCleared && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-30">
            <h2 className="text-xl md:text-2xl mb-4 text-lime-400 uppercase tracking-widest">¡NIVEL SUPERADO!</h2>
            <p className="text-[10px] md:text-xs mb-8 text-gray-300">ADÉNTRATE MÁS EN EL PANTANO...</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4">
              {gameState.level < 10 && (
                <button
                  onClick={() => initGame(gameState.level + 1)}
                  className="bg-green-950 hover:bg-green-900 text-white px-8 py-4 text-xs md:text-sm font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  IR AL NIVEL {gameState.level + 1} ➡️
                </button>
              )}
              <button
                onClick={() => setView('levelSelect')}
                className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 text-xs md:text-sm font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                MENU DE NIVELES 📜
              </button>
            </div>
          </div>
        )}
        {(gameState.isGameOver || gameState.isWin) && (
          <div className="absolute inset-0 bg-green-950/90 flex flex-col items-center justify-center z-30">
            <h2 className={`text-xl md:text-2xl mb-4 ${gameState.isWin ? 'text-lime-400' : 'text-red-500'} uppercase tracking-widest text-center px-4 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]`}>{gameState.isWin ? (gameState.level === 12 ? '¡LA OGRA HA SIDO RESCATADA!' : gameState.level === 13 ? '¡EL NATITA HA SIDO RESCATADO!' : '¡EL OGRO HA SIDO SACIADO! VICTORIA') : 'HAS SIDO EXPULSADO DEL PANTANO'}</h2>
            <p className="text-xs md:text-sm mb-8 text-lime-200">PUNTAJE FINAL: {gameState.score}</p>
            <div className="flex flex-col gap-4 w-full max-w-xs px-4 items-stretch">
              <button
                onClick={() => initGame(gameState.level)}
                className="bg-white text-black px-8 py-4 text-xs font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {gameState.isWin ? 'REPETIR GLORIA 🔄' : 'REINTENTAR 🔄'}
              </button>
              <button
                onClick={() => setView('start')}
                className="bg-green-950 hover:bg-green-900 text-white px-8 py-4 text-xs font-bold transition-all border-4 border-[#a3e635] rounded-none active:translate-y-1 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                PAGINA DE INICIO 🏠
              </button>
              <div className="mt-4 flex justify-center"><KofiButton phrase={gameState.kofiPhrase} /></div>
            </div>
          </div>
        )}
      </div>
      <div className="hidden md:flex p-4 text-[8px] text-green-700 bg-green-950/40 uppercase gap-8 border-t-2 border-green-900 w-full justify-center"><span>FLECHAS: Moverse</span><span>P / ESC: Pausa</span>{gameState.view === 'playing' && <span className="text-lime-500">NIVEL: {gameState.level}</span>}</div>
    </div>
  );
};

export default Game;