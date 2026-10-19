/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Music,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Trophy,
  Flame,
  ChevronRight,
  Disc,
} from 'lucide-react';
import { soundEngine, TRACKS } from './audio/soundEngine';

const COLS = 10;
const ROWS = 20;
const CELL_SIZE = 30;
const BASE_DROP_MS = 900;
const SPEED_MULT = 1.1;
const LINES_PER_ROUND = 10;

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

interface Piece {
  type: TetrominoType;
  matrix: number[][];
  rotation: number;
  x: number;
  y: number;
}

const COLORS: Record<TetrominoType, string> = {
  I: '#47f0ff', // Cyan
  O: '#ffd166', // Yellow / Amber
  T: '#c084fc', // Purple
  S: '#4ade80', // Green
  Z: '#fb7185', // Red / Rose
  J: '#60a5fa', // Blue
  L: '#fb923c', // Orange
};

const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

const KICKS: Record<string, Record<string, [number, number][]>> = {
  JLSTZ: {
    '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  },
  I: {
    '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
    '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
    '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
    '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
    '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  },
};

function createGrid(): (TetrominoType | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneMatrix(matrix: number[][]): number[][] {
  return matrix.map((row) => row.slice());
}

function rotateMatrix(matrix: number[][], dir: number): number[][] {
  const size = matrix.length;
  const next = Array.from({ length: size }, () => Array(size).fill(0));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (dir > 0) next[x][size - 1 - y] = matrix[y][x];
      else next[size - 1 - x][y] = matrix[y][x];
    }
  }
  return next;
}

export default function App() {
  const boardCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // High score in localStorage
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('neon_tetris_highscore') || '0');
    } catch {
      return 0;
    }
  });

  // Game state
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [round, setRound] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [roundBanner, setRoundBanner] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio state
  const [bgmMuted, setBgmMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.55);
  const [sfxVolume, setSfxVolume] = useState(0.7);
  const [visualizerBars, setVisualizerBars] = useState<number[]>([0.1, 0.2, 0.4, 0.6, 0.3, 0.5, 0.2, 0.1]);

  // Ref holders for active game loop state
  const gameStateRef = useRef({
    grid: createGrid(),
    bag: [] as TetrominoType[],
    current: null as Piece | null,
    next: null as Piece | null,
    hold: null as TetrominoType | null,
    canHold: true,
    score: 0,
    lines: 0,
    round: 1,
    dropMs: BASE_DROP_MS,
    acc: 0,
    last: 0,
    playing: false,
    paused: false,
    over: false,
  });

  // Refill 7-bag
  const refillBag = useCallback(() => {
    const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = types.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    gameStateRef.current.bag.push(...types);
  }, []);

  const spawnPiece = useCallback((type: TetrominoType): Piece => {
    const matrix = cloneMatrix(SHAPES[type]);
    return {
      type,
      matrix,
      rotation: 0,
      x: Math.floor((COLS - matrix[0].length) / 2),
      y: 0,
    };
  }, []);

  const takeFromBag = useCallback((): Piece => {
    if (gameStateRef.current.bag.length === 0) refillBag();
    const type = gameStateRef.current.bag.shift()!;
    return spawnPiece(type);
  }, [refillBag, spawnPiece]);

  // Collision detection
  const collides = useCallback((piece: Piece, ox = 0, oy = 0, matrix = piece.matrix): boolean => {
    const { grid } = gameStateRef.current;
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const nx = piece.x + x + ox;
        const ny = piece.y + y + oy;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && grid[ny][nx]) return true;
      }
    }
    return false;
  }, []);

  const ghostY = useCallback((): number => {
    const { current } = gameStateRef.current;
    if (!current) return 0;
    let y = 0;
    while (!collides(current, 0, y + 1)) y += 1;
    return current.y + y;
  }, [collides]);

  // Sound speed sync with round
  const updateBgmSpeedForRound = useCallback((currentRound: number) => {
    // Round 1: 1.0x, Round 2: 1.04x, Round 5: 1.15x, up to 1.6x
    const speed = Math.min(1.6, 1.0 + (currentRound - 1) * 0.04);
    soundEngine.setSpeedMultiplier(speed);
  }, []);

  // End Game
  const endGame = useCallback(() => {
    const s = gameStateRef.current;
    s.playing = false;
    s.over = true;
    setIsPlaying(false);
    setIsGameOver(true);
    soundEngine.sfxOver();
    soundEngine.stopBgm();

    setHighScore((prev) => {
      const best = Math.max(prev, s.score);
      try {
        localStorage.setItem('neon_tetris_highscore', String(best));
      } catch {}
      return best;
    });
  }, []);

  // Spawn Next piece
  const spawnNext = useCallback(() => {
    const s = gameStateRef.current;
    s.current = s.next || takeFromBag();
    s.next = takeFromBag();
    if (collides(s.current)) {
      endGame();
    }
  }, [collides, endGame, takeFromBag]);

  // Clear lines
  const clearLines = useCallback(() => {
    const s = gameStateRef.current;
    let cleared = 0;
    s.grid = s.grid.filter((row) => {
      if (row.every(Boolean)) {
        cleared += 1;
        return false;
      }
      return true;
    });

    while (s.grid.length < ROWS) {
      s.grid.unshift(Array(COLS).fill(null));
    }

    if (!cleared) return;

    const table = [0, 100, 300, 500, 800];
    const prevRound = s.round;
    s.lines += cleared;
    s.score += table[cleared] * s.round;
    s.round = Math.floor(s.lines / LINES_PER_ROUND) + 1;
    s.dropMs = Math.max(60, BASE_DROP_MS / SPEED_MULT ** (s.round - 1));

    soundEngine.sfxClear(cleared);

    if (s.round > prevRound) {
      soundEngine.sfxRound();
      setRoundBanner(s.round);
      updateBgmSpeedForRound(s.round);
      setTimeout(() => setRoundBanner(null), 1500);
    }

    setScore(s.score);
    setLines(s.lines);
    setRound(s.round);
  }, [updateBgmSpeedForRound]);

  // Lock piece
  const lockPiece = useCallback(() => {
    const s = gameStateRef.current;
    const current = s.current;
    if (!current) return;

    for (let y = 0; y < current.matrix.length; y += 1) {
      for (let x = 0; x < current.matrix[y].length; x += 1) {
        if (!current.matrix[y][x]) continue;
        const ny = current.y + y;
        const nx = current.x + x;
        if (ny < 0) {
          endGame();
          return;
        }
        s.grid[ny][nx] = current.type;
      }
    }

    soundEngine.sfxLock();
    clearLines();
    s.canHold = true;
    spawnNext();
  }, [clearLines, endGame, spawnNext]);

  // Player Actions
  const move = useCallback((dx: number) => {
    const s = gameStateRef.current;
    if (!s.playing || s.paused || s.over || !s.current) return;
    if (!collides(s.current, dx, 0)) {
      s.current.x += dx;
      soundEngine.sfxMove();
    }
  }, [collides]);

  const softDrop = useCallback(() => {
    const s = gameStateRef.current;
    if (!s.playing || s.paused || s.over || !s.current) return;
    if (!collides(s.current, 0, 1)) {
      s.current.y += 1;
      s.score += 1;
      setScore(s.score);
      soundEngine.sfxMove();
    } else {
      lockPiece();
    }
  }, [collides, lockPiece]);

  const hardDrop = useCallback(() => {
    const s = gameStateRef.current;
    if (!s.playing || s.paused || s.over || !s.current) return;
    const drop = ghostY() - s.current.y;
    s.current.y += drop;
    s.score += drop * 2;
    setScore(s.score);
    soundEngine.sfxDrop();
    lockPiece();
  }, [ghostY, lockPiece]);

  const tryRotate = useCallback((dir: number) => {
    const s = gameStateRef.current;
    if (!s.playing || s.paused || s.over || !s.current) return;
    const piece = s.current;
    if (piece.type === 'O') return;
    const nextRot = (piece.rotation + dir + 4) % 4;
    const rotated = rotateMatrix(piece.matrix, dir);
    const table = piece.type === 'I' ? KICKS.I : KICKS.JLSTZ;
    const tests = table[`${piece.rotation}>${nextRot}`] || [];

    for (const [kx, ky] of tests) {
      if (!collides(piece, kx, -ky, rotated)) {
        piece.matrix = rotated;
        piece.rotation = nextRot;
        piece.x += kx;
        piece.y -= ky;
        soundEngine.sfxRotate();
        return;
      }
    }
  }, [collides]);

  const hold = useCallback(() => {
    const s = gameStateRef.current;
    if (!s.playing || s.paused || s.over || !s.canHold || !s.current) return;
    const currentType = s.current.type;
    if (s.hold) {
      s.current = spawnPiece(s.hold);
    } else {
      s.current = s.next;
      s.next = takeFromBag();
    }
    s.hold = currentType;
    s.canHold = false;
    soundEngine.sfxHold();
    if (collides(s.current!)) endGame();
  }, [collides, endGame, spawnPiece, takeFromBag]);

  const togglePause = useCallback(() => {
    const s = gameStateRef.current;
    if (!s.playing || s.over) return;
    s.paused = !s.paused;
    setIsPaused(s.paused);
    if (s.paused) {
      soundEngine.pauseBgm();
    } else {
      soundEngine.resumeBgm();
      s.last = performance.now();
    }
  }, []);

  const startGame = useCallback(() => {
    soundEngine.ensureContext();
    const s = gameStateRef.current;
    s.grid = createGrid();
    s.bag = [];
    s.current = null;
    s.next = null;
    s.hold = null;
    s.canHold = true;
    s.score = 0;
    s.lines = 0;
    s.round = 1;
    s.dropMs = BASE_DROP_MS;
    s.acc = 0;
    s.last = performance.now();
    s.playing = true;
    s.paused = false;
    s.over = false;

    setScore(0);
    setLines(0);
    setRound(1);
    setIsPlaying(true);
    setIsPaused(false);
    setIsGameOver(false);

    spawnNext();
    soundEngine.sfxStart();
    updateBgmSpeedForRound(1);
    soundEngine.startBgm();
  }, [spawnNext, updateBgmSpeedForRound]);

  // Fullscreen Handler
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Track & Music handlers
  const handleSelectTrack = useCallback((index: number) => {
    setCurrentTrackIndex(index);
    soundEngine.setTrack(index);
  }, []);

  const toggleBgm = useCallback(() => {
    soundEngine.ensureContext();
    const isMutedNow = soundEngine.toggleBgmMute();
    setBgmMuted(isMutedNow);
    if (!isMutedNow && gameStateRef.current.playing && !gameStateRef.current.paused) {
      soundEngine.resumeBgm();
    }
  }, []);

  const toggleSfx = useCallback(() => {
    soundEngine.ensureContext();
    const isMutedNow = soundEngine.toggleSfxMute();
    setSfxMuted(isMutedNow);
  }, []);

  const handleBgmVolumeChange = useCallback((val: number) => {
    setBgmVolume(val);
    soundEngine.setBgmVolume(val);
    if (bgmMuted && val > 0) {
      soundEngine.toggleBgmMute();
      setBgmMuted(false);
    }
  }, [bgmMuted]);

  const handleSfxVolumeChange = useCallback((val: number) => {
    setSfxVolume(val);
    soundEngine.setSfxVolume(val);
    if (sfxMuted && val > 0) {
      soundEngine.toggleSfxMute();
      setSfxMuted(false);
    }
  }, [sfxMuted]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      soundEngine.ensureContext();
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P', 'f', 'F', 'm', 'M', 'c', 'C', 'z', 'Z', 'x', 'X'];
      if (keys.includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowLeft') move(-1);
      else if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowDown') softDrop();
      else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') tryRotate(1);
      else if (e.key === 'z' || e.key === 'Z') tryRotate(-1);
      else if (e.key === ' ') hardDrop();
      else if (e.key === 'c' || e.key === 'C') hold();
      else if (e.key === 'p' || e.key === 'P') togglePause();
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
      else if (e.key === 'm' || e.key === 'M') toggleBgm();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hardDrop, hold, move, softDrop, toggleBgm, toggleFullscreen, togglePause, tryRotate]);

  // Visualizer tick interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (soundEngine.isBgmRunning() && !bgmMuted) {
        setVisualizerBars(soundEngine.getVisualizerData());
      } else {
        setVisualizerBars([0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 0.05]);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [bgmMuted]);

  // Canvas drawing functions
  const drawCell = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    alpha = 1,
    size = CELL_SIZE
  ) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    const pad = 2;
    const px = x * size + pad;
    const py = y * size + pad;
    const innerSize = size - pad * 2;

    // Base block
    ctx.fillStyle = color;
    ctx.fillRect(px, py, innerSize, innerSize);

    // Bevel highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(px, py, innerSize, 5);
    ctx.fillRect(px, py, 5, innerSize);

    // Bevel shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(px, py + innerSize - 5, innerSize, 5);
    ctx.fillRect(px + innerSize - 5, py, 5, innerSize);

    ctx.restore();
  };

  const drawMatrix = (
    ctx: CanvasRenderingContext2D,
    piece: Piece,
    ox: number,
    oy: number,
    size: number,
    ghost = false
  ) => {
    for (let y = 0; y < piece.matrix.length; y += 1) {
      for (let x = 0; x < piece.matrix[y].length; x += 1) {
        if (!piece.matrix[y][x]) continue;
        drawCell(ctx, ox + x, oy + y, COLORS[piece.type], ghost ? 0.22 : 1, size);
      }
    }
  };

  const drawPreview = (
    canvas: HTMLCanvasElement | null,
    type: TetrominoType | null
  ) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;

    const matrix = SHAPES[type];
    const size = 22;
    const w = matrix[0].length * size;
    const h = matrix.length * size;
    const ox = (canvas.width - w) / 2 / size;
    const oy = (canvas.height - h) / 2 / size;
    drawMatrix(ctx, { type, matrix, rotation: 0, x: 0, y: 0 }, ox, oy, size);
  };

  // Main game animation loop
  useEffect(() => {
    let animId: number;

    const loop = (ts: number) => {
      const s = gameStateRef.current;
      if (s.playing && !s.paused && !s.over && s.current) {
        const delta = ts - (s.last || ts);
        s.acc += delta;
        if (s.acc >= s.dropMs) {
          s.acc = 0;
          if (!collides(s.current, 0, 1)) {
            s.current.y += 1;
          } else {
            lockPiece();
          }
        }
      }
      s.last = ts;

      // Draw Main Board
      const canvas = boardCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Dark tech board background
          ctx.fillStyle = '#0a0e20';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Grid lines
          ctx.strokeStyle = 'rgba(71, 240, 255, 0.06)';
          ctx.lineWidth = 1;
          for (let x = 0; x <= COLS; x += 1) {
            ctx.beginPath();
            ctx.moveTo(x * CELL_SIZE, 0);
            ctx.lineTo(x * CELL_SIZE, ROWS * CELL_SIZE);
            ctx.stroke();
          }
          for (let y = 0; y <= ROWS; y += 1) {
            ctx.beginPath();
            ctx.moveTo(0, y * CELL_SIZE);
            ctx.lineTo(COLS * CELL_SIZE, y * CELL_SIZE);
            ctx.stroke();
          }

          // Locked cells
          for (let y = 0; y < ROWS; y += 1) {
            for (let x = 0; x < COLS; x += 1) {
              const cell = s.grid[y][x];
              if (cell) {
                drawCell(ctx, x, y, COLORS[cell]);
              }
            }
          }

          // Active piece & Ghost piece
          if (s.current && s.playing && !s.over) {
            const gy = ghostY();
            drawMatrix(ctx, s.current, s.current.x, gy, CELL_SIZE, true);
            drawMatrix(ctx, s.current, s.current.x, s.current.y, CELL_SIZE, false);
          }
        }
      }

      // Draw Next & Hold previews
      drawPreview(nextCanvasRef.current, s.next?.type || null);
      drawPreview(holdCanvasRef.current, s.hold);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [collides, ghostY, lockPiece]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-between p-3 md:p-6 text-slate-100 overflow-x-hidden">
      {/* Background neon ambient */}
      <div className="bg-pattern" />
      <div className="grid-lines" />
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      {/* Top Header & Music Bar */}
      <header className="relative z-10 w-full max-w-4xl flex flex-col items-center mb-4">
        <div className="text-center mb-2">
          <p className="text-[11px] font-bold tracking-[0.35em] text-[#47f0ff] uppercase">
            Retro Arcade Edition
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wider font-['Orbitron'] text-white neon-glow-cyan flex items-center justify-center gap-2">
            <span>NEON TETRIS</span>
          </h1>
        </div>

        {/* Global Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
          {/* BGM Toggle button */}
          <button
            onClick={toggleBgm}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all border ${
              !bgmMuted
                ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(71,240,255,0.4)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="배경음악 ON/OFF (단축키: M)"
          >
            <Music className={`w-3.5 h-3.5 ${!bgmMuted ? 'animate-bounce text-cyan-400' : ''}`} />
            <span>배경음악 {!bgmMuted ? 'ON' : 'OFF'}</span>

            {/* Live Equalizer visualizer */}
            {!bgmMuted && (
              <div className="flex items-end gap-0.5 h-3.5 ml-1">
                {visualizerBars.map((val, i) => (
                  <span
                    key={i}
                    className="w-1 bg-cyan-400 rounded-t-sm"
                    style={{ height: `${Math.max(3, val * 14)}px` }}
                  />
                ))}
              </div>
            )}
          </button>

          {/* SFX Toggle */}
          <button
            onClick={toggleSfx}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider transition-all border ${
              !sfxMuted
                ? 'bg-purple-950/70 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.3)]'
                : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="효과음 ON/OFF"
          >
            {!sfxMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>효과음 {!sfxMuted ? 'ON' : 'OFF'}</span>
          </button>

          {/* Audio Settings Panel Modal Button */}
          <button
            onClick={() => setShowAudioSettings((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider bg-slate-900/80 border border-slate-700 text-slate-300 hover:border-cyan-400 transition"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>음악 설정</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider bg-slate-900/80 border border-slate-700 text-slate-300 hover:border-cyan-400 transition"
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? '창모드' : '전체화면'}</span>
          </button>
        </div>

        {/* Audio Track Selector & Volume Controls Popup / Bar */}
        {showAudioSettings && (
          <div className="mt-3 w-full max-w-lg bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                <h3 className="text-sm font-bold tracking-wide font-['Orbitron'] text-cyan-300">
                  배경음악 & 사운드 콘솔
                </h3>
              </div>
              <button
                onClick={() => setShowAudioSettings(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded bg-slate-800"
              >
                닫기
              </button>
            </div>

            {/* Track Selector Buttons */}
            <div className="space-y-1.5 mb-4">
              <span className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase block mb-1">
                🎵 배경음악 테마 트랙
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {TRACKS.map((track, idx) => {
                  const isSelected = currentTrackIndex === idx;
                  return (
                    <button
                      key={track.id}
                      onClick={() => handleSelectTrack(idx)}
                      className={`text-left p-2.5 rounded-xl border text-xs transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_15px_rgba(71,240,255,0.3)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center justify-between">
                        <span className="truncate">{track.name}</span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{track.artist}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Volume Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-800/80">
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>배경음악 볼륨</span>
                  <span className="font-mono text-cyan-300">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => handleBgmVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>효과음 볼륨</span>
                  <span className="font-mono text-purple-300">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => handleSfxVolumeChange(parseFloat(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Game Stage */}
      <main className="relative z-10 w-full max-w-4xl flex flex-col md:flex-row items-center justify-center gap-5 my-auto">
        {/* Left Panel: HOLD & SCORE */}
        <aside className="w-full md:w-48 flex flex-row md:flex-col gap-3">
          {/* HOLD Box */}
          <div className="flex-1 md:flex-none bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 backdrop-blur-md shadow-lg flex flex-col items-center">
            <h2 className="text-[11px] font-bold tracking-[0.2em] font-['Orbitron'] text-slate-400 mb-2">
              HOLD (C)
            </h2>
            <div className="w-[110px] h-[110px] bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-center p-1">
              <canvas ref={holdCanvasRef} width={110} height={110} className="block" />
            </div>
          </div>

          {/* SCORE & STATS */}
          <div className="flex-1 md:flex-none bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 backdrop-blur-md shadow-lg flex flex-col gap-3">
            <div>
              <span className="text-[10px] font-bold tracking-wider text-slate-400 block mb-0.5">
                SCORE
              </span>
              <strong className="text-2xl md:text-3xl font-extrabold text-[#ffd166] neon-glow-amber font-mono block leading-none">
                {score.toLocaleString()}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[9px] font-bold tracking-wider text-slate-400 block">ROUND</span>
                <strong className="text-lg font-bold text-cyan-300 font-mono">{round}</strong>
              </div>
              <div>
                <span className="text-[9px] font-bold tracking-wider text-slate-400 block">LINES</span>
                <strong className="text-lg font-bold text-white font-mono">{lines}</strong>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>다음 라운드까지</span>
              <span className="font-bold text-cyan-400 font-mono">
                {LINES_PER_ROUND - (lines % LINES_PER_ROUND)} 줄
              </span>
            </div>

            {/* High Score Badge */}
            <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 text-[11px] text-amber-400/90 font-medium">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>최고: </span>
              <span className="font-mono font-bold text-amber-300">{highScore.toLocaleString()}</span>
            </div>
          </div>
        </aside>

        {/* Center: Tetris Game Board */}
        <div className="relative w-[300px] h-[600px] rounded-2xl overflow-hidden border border-cyan-400/30 neon-box-glow bg-[#0a0e20] shrink-0">
          {/* HUD Overlay inside board */}
          <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex justify-between items-center pointer-events-none px-3 py-1.5 rounded-xl bg-slate-950/70 border border-cyan-500/20 backdrop-blur-sm">
            <div>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 block leading-tight">
                SCORE
              </span>
              <strong className="text-base font-extrabold text-[#ffd166] font-mono leading-tight">
                {score.toLocaleString()}
              </strong>
            </div>

            {/* Audio Indicator */}
            <div className="flex items-center gap-1.5">
              {!bgmMuted ? (
                <div className="flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[10px] text-cyan-300 font-bold tracking-wider">BGM ON</span>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 font-semibold tracking-wider">BGM MUTE</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[9px] font-bold tracking-wider text-slate-400 block leading-tight">
                ROUND
              </span>
              <strong className="text-base font-extrabold text-cyan-300 font-mono leading-tight">
                {round}
              </strong>
            </div>
          </div>

          {/* Canvas */}
          <canvas ref={boardCanvasRef} width={COLS * CELL_SIZE} height={ROWS * CELL_SIZE} className="block w-full h-full" />

          {/* Round Level-up Banner */}
          {roundBanner && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in-75 duration-200">
              <div className="text-center p-4">
                <p className="text-xs font-bold tracking-[0.3em] text-[#ffd166] uppercase mb-1 flex items-center justify-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400 animate-bounce" /> SPEED UP!
                </p>
                <h2 className="text-4xl font-black font-['Orbitron'] tracking-wider text-[#47f0ff] neon-glow-cyan">
                  ROUND {roundBanner}
                </h2>
                <p className="text-xs text-slate-300 mt-2">속도와 배경음악 템포가 빨라집니다!</p>
              </div>
            </div>
          )}

          {/* Start / Pause / Game Over Overlay */}
          {(!isPlaying || isPaused || isGameOver) && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-md p-6">
              <div className="w-full max-w-xs text-center flex flex-col items-center">
                {isGameOver ? (
                  <>
                    <p className="text-[11px] font-bold tracking-[0.3em] text-rose-400 uppercase mb-1">
                      GAME OVER
                    </p>
                    <h2 className="text-3xl font-extrabold font-['Orbitron'] text-white mb-2">
                      한 판 더?
                    </h2>
                    <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                      최종 점수 <span className="text-[#ffd166] font-bold font-mono">{score.toLocaleString()}</span>점
                      <br />
                      도달 라운드 <span className="text-cyan-400 font-bold font-mono">ROUND {round}</span>
                    </p>
                    <button
                      onClick={startGame}
                      className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-rose-500 via-pink-500 to-cyan-400 text-slate-950 font-extrabold font-['Orbitron'] tracking-wider text-sm hover:brightness-110 shadow-[0_0_20px_rgba(244,63,94,0.4)] transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>RETRY</span>
                    </button>
                  </>
                ) : isPaused ? (
                  <>
                    <p className="text-[11px] font-bold tracking-[0.3em] text-cyan-400 uppercase mb-1">
                      GAME PAUSED
                    </p>
                    <h2 className="text-3xl font-extrabold font-['Orbitron'] text-white mb-2">
                      PAUSE
                    </h2>
                    <p className="text-xs text-slate-300 mb-5">
                      점수 <span className="text-[#ffd166] font-bold font-mono">{score.toLocaleString()}</span> · 라운드 {round}
                    </p>
                    <button
                      onClick={togglePause}
                      className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#47f0ff] to-[#7dffd4] text-slate-950 font-extrabold font-['Orbitron'] tracking-wider text-sm hover:brightness-110 shadow-[0_0_20px_rgba(71,240,255,0.4)] transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>RESUME (P)</span>
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold tracking-[0.3em] text-cyan-400 uppercase mb-1">
                      PRESS START
                    </p>
                    <h2 className="text-3xl font-extrabold font-['Orbitron'] text-white mb-2">
                      READY?
                    </h2>
                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                      10줄을 지울 때마다 다음 판으로 넘어가며 낙하 속도와 배경음악 템포가 빨라집니다.
                    </p>
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 w-full mb-4 text-[11px] text-cyan-300 flex items-center justify-center gap-2">
                      <Music className="w-3.5 h-3.5 text-cyan-400" />
                      <span>배경음악: {TRACKS[currentTrackIndex]?.name}</span>
                    </div>
                    <button
                      onClick={startGame}
                      className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#47f0ff] to-[#7dffd4] text-slate-950 font-black font-['Orbitron'] tracking-widest text-base hover:brightness-110 shadow-[0_0_25px_rgba(71,240,255,0.5)] transition transform active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>START</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: NEXT & CONTROLS */}
        <aside className="w-full md:w-48 flex flex-row md:flex-col gap-3">
          {/* NEXT Box */}
          <div className="flex-1 md:flex-none bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 backdrop-blur-md shadow-lg flex flex-col items-center">
            <h2 className="text-[11px] font-bold tracking-[0.2em] font-['Orbitron'] text-slate-400 mb-2">
              NEXT
            </h2>
            <div className="w-[110px] h-[110px] bg-slate-950/70 rounded-xl border border-slate-800/80 flex items-center justify-center p-1">
              <canvas ref={nextCanvasRef} width={110} height={110} className="block" />
            </div>
          </div>

          {/* CONTROLS Guide */}
          <div className="flex-1 md:flex-none bg-slate-900/80 border border-slate-700/80 rounded-2xl p-3.5 backdrop-blur-md shadow-lg">
            <h2 className="text-[11px] font-bold tracking-[0.2em] font-['Orbitron'] text-slate-400 mb-2.5">
              CONTROLS
            </h2>
            <ul className="text-xs text-slate-300 space-y-1.5 font-sans">
              <li className="flex items-center justify-between">
                <span className="text-slate-400">이동</span>
                <span className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">→</kbd>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">소프트 드롭</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">↓</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">시계 회전</span>
                <span className="flex gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">X</kbd>
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">반시계 회전</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Z</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">하드 드롭</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">SPACE</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">홀드</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">C</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">일시정지</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">P</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-slate-400">배경음악 토글</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">M</kbd>
              </li>
            </ul>
          </div>
        </aside>
      </main>

      {/* On-screen Touchpad for Mobile / Tablet / Mouse */}
      <footer className="relative z-10 w-full max-w-sm mt-3 pb-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={hold}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-cyan-300 font-['Orbitron'] font-bold text-xs tracking-wider active:bg-cyan-900/50 active:scale-95 transition"
          >
            HOLD
          </button>
          <button
            type="button"
            onClick={() => tryRotate(-1)}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-['Orbitron'] font-bold text-xs tracking-wider active:bg-cyan-900/50 active:scale-95 transition"
          >
            CCW ↺
          </button>
          <button
            type="button"
            onClick={() => tryRotate(1)}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-['Orbitron'] font-bold text-xs tracking-wider active:bg-cyan-900/50 active:scale-95 transition"
          >
            CW ↻
          </button>

          <button
            type="button"
            onClick={() => move(-1)}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold text-lg active:bg-cyan-900/50 active:scale-95 transition"
          >
            ←
          </button>
          <button
            type="button"
            onClick={softDrop}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold text-lg active:bg-cyan-900/50 active:scale-95 transition"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => move(1)}
            className="py-3 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold text-lg active:bg-cyan-900/50 active:scale-95 transition"
          >
            →
          </button>

          <button
            type="button"
            onClick={hardDrop}
            className="col-span-3 py-3 rounded-xl bg-gradient-to-r from-[#47f0ff] to-[#7dffd4] text-slate-950 font-black font-['Orbitron'] text-xs tracking-widest shadow-[0_0_15px_rgba(71,240,255,0.35)] active:scale-98 transition"
          >
            HARD DROP (SPACE)
          </button>
        </div>
      </footer>
    </div>
  );
}
