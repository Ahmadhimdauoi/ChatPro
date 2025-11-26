import React from 'react';
import { Chat } from '../types';

interface ChatListEnhancedProps {
  chats: Chat[];
  selectedChatId: string | null;
  onChatSelect: (chatId: string) => void;
  currentUserId: string;
}

const ChatListEnhanced: React.FC<ChatListEnhancedProps> = ({
  chats,
  selectedChatId,
  onChatSelect,
  currentUserId
}) => {
  // Separate chats into private (DMs) and groups
  const privateChats = chats.filter(chat => chat.type === 'private');
  const groupChats = chats.filter(chat => chat.type === 'group');

  const renderChatItem = (chat: Chat, isGroup: boolean = false) => {
    const isSelected = selectedChatId === chat._id;
    const otherParticipant = chat.type === 'private' 
      ? chat.participants.find(p => p._id !== currentUserId)
      : null;

    const displayName = chat.type === 'private' 
      ? otherParticipant?.username || 'Unknown User'
      : chat.name || 'Unnamed Group';

    const displaySubtitle = chat.type === 'private'
      ? otherParticipant?.department || 'No department'
      : `${chat.participants.length} members`;

    const icon = isGroup ? '👥' : '👤';

    return (
      <div
        key={chat._id}
        onClick={() => onChatSelect(chat._id)}
        className={`flex items-center p-3 cursor-pointer transition-colors duration-200 ${
          isSelected 
            ? 'bg-accent border-l-4 border-secondary' 
            : 'hover:bg-accent-dark border-l-4 border-transparent'
        }`}
      >
        {/* Chat icon with profile picture */}
        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
          {chat.type === 'private' && chat.participants.length === 2 ? (
            // Private chat - show other user's profile picture
            (() => {
              const otherUser = chat.participants.find(p => p._id !== currentUserId);
              const profilePicture = otherUser?.profilePicture;
              const displayName = otherUser?.username || 'Unknown';
              
              return profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              );
            })()
          ) : (
            // Group chat - show group icon
            <div className="w-full h-full bg-gradient-to-br from-secondary to-primary rounded-full flex items-center justify-center text-white font-semibold">
              {icon}
            </div>
          )}
        </div>

        {/* Chat info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold truncate ${
              isSelected ? 'text-secondary' : 'text-primary'
            }`}>
              {displayName}
            </h3>
            {chat.unreadCount && chat.unreadCount > 0 && (
              <span className="bg-danger text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-1">
            <p className="text-sm text-textSecondary truncate">
              {displaySubtitle}
            </p>
            {chat.category && (
              <span className="text-xs bg-accent text-secondary px-2 py-0.5 rounded">
                {chat.category}
              </span>
            )}
          </div>

          {/* Last message preview */}
          {chat.lastMessage && (
            <div className="mt-1">
              <p className="text-xs text-textSecondary truncate">
                {chat.lastMessage.sender_username}: {chat.lastMessage.content}
              </p>
            </div>
          )}
        </div>

        {/* Status indicator for private chats */}
        {chat.type === 'private' && otherParticipant && (
          <div className="ml-2">
            <div className={`w-2 h-2 rounded-full ${
              otherParticipant.status === 'online' 
                ? 'bg-success' 
                : otherParticipant.status === 'offline' 
                ? 'bg-textSecondary'
                : 'bg-secondary-light'
            }`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-primary">Messages</h2>
        <p className="text-sm text-textSecondary">
          {chats.length} conversations
        </p>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {/* Private Chats Section */}
        {privateChats.length > 0 && (
          <div className="mb-4">
            <div className="px-4 py-2 bg-accent border-b border-border">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Direct Messages
              </h3>
            </div>
            <div className="divide-y divide-border">
              {privateChats.map(chat => renderChatItem(chat, false))}
            </div>
          </div>
        )}

        {/* Group Chats Section */}
        {groupChats.length > 0 && (
          <div>
            <div className="px-4 py-2 bg-accent border-b border-border">
              <h3 className="text-xs font-semibold text-secondary uppercase tracking-wider">
                Groups & Channels
              </h3>
            </div>
            <div className="divide-y divide-border">
              {groupChats.map(chat => renderChatItem(chat, true))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {chats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-textSecondary">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-lg font-medium text-primary">No conversations yet</p>
            <p className="text-sm text-secondary">Start chatting to see your conversations here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListEnhanced;
