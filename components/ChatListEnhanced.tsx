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
        className={`flex items-center p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
          isSelected 
            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg border-l-4 border-white' 
            : 'hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 border-l-4 border-transparent'
        }`}
      >
        {/* Chat icon with profile picture - Enhanced */}
        <div className="w-12 h-12 rounded-full overflow-hidden mr-4 flex-shrink-0 ring-2 ring-gradient-to-r from-primary to-secondary ring-offset-2 ring-offset-white shadow-lg">
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
                <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              );
            })()
          ) : (
            // Group chat - show group icon
            <div className="w-full h-full bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-lg animate-pulse">
              {icon}
            </div>
          )}
        </div>

        {/* Chat info - Enhanced */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className={`font-bold text-base truncate ${
              isSelected ? 'text-white' : 'text-primary'
            }`}>
              {displayName}
            </h3>
            {chat.unreadCount && chat.unreadCount > 0 && (
              <span className="bg-gradient-to-r from-danger to-red-600 text-white text-xs rounded-full px-3 py-1.5 min-w-[24px] text-center font-bold shadow-md animate-pulse">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <p className={`text-sm truncate ${
              isSelected ? 'text-blue-100' : 'text-gray-600'
            }`}>
              {displaySubtitle}
            </p>
            {chat.category && (
              <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                isSelected 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gradient-to-r from-primary/10 to-secondary/10 text-primary'
              }`}>
                {chat.category}
              </span>
            )}
          </div>

          {/* Last message preview - Enhanced */}
          {chat.lastMessage && (
            <div className="mt-2">
              <p className={`text-xs truncate font-medium ${
                isSelected ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span className={`font-bold ${
                  isSelected ? 'text-white' : 'text-primary'
                }`}>
                  {chat.lastMessage.sender_username}:
                </span>{' '}
                {chat.lastMessage.content}
              </p>
            </div>
          )}
        </div>

        {/* Status indicator for private chats - Enhanced */}
        {chat.type === 'private' && otherParticipant && (
          <div className="ml-3">
            <div className={`w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-white animate-pulse ${
              otherParticipant.status === 'online' 
                ? 'bg-gradient-to-r from-success to-emerald-500 ring-success/50' 
                : otherParticipant.status === 'offline' 
                ? 'bg-gray-400 ring-gray-400/30'
                : 'bg-gradient-to-r from-secondary to-primary ring-secondary/50'
            }`} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header - Enhanced */}
      <div className="bg-gradient-to-r from-primary to-secondary p-6 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white shadow-md animate-pulse">
            <img 
              src="/Gemini_Generated_Image_cll9fhcll9fhcll9-removebg-preview.png" 
              alt="PONGO Logo" 
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<span class="text-lg font-bold text-primary">💬</span>';
              }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Conversations</h2>
            <p className="text-sm text-blue-100">
              {chats.length} conversations
            </p>
          </div>
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {/* Private Chats Section - Enhanced */}
        {privateChats.length > 0 && (
          <div className="mb-6">
            <div className="px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-secondary/20">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center">
                <span className="text-lg mr-2">👤</span>
                Private Chats
              </h3>
            </div>
            <div className="divide-y divide-secondary/20">
              {privateChats.map(chat => renderChatItem(chat, false))}
            </div>
          </div>
        )}

        {/* Group Chats Section - Enhanced */}
        {groupChats.length > 0 && (
          <div>
            <div className="px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-secondary/20">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center">
                <span className="text-lg mr-2">👥</span>
                Groups & Channels
              </h3>
            </div>
            <div className="divide-y divide-secondary/20">
              {groupChats.map(chat => renderChatItem(chat, true))}
            </div>
          </div>
        )}

        {/* Empty state - Enhanced */}
        {chats.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 animate-pulse">
              <span className="text-3xl text-white">💬</span>
            </div>
            <h3 className="text-xl font-bold text-primary mb-2">No conversations</h3>
            <p className="text-gray-600 text-center px-4">
              Start a new conversation with your team
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatListEnhanced;
