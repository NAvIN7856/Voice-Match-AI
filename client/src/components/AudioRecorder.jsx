import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Trash2, RotateCcw } from 'lucide-react';

// WAV encoder helper functions
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function bufferToWav(buffer, sampleRate) {
  const bufferLength = buffer.length;
  const wavBuffer = new ArrayBuffer(44 + bufferLength * 2);
  const view = new DataView(wavBuffer);

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count */
  view.setUint16(22, 1, true); // Mono
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength * 2, true);

  // Write PCM audio samples
  floatTo16BitPCM(view, 44, buffer);

  return new Blob([view], { type: 'audio/wav' });
}

export default function AudioRecorder({ onRecordingComplete, label = "Record Voice" }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);

  const canvasRef = useRef(null);
  const isRecordingRef = useRef(false);

  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);
  const samplesRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (processorRef.current) {
        try { processorRef.current.disconnect(); } catch (e) {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (streamRef.current) {
        try { streamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
      }
    };
  }, []);

  const drawVisualizer = (analyser, dataArray, canvas) => {
    const canvasCtx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = dataArray.length;
    
    const draw = () => {
      if (!isRecordingRef.current) {
        if (canvasCtx) canvasCtx.clearRect(0, 0, width, height);
        return;
      }
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear with dark blue semi-transparent color for smooth fade tail
      canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.3)';
      canvasCtx.fillRect(0, 0, width, height);
      
      const barWidth = (width / bufferLength) * 1.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        // scale height to fit canvas
        const barHeight = (dataArray[i] / 255.0) * height * 0.85;
        
        // Dynamic color transition from cyan to indigo
        const gradient = canvasCtx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#4f46e5'); // Indigo
        gradient.addColorStop(1, '#06b6d4'); // Cyan
        
        canvasCtx.fillStyle = gradient;
        
        // Centered bar rendering
        const y = (height - barHeight) / 2;
        
        if (canvasCtx.roundRect) {
          canvasCtx.beginPath();
          canvasCtx.roundRect(x, y, barWidth - 2, barHeight, 3);
          canvasCtx.fill();
        } else {
          canvasCtx.fillRect(x, y, barWidth - 2, barHeight);
        }
        
        x += barWidth;
      }
    };
    
    draw();
  };

  const startRecording = async () => {
    samplesRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Setup Analyser Node for the visualizer
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64; // Low bin count for clear indicator bars
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      source.connect(analyser);

      // bufferSize = 4096, 1 input channel, 1 output channel
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        samplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      // Start the visualizer rendering loop
      setTimeout(() => {
        if (canvasRef.current) {
          drawVisualizer(analyser, dataArray, canvasRef.current);
        }
      }, 50);

    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access denied or unsupported. Please check permissions!");
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      try { streamRef.current.getTracks().forEach(track => track.stop()); } catch (e) {}
      streamRef.current = null;
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Process collected Float32 samples
    const totalLength = samplesRef.current.reduce((acc, curr) => acc + curr.length, 0);
    if (totalLength === 0) return;

    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of samplesRef.current) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = bufferToWav(mergedSamples, 16000);
    const url = URL.createObjectURL(wavBlob);
    setAudioBlob(wavBlob);
    setAudioUrl(url);

    // Convert blob to standard File object for uploading
    const file = new File([wavBlob], `recording_${Date.now()}.wav`, { type: 'audio/wav' });
    onRecordingComplete(file, url);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const resetRecorder = () => {
    setAudioUrl(null);
    setAudioBlob(null);
    onRecordingComplete(null, null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 border border-brand-800/30 rounded-2xl bg-slate-900/40 backdrop-blur-md">
      <span className="text-sm font-semibold text-brand-300 mb-4">{label}</span>
      
      {!audioUrl && !isRecording && (
        <button
          onClick={startRecording}
          type="button"
          className="flex items-center justify-center w-16 h-16 rounded-full bg-brand-600 hover:bg-brand-500 text-white transition-all duration-300 hover:scale-105 glow-btn"
        >
          <Mic className="w-8 h-8" />
        </button>
      )}

      {isRecording && (
        <div className="flex flex-col items-center w-full max-w-xs">
          <canvas
            ref={canvasRef}
            width={280}
            height={50}
            className="w-full h-12 rounded-xl bg-slate-950 border border-slate-800/60 mb-4 shadow-inner"
          />
          <div className="relative flex items-center justify-center mb-4">
            {/* Pulsing ring animation */}
            <div className="absolute w-20 h-20 bg-red-500/20 rounded-full animate-ping" />
            <button
              onClick={stopRecording}
              type="button"
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all duration-300"
            >
              <Square className="w-6 h-6 fill-current" />
            </button>
          </div>
          <span className="text-xl font-bold text-red-400 font-mono tracking-wider animate-pulse">
            {formatTime(recordingTime)}
          </span>
          <span className="text-xs text-slate-400 mt-1">Recording active...</span>
        </div>
      )}

      {audioUrl && !isRecording && (
        <div className="flex flex-col items-center w-full">
          <audio src={audioUrl} controls className="w-full max-w-xs mb-3 accent-brand-500" />
          
          {recordingTime < 3 && (
            <div className="text-xs text-amber-400 font-semibold mb-4 text-center px-4 bg-amber-500/10 py-1.5 rounded-lg border border-amber-500/20 max-w-xs">
              ⚠️ Short recording ({recordingTime}s). Record at least 3 seconds for optimal match accuracy.
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={resetRecorder}
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Discard
            </button>
            <button
              onClick={startRecording}
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/20 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Record Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
