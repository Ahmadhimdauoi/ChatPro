import React, { useEffect, useRef } from 'react';
import { ChatMessage, MessageRole } from '../types';

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  currentUserId: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, loading, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]); // Scroll to bottom whenever messages change

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
      {loading && (
        <div className="text-center text-textSecondary italic">Loading messages...</div>
      )}

      {!loading && messages.length === 0 && (
        <div className="text-center text-textSecondary italic">No messages yet. Start the conversation!</div>
      )}

      {messages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId;
        const messageClass = isCurrentUser
          ? 'bg-primary text-white self-end rounded-bl-lg'
          : 'bg-card text-textPrimary self-start rounded-br-lg border border-border';

        const roleColor = isCurrentUser
          ? 'text-white'
          : 'text-primary'; // Different color for other users' names

        return (
          <div
            key={message._id}
            className={`flex flex-col max-w-[70%] p-3 rounded-lg shadow-sm ${messageClass}`}
            aria-live="polite"
          >
            <div className={`font-semibold text-sm ${roleColor}`}>
              {isCurrentUser ? 'You' : message.sender_username}
            </div>
            <p className="text-base">{message.content}</p>
            <span className="text-xs opacity-75 mt-1 self-end">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        );
      })}
      <div ref={messagesEndRef} /> {/* Dummy element to scroll to */}
    </div>
  );
};

export default ChatWindow;