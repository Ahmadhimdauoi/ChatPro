const dotenv = require('dotenv');
dotenv.config(); // Load environment variables first

const express = require('express');
const http = require('http'); // Required for Socket.IO
const { Server } = require('socket.io'); // Socket.IO Server
const cors = require('cors');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes'); // New: Import user routes
const chatRoutes = require('./routes/chatRoutes'); // New: Import chat routes
const notificationRoutes = require('./routes/notificationRoutes'); // New: Import notification routes
const fileRoutes = require('./routes/fileRoutes'); // New: Import file routes
const summaryRoutes = require('./routes/summaryRoutes'); // New: Import summary routes
const searchRoutes = require('./routes/searchRoutes'); // New: Import search routes
const adminRoutes = require('./routes/adminRoutes'); // New: Import admin routes
const { initSocketIO } = require('./services/socketService'); // Import the init function

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: ["http://localhost:8000", "http://localhost:8001", "http://localhost:8002", "http://localhost:3000"], // Allow multiple frontend URLs
  credentials: true
})); // Enable CORS for frontend
app.use(express.json()); // Body parser for JSON

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // New: Use user routes
app.use('/api/chats', chatRoutes); // New: Use chat routes
app.use('/api/chat', summaryRoutes); // New: Use summary routes for /api/chat/summarize
app.use('/api/notifications', notificationRoutes); // New: Use notification routes
app.use('/api/files', fileRoutes); // New: Use file routes
app.use('/api/summary', summaryRoutes); // New: Use summary routes
app.use('/api/search', searchRoutes); // New: Use search routes
app.use('/api/admin', adminRoutes); // New: Use admin routes

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8000", "http://localhost:8001", "http://localhost:8002", "http://localhost:3000"], // Allow multiple frontend URLs
    methods: ["GET", "POST"],
    credentials: true
  }
});

initSocketIO(io); // Pass the Socket.IO instance to the service

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));