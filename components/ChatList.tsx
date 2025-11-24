import React from 'react';
import { Chat, User, ChatParticipant } from '../types';

interface ChatListProps {
  chats: Chat[];
  activeChatId: string | null;
  currentUser: User;
  onSelectChat: (chatId: string) => void;
  onOpenNewChatModal: () => void; // For private chat creation
  onOpenGroupChatModal?: () => void; // For group chat creation (Admin only)
}

const ChatList: React.FC<ChatListProps> = ({ chats, activeChatId, currentUser, onSelectChat, onOpenNewChatModal, onOpenGroupChatModal }) => {
  const getChatDisplayName = (chat: Chat): string => {
    if (chat.type === 'group') {
      return chat.name || 'Group Chat';
    } else {
      // For private chats, find the other participant
      const otherParticipant = chat.participants.find(
        (p: ChatParticipant) => p._id !== currentUser._id
      );
      return otherParticipant ? otherParticipant.username : 'Unknown User';
    }
  };

  return (
    <aside className="w-1/4 border-r border-border p-4 flex flex-col bg-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-textPrimary">Chats</h3>
        <div className="flex space-x-2">
          {currentUser.role === 'Admin' && onOpenGroupChatModal && (
            <button
              onClick={onOpenGroupChatModal}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors duration-200 text-sm"
              aria-label="Create a new group chat"
            >
              + Group
            </button>
          )}
          <button
            onClick={onOpenNewChatModal}
            className="bg-primary hover:bg-secondary text-white font-bold py-1 px-3 rounded-lg shadow-md transition-colors duration-200 text-sm"
            aria-label="Start a new chat"
          >
            + New Chat
          </button>
        </div>
      </div>

      <div className="mb-4">
         <button
          onClick={() => onSelectChat('AI_CHAT')}
          className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-center space-x-3 shadow-sm border border-border
            ${activeChatId === 'AI_CHAT' ? 'bg-primary text-white' : 'bg-background hover:bg-gray-100 text-textPrimary'}`}
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr from-accent to-yellow-300 text-white shadow-sm">
            <span className="text-lg">✨</span>
          </div>
          <div className="flex-1">
            <div className="font-bold">AI Assistant</div>
            <div className={`text-xs ${activeChatId === 'AI_CHAT' ? 'text-gray-200' : 'text-textSecondary'}`}>
              Always here to help
            </div>
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="text-textSecondary italic text-center mt-4">No active chats.</p>
        ) : (
          <ul>
            {chats.map((chat) => (
              <li key={chat._id} className="mb-2">
                <button
                  onClick={() => onSelectChat(chat._id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex justify-between items-center
                    ${chat._id === activeChatId ? 'bg-secondary text-white shadow-md' : 'bg-background hover:bg-border text-textPrimary'}`}
                >
                  <div className="flex-1 overflow-hidden pr-2">
                    <div className="font-medium truncate">{getChatDisplayName(chat)}</div>
                    {chat.lastMessage && (
                      <p className="text-sm opacity-80 mt-1 truncate">
                        {chat.lastMessage.sender_username}: {chat.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {/* Display unread count if available */}
                  {chat.unreadCount && chat.unreadCount > 0 && (
                    <span className="ml-2 px-2 py-1 bg-accent text-white text-xs font-bold rounded-full">
                      {chat.unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
};

export default ChatList;