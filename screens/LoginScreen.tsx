import React, { useState } from 'react';
import { APP_TITLE } from '../constants';

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onShowRegister: () => void;
  loading: boolean;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onShowRegister, loading, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      await onLogin(email, password);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary text-white p-4">
      <div className="bg-card text-textPrimary p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-4xl font-extrabold text-center text-primary mb-6">{APP_TITLE}</h2>
        <p className="text-center text-lg mb-8 text-textSecondary">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 sr-only">Email</label>
            <input
              type="email"
              id="email"
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-primary focus:border-primary placeholder-textSecondary transition-colors bg-background"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 sr-only">Password</label>
            <input
              type="password"
              id="password"
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-primary focus:border-primary placeholder-textSecondary transition-colors bg-background"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-danger text-sm text-center font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-primary hover:bg-secondary text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-textSecondary">
          Don't have an account?{' '}
          <button
            onClick={onShowRegister}
            className="font-medium text-primary hover:text-secondary underline transition-colors duration-200"
            disabled={loading}
          >
            Register
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;