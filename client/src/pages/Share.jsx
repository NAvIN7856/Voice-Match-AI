import React, { useEffect, useState } from 'react';
// import { useParams, Link } from 'react-serif';
import { useParams as useRouteParams } from 'react-router-dom';
import { Calendar, Radio, ArrowLeft, Loader2, Sparkles } from 'lucide-react';

export default function Share() {
  const { id } = useRouteParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSharedResult();
  }, [id]);

  const fetchSharedResult = async () => {
    try {
      const response = await fetch(`http://localhost:8000/api/history/public/${id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Unable to fetch shared result");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictLabel = (conf) => {
    if (conf >= 80) return { text: "MATCH CONFIRMED", style: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (conf >= 50) return { text: "PROBABLE MATCH", style: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (conf >= 30) return { text: "INCONCLUSIVE", style: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return { text: "SPEAKER MISMATCH", style: "text-red-400 bg-red-500/10 border-red-500/20" };
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(undefined, { 
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="text-xs text-slate-500">Loading shared results report...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 text-lg font-bold">!</div>
        <h2 className="text-xl font-bold text-white">Report Unavailable</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          This voice comparison run doesn't exist, or has been toggled to private by the owner.
        </p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-brand-400 font-bold hover:underline mt-2">
          <ArrowLeft className="w-4 h-4" /> Go to home page
        </Link>
      </div>
    );
  }

  const { metrics } = result;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto py-2">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Link>
        <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {formatDate(result.created_at)}
        </span>
      </div>

      <div className="flex flex-col gap-6 p-8 rounded-3xl border border-white/5 bg-slate-900/10 backdrop-blur-md animate-float">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-semibold">
            <Radio className="w-4.5 h-4.5" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Shared Voice Match Report</h2>
          
          <div className="flex items-center gap-8 my-2">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-white font-mono">{result.similarity}%</span>
              <span className="text-[9px] font-bold text-slate-500">SIMILARITY SCORE</span>
            </div>
            <div className="w-px h-10 bg-white/10" />
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black text-brand-400 font-mono">{result.confidence}%</span>
              <span className="text-[9px] font-bold text-slate-500">MATCH CONFIDENCE</span>
            </div>
          </div>

          {(() => {
            const label = getVerdictLabel(result.confidence);
            return (
              <div className={`px-3 py-1 text-xs font-bold border ${label.style}`}>
                {label.text}
              </div>
            );
          })()}
        </div>

        {/* Comparative parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-white/5">
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vocal Dynamics</span>
            
            <div className="flex flex-col gap-2">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Average Pitch (F0)</span>
                <div className="flex justify-between items-center text-xs mt-1 font-semibold text-slate-200">
                  <span>{metrics.file1.analysis.pitch.mean} Hz</span>
                  <span className="text-slate-500 font-normal text-[10px]">vs</span>
                  <span>{metrics.file2.analysis.pitch.mean} Hz</span>
                </div>
              </div>
              
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Tempo / Speaking Rate</span>
                <div className="flex justify-between items-center text-xs mt-1 font-semibold text-slate-200">
                  <span>{metrics.file1.analysis.speaking_rate} syl/s</span>
                  <span className="text-slate-500 font-normal text-[10px]">vs</span>
                  <span>{metrics.file2.analysis.speaking_rate} syl/s</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Micro Jitter</span>
                <div className="flex justify-between items-center text-xs mt-1 font-semibold text-slate-200">
                  <span>{metrics.file1.analysis.quality.jitter.toFixed(4)}</span>
                  <span className="text-slate-500 font-normal text-[10px]">vs</span>
                  <span>{metrics.file2.analysis.quality.jitter.toFixed(4)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Classifier Check</span>
            
            <div className="flex flex-col gap-2">
              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Deepfake Spoof Risk</span>
                <div className="flex justify-between text-xs text-slate-200 font-semibold mt-0.5">
                  <span className={metrics.file1.spoof.spoof_score >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                    A: {metrics.file1.spoof.spoof_score}%
                  </span>
                  <span className={metrics.file2.spoof.spoof_score >= 40 ? 'text-amber-400' : 'text-emerald-400'}>
                    B: {metrics.file2.spoof.spoof_score}%
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col gap-1">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Primary Vocal Emotions</span>
                <div className="flex justify-between text-xs text-slate-200 font-semibold mt-0.5">
                  <span className="text-brand-400">{metrics.file1.emotion.primary_emotion}</span>
                  <span className="text-pink-400">{metrics.file2.emotion.primary_emotion}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
