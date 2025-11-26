import { API_BASE_URL } from '../constants';
import { User, ApiResponse, JwtPayload, Chat, ChatMessage, ChatParticipant, UnseenMessage, FileAttachment, GroupCreationRequest, AddMembersRequest, AnnouncementRequest, AdminGroup, AnnouncementResponse } from '../types';

/**
 * Generic function for making API requests.
 * @param endpoint The API endpoint (e.g., '/auth/login').
 * @param method HTTP method (e.g., 'POST', 'GET').
 * @param data Optional data to send in the request body.
 * @param requiresAuth Whether the request requires a JWT token.
 * @returns A promise that resolves to the API response data.
 */
const apiRequest = async <T>(
  endpoint: string,
  method: string,
  data?: any,
  requiresAuth: boolean = false
): Promise<ApiResponse<T>> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = localStorage.getItem('jwtToken');
    console.log(' Token from localStorage:', token ? ' Found' : ' Not found');
    console.log(' Token value (first 20 chars):', token ? token.substring(0, 20) + '...' : 'N/A');
    
    if (!token) {
      // For cases where token is missing for authenticated routes
      // You might want to automatically redirect to login or throw a specific error
      console.error('Authentication token not found for a protected route.');
      // Optional: Clear any invalid token and redirect
      localStorage.removeItem('jwtToken');
      // window.location.href = '/login'; // Example redirect
      throw new Error('Authentication token not found. Please log in again.');
    }
    headers['Authorization'] = `Bearer ${token}`;
    console.log(' Authorization header set:', `Bearer ${token.substring(0, 20)}...`);
  }

  const config: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const responseData: ApiResponse<T> = await response.json();

    if (!response.ok) {
      // Handle HTTP errors (e.g., 400, 401, 500)
      throw new Error(responseData.message || `API request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error(`API Error for ${method} ${endpoint}:`, error);
    throw error; // Re-throw to be caught by the calling component
  }
};

/**
 * Service for handling authentication-related API calls.
 */
export const authService = {
  /**
   * Registers a new user.
   * @param userData User registration details (username, email, password, department).
   * @returns A promise that resolves to the API response, including a JWT token on success.
   */
  register: async (userData: Omit<User, '_id' | 'status'> & { password: string }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<{ user: User; token: string }>('/auth/register', 'POST', userData);
  },

  /**
   * Logs in an existing user.
   * @param credentials User login credentials (email, password).
   * @returns A promise that resolves to the API response, including a JWT token on success.
   */
  login: async (credentials: Pick<User, 'email'> & { password: string }): Promise<ApiResponse<{ user: User; token: string }>> => {
    return apiRequest<{ user: User; token: string }>('/auth/login', 'POST', credentials);
  },

  /**
   * Decodes a JWT token to extract its payload.
   * @param token The JWT token string.
   * @returns The decoded payload or null if the token is invalid/malformed.
   */
  decodeToken: (token: string): JwtPayload | null => {
    try {
      // In a real application, you should *not* rely solely on client-side decoding
      // for security-sensitive information or token validation.
      // This is a basic approach for quick client-side access to non-sensitive data.
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  },
};

/**
 * Service for handling user-related API calls.
 */
export const userService = {
  /**
   * Fetches a list of all registered users.
   * @returns A promise that resolves to the API response, containing an array of User objects.
   */
  getUsers: async (): Promise<ApiResponse<User[]>> => {
    return apiRequest<User[]>('/users', 'GET', undefined, true);
  },
  /**
   * Fetches search suggestions/autocomplete
   * @param query The search query
   * @returns A promise that resolves to the API response, containing suggestions
   */
  getSearchSuggestions: async (query: string): Promise<ApiResponse<string[]>> => {
    return apiRequest<string[]>('/search/suggestions', 'GET', undefined, true);
  },
};

/**
 * Service for handling admin-related API calls.
 */
export const adminService = {
  /**
   * Get all users for admin management
   */
  getAllUsers: async (): Promise<ApiResponse<User[]>> => {
    return apiRequest<User[]>('/admin/users', 'GET', undefined, true);
  },

  /**
   * Update user role
   */
  updateUserRole: async (userId: string, role: string): Promise<ApiResponse<{ permissions: any }>> => {
    return apiRequest<{ permissions: any }>(`/admin/users/${userId}/role`, 'PUT', { role }, true);
  },

  /**
   * Delete user
   */
  deleteUser: async (userId: string): Promise<ApiResponse<{ deletedUsername: string }>> => {
    return apiRequest<{ deletedUsername: string }>(`/admin/users/${userId}`, 'DELETE', undefined, true);
  },

  /**
   * Get system analytics
   */
  getAnalytics: async (): Promise<ApiResponse<any>> => {
    return apiRequest<any>('/admin/analytics', 'GET', undefined, true);
  },

  /**
   * Remove member from group
   */
  removeGroupMember: async (chatId: string, userId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/admin/chats/${chatId}/members/${userId}`, 'DELETE', undefined, true);
  },

  /**
   * Get all groups for admin management
   */
  getAllGroups: async (): Promise<ApiResponse<AdminGroup[]>> => {
    return apiRequest<AdminGroup[]>('/admin/groups', 'GET', undefined, true);
  },

  /**
   * Create new group (Admin only)
   */
  createGroup: async (groupData: GroupCreationRequest): Promise<ApiResponse<AdminGroup>> => {
    return apiRequest<AdminGroup>('/admin/groups', 'POST', groupData, true);
  },

  /**
   * Add members to existing group (Admin only)
   */
  addGroupMembers: async (chatId: string, membersData: AddMembersRequest): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/admin/groups/${chatId}/members`, 'POST', membersData, true);
  },

  /**
   * Delete group (Admin only)
   */
  deleteGroup: async (groupId: string): Promise<ApiResponse<any>> => {
    return apiRequest<any>(`/admin/groups/${groupId}`, 'DELETE', undefined, true);
  },

  /**
   * Publish announcement to multiple groups (Admin only)
   */
  publishAnnouncement: async (announcementData: AnnouncementRequest): Promise<ApiResponse<AnnouncementResponse>> => {
    return apiRequest<AnnouncementResponse>('/admin/announce', 'POST', announcementData, true);
  },
};

/**
 * Service for handling file-related API calls.
 */
export const fileService = {
  /**
   * Upload a file to the server.
   * @param file The file to upload.
   * @param onProgress Optional progress callback.
   * @returns A promise that resolves to the API response, containing file info.
   */
  uploadFile: async (file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<FileAttachment>> => {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    // Return a promise that resolves with the response
    return new Promise((resolve, reject) => {
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText) as ApiResponse<FileAttachment>;
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid server response'));
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText) as ApiResponse;
            reject(new Error(errorResponse.message || 'Upload failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      // Set up and send request
      xhr.open('POST', `${API_BASE_URL}/files/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.send(formData);
    });
  },
};

/**
 * Service for handling search-related API calls.
 */
export const searchService = {
  /**
   * Search across chats, messages, and users
   * @param query The search query
   * @param options Optional search options
   * @returns A promise that resolves to the API response, containing search results
   */
  searchContent: async (
    query: string,
    options: {
      type?: 'all' | 'chats' | 'messages' | 'users';
      limit?: number;
      page?: number;
    } = {}
  ): Promise<ApiResponse<{
    query: string;
    results: {
      chats: Chat[];
      messages: ChatMessage[];
      users: User[];
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  }>> => {
    const params = new URLSearchParams({
      q: query,
      type: options.type || 'all',
      limit: (options.limit || 20).toString(),
      page: (options.page || 1).toString()
    });

    return apiRequest(
      `/search?${params.toString()}`,
      'GET',
      undefined,
      true
    );
  },

  /**
   * Get search suggestions/autocomplete
   * @param query The search query
   * @returns A promise that resolves to the API response, containing suggestions
   */
  getSearchSuggestions: async (
    query: string
  ): Promise<ApiResponse<{
    suggestions: Array<{
      type: 'chat' | 'user';
      text: string;
      subtitle: string;
      id: string;
    }>;
  }>> => {
    return apiRequest(
      `/search/suggestions?q=${encodeURIComponent(query)}`,
      'GET',
      undefined,
      true
    );
  },
};

/**
 * Service for handling summary-related API calls.
 */
export const summaryService = {
  /**
   * Generate AI summary of a conversation
   * @param chatId The ID of the chat to summarize
   * @returns A promise that resolves to the API response, containing the summary
   */
  generateConversationSummary: async (chatId: string): Promise<ApiResponse<{ summary: string; messageCount: number; chatId: string }>> => {
    return apiRequest<{ summary: string; messageCount: number; chatId: string }>('/chat/summarize', 'POST', { chatId }, true);
  },
};

/**
 * Service for handling chat-related API calls.
 */
export const chatService = {
  /**
   * Creates a new chat conversation (private or group).
   * @param chatData Data for the new chat (type, name, participants).
   * @returns A promise that resolves to the API response, containing the created Chat object.
   */
  createChat: async (chatData: {
    type: 'private' | 'group';
    name?: string;
    participants: string[]; // Array of User _id strings
  }): Promise<ApiResponse<Chat>> => {
    return apiRequest<Chat>('/chats', 'POST', chatData, true);
  },

  /**
   * Creates a new group chat (Admin only).
   * @param chatData Data for the new group chat (name, participants).
   * @returns A promise that resolves to the API response, containing the created Chat object.
   */
  createGroupChat: async (chatData: {
    name: string;
    participants: string[]; // Array of User _id strings
  }): Promise<ApiResponse<Chat>> => {
    const groupChatData = {
      type: 'group',
      name: chatData.name,
      participants: chatData.participants
    };
    return apiRequest<Chat>('/chats/group', 'POST', groupChatData, true);
  },

  /**
   * Fetches all chat conversations for the authenticated user.
   * @returns A promise that resolves to the API response, containing an array of Chat objects.
   */
  getUserChats: async (): Promise<ApiResponse<Chat[]>> => {
    return apiRequest<Chat[]>('/chats', 'GET', undefined, true);
  },

  /**
   * Fetches all messages for a specific chat.
   * @param chatId The ID of the chat conversation.
   * @returns A promise that resolves to the API response, containing an array of ChatMessage objects.
   */
  getChatMessages: async (chatId: string): Promise<ApiResponse<ChatMessage[]>> => {
    return apiRequest<ChatMessage[]>(`/chats/${chatId}/messages`, 'GET', undefined, true);
  },

  /**
   * Mark messages in a chat as read for the current user.
   * @param chatId The ID of the chat to mark as read.
   * @returns A promise that resolves to the API response.
   */
  markAsRead: async (chatId: string): Promise<ApiResponse<UnseenMessage[]>> => {
    return apiRequest<UnseenMessage[]>('/notifications/markAsRead', 'POST', { chatId }, true);
  },

  /**
   * Get all unseen messages for the current user.
   * @returns A promise that resolves to the API response, containing an array of UnseenMessage objects.
   */
  getUnseenMessages: async (): Promise<ApiResponse<UnseenMessage[]>> => {
    return apiRequest<UnseenMessage[]>('/notifications/unseen', 'GET', undefined, true);
  },
};