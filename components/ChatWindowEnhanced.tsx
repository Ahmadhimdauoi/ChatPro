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

const ChatWindowEnhanced: React.FC<ChatWindowProps> = ({ 
  messages, 
  loading, 
  currentUserId, 
  chatId,
  onMessagesUpdate 
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(messages);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<{ summary: string; messageCount: number } | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user from localStorage to check permissions
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    const handleNewMessage = (newMessage: ChatMessage) => {
      console.log('ChatWindow: Received new message:', newMessage);
      
      // Only update if this message belongs to the current chat
      if (chatId && newMessage.chat_id === chatId) {
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
      }
    };
    
    // Register the message handler with socket service
    socketService.onMessageReceived(handleNewMessage);
    
    // Cleanup function
    return () => {
      socketService.removeMessageListeners();
    };
  }, [chatId, onMessagesUpdate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [localMessages]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleGenerateSummary = async () => {
    if (!chatId) {
      setSummaryError('Chat ID is required for summary generation');
      return;
    }

    setSummaryLoading(true);
    setSummaryError(null);
    setShowSummaryModal(true);

    try {
      const response = await summaryService.generateConversationSummary(chatId);
      
      if (response.success && response.data) {
        setSummaryData({
          summary: response.data.summary,
          messageCount: response.data.messageCount
        });
      } else {
        throw new Error(response.message || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Summary generation error:', error);
      setSummaryError(error instanceof Error ? error.message : 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const renderFileAttachment = (fileAttachment: FileAttachment, isCurrentUser: boolean) => {
    const isImage = fileAttachment.mimeType?.startsWith('image/') || false;
    const fileIcon = isImage ? '🖼️' : '📄';
    
    return (
      <div className={`mt-3 p-3 rounded-xl border ${
        isCurrentUser 
          ? 'bg-white/20 border-white/30' 
          : 'bg-gradient-to-r from-gray-50 to-gray-100 border-secondary/30'
      } shadow-md`}>
        <div className="flex items-center space-x-3">
          <div className={`text-2xl ${isCurrentUser ? 'animate-pulse' : ''}`}>
            {fileIcon}
          </div>
          <div className="flex-1 min-w-0">
            <a
              href={fileAttachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-bold hover:underline transition-colors ${
                isCurrentUser ? 'text-white' : 'text-primary'
              }`}
            >
              {fileAttachment.originalName}
            </a>
            <div className={`text-xs mt-1 ${
              isCurrentUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {typeof fileAttachment.size === 'number' && !isNaN(fileAttachment.size) 
                ? `${(fileAttachment.size / 1024).toFixed(1)} KB` 
                : 'Size N/A'}
            </div>
          </div>
          <a
            href={fileAttachment.url}
            download={fileAttachment.originalName}
            className={`p-2 rounded-xl hover:bg-opacity-20 transition-all duration-300 transform hover:scale-110 ${
              isCurrentUser 
                ? 'text-white hover:bg-white/20' 
                : 'text-primary hover:bg-primary/10'
            }`}
            title="Download file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header with summary button - Enhanced PONGO Style */}
      <div className="bg-gradient-to-r from-primary to-secondary border-b border-secondary/30 px-6 py-4 flex items-center justify-between shadow-lg">
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
            <h2 className="text-xl font-bold text-white">PONGO Chat</h2>
            {localMessages.length > 0 && (
              <span className="text-sm text-blue-100">
                {localMessages.length} messages
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={!chatId || localMessages.length === 0 || summaryLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-white hover:bg-blue-50 text-primary text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105"
          title="Generate AI summary"
        >
          <span className="text-lg">🤖</span>
          <span>Summary</span>
        </button>
      </div>

      {/* Messages area - Enhanced PONGO Style */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
        {loading && (
          <div className="text-center text-primary py-12">
            <div className="inline-flex flex-col items-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary animate-pulse flex items-center justify-center">
                <span className="text-2xl text-white">💬</span>
              </div>
              <div className="text-lg font-medium animate-pulse">Loading messages...</div>
            </div>
          </div>
        )}

        {!loading && localMessages.length === 0 && (
          <div className="text-center py-16">
            {/* Enhanced Animated Chat Icon */}
            <div className="relative mb-8 inline-block">
              <div className="text-8xl animate-bounce">
                <div className="relative inline-block">
                  {/* Rotating ring around icon */}
                  <div className="absolute inset-0 animate-spin">
                    <div className="w-20 h-20 border-4 border-secondary border-t-transparent rounded-full opacity-30"></div>
                  </div>
                  {/* Pulsing center icon */}
                  <div className="relative animate-pulse">
                    <span className="text-7xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      💭
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Floating particles */}
              <div className="absolute -top-4 -left-6 text-2xl animate-ping opacity-60">
                ✨
              </div>
              <div className="absolute -top-2 -right-4 text-lg animate-ping animation-delay-300 opacity-60">
                ⭐
              </div>
              <div className="absolute -bottom-2 -left-4 text-base animate-ping animation-delay-600 opacity-60">
                💫
              </div>
            </div>

            {/* Enhanced Welcome Messages */}
            <div className="space-y-4">
              <div className="animate-fade-in-up">
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Welcome to PONGO!
                </div>
              </div>
              <div className="animate-fade-in-up animation-delay-200">
                <div className="text-lg text-gray-600">
                  Start a new conversation with your team
                </div>
              </div>
              <div className="animate-fade-in-up animation-delay-400 mt-6">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-full border border-white/30 shadow-lg">
                  <span className="text-sm text-white font-bold">
                    Type your message below to start
                  </span>
                  <span className="ml-3 text-lg animate-bounce">
                    👇
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {localMessages.map((message, index) => {
          const isCurrentUser = message.sender_id === currentUserId;
          const messageClass = isCurrentUser
            ? 'bg-gradient-to-br from-primary to-secondary text-white self-end ml-auto rounded-l-3xl rounded-br-3xl shadow-xl border border-primary/20'
            : 'bg-white text-primary self-start mr-auto rounded-r-3xl rounded-bl-3xl border border-secondary/30 shadow-lg';

          const roleColor = isCurrentUser
            ? 'text-accent'
            : 'text-secondary font-medium';

          // Check if this is a new day or first message
          const shouldShowDate = index === 0 || 
            new Date(message.timestamp).toDateString() !== 
            new Date(localMessages[index - 1].timestamp).toDateString();

          return (
            <div key={message._id} className="space-y-1">
              {/* Date Separator - Enhanced */}
              {shouldShowDate && (
                <div className="flex items-center justify-center my-6">
                  <div className="bg-gradient-to-r from-primary to-secondary px-4 py-2 rounded-full shadow-md">
                    <span className="text-sm text-white font-bold">
                      {new Date(message.timestamp).toLocaleDateString('ar-SA', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              )}

              <div
                className={`flex items-end space-x-3 max-w-[85%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
                aria-live="polite"
              >
                {/* Profile picture for other users - Enhanced */}
                {!isCurrentUser && (
                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 mb-2 ring-4 ring-gradient-to-r from-primary to-secondary ring-offset-2 ring-offset-white shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {message.sender_username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Message Container */}
                <div className={`flex flex-col ${messageClass} min-w-[120px]`}>
                  {/* Sender name for other users - Enhanced */}
                  {!isCurrentUser && (
                    <div className={`text-sm font-bold mb-3 px-3 ${roleColor} flex items-center`}>
                      <span className="w-3 h-3 bg-gradient-to-r from-success to-emerald-500 rounded-full mr-3 animate-pulse"></span>
                      {message.sender_username}
                    </div>
                  )}
                  
                  {/* Message content with better typography - Enhanced */}
                  {message.content && (
                    <div className="text-base leading-relaxed break-words px-5 py-3">
                      <div className="whitespace-pre-wrap font-medium">{message.content}</div>
                    </div>
                  )}

                  {/* File attachment */}
                  {message.fileAttachment && 
                   message.fileAttachment.url && 
                   message.fileAttachment.originalName && 
                   Object.keys(message.fileAttachment).length > 0 && (
                    <div className="mt-2 px-4 pb-2">
                      {renderFileAttachment(message.fileAttachment, isCurrentUser)}
                    </div>
                  )}

                  {/* Message timestamp with better styling - Enhanced */}
                  <div className={`text-xs mt-3 px-5 pb-3 ${isCurrentUser ? 'text-blue-100' : 'text-gray-500'} self-end flex items-center`}>
                    <span className="opacity-75 font-medium">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-3 text-lg">
                        {message.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current user avatar (smaller, on the right) - Enhanced */}
                {isCurrentUser && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mb-2 ring-4 ring-gradient-to-r from-secondary to-primary ring-offset-2 ring-offset-white shadow-lg">
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
                      <span className="text-sm font-bold text-white">
                        {message.sender_username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Summary Modal */}
      {showSummaryModal && (
        <SummaryModal
          isOpen={showSummaryModal}
          onClose={() => setShowSummaryModal(false)}
          summary={summaryData?.summary || ''}
          messageCount={summaryData?.messageCount || 0}
          isLoading={summaryLoading}
          error={summaryError}
        />
      )}
    </>
  );
};

export default ChatWindowEnhanced;
