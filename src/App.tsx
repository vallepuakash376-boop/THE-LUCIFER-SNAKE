import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, AlertTriangle, Terminal, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DUMMY_TRACKS } from './constants';

const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 120;

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export default function App() {
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false);
  
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = DUMMY_TRACKS[currentTrackIdx];

  const generateFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood;
    while (true) {
      newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      const isOnSnake = currentSnake.some((segment) => segment.x === newFood.x && segment.y === newFood.y);
      if (!isOnSnake) break;
    }
    setFood(newFood);
  }, []);

  useEffect(() => {
    generateFood(INITIAL_SNAKE);
    const storedHighScore = localStorage.getItem('glitchSnakeHighScore');
    if (storedHighScore) setHighScore(parseInt(storedHighScore, 10));
  }, [generateFood]);

  const gameLoop = useCallback(() => {
    if (gameOver || isGamePaused) return;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { x: head.x + direction.x, y: head.y + direction.y };

      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        handleGameOver();
        return prevSnake;
      }
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        handleGameOver();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => s + 10);
        generateFood(newSnake);
      } else {
        newSnake.pop(); 
      }
      return newSnake;
    });
  }, [direction, food, gameOver, isGamePaused, generateFood]);

  useInterval(gameLoop, gameOver || isGamePaused ? null : BASE_SPEED - Math.min(score, 80));

  const handleGameOver = () => {
    setGameOver(true);
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('glitchSnakeHighScore', score.toString());
    }
  };

  const restartGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameOver(false);
    setIsGamePaused(false);
    generateFood(INITIAL_SNAKE);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (e.key === ' ' || e.key === 'Escape') {
        setIsGamePaused((p) => !p);
        return;
      }
      if (gameOver) return;

      setDirection((prevDir) => {
        switch (e.key) {
          case 'ArrowUp': case 'w': return prevDir.y === 1 ? prevDir : { x: 0, y: -1 };
          case 'ArrowDown': case 's': return prevDir.y === -1 ? prevDir : { x: 0, y: 1 };
          case 'ArrowLeft': case 'a': return prevDir.x === 1 ? prevDir : { x: -1, y: 0 };
          case 'ArrowRight': case 'd': return prevDir.x === -1 ? prevDir : { x: 1, y: 0 };
          default: return prevDir;
        }
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.error(e));
    setIsPlaying(!isPlaying);
  };
  const nextTrack = () => { setCurrentTrackIdx((curr) => (curr + 1) % DUMMY_TRACKS.length); setIsPlaying(true); };
  const prevTrack = () => { setCurrentTrackIdx((curr) => (curr - 1 + DUMMY_TRACKS.length) % DUMMY_TRACKS.length); setIsPlaying(true); };
  const toggleMute = () => { if (audioRef.current) { audioRef.current.muted = !isMuted; setIsMuted(!isMuted); } };

  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrackIdx]);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row p-4 md:p-8 gap-4 md:gap-8 overflow-hidden bg-black z-0 screen-crush relative font-pixel">
      
      <div className="scanline"></div>
      <div className="static-noise-bg"></div>

      <audio ref={audioRef} src={currentTrack.url} onEnded={nextTrack} loop={false} />

      {/* SYSTEM LOGS / SIDEBAR */}
      <aside className="w-full md:w-80 flex flex-col gap-4 md:gap-6 z-10 relative shrink-0">
        <div className="border-glitch p-4 md:p-6 bg-cyan-950/20">
          <h1 className="text-2xl md:text-3xl font-pixel text-glitch-severe text-fuchsia-500 mb-2 leading-tight">
            FATAL_ERR<br/>0xSNAKE
          </h1>
          <p className="text-sm text-cyan-400 flex items-center gap-2 mt-4 font-bold bg-black inline-block p-1 font-mono">
            <Terminal size={14} className="animate-pulse inline" /> INPUT: [W A S D]<br/>
            &gt; BRK: [SPACE]
          </p>
        </div>

        <div className="border-glitch flex-1 p-4 md:p-6 bg-black flex flex-col overflow-y-auto">
          <h2 className="text-sm md:text-md font-pixel text-fuchsia-500 mb-6 border-b-2 border-fuchsia-500 pb-2">
            // AUDIO_DRV
          </h2>
          
          <div className="space-y-4 mb-4 flex-1 font-mono">
            <div className="bg-cyan-900/30 border border-cyan-400 p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-cyan-400 text-black px-1 text-xs font-bold shadow-[0_0_5px_#0ff]">ACTIVE</div>
              <p className="text-sm md:text-base font-pixel text-cyan-300 text-glitch truncate mt-2">{currentTrack.title}</p>
              <p className="text-xs text-fuchsia-400 truncate mt-1">BY: {currentTrack.artist}</p>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              {DUMMY_TRACKS.map((track, idx) => {
                if (idx === currentTrackIdx) return null;
                return (
                  <div key={idx} className="border border-white/20 p-2 hover:border-fuchsia-500 transition-colors cursor-pointer opacity-70 hover:opacity-100" onClick={() => {setCurrentTrackIdx(idx); setIsPlaying(true);}}>
                    <p className="text-xs font-pixel truncate">{track.title}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-auto pt-4 border-t-2 border-fuchsia-500 text-sm tracking-widest flex justify-between items-center bg-black font-mono">
             <button onClick={toggleMute} className="flex items-center gap-2 text-cyan-400 hover:text-fuchsia-500 transition-colors bg-cyan-950/40 px-2 py-1 border border-cyan-500/50">
               {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
               {isMuted ? 'SYS_MUTE' : 'SYS_OUT'}
             </button>
          </div>
        </div>
      </aside>

      {/* CORE PROCESSOR / MAIN */}
      <main className="flex-1 flex flex-col z-10 relative">
        <div className="flex justify-between items-end mb-4 px-2 border-b-4 border-cyan-400 pb-2 border-dashed font-mono">
          <div>
            <span className="text-xs md:text-sm text-cyan-500 block mb-1 font-bold tracking-widest">&gt;&gt; STACK_ADDR_CUR</span>
            <h3 className="text-2xl md:text-4xl font-pixel text-cyan-300 text-glitch">{score.toString().padStart(6, '0')}</h3>
          </div>
          <div className="text-right">
            <span className="text-xs md:text-sm text-fuchsia-500 block mb-1 font-bold tracking-widest">&gt;&gt; MAX_OVERFLOW</span>
            <h3 className="text-xl md:text-2xl font-pixel text-fuchsia-400">{highScore.toString().padStart(6, '0')}</h3>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative p-2 md:p-4">
          <div 
            className="snake-grid relative flex-shrink-0"
            style={{
              width: '100%',
              maxWidth: '500px',
              aspectRatio: '1/1',
            }}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const x = i % GRID_SIZE;
              const y = Math.floor(i / GRID_SIZE);
              
              const isHead = snake[0].x === x && snake[0].y === y;
              const isBody = snake.some((segment, idx) => idx !== 0 && segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;

              return (
                <div
                  key={i}
                  className="snake-cell relative float-left"
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                  }}
                >
                  {isFood && <div className="snake-food absolute inset-[15%]" />}
                  {isHead && <div className="snake-head absolute inset-[5%]" />}
                  {isBody && <div className="snake-body absolute inset-[10%]" />}
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {gameOver && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90 border-4 border-red-600 m-2"
              >
                <AlertTriangle size={64} className="text-red-500 mb-4 animate-pulse" />
                <h2 className="text-3xl md:text-4xl font-pixel text-red-500 mb-2 text-glitch-severe text-center leading-tight">
                  SEGMENTATION<br/>FAULT
                </h2>
                <p className="text-lg font-mono text-cyan-300 mt-6 mb-8 bg-black p-2 border border-cyan-400">TRACE: {score}</p>
                
                <button 
                  onClick={restartGame}
                  className="flex items-center gap-2 bg-red-600 text-black px-8 py-4 font-mono font-bold text-lg transition-all hover:bg-black hover:text-red-500 hover:border-4 hover:border-red-500 border-4 border-red-600"
                >
                  <RotateCcw size={18} /> REBOOT_SYS
                </button>
              </motion.div>
            )}

            {isGamePaused && !gameOver && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm"
              >
                <div className="border-4 border-cyan-400 bg-black p-8 flex flex-col items-center">
                  <h2 className="text-2xl md:text-4xl font-pixel text-cyan-300 text-glitch mb-4">
                    HALTED
                  </h2>
                  <div className="h-4 w-48 bg-cyan-400/20"><div className="h-full bg-cyan-400 w-1/2 animate-pulse"></div></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* AUDIO_CTRL - Bottom Block Main Area */}
        <div className="mt-4 border-glitch bg-black p-4 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
           <div className="flex items-center gap-4 text-cyan-400">
             <button onClick={prevTrack} className="hover:text-fuchsia-500 hover:scale-110 transition-all p-2 bg-cyan-900/20 border border-cyan-500/30">
               <SkipBack size={24} fill="currentColor" />
             </button>
             <button onClick={togglePlay} className="text-fuchsia-500 hover:text-cyan-400 hover:scale-110 hover:shadow-[0_0_15px_#0ff] transition-all p-4 border-2 border-fuchsia-500 bg-fuchsia-900/20">
               {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
             </button>
             <button onClick={nextTrack} className="hover:text-fuchsia-500 hover:scale-110 transition-all p-2 bg-cyan-900/20 border border-cyan-500/30">
               <SkipForward size={24} fill="currentColor" />
             </button>
           </div>
           
           <div className="w-full md:w-1/2">
             <div className="flex justify-between text-xs font-bold text-fuchsia-500 mb-1 tracking-widest">
                <span>BUFFERING...</span>
                <span className="animate-pulse">{isPlaying ? 'EXECUTING' : 'IDLE'}</span>
             </div>
             <div className="w-full h-6 border-2 border-fuchsia-500 p-1 relative bg-black">
               <div className="w-full h-full bg-fuchsia-900/30">
                  <motion.div 
                    className="h-full bg-fuchsia-500 shadow-[0_0_10px_#f0f]"
                    animate={{ width: isPlaying ? ['0%', '100%'] : '0%' }}
                    transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
                  />
               </div>
               
               {/* Decorative grid overlay for progress bar */}
               <div className="absolute inset-0 flex justify-between px-1 pointer-events-none opacity-50 space-x-1">
                  {[...Array(20)].map((_,i) => <div key={i} className="h-full flex-1 bg-black/40"></div>)}
               </div>
             </div>
           </div>
        </div>
      </main>

    </div>
  );
}
