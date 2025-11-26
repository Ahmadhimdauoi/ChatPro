import React, { useState } from 'react';
import { Chat, User, ChatParticipant } from '../types';
import { adminService } from '../services/apiService';

interface GroupManagementProps {
  chat: Chat;
  currentUser: User;
  onMemberRemoved: () => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({ 
  chat, 
  currentUser, 
  onMemberRemoved 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveMember = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await adminService.removeGroupMember(chat._id, participantId);
      
      if (response.success) {
        onMemberRemoved(); // Refresh the chat data
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const canManageGroup = currentUser.permissions.canManageGroups || currentUser.role === 'Admin';

  if (!canManageGroup) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-yellow-800">
          You don't have permission to manage this group.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">👥 Group Management</h3>
          <p className="text-sm text-gray-600 mt-1">{chat.name}</p>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          <div className="space-y-3">
            {chat.participants.map((participant) => {
              const isCurrentUser = participant._id === currentUser._id;
              const canRemoveThisMember = !isCurrentUser && canManageGroup;

              return (
                <div 
                  key={participant._id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {participant.username}
                        {isCurrentUser && <span className="ml-2 text-xs text-gray-500">(You)</span>}
                      </div>
                      <div className="text-sm text-gray-500">
                        {participant.department || 'No department'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      participant.status === 'online' ? 'bg-green-100 text-green-800' :
                      participant.status === 'offline' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {participant.status}
                    </span>
                    
                    {canRemoveThisMember && (
                      <button
                        onClick={() => handleRemoveMember(participant._id)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from group"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <strong>Group Info:</strong>
              <ul className="mt-2 space-y-1">
                <li>• Total Members: {chat.participants.length}</li>
                <li>• Created: {new Date(chat.createdAt).toLocaleDateString()}</li>
                {chat.category && <li>• Category: {chat.category}</li>}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupManagement;
