import React, { useState } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import WaveformView from '../components/WaveformView';
import { Play, ShieldAlert, Sparkles, Upload, Loader2, Share2, Globe, Lock, ArrowRightLeft } from 'lucide-react';

export default function Compare({ user }) {
  const [file1, setFile1] = useState(null);
  const [file1Url, setFile1Url] = useState(null);
  const [file2, setFile2] = useState(null);
  const [file2Url, setFile2Url] = useState(null);

  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleFile1Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFile1(file);
      setFile1Url(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleFile2Change = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setFile2(file);
      setFile2Url(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const handleRecord1Complete = (file, url) => {
    setFile1(file);
    setFile1Url(url);
    setResult(null);
  };

  const handleRecord2Complete = (file, url) => {
    setFile2(file);
    setFile2Url(url);
    setResult(null);
  };

  const runComparison = async () => {
    if (!file1 || !file2) {
      setError("Please select or record both voice samples before comparing.");
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file1', file1);
    formData.append('file2', file2);
    formData.append('is_public', isPublic);

    const headers = {};
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('http://localhost:8000/api/compare', {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Voice comparison failed");
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = () => {
    if (!result?.comparison_id) return;
    const shareUrl = `${window.location.origin}/share/${result.comparison_id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine indicator labels based on confidence ranges
  const getVerdictLabel = (conf) => {
    if (conf >= 80) return { text: "MATCH CONFIRMED", style: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (conf >= 50) return { text: "PROBABLE MATCH", style: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (conf >= 30) return { text: "INCONCLUSIVE", style: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return { text: "SPEAKER MISMATCH", style: "text-red-400 bg-red-500/10 border-red-500/20" };
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-4">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">AI Speaker Comparison</h1>
        <p className="text-slate-400 text-sm mt-2">
          Compare vocal features using deep neural embeddings to determine match probability.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Input columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Voice 1 */}
        <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-900/10 border border-white/5">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-brand-500/20 flex items-center justify-center text-xs text-brand-400 font-bold">1</span>
            Voice Sample A
          </h3>
          
          <div className="flex flex-col gap-4">
            <AudioRecorder onRecordingComplete={handleRecord1Complete} label="Record Voice A" />
            
            <div className="relative flex items-center justify-center py-6 border border-dashed border-slate-700 rounded-2xl hover:border-brand-500/40 hover:bg-slate-900/30 transition-all cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFile1Change}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">
                  {file1 ? file1.name : "Or upload audio file"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Voice 2 */}
        <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-900/10 border border-white/5">
          <h3 className="text-md font-bold text-white flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-pink-500/20 flex items-center justify-center text-xs text-pink-400 font-bold">2</span>
            Voice Sample B
          </h3>
          
          <div className="flex flex-col gap-4">
            <AudioRecorder onRecordingComplete={handleRecord2Complete} label="Record Voice B" />
            
            <div className="relative flex items-center justify-center py-6 border border-dashed border-slate-700 rounded-2xl hover:border-brand-500/40 hover:bg-slate-900/30 transition-all cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                onChange={handleFile2Change}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-6 h-6 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">
                  {file2 ? file2.name : "Or upload audio file"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Options and Action Button */}
      <div className="flex flex-col items-center gap-4 py-4 border-y border-white/5">
        {user && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-brand-500 focus:ring-brand-500 focus:ring-offset-slate-950"
            />
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              {isPublic ? <Globe className="w-3.5 h-3.5 text-brand-400" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
              Publish to public dashboard (shareable results)
            </span>
          </label>
        )}
        
        <button
          onClick={runComparison}
          disabled={loading || !file1 || !file2}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-sm text-white glow-btn disabled:opacity-50 disabled:cursor-not-allowed hover:scale-102 active:scale-98 transition-transform"
        >
          {loading ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              Analyzing Speech Vectors...
            </>
          ) : (
            <>
              <ArrowRightLeft className="w-4.5 h-4.5" />
              Compare Speaker Signatures
            </>
          )}
        </button>
      </div>

      {/* Comparison Results Card */}
      {result && (
        <div className="flex flex-col gap-6 p-8 rounded-3xl border border-white/5 bg-slate-900/10 backdrop-blur-md animate-float">
          
          {/* Main Dial Score */}
          <div className="flex flex-col items-center text-center gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Similarity Verdict</span>
            
            <div className="flex items-center gap-8 my-2">
              <div className="flex flex-col items-center">
                <span className="text-5xl font-black text-white font-mono">{result.similarity}%</span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">COSINE PROXIMITY</span>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="flex flex-col items-center">
                <span className="text-5xl font-black text-brand-400 font-mono">{result.confidence}%</span>
                <span className="text-[10px] font-bold text-slate-400 mt-0.5">MATCH CONFIDENCE</span>
              </div>
            </div>

            {(() => {
              const label = getVerdictLabel(result.confidence);
              return (
                <div className={`px-4 py-1.5 rounded-full text-xs font-extrabold border ${label.style}`}>
                  {label.text}
                </div>
              );
            })()}

            {result.comparison_id && (
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-semibold mt-2 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                {copied ? "Link Copied!" : "Copy Share Link"}
              </button>
            )}
          </div>

          {/* Visual Waveforms */}
          <div className="flex flex-col gap-4 mt-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waveforms</span>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-brand-300 font-semibold">{result.file1.filename}</span>
                {file1Url && <WaveformView audioUrl={file1Url} height={60} />}
              </div>
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-xs text-pink-300 font-semibold">{result.file2.filename}</span>
                {file2Url && <WaveformView audioUrl={file2Url} height={60} />}
              </div>
            </div>
          </div>

          {/* Side by Side Comparative Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-white/5">
            {/* Metric Parameters */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acoustic Parameter Comparison</span>
              <div className="flex flex-col gap-3">
                
                {/* Pitch */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-300">Pitch (Mean F0)</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-brand-400 font-bold">{result.file1.analysis.pitch.mean} Hz</span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-pink-400 font-bold">{result.file2.analysis.pitch.mean} Hz</span>
                  </div>
                </div>

                {/* Speaking Rate */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-300">Speaking Rate</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-brand-400 font-bold">{result.file1.analysis.speaking_rate} syl/s</span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-pink-400 font-bold">{result.file2.analysis.speaking_rate} syl/s</span>
                  </div>
                </div>

                {/* Brightness */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-300">Spectral Centroid (Vocal Brightness)</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-brand-400 font-bold">{Math.round(result.file1.analysis.quality.spectral_centroid)} Hz</span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-pink-400 font-bold">{Math.round(result.file2.analysis.quality.spectral_centroid)} Hz</span>
                  </div>
                </div>

                {/* Jitter */}
                <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-1">
                  <span className="text-xs font-semibold text-slate-300">Vocal Jitter (Pitch Stability)</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <span className="text-brand-400 font-bold">{result.file1.analysis.quality.jitter.toFixed(4)}</span>
                    <span className="text-slate-500">vs</span>
                    <span className="text-pink-400 font-bold">{result.file2.analysis.quality.jitter.toFixed(4)}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Anti-spoofing checker */}
            <div className="flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Spoof & Deepfake Verifiers</span>
              <div className="flex flex-col gap-4">
                
                {/* Voice A */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-brand-300">Sample A Spoof Risk</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      result.file1.spoof.spoof_score >= 70 ? 'bg-red-500/10 text-red-400' :
                      result.file1.spoof.spoof_score >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {result.file1.spoof.spoof_score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "{result.file1.spoof.verdict}: {result.file1.spoof.reasons[0]}"
                  </p>
                </div>

                {/* Voice B */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-pink-300">Sample B Spoof Risk</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      result.file2.spoof.spoof_score >= 70 ? 'bg-red-500/10 text-red-400' :
                      result.file2.spoof.spoof_score >= 40 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {result.file2.spoof.spoof_score}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "{result.file2.spoof.verdict}: {result.file2.spoof.reasons[0]}"
                  </p>
                </div>

                {/* Emotions */}
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-300">Vocal Emotions</span>
                  <div className="flex justify-between items-center text-xs mt-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">SAMPLE A</span>
                      <span className="font-bold text-brand-400">{result.file1.emotion.primary_emotion}</span>
                    </div>
                    <div className="flex flex-col gap-0.5 text-right">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">SAMPLE B</span>
                      <span className="font-bold text-pink-400">{result.file2.emotion.primary_emotion}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
