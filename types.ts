/**
 * Represents the role of a message sender in a chat.
 * Used for client-side display logic.
 */
export enum MessageRole {
  User = 'user',
  OtherUser = 'otherUser', // For messages from other participants
  System = 'system', // For system messages like errors, loading, etc.
  Model = 'model', // For AI messages
}

/**
 * Represents a user in the ChatPro system.
 * Mirrors the User schema from the backend.
 */
export interface User {
  _id: string;
  username: string;
  email: string;
  department: string;
  status: 'active' | 'inactive' | 'offline' | 'online'; // Example statuses
  role: 'Admin' | 'Manager' | 'Employee'; // Enhanced user role system
  permissions: {
    canDeleteUsers: boolean;
    canManageGroups: boolean;
    canViewAnalytics: boolean;
    canGenerateSummaries: boolean;
    canManageChannels: boolean;
  };
  unseenMessages: UnseenMessage[]; // Array of unseen messages
  // Removed isOnline as status from backend is sufficient
}

/**
 * Represents an unseen message notification.
 */
export interface UnseenMessage {
  chatId: string;
  latestMessageContent: string;
  count: number;
  timestamp: string;
}

// Minimal User for populated chat participants
export interface ChatParticipant {
  _id: string;
  username: string;
  status: 'active' | 'inactive' | 'offline' | 'online';
  // email and department are included if needed for display in chat list/directory
  email?: string; 
  department?: string;
}

/**
 * Represents a chat conversation in the ChatPro system.
 * Mirrors the Chat schema from the backend.
 */
export interface Chat {
  _id: string;
  type: 'private' | 'group';
  name?: string; // Optional for private chats, required for groups
  participants: ChatParticipant[]; // Array of populated User objects
  groupAdmin?: ChatParticipant; // Only for group chats - the admin user
  createdAt: string; // ISO Date string
  lastMessage?: ChatMessage; // Optional: last message for chat list preview
  unreadCount?: number; // Optional: number of unread messages
  // New fields for enhanced features
  description?: string;
  isPrivate?: boolean;
  pinnedMessageId?: string | null;
  category?: 'general' | 'marketing' | 'development' | 'sales' | 'hr' | 'project' | 'other';
  tags?: string[];
}

/**
 * Represents a file attachment in a chat message.
 */
export interface FileAttachment {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

/**
 * Represents a single chat message.
 * Aligned with the Message schema from the backend, but also includes
 * a client-side 'role' for rendering purposes.
 */
export interface ChatMessage {
  _id: string; // From backend
  chat_id: string; // Reference to Chat _id
  sender_id: string; // Reference to User _id
  sender_username: string; // Added for display in UI (populated from backend)
  content: string;
  fileAttachment?: FileAttachment; // Optional file attachment
  mentions?: string[]; // Array of mentioned user IDs
  priority?: 'normal' | 'urgent' | 'important'; // Message priority
  messageType?: 'text' | 'file' | 'system' | 'announcement'; // Message type
  timestamp: string; // ISO Date string
  is_read: boolean;
  role: MessageRole; // Client-side specific for display
}

/**
 * Represents a decoded JWT token payload.
 */
export interface JwtPayload {
  userId: string;
  username: string;
  email: string;
  iat: number; // Issued at
  exp: number; // Expiration time
}

// Interface for general API responses (e.g., success/error messages)
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  token?: string; // For login/register responses
}

// Admin-specific interfaces
export interface GroupCreationRequest {
  name: string;
  description?: string;
  participants: string[];
  category?: 'general' | 'marketing' | 'development' | 'sales' | 'hr' | 'project' | 'other';
  tags?: string[];
  isPrivate?: boolean;
}

export interface AddMembersRequest {
  participants: string[];
}

export interface AnnouncementRequest {
  message: string;
  groupIds: string[];
  priority?: 'normal' | 'urgent' | 'important';
  messageType?: 'text' | 'file' | 'system' | 'announcement';
}

export interface AdminGroup extends Chat {
  participantDetails?: ChatParticipant[];
  groupAdminDetails?: ChatParticipant;
}

export interface AnnouncementResult {
  chatId: string;
  chatName: string;
  messageId: string;
}

export interface AnnouncementResponse {
  announcement: string;
  publishedTo: AnnouncementResult[];
  totalRecipients: number;
  sender: string;
  priority: 'normal' | 'urgent' | 'important';
}