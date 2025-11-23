import React, { useState } from 'react';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center p-4 bg-card border-t border-border sticky bottom-0">
      <textarea
        className="flex-1 resize-none h-12 p-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mr-2 bg-background text-textPrimary placeholder-textSecondary"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={disabled ? 'Waiting for response...' : 'Type your message...'}
        disabled={disabled}
        rows={1}
        style={{ overflowY: 'hidden' }} // Hide scrollbar
      />
      <button
        className="bg-primary hover:bg-secondary text-white font-bold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        onClick={handleSend}
        disabled={disabled || !input.trim()}
      >
        Send
      </button>
    </div>
  );
};

export default MessageInput;
