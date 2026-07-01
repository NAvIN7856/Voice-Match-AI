import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

export default function WaveformView({ audioUrl, height = 70 }) {
  const containerRef = useRef(null);
  const waveSurferRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    // Initialize WaveSurfer with high-fidelity theme styling
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(167, 139, 250, 0.25)',  // Translucent purple waves
      progressColor: 'rgba(139, 92, 246, 0.85)', // Solid violet progress
      cursorColor: '#a78bfa',
      height: height,
      responsive: true,
      barWidth: 2.5,
      barGap: 3,
      barRadius: 3,
    });

    ws.load(audioUrl);
    waveSurferRef.current = ws;

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    ws.on('finish', () => setIsPlaying(false));

    return () => {
      ws.destroy();
    };
  }, [audioUrl, height]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  return (
    <div className="w-full flex items-center gap-4 p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl backdrop-blur-sm">
      <button
        onClick={togglePlay}
        type="button"
        className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-600 hover:bg-brand-500 text-white transition-all duration-200 active:scale-95 glow-btn"
      >
        {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
      </button>
      <div className="flex-1" ref={containerRef} />
    </div>
  );
}
