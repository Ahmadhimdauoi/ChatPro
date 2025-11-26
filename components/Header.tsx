import React, { useState } from 'react';
import { APP_TITLE } from '../constants';
import { User } from '../types';
import AdminDashboard from './AdminDashboard';
import ProfileScreen from '../screens/ProfileScreen';

interface HeaderProps {
  currentUser: User | null;
  onLogout: () => void;
  onSelectChat?: (chatId: string) => void;
  onUserUpdate?: (updatedUser: User) => void;
}

const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, onSelectChat, onUserUpdate }) => {
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentUserState, setCurrentUserState] = useState<User | null>(currentUser);

  const handleProfileUpdate = (updatedUser: User) => {
    setCurrentUserState(updatedUser);
    // Also notify parent component if callback is provided
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  const isAdmin = currentUserState?.role === 'Admin';
  const isManager = currentUserState?.role === 'Manager';
  const isStaff = currentUserState?.role === 'Employee';

  return (
    <>
      <header className="bg-primary text-white p-3 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          {/* Logo Only - No Frame - Adjusted Size */}
          <div className="relative z-10 w-24 h-24 rounded-lg overflow-hidden flex items-center justify-center transform transition-transform duration-300 hover:scale-110 hover:rotate-3 animate-pulse">
            <img 
              src="/Gemini_Generated_Image_cll9fhcll9fhcll9-removebg-preview.png" 
              alt="PONGO Logo" 
              className="w-full h-full object-contain animate-bounce"
                              onError={(e) => {
                // Fallback if image doesn't load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span class="text-4xl font-bold text-primary">💬</span>';
              }}
            />
          </div>
                  </div>
        {currentUser ? (
          <div className="flex items-center space-x-4">
            {/* Profile Picture Button */}
            <button
              onClick={() => setShowProfile(true)}
              className="relative group"
              title="Profile"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent hover:border-secondary transition-colors">
                {currentUserState?.profilePicture ? (
                  <img 
                    src={currentUserState.profilePicture} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                    <span className="text-lg font-bold text-secondary">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-primary"></div>
            </button>
            
            <span className="text-lg">Welcome, {currentUser.username}</span>
            
            {/* Admin Dashboard Button - Only for Admin */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Admin Dashboard
              </button>
            )}
            
            {/* Manager Dashboard Button - Only for Manager */}
            {isManager && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="bg-secondary hover:bg-secondary-dark text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manager Dashboard
              </button>
            )}
            
            {/* Staff Info Badge - Only for Staff */}
            {isStaff && (
              <div className="bg-success text-white px-3 py-2 rounded-lg flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Staff
              </div>
            )}
            
            <button
              onClick={onLogout}
              className="bg-danger hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        ) : (
          <span className="text-lg">Please login</span>
        )}
      </header>

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full h-full max-w-7xl max-h-[95vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="text-xl font-semibold text-primary">
                {isAdmin ? '🛡️ Admin Control Panel' : '📊 Manager Control Panel'}
              </h2>
              <button
                onClick={() => setShowAdminDashboard(false)}
                className="text-textSecondary hover:text-primary text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <AdminDashboard 
                currentUser={currentUser!} 
                onClose={() => setShowAdminDashboard(false)}
                onSelectChat={onSelectChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && currentUser && (
        <ProfileScreen 
          currentUser={currentUserState || currentUser}
          onClose={() => setShowProfile(false)}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </>
  );
};

export default Header;