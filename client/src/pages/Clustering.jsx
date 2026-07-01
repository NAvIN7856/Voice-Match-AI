import React, { useState } from 'react';
import { GitFork, Upload, Loader2, Play } from 'lucide-react';

export default function Clustering() {
  const [files, setFiles] = useState([]);
  const [nClusters, setNClusters] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFilesChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles(selected);
      setResult(null);
    }
  };

  const handleCluster = async () => {
    if (files.length < 2) {
      setError("Please upload at least 2 voice files to perform clustering analysis.");
      return;
    }
    if (files.length < nClusters) {
      setError(`Cannot partition ${nClusters} speaker clusters with only ${files.length} files.`);
      return;
    }
    setError('');
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('n_clusters', nClusters);

    try {
      const response = await fetch('http://localhost:8000/api/clustering', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Clustering failed");
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Group clips by their assigned Speaker label
  const getSpeakerGroups = () => {
    if (!result?.clusters) return {};
    const groups = {};
    result.clusters.forEach(item => {
      if (!groups[item.speaker_label]) {
        groups[item.speaker_label] = [];
      }
      groups[item.speaker_label].push(item.filename);
    });
    return groups;
  };

  // Helper to color similarity grid cells
  const getHeatmapColor = (sim) => {
    if (sim >= 80) return 'bg-brand-600/60 border-brand-500/50 text-white';
    if (sim >= 50) return 'bg-brand-600/30 border-brand-500/20 text-brand-200';
    if (sim >= 30) return 'bg-slate-900 border-white/5 text-slate-400';
    return 'bg-red-950/15 border-red-500/10 text-red-400';
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-2">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Voice Speaker Clustering</h1>
        <p className="text-slate-400 text-sm mt-2">
          Upload multiple audio files to automatically group them into distinct speaker groups.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Upload and Control Card */}
      <div className="p-6 rounded-2xl bg-slate-900/10 border border-white/5 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* File Picker */}
          <div className="relative flex items-center justify-center py-8 border border-dashed border-slate-700 rounded-2xl hover:border-brand-500/40 transition-all cursor-pointer">
            <input
              type="file"
              accept="audio/*"
              multiple
              onChange={handleFilesChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-slate-500" />
              <span className="text-xs font-semibold text-slate-300">
                {files.length > 0 ? `${files.length} files selected` : "Select multi-speaker files"}
              </span>
              <span className="text-[10px] text-slate-500">Supports WAV, MP3, M4A, WEBM</span>
            </div>
          </div>

          {/* Cluster configuration count */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">Target Speakers / Clusters</label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={2}
                  max={8}
                  value={nClusters}
                  onChange={(e) => setNClusters(parseInt(e.target.value) || 2)}
                  className="px-4 py-2.5 w-24 rounded-lg bg-slate-950/60 border border-white/5 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
                />
                <span className="text-xs text-slate-500">Configure target speaker divisions (2-8)</span>
              </div>
            </div>

            <button
              onClick={handleCluster}
              disabled={loading || files.length < 2}
              className="w-full py-3.5 rounded-xl text-xs font-bold text-white glow-btn flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Extracting Features & Segmenting...
                </>
              ) : (
                <>
                  <GitFork className="w-4 h-4" />
                  Run Clustering Map
                </>
              )}
            </button>
          </div>
        </div>

        {/* Selected files listing */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {files.map((file, idx) => (
              <span key={idx} className="px-2.5 py-1 text-[10px] bg-slate-950/50 border border-white/5 text-slate-400 rounded-md">
                {file.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Speaker Clusters List */}
          <div className="flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Speakers</span>
            
            <div className="flex flex-col gap-4">
              {Object.entries(getSpeakerGroups()).map(([speaker, clips]) => (
                <div key={speaker} className="p-4 rounded-xl border border-white/5 bg-slate-900/10 backdrop-blur-sm flex flex-col gap-2">
                  <span className="text-xs font-extrabold text-brand-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                    {speaker}
                  </span>
                  <div className="flex flex-col gap-1.5 mt-1">
                    {clips.map((clip, idx) => (
                      <span key={idx} className="text-xs text-slate-300 truncate pl-3 border-l border-slate-700">
                        {clip}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pairwise similarity Heatmap Matrix */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speaker Correlation Matrix</span>
            
            <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/30">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-950/50">
                    <th className="p-3 text-[10px] font-bold text-slate-500 uppercase truncate max-w-[120px]">Files</th>
                    {result.similarity_matrix.map((row, idx) => (
                      <th key={idx} className="p-3 text-[9px] font-bold text-slate-400 uppercase truncate max-w-[100px]" title={row.source_file}>
                        {row.source_file.substring(0, 10)}...
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.similarity_matrix.map((row, rowIdx) => (
                    <tr key={rowIdx} className="border-b border-white/5">
                      <td className="p-3 text-[10px] font-bold text-slate-300 truncate max-w-[120px]" title={row.source_file}>
                        {row.source_file}
                      </td>
                      {row.comparisons.map((col, colIdx) => (
                        <td key={colIdx} className={`p-3 text-center border-l border-white/5`}>
                          <div className={`p-2 rounded-lg text-xs font-bold font-mono border ${getHeatmapColor(col.similarity)}`}>
                            {col.similarity}%
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 mt-1 pl-1">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-brand-600 border border-brand-500/50" /> High Similarity (&gt;=80%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-brand-900 border border-brand-800/30" /> Moderate Similarity (50-80%)</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-950/20 border border-red-500/10" /> Distinct Speakers (&lt;30%)</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
