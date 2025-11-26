import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from '../components/Header';
import ChatListEnhanced from '../components/ChatListEnhanced';
import ChatWindowEnhanced from '../components/ChatWindowEnhanced';
import MessageInput from '../components/MessageInput';
import UserDirectoryModal from '../components/UserDirectoryModal';
import GroupChatModal from '../components/GroupChatModal';
import { User, Chat, ChatMessage, MessageRole, UnseenMessage, FileAttachment } from '../types';
import { chatService, userService } from '../services/apiService';
import { socketService } from '../services/socketService';
import { generateGeminiContent } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';

interface DashboardScreenProps {
  currentUser: User;
  onLogout: () => void;
  notifications: UnseenMessage[];
  setNotifications: React.Dispatch<React.SetStateAction<UnseenMessage[]>>;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ currentUser, onLogout, notifications, setNotifications }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [messageInputDisabled, setMessageInputDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupChatModal, setShowGroupChatModal] = useState(false);

  const activeChatIdRef = useRef<string | null>(null);
  const isAiThinking = useRef(false);

  // Fetch user chats
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

  // Fetch all users
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

  // Fetch messages for active chat
  useEffect(() => {
    const fetchMessages = async () => {
      if (activeChatId === 'AI_CHAT') {
        setLoadingMessages(false);
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
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      setError(null);
      try {
        const response = await chatService.getChatMessages(activeChatId);
        if (response.success && response.data) {
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

  // Socket.IO integration
  useEffect(() => {
    if (!socketService.isConnected()) return;

    // Leave previous room if exists
    if (activeChatIdRef.current && activeChatIdRef.current !== 'AI_CHAT') {
      socketService.leaveChat(activeChatIdRef.current);
    }

    // Update ref and join new room
    activeChatIdRef.current = activeChatId;
    if (activeChatId && activeChatId !== 'AI_CHAT') {
      socketService.joinChat(activeChatId);
    }
    
    return () => {
       if (activeChatIdRef.current && activeChatIdRef.current !== 'AI_CHAT') {
         socketService.leaveChat(activeChatIdRef.current);
       }
    };
  }, [activeChatId]);

  useEffect(() => {
     if (!socketService.isConnected()) return;
     
     const handleChatMessage = (newMessage: ChatMessage) => {
        console.log('Received chat message:', newMessage);
        console.log('Active chat ID:', activeChatIdRef.current);
        console.log('Message chat ID:', newMessage.chat_id);
        
        const msgWithRole = {
            ...newMessage,
            sender_username: newMessage.sender_id === currentUser._id ? currentUser.username : newMessage.sender_username,
            role: newMessage.sender_id === currentUser._id ? MessageRole.User : MessageRole.OtherUser
        };

        // Always try string comparison to avoid type issues
        const isActiveChat = activeChatIdRef.current?.toString() === newMessage.chat_id?.toString();
        
        if (isActiveChat) {
            setMessages((prevMessages) => {
                // Check if message already exists to avoid duplicates
                if (prevMessages.some(m => m._id === msgWithRole._id)) {
                    return prevMessages;
                }
                return [...prevMessages, msgWithRole];
            });
        }

        setChats((prevChats) => {
            return prevChats.map(chat => {
                if (chat._id === newMessage.chat_id) {
                    return {
                        ...chat,
                        lastMessage: msgWithRole,
                        unreadCount: (activeChatIdRef.current !== chat._id) 
                            ? (chat.unreadCount || 0) + 1 
                            : 0
                    };
                }
                return chat;
            }).sort((a, b) => {
                if (a._id === newMessage.chat_id) return -1;
                if (b._id === newMessage.chat_id) return 1;
                return 0;
            });
        });
     };
     
     console.log('Setting up chat message handler');
     socketService.onMessageReceived(handleChatMessage);

     // Set up notification listener
     const handleNotificationReceived = (notification: {
       chatId: string;
       message: ChatMessage;
       senderUsername: string;
       timestamp: Date;
     }) => {
       console.log('Received notification:', notification);
       
       // Add to notifications state
       setNotifications(prev => {
         const existingNotification = prev.find(n => n.chatId === notification.chatId);
         if (existingNotification) {
           // Update existing notification
           return prev.map(n => 
             n.chatId === notification.chatId 
               ? {
                   ...n,
                   latestMessageContent: notification.message.content,
                   count: n.count + 1,
                   timestamp: notification.timestamp.toISOString()
                 }
               : n
           );
         } else {
           // Add new notification
           const newNotification: UnseenMessage = {
             chatId: notification.chatId,
             latestMessageContent: notification.message.content,
             count: 1,
             timestamp: notification.timestamp.toISOString()
           };
           return [newNotification, ...prev];
         }
       });
     };

     // Set up notification listener in socket service
     socketService.on('notificationReceived', handleNotificationReceived);

     return () => {
         console.log('Cleaning up chat message handler');
         socketService.removeMessageListeners();
         // Clean up notification listener
         socketService.off('notificationReceived', handleNotificationReceived);
     };
  }, [currentUser._id, currentUser.username, setNotifications]);

  const handleSelectChat = async (chatId: string) => {
    setActiveChatId(chatId);
    activeChatIdRef.current = chatId; // Update ref immediately
    
    // Mark messages as read when selecting a chat (except AI chat)
    if (chatId !== 'AI_CHAT') {
      try {
        await chatService.markAsRead(chatId);
        // Remove notifications for this chat from local state
        setNotifications(prev => prev.filter(n => n.chatId !== chatId));
        console.log('Marked chat as read:', chatId);
      } catch (error) {
        console.error('Error marking chat as read:', error);
      }
    }
  };

  const handleSendMessage = async (content: string, fileAttachment?: FileAttachment) => {
    if (!activeChatId) return;

    console.log('Sending message:', content);
    console.log('Active chat ID:', activeChatId);
    console.log('File attachment:', fileAttachment);

    if (activeChatId === 'AI_CHAT') {
      if (isAiThinking.current) return;
      isAiThinking.current = true;
      setMessageInputDisabled(true);

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
      socketService.emit('sendMessage', {
        chat_id: activeChatId,
        content: content,
        fileAttachment: fileAttachment,
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

  const handleCreateGroupChat = async (groupName: string, participantIds: string[]) => {
    setLoadingChats(true);
    try {
        const response = await chatService.createGroupChat({
            name: groupName,
            participants: participantIds
        });

        if (response.success && response.data) {
            const newChat = response.data;
            setChats(prev => {
                const exists = prev.find(c => c._id === newChat._id);
                if (exists) return prev;
                return [newChat, ...prev];
            });
            setActiveChatId(newChat._id);
            setShowGroupChatModal(false);
        } else {
            alert(response.message || 'Failed to create group chat');
        }
    } catch (err) {
        console.error(err);
        alert('Error creating group chat');
    } finally {
        setLoadingChats(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header currentUser={currentUser} onLogout={onLogout} />

      <div className="flex flex-1 overflow-hidden">
        <ChatListEnhanced
          chats={chats}
          selectedChatId={activeChatId}
          currentUserId={currentUser._id}
          onChatSelect={handleSelectChat}
        />

        <main className="flex-1 flex flex-col bg-white">
          {activeChatId ? (
            <>
              <div className="flex-1 overflow-hidden relative flex flex-col">
                <ChatWindowEnhanced
                  messages={activeChatId === 'AI_CHAT' ? aiMessages : messages}
                  loading={loadingMessages && activeChatId !== 'AI_CHAT'}
                  currentUserId={currentUser._id}
                  chatId={activeChatId === 'AI_CHAT' ? undefined : activeChatId}
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
          currentUser={currentUser}
          onSelectUser={handleCreateNewChat}
          onClose={() => setShowNewChatModal(false)}
          loading={loadingUsers}
        />
      )}

      {showGroupChatModal && (
        <GroupChatModal
          isOpen={showGroupChatModal}
          onClose={() => setShowGroupChatModal(false)}
          currentUser={currentUser}
          allUsers={allUsers}
          onCreateGroup={handleCreateGroupChat}
          loading={loadingChats}
        />
      )}
    </div>
  );
};

export default DashboardScreen;
