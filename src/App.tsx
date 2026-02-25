/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Target, Trophy, RotateCcw, Info, Languages } from 'lucide-react';
import { 
  Rocket, Interceptor, Explosion, City, Tower, GameState, 
  GAME_WIDTH, GAME_HEIGHT, WIN_SCORE, POINTS_PER_KILL 
} from './types';

const INITIAL_TOWERS: Tower[] = [
  { id: 'tower-0', x: 50, y: GAME_HEIGHT - 40, ammo: 40, maxAmmo: 40, isDestroyed: false },
  { id: 'tower-1', x: GAME_WIDTH / 2, y: GAME_HEIGHT - 40, ammo: 80, maxAmmo: 80, isDestroyed: false },
  { id: 'tower-2', x: GAME_WIDTH - 50, y: GAME_HEIGHT - 40, ammo: 40, maxAmmo: 40, isDestroyed: false },
];

const INITIAL_CITIES: City[] = [
  { id: 'city-0', x: 150, y: GAME_HEIGHT - 30, isDestroyed: false },
  { id: 'city-1', x: 250, y: GAME_HEIGHT - 30, isDestroyed: false },
  { id: 'city-2', x: 350, y: GAME_HEIGHT - 30, isDestroyed: false },
  { id: 'city-3', x: 450, y: GAME_HEIGHT - 30, isDestroyed: false },
  { id: 'city-4', x: 550, y: GAME_HEIGHT - 30, isDestroyed: false },
  { id: 'city-5', x: 650, y: GAME_HEIGHT - 30, isDestroyed: false },
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [lang, setLang] = useState<'zh' | 'en'>('zh');
  
  // Game Entities
  const rocketsRef = useRef<Rocket[]>([]);
  const interceptorsRef = useRef<Interceptor[]>([]);
  const explosionsRef = useRef<Explosion[]>([]);
  const towersRef = useRef<Tower[]>(JSON.parse(JSON.stringify(INITIAL_TOWERS)));
  const citiesRef = useRef<City[]>(JSON.parse(JSON.stringify(INITIAL_CITIES)));
  
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);

  const t = {
    zh: {
      title: 'Tina新星防御',
      start: '开始游戏',
      win: '防御成功！',
      lose: '防御失败',
      score: '得分',
      winScore: '目标得分',
      ammo: '弹药',
      restart: '再玩一次',
      instructions: '点击屏幕发射拦截导弹。预判火箭落点，利用爆炸范围摧毁敌人。',
    },
    en: {
      title: 'Tina Nova Defense',
      start: 'Start Game',
      win: 'Defense Successful!',
      lose: 'Defense Failed',
      score: 'Score',
      winScore: 'Target Score',
      ammo: 'Ammo',
      restart: 'Play Again',
      instructions: 'Click screen to fire interceptors. Predict rocket paths and use explosion radius to destroy enemies.',
    }
  }[lang];

  const resetGame = useCallback(() => {
    rocketsRef.current = [];
    interceptorsRef.current = [];
    explosionsRef.current = [];
    towersRef.current = JSON.parse(JSON.stringify(INITIAL_TOWERS));
    citiesRef.current = JSON.parse(JSON.stringify(INITIAL_CITIES));
    setScore(0);
    setGameState('PLAYING');
  }, []);

  const fireInterceptor = (targetX: number, targetY: number) => {
    if (gameState !== 'PLAYING') return;

    // Find best tower (closest with ammo)
    let bestTower: Tower | null = null;
    let minDist = Infinity;

    towersRef.current.forEach(tower => {
      if (tower.ammo > 0 && !tower.isDestroyed) {
        const dist = Math.sqrt(Math.pow(tower.x - targetX, 2) + Math.pow(tower.y - targetY, 2));
        if (dist < minDist) {
          minDist = dist;
          bestTower = tower;
        }
      }
    });

    if (bestTower) {
      (bestTower as Tower).ammo -= 1;
      interceptorsRef.current.push({
        id: Math.random().toString(),
        startX: (bestTower as Tower).x,
        startY: (bestTower as Tower).y,
        x: (bestTower as Tower).x,
        y: (bestTower as Tower).y,
        targetX,
        targetY,
        speed: 10,
        progress: 0
      });
    }
  };

  const update = (deltaTime: number) => {
    if (gameState !== 'PLAYING') return;

    // Spawn rockets
    spawnTimerRef.current += deltaTime;
    const spawnRate = Math.max(500, 2000 - (score / 100) * 100); // Faster as score increases
    if (spawnTimerRef.current > spawnRate) {
      spawnTimerRef.current = 0;
      const targets = [...citiesRef.current.filter(c => !c.isDestroyed), ...towersRef.current.filter(t => !t.isDestroyed)];
      if (targets.length > 0) {
        const target = targets[Math.floor(Math.random() * targets.length)];
        rocketsRef.current.push({
          id: Math.random().toString(),
          x: Math.random() * GAME_WIDTH,
          y: 0,
          targetX: target.x,
          targetY: target.y,
          speed: 0.5 + Math.random() * 0.5 + (score / 2000),
          progress: 0
        });
      }
    }

    // Update Rockets
    rocketsRef.current.forEach((rocket, index) => {
      rocket.progress += rocket.speed / 100;
      rocket.x = rocket.x + (rocket.targetX - rocket.x) * (rocket.speed / 100) / (1 - rocket.progress + 0.01);
      rocket.y = rocket.y + (rocket.targetY - rocket.y) * (rocket.speed / 100) / (1 - rocket.progress + 0.01);

      // Check if reached target
      if (rocket.y >= rocket.targetY) {
        // Hit!
        explosionsRef.current.push({
          id: Math.random().toString(),
          x: rocket.targetX,
          y: rocket.targetY,
          radius: 0,
          maxRadius: 40,
          growthRate: 2,
          isExpanding: true
        });
        
        // Damage city or tower
        citiesRef.current.forEach(city => {
          if (Math.abs(city.x - rocket.targetX) < 10 && Math.abs(city.y - rocket.targetY) < 10) {
            city.isDestroyed = true;
          }
        });
        towersRef.current.forEach(tower => {
          if (Math.abs(tower.x - rocket.targetX) < 10 && Math.abs(tower.y - rocket.targetY) < 10) {
            tower.isDestroyed = true;
          }
        });

        rocketsRef.current.splice(index, 1);
      }
    });

    // Update Interceptors
    interceptorsRef.current.forEach((inter, index) => {
      const dx = inter.targetX - inter.startX;
      const dy = inter.targetY - inter.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      inter.progress += inter.speed / dist;
      
      inter.x = inter.startX + dx * inter.progress;
      inter.y = inter.startY + dy * inter.progress;

      if (inter.progress >= 1) {
        explosionsRef.current.push({
          id: Math.random().toString(),
          x: inter.targetX,
          y: inter.targetY,
          radius: 0,
          maxRadius: 50,
          growthRate: 1.5,
          isExpanding: true
        });
        interceptorsRef.current.splice(index, 1);
      }
    });

    // Update Explosions
    explosionsRef.current.forEach((exp, index) => {
      if (exp.isExpanding) {
        exp.radius += exp.growthRate;
        if (exp.radius >= exp.maxRadius) exp.isExpanding = false;
      } else {
        exp.radius -= exp.growthRate * 0.5;
        if (exp.radius <= 0) {
          explosionsRef.current.splice(index, 1);
        }
      }

      // Check collision with rockets
      rocketsRef.current.forEach((rocket, rIndex) => {
        const dist = Math.sqrt(Math.pow(rocket.x - exp.x, 2) + Math.pow(rocket.y - exp.y, 2));
        if (dist < exp.radius) {
          rocketsRef.current.splice(rIndex, 1);
          setScore(prev => prev + POINTS_PER_KILL);
        }
      });
    });

    // Check Win/Loss
    if (score >= WIN_SCORE) {
      setGameState('WON');
    }
    if (towersRef.current.every(t => t.isDestroyed)) {
      setGameState('LOST');
    }
  };

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, GAME_HEIGHT - 20, GAME_WIDTH, 20);

    // Draw Cities
    citiesRef.current.forEach(city => {
      if (!city.isDestroyed) {
        ctx.fillStyle = '#10b981';
        ctx.fillRect(city.x - 15, city.y - 15, 30, 15);
        ctx.fillRect(city.x - 10, city.y - 25, 20, 10);
      }
    });

    // Draw Towers
    towersRef.current.forEach(tower => {
      if (!tower.isDestroyed) {
        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.moveTo(tower.x - 20, tower.y);
        ctx.lineTo(tower.x + 20, tower.y);
        ctx.lineTo(tower.x, tower.y - 30);
        ctx.closePath();
        ctx.fill();
        
        // Ammo dots
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${tower.ammo}`, tower.x, tower.y + 15);
      }
    });

    // Draw Rockets
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    rocketsRef.current.forEach(rocket => {
      ctx.beginPath();
      ctx.moveTo(rocket.x, rocket.y);
      // Draw trail
      const startX = rocket.x - (rocket.targetX - rocket.x) * (rocket.progress / (1 - rocket.progress + 0.01));
      ctx.lineTo(startX, 0);
      ctx.stroke();
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(rocket.x, rocket.y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Interceptors
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    interceptorsRef.current.forEach(inter => {
      ctx.beginPath();
      ctx.moveTo(inter.startX, inter.startY);
      ctx.lineTo(inter.x, inter.y);
      ctx.stroke();
      
      // Target marker X
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(inter.targetX - 5, inter.targetY - 5);
      ctx.lineTo(inter.targetX + 5, inter.targetY + 5);
      ctx.moveTo(inter.targetX + 5, inter.targetY - 5);
      ctx.lineTo(inter.targetX - 5, inter.targetY + 5);
      ctx.stroke();
    });

    // Draw Explosions
    explosionsRef.current.forEach(exp => {
      const alpha = exp.isExpanding ? 0.7 : exp.radius / exp.maxRadius * 0.7;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = (time: number) => {
      const deltaTime = time - lastTimeRef.current;
      lastTimeRef.current = time;

      update(deltaTime);
      draw(ctx);
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState, score, draw]);

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    fireInterceptor(x, y);
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Header Info */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">{t.score}</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{score.toString().padStart(4, '0')}</span>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-mono">{t.winScore}</span>
            <span className="text-2xl font-bold font-mono text-white/80">{WIN_SCORE}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLang(l => l === 'zh' ? 'en' : 'zh')}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white/70"
          >
            <Languages size={20} />
          </button>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
            <Shield size={16} className="text-blue-400" />
            <span className="text-sm font-medium">{t.title}</span>
          </div>
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative aspect-[4/3] w-full max-w-4xl bg-[#050505] shadow-2xl shadow-blue-500/10 border border-white/5 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          onMouseDown={handleInteraction}
          onTouchStart={handleInteraction}
          className="w-full h-full cursor-crosshair"
        />

        {/* Overlays */}
        <AnimatePresence>
          {gameState === 'START' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.h1 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-6xl font-black mb-4 tracking-tighter uppercase italic text-white"
              >
                {t.title}
              </motion.h1>
              <p className="text-white/60 max-w-md mb-8 leading-relaxed">
                {t.instructions}
              </p>
              <button
                onClick={resetGame}
                className="group relative px-12 py-4 bg-white text-black font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all duration-300"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Target size={20} />
                  {t.start}
                </span>
                <div className="absolute inset-0 bg-emerald-400 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
              </button>
            </motion.div>
          )}

          {(gameState === 'WON' || gameState === 'LOST') && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className={`mb-6 p-6 rounded-full ${gameState === 'WON' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {gameState === 'WON' ? <Trophy size={64} /> : <Shield size={64} />}
              </div>
              <h2 className={`text-5xl font-black mb-2 uppercase tracking-tight ${gameState === 'WON' ? 'text-emerald-400' : 'text-red-400'}`}>
                {gameState === 'WON' ? t.win : t.lose}
              </h2>
              <div className="mb-8">
                <span className="text-white/40 uppercase text-xs tracking-widest block mb-1">{t.score}</span>
                <span className="text-4xl font-mono font-bold text-white">{score}</span>
              </div>
              <button
                onClick={resetGame}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black font-bold uppercase tracking-widest hover:bg-blue-400 transition-all"
              >
                <RotateCcw size={20} />
                {t.restart}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Controls / Legend */}
      <div className="mt-8 grid grid-cols-3 gap-8 w-full max-w-4xl px-4">
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Defense Grid Alpha</span>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              animate={{ width: `${(towersRef.current[0].ammo / towersRef.current[0].maxAmmo) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-blue-400">L-TOWER: {towersRef.current[0].ammo}/{towersRef.current[0].maxAmmo}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Defense Grid Prime</span>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              animate={{ width: `${(towersRef.current[1].ammo / towersRef.current[1].maxAmmo) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-emerald-400">C-TOWER: {towersRef.current[1].ammo}/{towersRef.current[1].maxAmmo}</span>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-widest text-white/30 font-mono">Defense Grid Gamma</span>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-blue-500"
              animate={{ width: `${(towersRef.current[2].ammo / towersRef.current[2].maxAmmo) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-blue-400">R-TOWER: {towersRef.current[2].ammo}/{towersRef.current[2].maxAmmo}</span>
        </div>
      </div>

      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-[-1]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>
    </div>
  );
}
