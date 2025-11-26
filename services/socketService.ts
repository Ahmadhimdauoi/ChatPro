import { io, Socket } from 'socket.io-client';
import { WS_URL } from '../constants';
import { ChatMessage } from '../types';

/**
 * Manages the Socket.IO client connection for real-time communication.
 */
class SocketService {
  private socket: Socket | null = null;
  private url: string;
  private handlers: {
    onConnect?: () => void;
    onDisconnect?: () => void;
    onMessage?: (message: any) => void; // Generic message handler
    onError?: (error: Error) => void;
    onChatMessage?: (message: ChatMessage) => void; // Specific type for chat messages
  } = {}; // Use a handlers object to manage callbacks

  constructor(url: string = WS_URL) {
    this.url = url;
  }

  // Setter methods for event handlers
  public setOnConnect(handler: (() => void) | undefined) { this.handlers.onConnect = handler; }
  public setOnDisconnect(handler: (() => void) | undefined) { this.handlers.onDisconnect = handler; }
  public setOnMessage(handler: ((message: any) => void) | undefined) { this.handlers.onMessage = handler; }
  public setOnError(handler: ((error: Error) => void) | undefined) { this.handlers.onError = handler; }
  public setOnChatMessage(handler: ((message: ChatMessage) => void) | undefined) { this.handlers.onChatMessage = handler; }

  /**
   * Add event listener for custom events
   */
  public on(event: string, handler: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.on(event, handler);
    }
  }

  /**
   * Remove event listener for custom events
   */
  public off(event: string, handler: (...args: any[]) => void) {
    if (this.socket) {
      this.socket.off(event, handler);
    }
  }

  /**
   * Register a callback for when a chat message is received
   * @param callback The function to call when a chat message is received
   */
  public onMessageReceived(callback: (message: ChatMessage) => void) {
    this.handlers.onChatMessage = callback;
    
    // If socket is already connected, register the listener immediately
    if (this.socket && this.socket.connected) {
      // Remove existing listener to avoid duplicates
      this.socket.off('chatMessage', this.handlers.onChatMessage);
      // Add new listener
      this.socket.on('chatMessage', callback);
      console.log('[SocketService] Registered chatMessage listener on existing connection');
    }
  }

  /**
   * Remove a specific event listener
   * @param event The event name to remove listener for
   * @param callback The callback function to remove
   */
  public removeListener(event: string, callback?: any) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
      console.log(`[SocketService] Removed listener for event: ${event}`);
    }
  }

  /**
   * Remove all chat message listeners
   */
  public removeMessageListeners() {
    if (this.socket && this.handlers.onChatMessage) {
      this.socket.off('chatMessage', this.handlers.onChatMessage);
      console.log('[SocketService] Removed chatMessage listeners');
    }
  }

  /**
   * Establishes a Socket.IO connection.
   * Authentication can be handled here by sending a JWT token.
   * @param token Optional JWT token for authentication.
   */
  public connect(token?: string) {
    if (this.socket && this.socket.connected) {
      console.log('[SocketService] Already connected.');
      return;
    }

    // Connect with auth token if provided
    this.socket = io(this.url, {
      auth: {
        token: token,
      },
      // Optional: reconnection attempts, timeout, etc.
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to Socket.IO server.');
      this.handlers.onConnect?.();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
      this.handlers.onDisconnect?.();
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketService] Connection Error:', err.message);
      this.handlers.onError?.(new Error(`Socket.IO connection error: ${err.message}`));
    });

    // Generic message handler (can be customized for specific events)
    this.socket.on('message', (data: any) => {
      console.log('[SocketService] Received generic message:', data);
      this.handlers.onMessage?.(data);
    });

    // Example specific event listener for chat messages
    this.socket.on('chatMessage', (data: ChatMessage) => { // Type data as ChatMessage
      console.log('[SocketService] Received chat message:', data);
      this.handlers.onChatMessage?.(data);
    });

    // Handle sendMessageError from the backend
    this.socket.on('sendMessageError', (error: { message: string, error?: string }) => {
      console.error('[SocketService] Send Message Error:', error.message, error.error);
      this.handlers.onError?.(new Error(`Send message failed: ${error.message}`));
    });
  }

  /**
   * Removes all event listeners from the socket.
   */
  public removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
      console.log('[SocketService] Removed all event listeners.');
    }
  }

  /**
   * Disconnects the Socket.IO connection.
   */
  public disconnect() {
    if (this.socket) {
      this.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('[SocketService] Disconnected from Socket.IO server.');
    }
  }

  /**
   * Checks if the socket is currently connected.
   * @returns True if connected, false otherwise.
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Emits a Socket.IO event.
   * @param eventName The name of the event to emit.
   * @param data Optional data to send with the event.
   */
  public emit(eventName: string, data?: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventName, data);
    } else {
      console.warn(`[SocketService] Socket not connected. Cannot emit event: ${eventName}`);
      // Optionally, queue events or handle this error more gracefully
    }
  }

  /**
   * Joins a specific chat room on the server.
   * @param chatId The ID of the chat room to join.
   */
  public joinChat(chatId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('joinChat', chatId);
      console.log(`[SocketService] Emitted joinChat for: ${chatId}`);
    } else {
      console.warn(`[SocketService] Socket not connected. Cannot join chat: ${chatId}`);
    }
  }

  /**
   * Leaves a specific chat room on the server.
   * @param chatId The ID of the chat room to leave.
   */
  public leaveChat(chatId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leaveChat', chatId);
      console.log(`[SocketService] Emitted leaveChat for: ${chatId}`);
    } else {
      console.warn(`[SocketService] Socket not connected. Cannot leave chat: ${chatId}`);
    }
  }
}

export const socketService = new SocketService();