import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage, MessageRole, FileAttachment } from '../types';
import { socketService } from '../services/socketService';
import { summaryService } from '../services/apiService';
import SummaryModal from './SummaryModal';

interface ChatWindowProps {
  messages: ChatMessage[];
  loading: boolean;
  currentUserId: string;
  chatId?: string;
  onMessagesUpdate?: (messages: ChatMessage[]) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  loading, 
  currentUserId, 
  chatId,
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
        const isCallMessage = message.content.includes('📞 **🎯 Premium Group Call Session** 🎯');
        
        // Special styling for call messages - always use the enhanced design
        if (isCallMessage) {
          return (
            <div
              key={message._id}
              className="flex flex-col max-w-[85%] mx-auto"
              aria-live="polite"
            >
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-5 border border-indigo-200 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-3xl mr-3">📞</span>
                    <div>
                      <h4 className="font-bold text-indigo-900 text-lg">🎯 Premium Group Call Session</h4>
                      <p className="text-sm text-indigo-600 font-medium">
                        {isCurrentUser ? 'You started this call' : `Started by ${message.sender_username}`}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs px-3 py-1 rounded-full font-semibold ${
                    isCurrentUser 
                      ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' 
                      : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>
                    {isCurrentUser ? '📤 Sent' : '📥 Received'}
                  </div>
                </div>
                
                {/* Extract call details */}
                {(() => {
                  const lines = message.content.split('\n');
                  const topic = lines.find(l => l.includes('🎙️ **Topic:**'))?.split(':')[1]?.trim();
                  const host = lines.find(l => l.includes('👤 **Host:**'))?.split(':')[1]?.trim();
                  const time = lines.find(l => l.includes('⏰ **Start Time:**'))?.split(':')[1]?.trim();
                  const linkMatch = message.content.match(/\[🎤 Join Video Call\]\((https:\/\/[^)]+)\)/);
                  const joinUrl = linkMatch ? linkMatch[1] : null;
                  
                  return (
                    <div className="space-y-3">
                      {topic && (
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-indigo-100">
                          <div className="flex items-center">
                            <span className="text-indigo-600 text-sm w-24 font-medium">🎙️ Topic:</span>
                            <span className="font-bold text-gray-900 text-sm">{topic}</span>
                          </div>
                        </div>
                      )}
                      {host && (
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-indigo-100">
                          <div className="flex items-center">
                            <span className="text-indigo-600 text-sm w-24 font-medium">👤 Host:</span>
                            <span className="font-bold text-gray-900 text-sm">{host}</span>
                          </div>
                        </div>
                      )}
                      {time && (
                        <div className="bg-white bg-opacity-60 rounded-lg p-3 border border-indigo-100">
                          <div className="flex items-center">
                            <span className="text-indigo-600 text-sm w-24 font-medium">⏰ Time:</span>
                            <span className="font-bold text-gray-900 text-sm">{time}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Premium Features */}
                      <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-3 border border-purple-200">
                        <p className="text-xs font-bold text-purple-800 mb-2">✨ Premium Features Enabled:</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center text-purple-700">
                            <span className="text-green-500 mr-1">✓</span>
                            <span>🎥 HD Recording</span>
                          </div>
                          <div className="flex items-center text-purple-700">
                            <span className="text-green-500 mr-1">✓</span>
                            <span>📝 Live Transcription</span>
                          </div>
                          <div className="flex items-center text-purple-700">
                            <span className="text-green-500 mr-1">✓</span>
                            <span>🤖 AI Summary</span>
                          </div>
                          <div className="flex items-center text-purple-700">
                            <span className="text-green-500 mr-1">✓</span>
                            <span>📊 Documentation</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Join Button */}
                      <div className="pt-3">
                        <button
                          onClick={() => {
                            if (joinUrl) {
                              window.open(joinUrl, '_blank');
                            }
                          }}
                          className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                        >
                          <span className="text-lg">🎤</span>
                          <span>Join Premium Video Call</span>
                          <span className="text-xs opacity-75">→</span>
                        </button>
                        <p className="text-xs text-center text-gray-500 mt-2 italic">
                          🚀 High-quality video conference • Click to join instantly
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className={`text-xs mt-2 text-gray-400 text-center`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          );
        }

        // Regular message styling
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
              <div className="whitespace-pre-wrap">{message.content}</div>
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