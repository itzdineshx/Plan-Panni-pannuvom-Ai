import React, { useState } from 'react';
import { GraduationCap, LogIn, UserPlus, AlertTriangle } from 'lucide-react';
import { AcademicLevel, AppUser } from '../types';
import { loginUser, signUpUser } from '../services/authService';

interface Props {
  onAuthenticated: (user: AppUser) => void;
}

const AuthScreen: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      if (mode === 'login') {
        const user = loginUser(
          String(formData.get('email') || ''),
          String(formData.get('password') || '')
        );
        onAuthenticated(user);
      } else {
        const user = signUpUser({
          fullName: String(formData.get('fullName') || ''),
          email: String(formData.get('email') || ''),
          password: String(formData.get('password') || ''),
          department: String(formData.get('department') || ''),
          academicLevel: formData.get('academicLevel') as AcademicLevel,
          headline: String(formData.get('headline') || ''),
        });
        onAuthenticated(user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl">
            <GraduationCap size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">AcademiGen</h1>
            <p className="text-xs text-slate-500">AI project workspace for student teams</p>
          </div>
        </div>

        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl mb-6">
          {['login', 'signup'].map(tab => (
            <button
              key={tab}
              onClick={() => setMode(tab as 'login' | 'signup')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
              }`}
              type="button"
            >
              {tab === 'login' ? 'Login' : 'Sign Up'}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2 text-xs mb-4">
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <input
                name="fullName"
                required
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <input
                name="department"
                placeholder="Department (e.g., CSE)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <select
                name="academicLevel"
                defaultValue={AcademicLevel.UG}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              >
                {Object.values(AcademicLevel).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <input
                name="headline"
                placeholder="Headline (e.g., UG - CSE Final Year)"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
            </>
          )}

          <input
            name="email"
            type="email"
            required
            placeholder="Email"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="Password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-70"
          >
            {mode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthScreen;
