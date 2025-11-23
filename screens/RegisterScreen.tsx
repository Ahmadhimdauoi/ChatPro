import React, { useState } from 'react';
import { APP_TITLE } from '../constants';

interface RegisterScreenProps {
  onRegister: (username: string, email: string, password: string, department: string) => Promise<void>;
  onShowLogin: () => void;
  loading: boolean;
  error: string | null;
}

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onRegister, onShowLogin, loading, error }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username && email && password && department) {
      await onRegister(username, email, password, department);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary text-white p-4">
      <div className="bg-card text-textPrimary p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-4xl font-extrabold text-center text-primary mb-6">{APP_TITLE}</h2>
        <p className="text-center text-lg mb-8 text-textSecondary">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 sr-only">Username</label>
            <input
              type="text"
              id="username"
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-primary focus:border-primary placeholder-textSecondary transition-colors bg-background"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
            />
          </div>
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
          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 sr-only">Department</label>
            <input
              type="text"
              id="department"
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-primary focus:border-primary placeholder-textSecondary transition-colors bg-background"
              placeholder="Department (e.g., Sales, HR, IT)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
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
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-textSecondary">
          Already have an account?{' '}
          <button
            onClick={onShowLogin}
            className="font-medium text-primary hover:text-secondary underline transition-colors duration-200"
            disabled={loading}
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterScreen;