import React from 'react';
import { APP_TITLE } from '../constants';
import { User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout }) => {
  return (
    <header className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
      <h1 className="text-2xl font-bold">{APP_TITLE}</h1>
      {currentUser ? (
        <div className="flex items-center space-x-4">
          <span className="text-lg">Welcome, {currentUser.username}</span>
          <button
            onClick={onLogout}
            className="bg-danger hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      ) : (
        <span className="text-lg">Please Log In</span>
      )}
    </header>
  );
};

export default Header;