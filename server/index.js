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
const { initSocketIO } = require('./services/socketService'); // Import the init function

const app = express();
const server = http.createServer(app); // Create HTTP server from Express app

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: ["http://localhost:8000", "http://localhost:8002", "http://localhost:3000"], // Allow multiple frontend URLs
  credentials: true
})); // Enable CORS for frontend
app.use(express.json()); // Body parser for JSON

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // New: Use user routes
app.use('/api/chats', chatRoutes); // New: Use chat routes

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:8000", "http://localhost:8002", "http://localhost:3000"], // Allow multiple frontend URLs
    methods: ["GET", "POST"],
    credentials: true
  }
});

initSocketIO(io); // Pass the Socket.IO instance to the service

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));