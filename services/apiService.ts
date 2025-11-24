import { API_BASE_URL } from '../constants';
import { User, ApiResponse, JwtPayload, Chat, ChatMessage, ChatParticipant } from '../types';

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
};