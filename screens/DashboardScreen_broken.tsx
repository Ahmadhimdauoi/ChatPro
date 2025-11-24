import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';
import MessageInput from '../components/MessageInput';
import UserDirectoryModal from '../components/UserDirectoryModal';
import { User, Chat, ChatMessage, MessageRole } from '../types';
import { chatService, userService } from '../services/apiService';
import { socketService } from '../services/socketService';
import { generateGeminiContent } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface DashboardScreenProps {
  currentUser: User;
  onLogout: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ currentUser, onLogout }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Standard chat messages
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]); // AI chat history (local only)
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [messageInputDisabled, setMessageInputDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Ref to store the activeChatId, useful for access inside socket callbacks without dependency issues
  const activeChatIdRef = useRef<string | null>(null);
  
  // Ref to check if AI is currently thinking to prevent multiple submissions
  const isAiThinking = useRef(false);

  // --- Initial Data Fetching ---

  // Fetch all chats for the current user
  const fetchUserChats = useCallback(async () => {
    if (!currentUser?._id) return;

    setLoadingChats(true);
    setError(null);
    try {
      const response = await chatService.getUserChats();
      if (response.success && response.data) {
        setChats(response.data);
      } else {
        setError(response.message || 'Failed to fetch chats.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching chats.');
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser._id]);

  useEffect(() => {
    fetchUserChats();
  }, [fetchUserChats]);

  // Fetch all users for the directory
  useEffect(() => {
    const fetchAllUsers = async () => {
      setLoadingUsers(true);
      setError(null);
      try {
        const response = await userService.getUsers();
        if (response.success && response.data) {
          setAllUsers(response.data);
        } else {
          setError(response.message || 'Failed to fetch users.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching users.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchAllUsers();
  }, [currentUser._id]);

  // Fetch messages for the active chat
  useEffect(() => {
    const fetchMessages = async () => {
      // If AI Chat, we don't fetch from backend.
      if (activeChatId === 'AI_CHAT') {
        setLoadingMessages(false);
        // Ensure dummy welcome message if empty
        if (aiMessages.length === 0) {
            setAiMessages([{
                _id: uuidv4(),
                chat_id: 'AI_CHAT',
                sender_id: 'gemini-ai',
                sender_username: 'AI Assistant',
                content: `Hello ${currentUser.username}! I am your AI Assistant. How can I help you today?`,
                timestamp: new Date().toISOString(),
                is_read: true,
                role: MessageRole.Model
            }]);
        }
        return;
      }

      if (!activeChatId) {
        setMessages([]); // Clear messages if no chat is active
        return;
      }

      setLoadingMessages(true);
      setError(null);
      try {
        const response = await chatService.getChatMessages(activeChatId);
        if (response.success && response.data) {
          // Map backend messages to client-side ChatMessage with role
          const formattedMessages: ChatMessage[] = response.data.map(msg => ({
            ...msg,
            sender_username: (msg.sender_id === currentUser._id) ? currentUser.username : msg.sender_username, 
            role: msg.sender_id === currentUser._id ? MessageRole.User : MessageRole.OtherUser,
          }));
          setMessages(formattedMessages);
        } else {
          setError(response.message || 'Failed to fetch messages.');
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching messages.');
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [activeChatId, currentUser._id, currentUser.username]);

  // --- Socket.IO Integration ---

  // Effect for joining/leaving chat rooms and handling messages
  useEffect(() => {
    // Sync ref
    activeChatIdRef.current = activeChatId;

    if (!socketService.isConnected()) return;

    // Join/Leave rooms
    if (activeChatId && activeChatId !== 'AI_CHAT') {
      socketService.joinChat(activeChatId);
    }
    
    // Cleanup previous room if changed is handled by next render or manual leave logic
    // A simplified approach: leave old room logic is complex to track in useEffect without previous value.
    // Instead, we trust the user won't be in too many rooms, or we could track 'prevChatId' state.
    // For this implementation, we just ensure we join.
    // Ideally, we should leave the previous room.
    
    return () => {
       if (activeChatId && activeChatId !== 'AI_CHAT') {
         socketService.leaveChat(activeChatId);
       }
    };
  }, [activeChatId]);


  useEffect(() => {
     if (!socketService.isConnected()) return;

     // Set up message listener
     socketService.setOnChatMessage((newMessage: ChatMessage) => {
        // Determine role for display
        const msgWithRole = {
            ...newMessage,
            role: newMessage.sender_id === currentUser._id ? MessageRole.User : MessageRole.OtherUser
        };

        // 1. If message belongs to active chat, append it
        if (activeChatIdRef.current === newMessage.chat_id) {
            setMessages((prev) => {
                // Deduplicate based on ID just in case
                if (prev.some(m => m._id === newMessage._id)) return prev;
                return [...prev, msgWithRole];
            });
        }

        // 2. Update chat list (last message)
        setChats((prevChats) => {
            return prevChats.map(chat => {
                if (chat._id === newMessage.chat_id) {
                    return {
                        ...chat,
                        lastMessage: msgWithRole,
                        // Increment unread if not active (simple logic)
                        unreadCount: (activeChatIdRef.current !== chat._id) 
                            ? (chat.unreadCount || 0) + 1 
                            : 0
                    };
                }
                return chat;
            }).sort((a, b) => {
                // Move updated chat to top
                if (a._id === newMessage.chat_id) return -1;
                if (b._id === newMessage.chat_id) return 1;
                return 0;
            });
        });
     });

     return () => {
         socketService.setOnChatMessage(undefined);
     };
  }, [currentUser._id]);


  // --- Event Handlers ---

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChatId) return;

    if (activeChatId === 'AI_CHAT') {
      if (isAiThinking.current) return;
      isAiThinking.current = true;
      setMessageInputDisabled(true);

      // Add user message immediately
      const userMsg: ChatMessage = {
        _id: uuidv4(),
        chat_id: 'AI_CHAT',
        sender_id: currentUser._id,
        sender_username: currentUser.username,
        content: content,
        timestamp: new Date().toISOString(),
        is_read: true,
        role: MessageRole.User,
      };
      setAiMessages(prev => [...prev, userMsg]);

      try {
        // Generate AI response
        const historyForAi = aiMessages.map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
        }));
        
        const aiResponseText = await generateGeminiContent(content, historyForAi);
        
        const aiMsg: ChatMessage = {
            _id: uuidv4(),
            chat_id: 'AI_CHAT',
            sender_id: 'gemini-ai',
            sender_username: 'AI Assistant',
            content: aiResponseText,
            timestamp: new Date().toISOString(),
            is_read: true,
            role: MessageRole.Model
        };
        setAiMessages(prev => [...prev, aiMsg]);

      } catch (err) {
        console.error('AI Error:', err);
        const errorMsg: ChatMessage = {
             _id: uuidv4(),
             chat_id: 'AI_CHAT',
             sender_id: 'system',
             sender_username: 'System',
             content: "Sorry, I'm having trouble connecting to the AI service right now.",
             timestamp: new Date().toISOString(),
             is_read: true,
             role: MessageRole.System
        };
        setAiMessages(prev => [...prev, errorMsg]);
      } finally {
        setMessageInputDisabled(false);
        isAiThinking.current = false;
      }

    } else {
      // Standard Chat: Emit via Socket
      // The server will broadcast the message back, which we catch in onChatMessage
      socketService.emit('sendMessage', {
        chat_id: activeChatId,
        content: content,
      });
    }
  };

  const handleCreateNewChat = async (userToChatWith: User) => {
    setLoadingChats(true);
    try {
        const response = await chatService.createChat({
            type: 'private',
            participants: [userToChatWith._id]
        });

        if (response.success && response.data) {
            const newChat = response.data;
            setChats(prev => {
                const exists = prev.find(c => c._id === newChat._id);
                if (exists) return prev;
                return [newChat, ...prev];
            });
            setActiveChatId(newChat._id);
            setShowNewChatModal(false);
        } else {
    } catch (err) {
      console.error('AI Error:', err);
      const errorMsg: ChatMessage = {
           _id: uuidv4(),
           chat_id: 'AI_CHAT',
           sender_id: 'system',
           sender_username: 'System',
           content: "Sorry, I'm having trouble connecting to the AI service right now.",
           timestamp: new Date().toISOString(),
           is_read: true,
           role: MessageRole.System
      };
      setAiMessages(prev => [...prev, errorMsg]);
    } finally {
      setMessageInputDisabled(false);
      isAiThinking.current = false;
    }

  } else {
    // Standard Chat: Emit via Socket
    // The server will broadcast the message back, which we catch in onChatMessage
    socketService.emit('sendMessage', {
      chat_id: activeChatId,
      content: content,
    });
  }
};

const handleCreateNewChat = async (userToChatWith: User) => {
  setLoadingChats(true);
  try {
      const response = await chatService.createChat({
          type: 'private',
          participants: [userToChatWith._id]
      });

      if (response.success && response.data) {
          const newChat = response.data;
          setChats(prev => {
              const exists = prev.find(c => c._id === newChat._id);
              if (exists) return prev;
              return [newChat, ...prev];
          });
          setActiveChatId(newChat._id);
          setShowNewChatModal(false);
      } else {
          alert(response.message || 'Failed to create chat');
      }
  } catch (err) {
      console.error(err);
      alert('Error creating chat');
  } finally {
    setLoadingChats(false);
  }
};

return (
  <div className="flex flex-col h-screen bg-gray-100">
    <Header currentUser={currentUser} onLogout={onLogout} />

    <div className="flex flex-1 overflow-hidden">
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        currentUser={currentUser}
        onSelectChat={handleSelectChat}
        onOpenNewChatModal={() => setShowNewChatModal(true)}
      />

      <main className="flex-1 flex flex-col bg-white">
        {activeChatId ? (
          <>
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <ChatWindow
                messages={activeChatId === 'AI_CHAT' ? aiMessages : messages}
                loading={loadingMessages && activeChatId !== 'AI_CHAT'}
                currentUserId={currentUser._id}
              />
            </div>
            <MessageInput
              onSendMessage={handleSendMessage}
              disabled={messageInputDisabled}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-50">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-800">Welcome to ChatPro</h3>
              <p className="text-gray-600">Select a chat from the left or start a new conversation.</p>
            </div>
          </div>
        )}
      </main>
    </div>

    {showNewChatModal && (
      <UserDirectoryModal
        users={allUsers}