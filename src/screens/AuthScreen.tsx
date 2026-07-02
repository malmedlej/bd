import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Zap, Eye, EyeOff, AlertCircle } from 'lucide-react';

export function AuthScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !pin) { setError('Please enter your username and PIN.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(username, pin);
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div
      className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4"
      style={{
        paddingTop: 'calc(1rem + env(safe-area-inset-top))',
        paddingRight: 'calc(1rem + env(safe-area-inset-right))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
        paddingLeft: 'calc(1rem + env(safe-area-inset-left))',
      }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">BD Pulse</h1>
          <p className="text-slate-400 text-sm mt-1">Business Development Command Center</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <h2 className="font-semibold text-slate-900 mb-5">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Username</label>
              <input
                className="input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. medlej"
                autoComplete="username"
                autoCapitalize="none"
              />
            </div>
            <div>
              <label className="label">PIN / Password</label>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Your PIN"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPin(!showPin)}
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-sm font-semibold"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          Internal Business Development Tool
        </p>
      </div>
    </div>
  );
}
