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
      <div className={`mt-2 p-2 rounded-lg ${
        isCurrentUser ? 'bg-primary-dark' : 'bg-accent'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{fileIcon}</span>
          <div className="flex-1 min-w-0">
            <a
              href={fileAttachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm font-medium hover:underline ${
                isCurrentUser ? 'text-accent' : 'text-secondary'
              }`}
            >
              {fileAttachment.originalName}
            </a>
            <div className={`text-xs ${
              isCurrentUser ? 'text-accent-dark' : 'text-textSecondary'
            }`}>
              {typeof fileAttachment.size === 'number' && !isNaN(fileAttachment.size) 
                ? `${(fileAttachment.size / 1024).toFixed(1)} KB` 
                : 'Size N/A'}
            </div>
          </div>
          <a
            href={fileAttachment.url}
            download={fileAttachment.originalName}
            className={`p-1 rounded hover:bg-opacity-20 ${
              isCurrentUser ? 'text-accent hover:bg-white' : 'text-secondary hover:bg-accent'
            }`}
            title="Download file"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Header with summary button */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-primary">Chat</h2>
          {localMessages.length > 0 && (
            <span className="text-sm text-textSecondary">
              ({localMessages.length} messages)
            </span>
          )}
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={!chatId || localMessages.length === 0 || summaryLoading}
          className="flex items-center space-x-2 px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Generate AI summary"
        >
          <span>🤖</span>
          <span>Summarize</span>
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-background">
        {loading && (
          <div className="text-center text-textSecondary italic py-8">Loading messages...</div>
        )}

        {!loading && localMessages.length === 0 && (
          <div className="text-center text-textSecondary py-12">
            {/* Animated Chat Icon */}
            <div className="relative mb-6 inline-block">
              <div className="text-6xl animate-bounce">
                <div className="relative inline-block">
                  {/* Rotating ring around icon */}
                  <div className="absolute inset-0 animate-spin">
                    <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full opacity-30"></div>
                  </div>
                  {/* Pulsing center icon */}
                  <div className="relative animate-pulse">
                    <span className="text-5xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      💭
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Floating particles */}
              <div className="absolute -top-2 -left-4 text-lg animate-ping opacity-60">
                ✨
              </div>
              <div className="absolute -top-1 -right-3 text-sm animate-ping animation-delay-300 opacity-60">
                ⭐
              </div>
              <div className="absolute -bottom-1 -left-3 text-xs animate-ping animation-delay-600 opacity-60">
                💫
              </div>
            </div>

            {/* Animated Welcome Messages */}
            <div className="space-y-3">
              <div className="animate-fade-in-up">
                <div className="text-xl font-semibold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Ready to connect?
                </div>
              </div>
              <div className="animate-fade-in-up animation-delay-200">
                <div className="text-sm text-textSecondary">
                  Send your first message to start the conversation
                </div>
              </div>
              <div className="animate-fade-in-up animation-delay-400 mt-4">
                <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-accent to-accent-dark rounded-full border border-secondary/30">
                  <span className="text-xs text-secondary font-medium">
                    Type a message below to begin
                  </span>
                  <span className="ml-2 text-xs animate-bounce">
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
            ? 'bg-gradient-to-br from-secondary to-secondary-dark text-white self-end ml-auto rounded-l-2xl rounded-br-2xl shadow-lg'
            : 'bg-white text-primary self-start mr-auto rounded-r-2xl rounded-bl-2xl border border-border shadow-md';

          const roleColor = isCurrentUser
            ? 'text-accent'
            : 'text-secondary font-medium';

          // Check if this is a new day or first message
          const shouldShowDate = index === 0 || 
            new Date(message.timestamp).toDateString() !== 
            new Date(localMessages[index - 1].timestamp).toDateString();

          return (
            <div key={message._id} className="space-y-1">
              {/* Date Separator */}
              {shouldShowDate && (
                <div className="flex items-center justify-center my-4">
                  <div className="bg-accent px-3 py-1 rounded-full">
                    <span className="text-xs text-textSecondary font-medium">
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
                {/* Profile picture for other users */}
                {!isCurrentUser && (
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 mb-1 ring-2 ring-accent ring-offset-2 ring-offset-background">
                    <div className="w-full h-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
                      <span className="text-sm font-bold text-secondary">
                        {message.sender_username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Message Container */}
                <div className={`flex flex-col ${messageClass} min-w-[120px]`}>
                  {/* Sender name for other users */}
                  {!isCurrentUser && (
                    <div className={`text-xs font-bold mb-2 px-1 ${roleColor} flex items-center`}>
                      <span className="w-2 h-2 bg-success rounded-full mr-2"></span>
                      {message.sender_username}
                    </div>
                  )}
                  
                  {/* Message content with better typography */}
                  {message.content && (
                    <div className="text-sm leading-relaxed break-words px-4 py-2">
                      <div className="whitespace-pre-wrap">{message.content}</div>
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

                  {/* Message timestamp with better styling */}
                  <div className={`text-xs mt-2 px-4 pb-2 ${isCurrentUser ? 'text-blue-100' : 'text-textSecondary'} self-end flex items-center`}>
                    <span className="opacity-75">
                      {formatTimestamp(message.timestamp)}
                    </span>
                    {isCurrentUser && (
                      <span className="ml-2">
                        {message.is_read ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Current user avatar (smaller, on the right) */}
                {isCurrentUser && (
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 ring-2 ring-secondary ring-offset-2 ring-offset-background">
                    <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
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
