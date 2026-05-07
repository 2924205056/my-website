/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, Zap, Cloud } from 'lucide-react';

enum Difficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD'
}

interface DifficultyConfig {
  gravity: number;
  jumpStrength: number;
  gameSpeed: number;
  spawnRate: number;
  label: string;
  color: string;
}

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultyConfig> = {
  [Difficulty.EASY]: {
    gravity: 0.4,
    jumpStrength: -10,
    gameSpeed: 4,
    spawnRate: 200,
    label: '休闲',
    color: 'bg-green-400'
  },
  [Difficulty.NORMAL]: {
    gravity: 0.5,
    jumpStrength: -11,
    gameSpeed: 5.5,
    spawnRate: 140,
    label: '普通',
    color: 'bg-blue-400'
  },
  [Difficulty.HARD]: {
    gravity: 0.65,
    jumpStrength: -13,
    gameSpeed: 8,
    spawnRate: 80,
    label: '专家',
    color: 'bg-rose-500'
  }
};

interface GameState {
  playerY: number;
  playerVelocity: number;
  score: number;
  isGameOver: boolean;
  gameStarted: boolean;
  difficulty: Difficulty;
  obstacles: Array<{ id: number; x: number; height: number; type: 'storm' | 'bird' }>;
  backgroundClouds: Array<{ id: number; x: number; y: number; scale: number; speed: number }>;
}

export default function App() {
  const [state, setState] = useState<GameState>({
    playerY: 200,
    playerVelocity: 0,
    score: 0,
    isGameOver: false,
    gameStarted: false,
    difficulty: Difficulty.NORMAL,
    obstacles: [],
    backgroundClouds: Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * 200,
      scale: 0.5 + Math.random(),
      speed: 0.5 + Math.random()
    }))
  });

  const config = DIFFICULTY_SETTINGS[state.difficulty];

  const requestRef = useRef<number>(null);
  const frameCount = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const startGame = useCallback((difficulty: Difficulty) => {
    frameCount.current = 0;
    setState(prev => ({ 
      ...prev, 
      difficulty,
      gameStarted: true, 
      isGameOver: false, 
      score: 0, 
      obstacles: [],
      playerY: 150,
      playerVelocity: DIFFICULTY_SETTINGS[difficulty].jumpStrength
    }));
  }, []);

  const jump = useCallback(() => {
    if (!state.gameStarted || state.isGameOver) return;
    
    setState(prev => ({
      ...prev,
      playerVelocity: DIFFICULTY_SETTINGS[prev.difficulty].jumpStrength
    }));
  }, [state.gameStarted, state.isGameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (state.gameStarted && !state.isGameOver) {
          jump();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump, state.gameStarted, state.isGameOver]);

  const updateGame = useCallback(() => {
    if (!state.gameStarted || state.isGameOver) return;

    frameCount.current++;

    setState(prev => {
      const currentConfig = DIFFICULTY_SETTINGS[prev.difficulty];
      
      // 1. Update Player position
      const newVelocity = prev.playerVelocity + currentConfig.gravity;
      let newY = prev.playerY + newVelocity;
      
      if (newY > 400) return { ...prev, isGameOver: true, gameStarted: false };
      if (newY < 0) newY = 0;

      // 2. Spawn Obstacles
      let nextObstacles = [...prev.obstacles];
      if (frameCount.current > 100 && frameCount.current % currentConfig.spawnRate === 0) {
        nextObstacles.push({
          id: Date.now(),
          x: window.innerWidth,
          height: 80 + Math.random() * 120,
          type: Math.random() > 0.8 ? 'bird' : 'storm'
        });
      }

      // 3. Move Obstacles
      nextObstacles = nextObstacles
        .map(o => ({ ...o, x: o.x - currentConfig.gameSpeed }))
        .filter(o => o.x > -100);

      const nextBackground = prev.backgroundClouds.map(c => ({
        ...c,
        x: (c.x - c.speed) < -200 ? window.innerWidth + 200 : c.x - c.speed
      }));

      // 4. Collision Detection
      const playerPadding = 20;
      const playerRect = { 
        top: newY + playerPadding, 
        bottom: newY + 80 - playerPadding, 
        left: 60 + playerPadding, 
        right: 60 + 80 - playerPadding 
      };
      
      const hasCollision = nextObstacles.some(o => {
        const obsPadding = 15;
        const obsRect = { 
          top: 400 - o.height + obsPadding, 
          bottom: 400, 
          left: o.x + obsPadding, 
          right: o.x + 60 - obsPadding 
        };
        return (
          playerRect.left < obsRect.right &&
          playerRect.right > obsRect.left &&
          playerRect.top < obsRect.bottom &&
          playerRect.bottom > obsRect.top
        );
      });

      if (hasCollision) return { ...prev, isGameOver: true, gameStarted: false };

      return {
        ...prev,
        playerY: newY,
        playerVelocity: newVelocity,
        score: prev.score + (prev.difficulty === Difficulty.HARD ? 2 : 1),
        obstacles: nextObstacles,
        backgroundClouds: nextBackground
      };
    });

    requestRef.current = requestAnimationFrame(updateGame);
  }, [state.gameStarted, state.isGameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [updateGame]);

  return (
    <div 
      className="relative w-full h-screen bg-gradient-to-b from-sky-400 to-sky-200 overflow-hidden cursor-pointer flex items-center justify-center font-sans"
      onClick={jump}
      ref={containerRef}
    >
      {/* Background Clouds */}
      {state.backgroundClouds.map(cloud => (
        <motion.div
          key={cloud.id}
          className="absolute text-white/40"
          style={{ 
            left: cloud.x, 
            top: cloud.y,
            transform: `scale(${cloud.scale})`
          }}
        >
          <Cloud size={100} fill="currentColor" />
        </motion.div>
      ))}

      {/* Score */}
      <div className="absolute top-8 left-8 z-20">
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/30 shadow-xl">
          <Zap className="text-yellow-400 fill-yellow-400" size={24} />
          <span className="text-2xl font-extrabold text-white tracking-widest">{state.score}</span>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative w-full max-w-4xl h-[400px]">
        {/* Floor Line (Invisible) */}
        <div className="absolute bottom-0 w-full h-1 bg-white/10 hidden" />

        {/* Player - Character Image from User */}
        <motion.div
          animate={{ y: state.playerY, rotate: state.playerVelocity * 2 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          style={{ left: 60, position: 'absolute' }}
          className="z-10"
        >
          <div className="relative">
            {/* Using the user provided image as character */}
            <img 
              src="/images/0641f907-e976-44bd-b2dc-f08e14852cd9.png" 
              alt="SkateCloud"
              className="w-28 h-28 object-contain drop-shadow-2xl"
              referrerPolicy="no-referrer"
            />
            {/* Trail effect */}
            <AnimatePresence>
              {state.playerVelocity < 0 && (
                <motion.div
                  initial={{ opacity: 0.5, scale: 0.8 }}
                  animate={{ opacity: 0, scale: 1.2, x: -20 }}
                  exit={{ opacity: 0 }}
                  className="absolute -bottom-2 -left-4 w-12 h-6 bg-white/40 rounded-full blur-md"
                />
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Obstacles */}
        {state.obstacles.map(o => (
          <div
            key={o.id}
            className="absolute bottom-0"
            style={{ left: o.x, width: 60, height: o.height }}
          >
            <div className={`w-full h-full rounded-2xl border-4 ${o.type === 'storm' ? 'bg-slate-700 border-slate-900' : 'bg-red-400 border-red-600'} shadow-lg flex items-center justify-center overflow-hidden`}>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]" />
              {o.type === 'storm' ? (
                <Zap className="text-yellow-400 animate-pulse" size={32} />
              ) : (
                <div className="animate-bounce">👿</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* UI Overlays */}
      <AnimatePresence>
        {!state.gameStarted && !state.isGameOver && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-sky-900/40 backdrop-blur-sm px-6 text-center"
          >
            <motion.img 
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              src="/images/0641f907-e976-44bd-b2dc-f08e14852cd9.png"
              className="w-40 h-40 mb-6 drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            />
            <h1 className="text-6xl font-black text-white mb-2 drop-shadow-lg tracking-tighter">云端酷跑</h1>
            <p className="text-xl text-sky-50 font-medium mb-8 max-w-sm">选择你的云端挑战难度</p>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
              {(Object.keys(Difficulty) as Difficulty[]).map((diff) => (
                <motion.button
                  key={diff}
                  whileHover={{ scale: 1.05, x: 10 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); startGame(diff); }}
                  className={`${DIFFICULTY_SETTINGS[diff].color} group relative flex items-center justify-between px-8 py-4 rounded-2xl text-white text-xl font-bold shadow-lg transition-all`}
                >
                  <span className="flex items-center gap-3">
                    {diff === Difficulty.HARD ? <Zap size={20} className="fill-current"/> : <Play size={20} className="fill-current" />}
                    {DIFFICULTY_SETTINGS[diff].label}
                  </span>
                  <span className="text-sm opacity-70 font-normal">
                    {diff === Difficulty.EASY ? '放松心境' : diff === Difficulty.HARD ? '极速瞬移' : '平稳节奏'}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {state.isGameOver && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-rose-500/90 backdrop-blur-md text-white p-8 text-center"
          >
            <Trophy className="text-yellow-300 w-20 h-20 mb-4 animate-bounce" />
            <h2 className="text-6xl font-black mb-1">出局啦!</h2>
            <p className="text-xl opacity-90 mb-6 italic">你在 {DIFFICULTY_SETTINGS[state.difficulty].label} 模式中获得了：</p>
            
            <div className="bg-black/20 px-8 py-4 rounded-3xl mb-8">
              <span className="text-6xl font-black tabular-nums">{state.score}</span>
            </div>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); startGame(state.difficulty); }}
                className="flex items-center justify-center gap-3 bg-white text-rose-600 px-8 py-4 rounded-2xl text-xl font-bold shadow-xl"
              >
                <RotateCcw />
                再试一次
              </motion.button>
              
              <button
                onClick={(e) => { e.stopPropagation(); setState(prev => ({...prev, isGameOver: false, gameStarted: false})); }}
                className="text-white/80 hover:text-white font-medium underline underline-offset-4"
              >
                返回难度选择
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative Ground Clouds */}
      <div className="absolute bottom-0 w-full flex justify-between px-10 pointer-events-none">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 3 + i, repeat: Infinity }}
            className="text-white h-24"
          >
            <Cloud size={120 + i * 10} fill="currentColor" />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
