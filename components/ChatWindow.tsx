import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, MessageRole } from '../types';
import { socketService } from '../services/socketService';

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  currentUserId: string;
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  loading, 
  currentUserId, 
  onMessagesUpdate 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      console.log('ChatWindow: Received new message:', newMessage);
      
      setLocalMessages(prevMessages => {
        // Check if message already exists to avoid duplicates
        if (prevMessages.some(m => m._id === newMessage._id)) {
          return prevMessages;
        }
        const updatedMessages = [...prevMessages, newMessage];
        // Notify parent component if callback provided
        onMessagesUpdate?.(updatedMessages);
        return updatedMessages;
      });
    };
    
    // Register the message handler
    socketService.onMessageReceived(handleNewMessage);
    
    // Cleanup function
    return () => {
      socketService.removeListener('chatMessage', handleNewMessage);
    };
  }, [onMessagesUpdate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]); // Scroll to bottom whenever messages change

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
      {loading && (
        <div className="text-center text-gray-500 italic py-8">Loading messages...</div>
      )}

      {!loading && localMessages.length === 0 && (
        <div className="text-center text-gray-500 italic py-12">
          <div className="text-6xl mb-4">💬</div>
          <div className="text-lg">No messages yet</div>
          <div className="text-sm">Start the conversation!</div>
        </div>
      )}

      {localMessages.map((message) => {
        const isCurrentUser = message.sender_id === currentUserId;
        const messageClass = isCurrentUser
          ? 'bg-blue-600 text-white self-end ml-auto rounded-l-2xl rounded-br-2xl'
          : 'bg-white text-gray-800 self-start mr-auto rounded-r-2xl rounded-bl-2xl border border-gray-200 shadow-sm';

        const roleColor = isCurrentUser
          ? 'text-blue-100'
          : 'text-blue-600 font-medium';

        return (
          <div
            key={message._id}
            className={`flex flex-col max-w-[75%] p-3 ${messageClass}`}
            aria-live="polite"
          >
            {!isCurrentUser && (
              <div className={`text-xs font-semibold mb-1 ${roleColor}`}>
                {message.sender_username}
              </div>
            )}
            <div className="text-sm leading-relaxed break-words">
              {message.content}
            </div>
            <div className={`text-xs mt-2 ${isCurrentUser ? 'text-blue-100' : 'text-gray-400'} self-end`}>
              {formatTimestamp(message.timestamp)}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} /> {/* Dummy element to scroll to */}
    </div>
  );
};

export default ChatWindow;