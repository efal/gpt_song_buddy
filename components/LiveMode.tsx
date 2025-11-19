import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { useAudioMonitor } from '../services/audio';
import { ArrowLeft, Mic, Play, Maximize2, Minimize2, Type, MoveVertical, Pause, MicOff } from 'lucide-react';

interface LiveModeProps {
  song: Song;
  onExit: () => void;
  onUpdate: (song: Song) => void;
}

const LiveMode: React.FC<LiveModeProps> = ({ song, onExit, onUpdate }) => {
  // Default to monitoring true (armed) immediately
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null); // Ref for the progress bar thumb
  const lastFrameTime = useRef<number>(0);
  const animationRef = useRef<number>(0);

  // Reference to song to access latest values inside requestAnimationFrame closure
  const songRef = useRef(song);
  songRef.current = song;
  
  // Audio Monitor
  // CRITICAL PERFORMANCE FIX: Disable monitoring while scrolling.
  // This stops React from re-rendering the component 60fps due to db level changes,
  // allowing the browser to dedicate resources entirely to smooth scrolling.
  const shouldMonitor = isMonitoring && !isScrolling;
  const { currentDB, triggered, error } = useAudioMonitor(shouldMonitor, song.audioTrigger.threshold);

  // Trigger effect
  useEffect(() => {
    if (triggered && !isScrolling) {
      setIsScrolling(true);
    }
  }, [triggered, isScrolling]);

  // Helper to update progress bar visually without triggering re-renders
  const updateProgressBar = () => {
    if (containerRef.current && progressBarRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const maxScroll = scrollHeight - clientHeight;
      
      if (maxScroll > 0) {
        // Calculate remaining percentage
        const progress = (scrollTop / maxScroll) * 100;
        const remaining = 100 - Math.min(100, Math.max(0, progress));
        
        // Set height based on remaining content (shrinks as we scroll)
        progressBarRef.current.style.height = `${remaining}%`;
      }
    }
  };

  // Scroll Loop
  const scroll = (time: number) => {
    if (!lastFrameTime.current) lastFrameTime.current = time;
    const deltaTime = (time - lastFrameTime.current) / 1000; // seconds
    lastFrameTime.current = time;

    if (containerRef.current) {
      // Use ref to get latest speed during active loop without restarting it
      // Pixels to move = speed (px/s) * deltaTime (s)
      const moveAmount = songRef.current.scrollspeed * deltaTime;
      
      // Only update DOM if we actually moved
      if (moveAmount > 0) {
        containerRef.current.scrollTop += moveAmount;
        
        // Update progress bar synchronously with scroll
        updateProgressBar();

        // Check end
        // FIXED: Calculate end based on the container's total scrollable height (including spacers),
        // not just the lyrics text content height.
        const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
        // Allow a small epsilon (1px) for float rounding errors in some browsers
        if (scrollTop + clientHeight >= scrollHeight - 1) {
          setIsScrolling(false); // Stop at absolute bottom
        }
      }
    }

    if (isScrolling) {
      animationRef.current = requestAnimationFrame(scroll);
    }
  };

  // Start/Stop Scroll Animation
  useEffect(() => {
    if (isScrolling) {
      lastFrameTime.current = 0; // Reset delta timer
      animationRef.current = requestAnimationFrame(scroll);
    } else {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isScrolling]);

  // Update progress bar on manual scroll or window resize
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
        container.addEventListener('scroll', updateProgressBar);
        window.addEventListener('resize', updateProgressBar);
        // Initial update
        updateProgressBar();
    }
    return () => {
        if (container) container.removeEventListener('scroll', updateProgressBar);
        window.removeEventListener('resize', updateProgressBar);
    };
  }, []);

  // Fullscreen Toggle
  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle exit
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onExit]);

  const handleScreenTap = () => {
    // Tapping stops scrolling if active, otherwise does nothing specific (controls are always visible now)
    if (isScrolling) {
        setIsScrolling(false);
    }
  };

  const handleSettingChange = (field: keyof Song, value: number) => {
      onUpdate({ ...song, [field]: value });
  };

  return (
    <div 
      className="fixed inset-0 bg-black text-white z-50 overflow-hidden flex flex-col"
      onClick={handleScreenTap}
    >
      {/* Progress Bar Sidebar */}
      <div className="absolute right-0 top-0 bottom-0 w-1.5 z-30 bg-white/5">
        <div 
            ref={progressBarRef}
            className="absolute bottom-0 w-full bg-gray-300/70 rounded-t-full transition-all duration-75 ease-linear"
            style={{ height: '100%' }}
        />
      </div>

      {/* Scrolling Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-scroll no-scrollbar relative"
        style={{ scrollBehavior: 'auto', transform: 'translateZ(0)' }} // Force GPU layer
      >
        {/* Padding top and bottom to allow text to center vertically at start and end */}
        <div style={{ height: '40vh' }}></div>
        
        <div 
            ref={contentRef}
            className="max-w-5xl mx-auto px-8 pb-20 text-center whitespace-pre-wrap font-bold leading-relaxed transition-all duration-100"
            style={{ fontSize: `${song.fontsize}px` }}
        >
          {song.lyrics}
        </div>
        
        <div style={{ height: '60vh' }}></div>
      </div>

      {/* Top HUD Controls - Transparent & Fade on Hover */}
      <div className="absolute top-0 left-0 w-full bg-black/10 hover:bg-black/60 transition-colors duration-300 p-4 backdrop-blur-[1px] z-20 group">
        <div className="flex justify-between items-center max-w-7xl mx-auto opacity-40 group-hover:opacity-100 transition-opacity duration-300">
            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <ArrowLeft size={24} />
            </button>

            <div className="flex items-center space-x-4">
                {/* Monitoring Indicator */}
                <div className="flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full border border-white/5">
                    <Mic size={20} className={shouldMonitor ? "text-green-500/70" : "text-white/20"} />
                    <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-75 ${currentDB > song.audioTrigger.threshold ? 'bg-green-500/80' : 'bg-blue-500/50'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (currentDB + 60) * 2))}%` }} // approximate viz -60db to -10db
                        />
                    </div>
                    <span className="text-xs font-mono w-12 text-right hidden sm:inline-block text-white/50">
                      {shouldMonitor ? `${Math.round(currentDB)}dB` : 'OFF'}
                    </span>
                </div>

                {!isMonitoring ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMonitoring(true); }}
                        className="bg-blue-600/30 hover:bg-blue-600/80 text-blue-100/70 hover:text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 text-sm sm:text-base transition-all"
                    >
                        <span>Arm</span>
                    </button>
                ) : (
                    <div className={`font-bold text-xs sm:text-sm px-3 rounded-lg py-1 border flex items-center space-x-2 transition-all
                        ${isScrolling 
                            ? 'text-yellow-500/70 border-yellow-500/20 bg-yellow-900/10' 
                            : 'text-green-500/70 border-green-500/20 bg-green-900/10 animate-pulse'}`
                    }>
                        {isScrolling ? (
                          <>
                             <MicOff size={14} />
                             <span>Paused</span>
                          </>
                        ) : (
                          <span>Listening...</span>
                        )}
                    </div>
                )}

                <button 
                    onClick={(e) => { e.stopPropagation(); setIsScrolling(!isScrolling); }} 
                    className={`p-3 rounded-full transition-all ${isScrolling ? 'bg-red-600/30 text-red-100/70 hover:bg-red-600 hover:text-white' : 'bg-green-600/30 text-green-100/70 hover:bg-green-600 hover:text-white'}`}
                >
                    {isScrolling ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>

                <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hidden sm:block p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all">
                    {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                </button>
            </div>
        </div>
        {error && <div className="text-red-500 text-center mt-2 font-bold text-sm opacity-80">{error}</div>}
      </div>

      {/* Bottom Settings Bar - Transparent & Fade on Hover */}
      <div 
        className="absolute bottom-0 left-0 w-full bg-black/10 hover:bg-black/80 transition-colors duration-300 p-4 backdrop-blur-[1px] z-20 group"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12 opacity-30 group-hover:opacity-100 transition-opacity duration-300">
            
            {/* Font Size Control */}
            <div className="flex items-center space-x-4 w-full sm:w-auto">
                <Type size={20} className="text-white/50" />
                <div className="flex flex-col flex-1 sm:w-48">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Size</span>
                        <span>{song.fontsize}px</span>
                    </div>
                    <input 
                        type="range" min="20" max="150" step="2"
                        value={song.fontsize}
                        onChange={(e) => handleSettingChange('fontsize', parseInt(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500/70 hover:accent-blue-500"
                    />
                </div>
            </div>

            {/* Scroll Speed Control */}
            <div className="flex items-center space-x-4 w-full sm:w-auto">
                <MoveVertical size={20} className="text-white/50" />
                <div className="flex flex-col flex-1 sm:w-48">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Speed</span>
                        <span>{song.scrollspeed} px/s</span>
                    </div>
                    <input 
                        type="range" min="5" max="200" step="5"
                        value={song.scrollspeed}
                        onChange={(e) => handleSettingChange('scrollspeed', parseInt(e.target.value))}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-green-500/70 hover:accent-green-500"
                    />
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMode;