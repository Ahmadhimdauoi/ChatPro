import React, { useState } from 'react';
import { summaryService } from '../services/apiService';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId?: string;
  chatName?: string;
  summary?: string;
  messageCount?: number;
  isLoading?: boolean;
  error?: string;
}

const SummaryModal: React.FC<SummaryModalProps> = ({ 
  isOpen, 
  onClose, 
  chatId, 
  chatName, 
  summary: preGeneratedSummary, 
  messageCount: preGeneratedMessageCount,
  isLoading: preGeneratedLoading,
  error: preGeneratedError
}) => {
  const [summary, setSummary] = useState<string>(preGeneratedSummary || '');
  const [loading, setLoading] = useState(preGeneratedLoading || false);
  const [error, setError] = useState<string | null>(preGeneratedError || null);

  const handleGenerateSummary = async () => {
    setLoading(true);
    setError(null);
    setSummary('');

    try {
      const response = await summaryService.generateConversationSummary(chatId);
      
      if (response.success && response.data) {
        setSummary(response.data.summary);
      } else {
        setError(response.message || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSummary('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              📊 Conversation Summary
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close summary modal"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {chatName && (
            <p className="text-sm text-gray-500 mt-1">Chat: {chatName}</p>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {!summary && !loading && !error && (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Generate Conversation Summary
              </h3>
              <p className="text-gray-500 mb-6">
                Get an AI-powered summary of the last 50 messages in this conversation.
              </p>
              <button
                onClick={handleGenerateSummary}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
              >
                Generate Summary
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600">Generating summary...</p>
              <p className="text-sm text-gray-500 mt-2">
                Analyzing the last 50 messages
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-600"
                  aria-label="Dismiss error"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button
                onClick={handleGenerateSummary}
                className="mt-4 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {summary && !loading && !error && (
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                Summary of {preGeneratedMessageCount || 0} messages
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded-lg border">
                  {summary}
                </div>
              </div>
            </div>
          )}

          {summary && !loading && !error && (
            <div className="flex justify-between items-center">
              <button
                onClick={handleGenerateSummary}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SummaryModal;
