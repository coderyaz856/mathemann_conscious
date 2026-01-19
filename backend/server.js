const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

// Load environment variables from the correct path
dotenv.config({ path: path.join(__dirname, '.env') });

// Initialize file-based database
const { initializeCollections } = require('./config/fileDB');

// Initialize database
initializeCollections();

const app = express();
const server = http.createServer(app);

// Socket mapping - declare before middleware
const userSockets = {};

// Configure Socket.IO
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true
}));
app.use(express.json());

// Attach io instance to request object
app.use((req, res, next) => {
    req.io = io;
    req.userSockets = userSockets;
    console.log(`${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/users', require('./routes/UserRoute'));
app.use('/api/tree', require('./routes/TreeRoute'));
app.use('/api/dashboard', require('./routes/DashboardRoute'));
app.use('/api/chapters', require('./routes/ChapterRoutes'));
app.use('/api/quizzes', require('./routes/QuizRoutes'));
app.use('/api/messages', require('./routes/MessageRoute'));
app.use('/api/mnemonics', require('./routes/MnemonicRoute'));
app.use('/api/meetings', require('./routes/MeetingRequestRoute'));

// Socket.IO Connection Handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (userId) => {
        if (userId) {
            console.log(`User ${userId} joined with socket ${socket.id}`);
            userSockets[userId] = socket.id;
            socket.join(userId);
        }
    });

    socket.on('sendMessage', async (messageData) => {
        const recipientSocketId = userSockets[messageData.recipientId];
        console.log(`Attempting to send message from ${messageData.sender?.name} to user ${messageData.recipientId}`);

        if (recipientSocketId) {
            console.log(`Recipient ${messageData.recipientId} is online. Emitting message.`);
            io.to(messageData.recipientId).emit('receiveMessage', messageData);
        } else {
            console.log(`Recipient ${messageData.recipientId} is offline.`);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        for (const userId in userSockets) {
            if (userSockets[userId] === socket.id) {
                console.log(`User ${userId} disconnected.`);
                delete userSockets[userId];
                break;
            }
        }
    });
});

// Basic route for testing
app.get('/', (req, res) => {
    res.send('Backend is running with file-based storage!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log('Using file-based storage (no MongoDB required)');
}).on('error', (error) => {
    console.error('Error starting server:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use.`);
    }
});
