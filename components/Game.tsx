
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  PADDLE_WIDTH, 
  PADDLE_HEIGHT, 
  PADDLE_SPEED, 
  BALL_RADIUS, 
  BALL_SPEED, 
  PIXEL_SIZE, 
  CHARACTER_DATA, 
  COLORS 
} from '../constants';
import { Ball, Paddle, PixelType, GameState } from '../types';

const Game: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [deviceType, setDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    isGameOver: false,
    isWin: false,
    started: false,
    isPaused: false,
    speedMultiplier: 1.0,
  });

  // Derived constants based on current dimensions
  const getPaddleY = useCallback((h: number, type: string) => {
    if (type === 'mobile' || type === 'tablet') return h * 0.75; // 25% up from bottom
    return h - 60; // Desktop near bottom
  }, []);

  // Mutable game state for the loop
  const paddleRef = useRef<Paddle>({
    x: 0,
    y: 0,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    color: COLORS.PADDLE,
  });

  const ballRef = useRef<Ball>({
    x: 0,
    y: 0,
    dx: BALL_SPEED,
    dy: -BALL_SPEED,
    radius: BALL_RADIUS,
  });

  const charGridRef = useRef<number[][]>(CHARACTER_DATA.map(row => [...row]));
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Resize handler
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      const w = Math.min(clientWidth, 1024); // Cap width for desktop readability
      const h = clientHeight;
      setDimensions({ width: w, height: h });
      
      let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
      if (clientWidth < 640) type = 'mobile';
      else if (clientWidth < 1024) type = 'tablet';
      setDeviceType(type);

      // Adjust paddle if already started
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

  const togglePause = useCallback(() => {
    setGameState(prev => {
      if (!prev.started || prev.isGameOver || prev.isWin) return prev;
      return { ...prev, isPaused: !prev.isPaused };
    });
  }, []);

  const playSound = useCallback((type: 'paddle' | 'wall' | 'hit' | 'win' | 'lose') => {
    if (!audioCtxRef.current || gameState.isPaused) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch (type) {
      case 'paddle':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'wall':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(); osc.stop(now + 0.05);
        break;
      case 'hit':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(); osc.stop(now + 0.1);
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'square';
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.05, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
          o.connect(g); g.connect(ctx.destination);
          o.start(now + i * 0.1); o.stop(now + i * 0.1 + 0.2);
        });
        break;
      case 'lose':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.8);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.8);
        osc.start(); osc.stop(now + 0.8);
        break;
    }
  }, [gameState.isPaused]);

  const initGame = useCallback(() => {
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
    };
    
    const initialMultiplier = gameState.speedMultiplier;
    ballRef.current = {
      x: dimensions.width / 2,
      y: py - 40,
      dx: BALL_SPEED * initialMultiplier * (Math.random() > 0.5 ? 1 : -1),
      dy: -BALL_SPEED * initialMultiplier,
      radius: BALL_RADIUS,
    };
    
    charGridRef.current = CHARACTER_DATA.map(row => [...row]);
    setGameState(prev => ({ ...prev, score: 0, isGameOver: false, isWin: false, isPaused: false, started: true }));
  }, [dimensions, deviceType, getPaddleY, gameState.speedMultiplier]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { 
    keysRef.current[e.code] = true; 
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  }, [togglePause]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => { keysRef.current[e.code] = false; }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Touch controls for mobile
  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (!gameState.started || gameState.isPaused) return;
    const touch = e.touches[0];
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      paddleRef.current.x = Math.max(0, Math.min(dimensions.width - paddleRef.current.width, relativeX - paddleRef.current.width / 2));
    }
  }, [gameState.started, gameState.isPaused, dimensions.width]);

  const update = () => {
    if (gameState.isPaused || !gameState.started) return;

    const ball = ballRef.current;
    const paddle = paddleRef.current;
    const grid = charGridRef.current;
    const currentSpeed = BALL_SPEED * gameState.speedMultiplier;

    // Movement
    if (keysRef.current['ArrowLeft']) paddle.x -= PADDLE_SPEED;
    if (keysRef.current['ArrowRight']) paddle.x += PADDLE_SPEED;
    paddle.x = Math.max(0, Math.min(dimensions.width - paddle.width, paddle.x));

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Bounds
    if (ball.x + ball.radius > dimensions.width || ball.x - ball.radius < 0) {
      ball.dx *= -1;
      playSound('wall');
    }
    if (ball.y - ball.radius < 0) {
      ball.dy *= -1;
      playSound('wall');
    }

    // Fail state
    if (ball.y + ball.radius > dimensions.height) {
      setGameState(prev => ({ ...prev, isGameOver: true, started: false }));
      playSound('lose');
      return;
    }

    // Paddle collision
    if (
      ball.y + ball.radius > paddle.y &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.width &&
      ball.dy > 0
    ) {
      ball.dy = -currentSpeed;
      const hitPos = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
      ball.dx = hitPos * currentSpeed * 1.5;
      playSound('paddle');
    }

    // Wizard collision
    const charWidth = CHARACTER_DATA[0].length * PIXEL_SIZE;
    const charHeight = CHARACTER_DATA.length * PIXEL_SIZE;
    const charX = (dimensions.width - charWidth) / 2;
    const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2)); // Dynamic center-ish top

    const relativeX = ball.x - charX;
    const relativeY = ball.y - charY;
    const gx = Math.floor(relativeX / PIXEL_SIZE);
    const gy = Math.floor(relativeY / PIXEL_SIZE);

    if (gx >= 0 && gx < grid[0].length && gy >= 0 && gy < grid.length) {
      const pixel = grid[gy][gx];
      if (pixel !== PixelType.EMPTY) {
        // Destroy
        const radius = 1;
        for (let y = gy - radius; y <= gy + radius; y++) {
          for (let x = gx - radius; x <= gx + radius; x++) {
            if (y >= 0 && y < grid.length && x >= 0 && x < grid[0].length) grid[y][x] = PixelType.EMPTY;
          }
        }
        
        // Bounce
        const pixelCenterX = charX + gx * PIXEL_SIZE + PIXEL_SIZE / 2;
        const pixelCenterY = charY + gy * PIXEL_SIZE + PIXEL_SIZE / 2;
        if (Math.abs(ball.x - pixelCenterX) > Math.abs(ball.y - pixelCenterY)) ball.dx *= -1;
        else ball.dy *= -1;

        setGameState(prev => ({ ...prev, score: prev.score + 10 }));
        playSound('hit');
      }
    }

    // Win check
    const remaining = grid.flat().some(p => p !== PixelType.EMPTY);
    if (!remaining) {
      setGameState(prev => ({ ...prev, isWin: true, started: false }));
      playSound('win');
    }
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = COLORS.BG;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    const charWidth = CHARACTER_DATA[0].length * PIXEL_SIZE;
    const charHeight = CHARACTER_DATA.length * PIXEL_SIZE;
    const charX = (dimensions.width - charWidth) / 2;
    const charY = Math.max(40, (dimensions.height * 0.4) - (charHeight / 2));

    const grid = charGridRef.current;
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
        }
        ctx.fillRect(charX + x * PIXEL_SIZE, charY + y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
      }
    }

    const paddle = paddleRef.current;
    ctx.fillStyle = paddle.color;
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, 4);

    const ball = ballRef.current;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.BALL;
    ctx.fill();
    ctx.closePath();
  }, [dimensions]);

  const loop = useCallback(() => {
    update();
    draw();
    animationFrameRef.current = requestAnimationFrame(loop);
  }, [dimensions, gameState.isPaused, gameState.started, gameState.speedMultiplier]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [loop]);

  return (
    <div className="fixed inset-0 flex flex-col items-center bg-gray-950 text-white font-['Press_Start_2P'] select-none">
      {/* Header UI */}
      <div className="z-10 w-full p-4 flex flex-col items-center bg-gray-900/50 backdrop-blur-md border-b border-gray-800">
        <h1 className="text-sm md:text-lg lg:text-2xl font-bold mb-2 tracking-widest text-blue-400">WIZARD BREAKER</h1>
        <div className="flex justify-between w-full max-w-4xl px-2 items-center">
          <div className="flex flex-col items-start uppercase text-[8px] md:text-[10px]">
             <span className="text-gray-500 mb-1">Speed: {Math.round(gameState.speedMultiplier * 100)}%</span>
             <input 
              type="range" min="0.5" max="1.5" step="0.05" value={gameState.speedMultiplier}
              onChange={(e) => setGameState(prev => ({ ...prev, speedMultiplier: parseFloat(e.target.value) }))}
              className="w-20 md:w-32 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
             />
          </div>
          <div className="flex gap-2 md:gap-4 items-center">
            <button 
              onClick={togglePause} disabled={!gameState.started}
              className={`p-2 rounded transition-all active:scale-95 ${!gameState.started ? 'opacity-30' : 'bg-blue-600 hover:bg-blue-500 border-b-2 border-blue-800'}`}
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

      {/* Game Area Container */}
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

        {/* Overlays */}
        {!gameState.started && !gameState.isGameOver && !gameState.isWin && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center z-20">
            <h2 className="text-lg md:text-2xl mb-4 text-blue-300 uppercase tracking-widest">BREAK THE WIZARD</h2>
            <p className="text-[8px] md:text-xs mb-8 leading-relaxed text-gray-400 max-w-md">
              Bounce the ball off your paddle to break the wizard apart.<br/><br/>
              On {deviceType}, use {deviceType === 'desktop' ? 'ARROWS' : 'TOUCH'} to move.<br/><br/>
              The paddle is positioned higher on mobile to avoid system gestures.
            </p>
            <button
              onClick={initGame}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
            >
              START QUEST
            </button>
          </div>
        )}

        {gameState.isPaused && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
            <h2 className="text-2xl md:text-4xl mb-6 text-yellow-400 animate-pulse tracking-widest">PAUSED</h2>
            <button
              onClick={togglePause}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-blue-800 active:border-b-0 active:translate-y-1"
            >
              RESUME
            </button>
          </div>
        )}

        {(gameState.isGameOver || gameState.isWin) && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-20">
            <h2 className={`text-xl md:text-2xl mb-4 ${gameState.isWin ? 'text-green-400' : 'text-red-500'}`}>
              {gameState.isWin ? 'WIZARD DESTROYED!' : 'QUEST FAILED'}
            </h2>
            <p className="text-xs md:text-sm mb-8">FINAL SCORE: {gameState.score}</p>
            <button
              onClick={initGame}
              className="bg-white text-black px-8 py-4 text-xs md:text-sm transition-all border-b-4 border-gray-400 active:border-b-0 active:translate-y-1"
            >
              PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="hidden md:flex p-4 text-[8px] text-gray-600 uppercase gap-8 border-t border-gray-900 w-full justify-center">
        <span>ARROWS: Move</span>
        <span>P / ESC: Pause</span>
        <span>DEVICE: {deviceType}</span>
      </div>
    </div>
  );
};

export default Game;
