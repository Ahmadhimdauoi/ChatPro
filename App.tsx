import React, { useState, useEffect, useCallback } from 'react';
import { User, JwtPayload, UnseenMessage } from './types';
import { authService } from './services/apiService';
import { socketService } from './services/socketService';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import { WS_URL } from './constants'; // Import WS_URL from constants

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showRegisterScreen, setShowRegisterScreen] = useState(false);
  const [isConnectingSocket, setIsConnectingSocket] = useState(false);
  const [notifications, setNotifications] = useState<UnseenMessage[]>([]);

  // Effect to check for existing token on initial load
  useEffect(() => {
    const loadUserFromToken = async () => {
      setAuthLoading(true);
      const token = localStorage.getItem('jwtToken');
      if (token) {
        const decoded = authService.decodeToken(token);
        if (decoded && decoded.userId) {
          // In a real app, you might want to verify token with backend or fetch user details
          // For now, assume decoded token is sufficient for basic user info.
          // The `authService.login` or `authService.register` would return the full User object.
          // For now, we'll create a dummy user object from the token.
          const dummyUser: User = {
            _id: decoded.userId,
            username: decoded.username,
            email: decoded.email,
            department: 'Unknown', // Placeholder, would come from actual user data
            status: 'online', // Placeholder
            role: 'Employee', // Default role - will be updated on full login
            permissions: {
              canDeleteUsers: false,
              canManageGroups: false,
              canViewAnalytics: false,
              canGenerateSummaries: false,
              canManageChannels: false,
            },
            unseenMessages: [], // Initialize with empty array
          };
          setJwtToken(token);
          setCurrentUser(dummyUser);
          setIsAuthenticated(true);
        } else {
          console.log('Invalid or expired token found, clearing.');
          localStorage.removeItem('jwtToken');
        }
      }
      setAuthLoading(false);
    };

    loadUserFromToken();
  }, []);

  // Effect to manage Socket.IO connection based on authentication
  useEffect(() => {
    if (isAuthenticated && jwtToken && currentUser) {
      console.log('User authenticated, attempting to connect Socket.IO...');
      setIsConnectingSocket(true);
      socketService.connect(jwtToken);

      // Optional: Add listeners for socket events like messages, user status etc.
      socketService.setOnConnect(() => {
        console.log('Socket.IO Connected!');
        setIsConnectingSocket(false);
      });
      socketService.setOnDisconnect(() => console.log('Socket.IO Disconnected!'));
      socketService.setOnError((err) => {
        console.error('Socket.IO error:', err);
        setAuthError(`Socket connection error: ${err.message}`);
        setIsConnectingSocket(false);
      });
      // Example of handling a chat message received via socket
      // socketService.onChatMessage = (message) => {
      //   console.log('Received chat message:', message);
      //   // Update chat window with new message
      // };

    } else if (!isAuthenticated && socketService.isConnected()) {
      console.log('User unauthenticated, disconnecting Socket.IO...');
      socketService.disconnect();
    }

    return () => {
      // Clean up socket connection on component unmount or auth change
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [isAuthenticated, jwtToken, currentUser]); // Re-run when auth state changes

  const handleLogin = useCallback(async (email: string, password: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authService.login({ email, password });
      if (response.success && response.data?.token && response.data?.user) {
        localStorage.setItem('jwtToken', response.data.token);
        setJwtToken(response.data.token);
        setCurrentUser(response.data.user);
        setIsAuthenticated(true);
        setShowRegisterScreen(false); // Ensure login screen is not shown
      } else {
        setAuthError(response.message || 'Login failed.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (username: string, email: string, password: string, department: string) => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const response = await authService.register({ 
        username, 
        email, 
        password, 
        department,
        role: 'Employee', // Default role for new users
        permissions: {
          canDeleteUsers: false,
          canManageGroups: false,
          canViewAnalytics: false,
          canGenerateSummaries: false,
          canManageChannels: false,
        },
        unseenMessages: [] // Initialize with empty array
      });
      if (response.success && response.data?.token && response.data?.user) {
        localStorage.setItem('jwtToken', response.data.token);
        setJwtToken(response.data.token);
        setCurrentUser(response.data.user);
        setIsAuthenticated(true);
        setShowRegisterScreen(false); // After successful registration, log them in
      } else {
        setAuthError(response.message || 'Registration failed.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('jwtToken');
    setJwtToken(null);
    setCurrentUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setShowRegisterScreen(false); // Go back to login screen
    // Socket.IO disconnection is handled by the useEffect cleanup
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary to-secondary">
        <div className="text-white text-2xl animate-pulse">Loading Application...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (showRegisterScreen) {
      return (
        <RegisterScreen
          onRegister={handleRegister}
          onShowLogin={() => setShowRegisterScreen(false)}
          loading={authLoading}
          error={authError}
        />
      );
    } else {
      return (
        <LoginScreen
          onLogin={handleLogin}
          onShowRegister={() => setShowRegisterScreen(true)}
          loading={authLoading}
          error={authError}
        />
      );
    }
  }

  return (
    <DashboardScreen
      currentUser={currentUser}
      onLogout={handleLogout}
      notifications={notifications}
      setNotifications={setNotifications}
    />
  );
};

export default App;