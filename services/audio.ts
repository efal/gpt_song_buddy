import { useState, useEffect, useRef, useCallback } from 'react';

export const useAudioMonitor = (enabled: boolean, thresholdDB: number) => {
  const [currentDB, setCurrentDB] = useState<number>(-100);
  const [triggered, setTriggered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const startMonitoring = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      // Smooth out the volume reading slightly
      analyser.smoothingTimeConstant = 0.3; 
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyserRef.current = analyser;
      sourceRef.current = source;

      analyze();
      setError(null);
    } catch (err) {
      console.error("Microphone access denied or error", err);
      setError("Microphone access denied.");
    }
  }, []);

  const stopMonitoring = useCallback(() => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    // We do not close AudioContext to reuse it, but we could suspend it.
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.suspend();
    }
  }, []);

  const analyze = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    // Calculate RMS (Root Mean Square)
    let sumSquares = 0;
    for (let i = 0; i < bufferLength; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sumSquares / bufferLength);
    
    // Convert to Decibels
    // Use a small epsilon to avoid log(0) = -Infinity
    const db = 20 * Math.log10(Math.max(rms, 1e-7));
    
    setCurrentDB(db);

    if (db > thresholdDB) {
        setTriggered(true);
        // Once triggered, we can keep monitoring or stop if we just wanted a single trigger.
        // The prompt implies scrolling starts. We continue monitoring to show levels if needed, 
        // but the boolean `triggered` stays true.
    }

    animationFrameRef.current = requestAnimationFrame(analyze);
  };

  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
      setTriggered(false);
      setCurrentDB(-100);
    }
    return () => stopMonitoring();
  }, [enabled, startMonitoring, stopMonitoring]);

  return { currentDB, triggered, error };
};