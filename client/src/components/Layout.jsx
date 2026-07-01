import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mic, History, GitFork, User, LogOut, Radio, BrainCircuit } from 'lucide-react';

export default function Layout({ children, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const menuItems = [
    { name: 'Compare', path: '/compare', icon: Mic },
    { name: 'Acoustic & Spoof', path: '/analysis', icon: BrainCircuit },
    { name: 'Clustering', path: '/clustering', icon: GitFork },
    ...(user ? [{ name: 'History', path: '/history', icon: History }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#05070c] relative">
      {/* Background gradients for premium glass design */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-slate-950/45 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-pink-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                <Radio className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                VoiceMatch<span className="text-brand-400">AI</span>
              </span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/10' 
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/5">
                  <User className="w-4 h-4 text-brand-400" />
                  <span className="text-xs font-semibold text-slate-200">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-2 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/login?tab=register"
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white glow-btn"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} VoiceMatch AI. All rights reserved.
          </span>
          <div className="flex gap-4 text-xs text-slate-500">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
