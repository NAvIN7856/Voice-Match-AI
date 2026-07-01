import React, { useState, useEffect } from 'react';
import AudioRecorder from '../components/AudioRecorder';
import WaveformView from '../components/WaveformView';
import { Sparkles, Brain, Search, Database, Trash2, Plus, Loader2, Play } from 'lucide-react';

export default function Analysis({ user }) {
  const [activeTab, setActiveTab] = useState('analyze'); // 'analyze' or 'catalog'
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  
  // Standalone analysis state
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState('');

  // Catalog registration state
  const [registerLabel, setRegisterLabel] = useState('');
  const [registering, setRegistering] = useState(false);
  const [catalogList, setCatalogList] = useState([]);

  // Catalog search state
  const [searchFile, setSearchFile] = useState(null);
  const [searchFileUrl, setSearchFileUrl] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    if (user && activeTab === 'catalog') {
      fetchCatalog();
    }
  }, [user, activeTab]);

  const fetchCatalog = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/api/analysis/catalog', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCatalogList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileUrl(URL.createObjectURL(selectedFile));
      setAnalysisResult(null);
    }
  };

  const handleRecordComplete = (recFile, recUrl) => {
    setFile(recFile);
    setFileUrl(recUrl);
    setAnalysisResult(null);
  };

  const runAnalysis = async () => {
    if (!file) {
      setError("Please choose or record an audio file first.");
      return;
    }
    setError('');
    setLoading(true);
    setAnalysisResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/analysis/voice', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Audio analysis failed");
      }
      setAnalysisResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVoice = async (e) => {
    e.preventDefault();
    if (!file || !registerLabel.trim()) {
      alert("Please provide both an audio file and a label descriptor.");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert("Authentication token not found. Please log in.");
      return;
    }

    setRegistering(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', registerLabel.trim());

    try {
      const response = await fetch('http://localhost:8000/api/analysis/catalog', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Registration failed");
      }

      setRegisterLabel('');
      setFile(null);
      setFileUrl(null);
      fetchCatalog();
      alert("Voice signature successfully catalogued! 🎉");
    } catch (err) {
      alert(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleDeleteVoice = async (voiceId) => {
    if (!confirm("Are you sure you want to remove this voice print signature?")) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:8000/api/analysis/catalog/${voiceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchCatalog();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSearchFileChange = (e) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setSearchFile(selectedFile);
      setSearchFileUrl(URL.createObjectURL(selectedFile));
      setSearchResults(null);
    }
  };

  const runCatalogSearch = async () => {
    if (!searchFile) return;
    setSearching(true);
    setSearchResults(null);

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', searchFile);

    try {
      const response = await fetch('http://localhost:8000/api/analysis/catalog/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      } else {
        alert(data.detail || "Search failed");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto py-2">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Vocal Analysis & Biometrics</h1>
        <p className="text-slate-400 text-sm mt-2">
          Run deepfake diagnostic checks, emotional splits, or manage voice matching catalogues.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center border-b border-white/5 gap-4">
        <button
          onClick={() => setActiveTab('analyze')}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'analyze' 
              ? 'border-brand-500 text-brand-400' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          Acoustic & Deepfake Analyzer
        </button>
        {user && (
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'catalog' 
                ? 'border-brand-500 text-brand-400' 
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Voice Signature Catalog
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* TAB A: STANDALONE ANALYZER */}
      {activeTab === 'analyze' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Inputs Column */}
          <div className="flex flex-col gap-4 p-6 rounded-2xl bg-slate-900/10 border border-white/5 h-fit">
            <h3 className="text-sm font-bold text-white mb-2">Input Voice</h3>
            <AudioRecorder onRecordingComplete={handleRecordComplete} label="Record Clip" />
            
            <div className="relative flex items-center justify-center py-6 border border-dashed border-slate-700 rounded-2xl hover:border-brand-500/40 transition-all cursor-pointer">
              <input type="file" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">{file ? file.name : "Or upload audio file"}</span>
              </div>
            </div>

            <button
              onClick={runAnalysis}
              disabled={loading || !file}
              className="w-full py-3 rounded-xl text-xs font-bold text-white glow-btn mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
              Analyze Voice
            </button>
          </div>

          {/* Results Column */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {analysisResult ? (
              <div className="flex flex-col gap-6 p-6 rounded-2xl bg-slate-900/10 border border-white/5">
                
                {/* Waveform */}
                {fileUrl && <WaveformView audioUrl={fileUrl} height={60} />}

                {/* Score indicators */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  {/* Deepfake spoof risk */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Voice / Spoof Risk</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-white font-mono">{analysisResult.spoof.spoof_score}%</span>
                      <span className="text-xs text-slate-400">probability</span>
                    </div>
                    <span className={`text-[10px] font-bold mt-1 inline-block ${
                      analysisResult.spoof.spoof_score >= 70 ? 'text-red-400' :
                      analysisResult.spoof.spoof_score >= 40 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {analysisResult.spoof.verdict}
                    </span>
                    <p className="text-[10px] text-slate-500 leading-relaxed mt-2 border-t border-white/5 pt-2">
                      {analysisResult.spoof.reasons[0]}
                    </p>
                  </div>

                  {/* Emotion likelihood */}
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vocal Emotion</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-brand-400 font-mono">{analysisResult.emotion.primary_emotion}</span>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 mt-2 border-t border-white/5 pt-2">
                      {Object.entries(analysisResult.emotion.probabilities).map(([emo, val]) => (
                        <div key={emo} className="flex flex-col gap-0.5">
                          <div className="flex justify-between text-[9px] font-semibold text-slate-400">
                            <span>{emo}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${val}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Vocal Parameters Grid */}
                <div className="flex flex-col gap-3 mt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acoustic Measurements</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Pitch (Mean)</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{analysisResult.analysis.pitch.mean} Hz</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Tempo / Speaking Rate</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{analysisResult.analysis.speaking_rate} syl/s</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Loudness</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{analysisResult.analysis.loudness_db} dBFS</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Jitter</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{analysisResult.analysis.quality.jitter.toFixed(5)}</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Shimmer</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{analysisResult.analysis.quality.shimmer.toFixed(5)}</span>
                    </div>
                    <div className="p-3 bg-slate-950/40 border border-white/5 rounded-lg flex flex-col">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Centroid (Brightness)</span>
                      <span className="text-sm font-bold text-slate-200 mt-1">{Math.round(analysisResult.analysis.quality.spectral_centroid)} Hz</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] border border-dashed border-slate-800 rounded-2xl bg-slate-950/20 text-slate-500 text-xs">
                Upload or record a clip, and click "Analyze Voice" to inspect acoustic details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB B: SIGNATURE CATALOG */}
      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Register signature form */}
          <div className="flex flex-col gap-6 p-6 rounded-2xl bg-slate-900/10 border border-white/5">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-brand-400" />
              Register New Voice Signature
            </h3>
            
            <form onSubmit={handleRegisterVoice} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Label Descriptor</label>
                <input
                  type="text"
                  value={registerLabel}
                  onChange={(e) => setRegisterLabel(e.target.value)}
                  placeholder="e.g. John Doe (Home Mic)"
                  required
                  className="px-4 py-2.5 rounded-lg bg-slate-950/60 border border-white/5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <AudioRecorder onRecordingComplete={handleRecordComplete} label="Record Voice Print" />
              
              <div className="relative flex items-center justify-center py-4 border border-dashed border-slate-700 rounded-xl hover:border-brand-500/40 cursor-pointer">
                <input type="file" accept="audio/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                <span className="text-xs text-slate-400">{file ? file.name : "Or click to upload file"}</span>
              </div>

              <button
                type="submit"
                disabled={registering || !file || !registerLabel.trim()}
                className="py-3 rounded-lg text-xs font-bold text-white glow-btn flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {registering ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Signature Print
              </button>
            </form>
          </div>

          {/* Registered Prints and Vector Search */}
          <div className="flex flex-col gap-6">
            
            {/* Vector Similarity Search */}
            <div className="p-6 rounded-2xl bg-slate-900/10 border border-white/5 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Search className="w-4 h-4 text-cyan-400" />
                Search Database Vector Match
              </h3>
              
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex items-center justify-center p-3 border border-dashed border-slate-700 rounded-lg hover:border-cyan-500/40 cursor-pointer w-full sm:w-auto">
                  <input type="file" accept="audio/*" onChange={handleSearchFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                    {searchFile ? searchFile.name : "Upload match query"}
                  </span>
                </div>
                
                <button
                  onClick={runCatalogSearch}
                  disabled={searching || !searchFile}
                  className="px-5 py-3 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 shrink-0 w-full sm:w-auto flex items-center justify-center gap-1"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Vector Search
                </button>
              </div>

              {/* Vector Search Results */}
              {searchResults && (
                <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Matching Signatures</span>
                  {searchResults.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {searchResults.map((res, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-slate-950/40 border border-white/5">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">{res.voice.label}</span>
                            <span className="text-[9px] text-slate-500">{res.voice.filename}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs font-black text-cyan-400 font-mono">{res.similarity}% match</span>
                            <span className="text-[9px] text-slate-500 font-bold uppercase">{res.confidence}% CONF</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic mt-1">No matching signatures found in database</span>
                  )}
                </div>
              )}
            </div>

            {/* List catalog prints */}
            <div className="p-6 rounded-2xl bg-slate-900/10 border border-white/5 flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Catalogued Prints ({catalogList.length})</span>
              
              <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2">
                {catalogList.map((item) => (
                  <div key={item._id} className="flex justify-between items-center p-3 rounded-xl bg-slate-950/30 border border-white/5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-slate-200">{item.label}</span>
                      <span className="text-[9px] text-slate-500">{item.filename}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteVoice(item._id)}
                      className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete print"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {catalogList.length === 0 && (
                  <span className="text-xs text-slate-500 italic text-center py-4">No signature prints currently registered.</span>
                )}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
