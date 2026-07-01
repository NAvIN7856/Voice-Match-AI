import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Lock, Mail, Loader2, ArrowRight } from 'lucide-react';

export default function Login({ onLoginSuccess }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const tab = searchParams.get('tab');
    setIsRegister(tab === 'register');
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isRegister && password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed");
      }

      // Save token
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Update App state
      onLoginSuccess(data.user);
      
      // Redirect home
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center py-12 max-w-md mx-auto">
      <div className="w-full glass-panel rounded-3xl p-8 border border-white/5">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isRegister ? "Create your Account" : "Sign In to VoiceMatch"}
          </h2>
          <p className="text-xs text-slate-400 mt-2">
            {isRegister 
              ? "Gain access to user history and custom voice catalogues" 
              : "Review your comparative voice histories"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <div className="relative flex items-center">
              <User className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                placeholder="Enter username"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Enter password"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirm Password</label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm password"
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950/60 border border-white/5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white glow-btn mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {isRegister ? "Create Account" : "Sign In"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-white/5">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              navigate(isRegister ? '/login' : '/login?tab=register');
            }}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            {isRegister 
              ? "Already have an account? Sign In" 
              : "Don't have an account yet? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}
