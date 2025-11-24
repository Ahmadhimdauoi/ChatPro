import React, { useState, useEffect } from 'react';
import { User } from '../types';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  allUsers: User[];
  onCreateGroup: (groupName: string, participantIds: string[]) => void;
  loading?: boolean;
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allUsers,
  onCreateGroup,
  loading = false
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users (exclude current user and apply search)
  const filteredUsers = allUsers.filter(user => 
    user._id !== currentUser._id &&
    (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setGroupName('');
      setSelectedParticipants([]);
      setSearchTerm('');
    }
  }, [isOpen]);

  const handleToggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedParticipants.length === 0) {
      alert('Please select at least one participant');
      return;
    }

    onCreateGroup(groupName.trim(), selectedParticipants);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Group Chat</h2>
          <p className="text-sm text-gray-600 mt-1">
            Add participants to create a group conversation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Group Name Input */}
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter group name"
              disabled={loading}
            />
          </div>

          {/* Search Users */}
          <div className="mb-4">
            <label htmlFor="searchUsers" className="block text-sm font-medium text-gray-700 mb-2">
              Search Participants
            </label>
            <input
              type="text"
              id="searchUsers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Search by name or email"
              disabled={loading}
            />
          </div>

          {/* Participants List */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Participants *
            </label>
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  {searchTerm ? 'No users found' : 'No available users'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user._id}`}
                      checked={selectedParticipants.includes(user._id)}
                      onChange={() => handleToggleParticipant(user._id)}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      disabled={loading}
                    />
                    <label
                      htmlFor={`user-${user._id}`}
                      className="ml-3 flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {user.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email} • {user.department}
                      </div>
                    </label>
                    <div className="ml-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'online' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Selected Participants Summary */}
          {selectedParticipants.length > 0 && (
            <div className="mb-4 p-3 bg-purple-50 rounded-md">
              <div className="text-sm text-purple-800">
                <span className="font-medium">{selectedParticipants.length}</span> participant(s) selected
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !groupName.trim() || selectedParticipants.length === 0}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupChatModal;
