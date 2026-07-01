import React, { useEffect, useState } from 'react';
import { Trash2, Globe, Lock, Share2, Calendar, ChevronDown, ChevronUp, LineChart, ShieldAlert } from 'lucide-react';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      } else {
        throw new Error("Failed to load history logs");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePrivacy = async (id, currentVal) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/history/${id}/privacy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_public: !currentVal })
      });

      if (response.ok) {
        setHistory(history.map(item => 
          item._id === id ? { ...item, is_public: !currentVal } : item
        ));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this comparison run from your history?")) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/history/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setHistory(history.filter(item => item._id !== id));
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCopyLink = (id) => {
    const shareUrl = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Comparison History</h1>
        <p className="text-slate-400 text-sm mt-2">
          Manage your past speaker verification runs, toggle public sharing links, or analyze vocal metric changes.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center min-h-[250px]">
          <span className="text-xs text-slate-500">Loading history logs...</span>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[250px] border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-slate-500 text-xs">
          No comparison history found. Visit the Compare page to execute your first speaker check!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {history.map((item) => (
            <div 
              key={item._id} 
              className="flex flex-col rounded-2xl border border-white/5 bg-slate-900/10 backdrop-blur-sm overflow-hidden"
            >
              {/* Row Summary header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(item.created_at)}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-slate-200">
                    <span className="text-brand-400 truncate max-w-[150px]">{item.file1_name}</span>
                    <span className="text-slate-600 font-medium font-mono">&lt;&gt;</span>
                    <span className="text-pink-400 truncate max-w-[150px]">{item.file2_name}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  {/* Scores */}
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-white font-mono">{item.similarity}%</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Match</span>
                    </div>
                    <div className="w-px h-6 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-brand-400 font-mono">{item.confidence}%</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Conf</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 border-l border-white/5 pl-4">
                    <button
                      onClick={() => handleTogglePrivacy(item._id, item.is_public)}
                      className={`p-2 rounded-lg border transition-all ${
                        item.is_public 
                          ? 'border-brand-500/20 bg-brand-500/5 text-brand-400 hover:bg-brand-500/10' 
                          : 'border-slate-800 bg-slate-950/40 text-slate-500 hover:text-slate-300'
                      }`}
                      title={item.is_public ? "Public (click to make private)" : "Private (click to make public)"}
                    >
                      {item.is_public ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    </button>

                    {item.is_public && (
                      <button
                        onClick={() => handleCopyLink(item._id)}
                        className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
                        title="Copy Public Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-2 rounded-lg border border-slate-850 hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => toggleExpand(item._id)}
                      className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    >
                      {expandedId === item._id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Copied alert inline */}
              {copiedId === item._id && (
                <div className="px-5 py-1.5 bg-brand-500/10 border-t border-brand-500/20 text-brand-300 text-[10px] font-semibold text-center">
                  Public share URL copied to clipboard!
                </div>
              )}

              {/* Expansion Details */}
              {expandedId === item._id && (
                <div className="p-6 border-t border-white/5 bg-slate-950/40 flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Vocal parameter comparison */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Acoustic Details</span>
                      
                      <div className="flex flex-col gap-2">
                        {/* Pitch */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Mean Pitch</span>
                          <span className="text-slate-200 font-semibold">
                            {item.metrics.file1.analysis.pitch.mean} Hz vs {item.metrics.file2.analysis.pitch.mean} Hz
                          </span>
                        </div>
                        {/* Tempo */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Speaking Rate</span>
                          <span className="text-slate-200 font-semibold">
                            {item.metrics.file1.analysis.speaking_rate} vs {item.metrics.file2.analysis.speaking_rate} syl/s
                          </span>
                        </div>
                        {/* Jitter */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Vocal Jitter</span>
                          <span className="text-slate-200 font-semibold">
                            {item.metrics.file1.analysis.quality.jitter.toFixed(4)} vs {item.metrics.file2.analysis.quality.jitter.toFixed(4)}
                          </span>
                        </div>
                        {/* Centroid */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Brightness (Centroid)</span>
                          <span className="text-slate-200 font-semibold">
                            {Math.round(item.metrics.file1.analysis.quality.spectral_centroid)} Hz vs {Math.round(item.metrics.file2.analysis.quality.spectral_centroid)} Hz
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Spoof / Emotion */}
                    <div className="flex flex-col gap-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ML Diagnostics</span>
                      
                      <div className="flex flex-col gap-2">
                        {/* Spoof risk */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Deepfake Risk A / B</span>
                          <span className="font-bold">
                            <span className={item.metrics.file1.spoof.spoof_score >= 40 ? "text-amber-400" : "text-emerald-400"}>
                              {item.metrics.file1.spoof.spoof_score}%
                            </span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className={item.metrics.file2.spoof.spoof_score >= 40 ? "text-amber-400" : "text-emerald-400"}>
                              {item.metrics.file2.spoof.spoof_score}%
                            </span>
                          </span>
                        </div>
                        {/* Emotion */}
                        <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-900/30 border border-white/5">
                          <span className="text-slate-400">Emotion A / B</span>
                          <span className="font-semibold text-slate-200">
                            {item.metrics.file1.emotion.primary_emotion} / {item.metrics.file2.emotion.primary_emotion}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
