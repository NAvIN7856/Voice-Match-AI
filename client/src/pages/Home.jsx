import React from 'react';
import { Link } from 'react-router-dom';
import { Mic, ShieldCheck, GitFork, BarChart3, ArrowRight, Zap, Database } from 'lucide-react';

export default function Home({ user }) {
  const features = [
    {
      title: "Voice Comparison",
      description: "Compare two voices using pretrained ECAPA-TDNN speaker recognition embeddings. Yields similarity percentages and calibrated match scores.",
      icon: Mic,
      color: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
      iconColor: "text-violet-400",
      link: "/compare"
    },
    {
      title: "Acoustic & Spoof Analysis",
      description: "Measure voice quality indicators (pitch trajectory, speaking tempo, loudness, jitter, shimmer) and run synthetic spoof/deepfake risk grading.",
      icon: ShieldCheck,
      color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",
      iconColor: "text-cyan-400",
      link: "/analysis"
    },
    {
      title: "Speaker Clustering",
      description: "Cluster sets of audio clips into distinct speaker identities using K-Means clustering, rendering a matching matrix.",
      icon: GitFork,
      color: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
      iconColor: "text-pink-400",
      link: "/clustering"
    }
  ];

  return (
    <div className="flex flex-col gap-12 max-w-5xl mx-auto py-6">
      {/* Hero section */}
      <section className="text-center flex flex-col items-center gap-6 py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold animate-float">
          <Zap className="w-3.5 h-3.5" />
          Powered by speechbrain & librosa
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight font-sans">
          Acoustic Voice Analysis & <br />
          <span className="text-gradient">Speaker Verification</span>
        </h1>
        <p className="max-w-2xl text-slate-400 text-base md:text-lg leading-relaxed">
          Verify voiceprints, extract acoustic speech metrics, identify AI deepfakes,
          and group audio logs by speakers in a secure, local platform.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          <Link
            to="/compare"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white glow-btn"
          >
            Start Comparing
            <ArrowRight className="w-4 h-4" />
          </Link>
          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              Sign Up for History Log
            </Link>
          )}
        </div>
      </section>

      {/* Grid details */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feat, index) => {
          const Icon = feat.icon;
          return (
            <div key={index} className={`flex flex-col gap-4 p-6 rounded-2xl border bg-slate-900/20 backdrop-blur-md ${feat.color}`}>
              <div className={`w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-white/5 ${feat.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white mt-2">{feat.title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed flex-grow">{feat.description}</p>
              <Link
                to={feat.link}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:text-brand-300 mt-4 transition-colors"
              >
                Launch Tool
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </section>

      {/* Database Catalog Info */}
      <section className="p-8 rounded-2xl border border-white/5 bg-slate-900/10 backdrop-blur-sm flex flex-col md:flex-row items-center gap-8 mt-4">
        <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
          <Database className="w-7 h-7" />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-white">Registered Voice Signature Prints</h3>
          <p className="text-xs text-slate-400 leading-relaxed mt-1">
            Register your vocal profile signatures. You can execute quick vector-database matching searches to instantly find matching profiles. Log in to register voice profiles.
          </p>
        </div>
        {user ? (
          <Link
            to="/analysis"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white transition-colors"
          >
            Manage Catalog
          </Link>
        ) : (
          <Link
            to="/login"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 transition-colors"
          >
            Sign In
          </Link>
        )}
      </section>
    </div>
  );
}
