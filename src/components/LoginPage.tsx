'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please login instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found. Please sign up first.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError('Something went wrong. Please try again.');
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError('Failed to sign in with Google');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">SP Daily Expense</h1>
          <p className="text-gray-500 text-sm">Track your daily expenses with ease</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'login'
                ? 'bg-white text-purple-600 shadow'
                : 'text-gray-500'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              mode === 'signup'
                ? 'bg-white text-purple-600 shadow'
                : 'text-gray-500'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-500 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Email/Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password (min 6 chars)' : 'Enter your password'}
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition ${
              loading ? 'opacity-70' : ''
            }`}
          >
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Login'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 rounded-xl py-3 px-6 font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Your data is securely stored in the cloud.<br/>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-purple-600 font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
