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
      <div className="bg-card rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-primary">Create Group Chat</h2>
          <p className="text-sm text-textSecondary mt-1">
            Add participants to create a group conversation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Group Name Input */}
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-sm font-medium text-primary mb-2">
              Group Name *
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="Enter group name"
              disabled={loading}
            />
          </div>

          {/* Search Users */}
          <div className="mb-4">
            <label htmlFor="searchUsers" className="block text-sm font-medium text-primary mb-2">
              Search Participants
            </label>
            <input
              type="text"
              id="searchUsers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent"
              placeholder="Search by name or email"
              disabled={loading}
            />
          </div>

          {/* Participants List */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-primary mb-2">
              Select Participants *
            </label>
            <div className="max-h-48 overflow-y-auto border border-border rounded-md">
              {filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-textSecondary">
                  {searchTerm ? 'No users found' : 'No available users'}
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user._id}
                    className="flex items-center p-3 hover:bg-accent border-b border-border last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      id={`user-${user._id}`}
                      checked={selectedParticipants.includes(user._id)}
                      onChange={() => handleToggleParticipant(user._id)}
                      className="h-4 w-4 text-secondary focus:ring-secondary border-border rounded"
                      disabled={loading}
                    />
                    <label
                      htmlFor={`user-${user._id}`}
                      className="ml-3 flex-1 cursor-pointer"
                    >
                      <div className="text-sm font-medium text-primary">
                        {user.username}
                      </div>
                      <div className="text-xs text-textSecondary">
                        {user.email} • {user.department}
                      </div>
                    </label>
                    <div className="ml-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'online' 
                          ? 'bg-success text-success'
                          : 'bg-accent text-textSecondary'
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
            <div className="mb-4 p-3 bg-accent rounded-md">
              <div className="text-sm text-secondary">
                <span className="font-medium">{selectedParticipants.length}</span> participant(s) selected
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-primary bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-secondary border border-transparent rounded-md hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
