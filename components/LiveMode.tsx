import React, { useEffect, useRef, useState } from 'react';
import { Song } from '../types';
import { useAudioMonitor } from '../services/audio';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Play, Maximize2, Minimize2 } from 'lucide-react';

interface LiveModeProps {
  song: Song;
  onExit: () => void;
}

const LiveMode: React.FC<LiveModeProps> = ({ song, onExit }) => {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastFrameTime = useRef<number>(0);
  const animationRef = useRef<number>(0);
  
  // Audio Monitor
  const { currentDB, triggered, error } = useAudioMonitor(isMonitoring, song.audioTrigger.threshold);

  // Trigger effect
  useEffect(() => {
    if (triggered && !isScrolling) {
      setIsScrolling(true);
    }
  }, [triggered, isScrolling]);

  // Scroll Loop
  const scroll = (time: number) => {
    if (!lastFrameTime.current) lastFrameTime.current = time;
    const deltaTime = (time - lastFrameTime.current) / 1000; // seconds
    lastFrameTime.current = time;

    if (containerRef.current && contentRef.current) {
      // Pixels to move = speed (px/s) * deltaTime (s)
      containerRef.current.scrollTop += song.scrollspeed * deltaTime;

      // Check end
      if (containerRef.current.scrollTop >= (contentRef.current.scrollHeight - containerRef.current.clientHeight)) {
        setIsScrolling(false); // Stop at bottom
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

  // Auto-hide controls timer
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isScrolling) {
        timeout = setTimeout(() => setShowControls(false), 2000);
    } else {
        setShowControls(true);
    }
    return () => clearTimeout(timeout);
  }, [isScrolling]);

  const handleScreenTap = () => {
    if (isScrolling) {
        setIsScrolling(false);
        setShowControls(true);
    } else {
        setShowControls(!showControls);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black text-white z-50 overflow-hidden flex flex-col"
      onClick={handleScreenTap}
    >
      {/* Scrolling Container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-scroll no-scrollbar relative"
        style={{ scrollBehavior: 'auto' }} // Disable smooth scroll for precise programmatic control
      >
        {/* Padding top and bottom to allow text to center vertically at start and end */}
        <div style={{ height: '40vh' }}></div>
        
        <div 
            ref={contentRef}
            className="max-w-4xl mx-auto px-8 pb-20 text-center whitespace-pre-wrap font-bold leading-relaxed"
            style={{ fontSize: `${song.fontsize}px` }}
        >
          {song.lyrics}
        </div>
        
        <div style={{ height: '60vh' }}></div>
      </div>

      {/* HUD Controls */}
      <div className={`absolute top-0 left-0 w-full bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity duration-500 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex justify-between items-center max-w-5xl mx-auto">
            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                <ArrowLeft size={24} />
            </button>

            <div className="flex items-center space-x-4">
                {/* Monitoring Indicator */}
                <div className="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full">
                    <Mic size={20} className={isMonitoring ? "text-green-400" : "text-gray-400"} />
                    <div className="w-24 h-2 bg-gray-600 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-75 ${currentDB > song.audioTrigger.threshold ? 'bg-green-500' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (currentDB + 60) * 2))}%` }} // approximate viz -60db to -10db
                        />
                    </div>
                    <span className="text-xs font-mono w-12 text-right">{Math.round(currentDB)}dB</span>
                </div>

                {!isMonitoring ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setIsMonitoring(true); }}
                        className="bg-blue-600 px-4 py-2 rounded-lg font-bold flex items-center space-x-2"
                    >
                        <span>Arm Trigger</span>
                    </button>
                ) : (
                    <div className="text-green-400 font-bold animate-pulse text-sm px-3">
                        Listening for {song.audioTrigger.threshold}dB...
                    </div>
                )}

                <button 
                    onClick={(e) => { e.stopPropagation(); setIsScrolling(!isScrolling); }} 
                    className={`p-3 rounded-full ${isScrolling ? 'bg-red-600' : 'bg-green-600'}`}
                >
                    <Play size={24} className={isScrolling ? 'hidden' : 'block ml-1'} />
                    <div className={`w-4 h-4 bg-white rounded-sm ${isScrolling ? 'block' : 'hidden'}`} />
                </button>

                <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="p-2 bg-gray-800 rounded-full">
                    {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                </button>
            </div>
        </div>
        {error && <div className="text-red-500 text-center mt-2 font-bold">{error}</div>}
      </div>

      {/* Initial overlay hint */}
      {!isMonitoring && showControls && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="bg-black/50 px-6 py-3 rounded-xl text-xl text-gray-300">Tap 'Arm Trigger' or Play manually</p>
         </div>
      )}
    </div>
  );
};

export default LiveMode;