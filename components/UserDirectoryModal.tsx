import React, { useState } from 'react';
import { User } from '../types';

interface UserDirectoryModalProps {
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
  loading: boolean;
}

const UserDirectoryModal: React.FC<UserDirectoryModalProps> = ({
  users,
  currentUser,
  onSelectUser,
  onClose,
  loading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(
    (user) =>
      user._id !== currentUser._id && // Exclude current user
      (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-xl font-semibold text-textPrimary">Start New Chat</h2>
          <button onClick={onClose} className="text-textSecondary hover:text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <input
            type="text"
            placeholder="Search users by name, email, or department..."
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary focus:border-primary transition-colors bg-background text-textPrimary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <p className="text-textSecondary text-center">Loading users...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-textSecondary text-center">No users found.</p>
          ) : (
            <ul>
              {filteredUsers.map((user) => (
                <li key={user._id}>
                  <button
                    onClick={() => onSelectUser(user)}
                    className="w-full text-left p-3 rounded-lg hover:bg-background transition-colors duration-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-textPrimary">{user.username}</div>
                      <div className="text-sm text-textSecondary">{user.email} - {user.department}</div>
                    </div>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        user.status === 'online' ? 'bg-success' : 'bg-textSecondary'
                      } block`}
                      aria-label={`User is ${user.status}`}
                    ></span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDirectoryModal;