const { db, generateId } = require('../config/fileDB');

// Helper function to get or create a conversation between two users
const getOrCreateConversation = (userId1, userId2) => {
    const participants = [userId1, userId2].sort();
    
    let conversation = db.find('conversations').find(c => 
        c.participants.length === 2 &&
        c.participants.includes(participants[0]) &&
        c.participants.includes(participants[1])
    );

    if (!conversation) {
        conversation = db.create('conversations', { 
            participants,
            lastMessage: null
        });
    }
    return conversation;
};

// Get all conversations for the logged-in user
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user.id;
        const allConversations = db.find('conversations');
        const users = db.find('users');
        const messages = db.find('messages');
        
        const userConversations = allConversations
            .filter(c => c.participants.includes(userId))
            .map(conv => {
                // Populate participants
                const populatedParticipants = conv.participants.map(pId => {
                    const user = users.find(u => u._id === pId);
                    return user ? { _id: user._id, name: user.name, email: user.email, role: user.role } : null;
                }).filter(Boolean);

                // Get last message
                const lastMsg = messages
                    .filter(m => m.conversationId === conv._id)
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

                return {
                    ...conv,
                    participants: populatedParticipants,
                    lastMessage: lastMsg || null
                };
            })
            .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        res.status(200).json(userConversations);
    } catch (error) {
        console.error("Error fetching conversations:", error);
        res.status(500).json({ message: 'Error fetching conversations', error: error.message });
    }
};

// Get messages for a specific conversation
exports.getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        const conversation = db.findById('conversations', conversationId);
        if (!conversation || !conversation.participants.includes(userId)) {
            return res.status(403).json({ message: 'Access denied to this conversation' });
        }

        const allMessages = db.find('messages');
        const users = db.find('users');
        
        const messages = allMessages
            .filter(m => m.conversationId === conversationId)
            .map(msg => {
                const sender = users.find(u => u._id === msg.sender);
                return {
                    ...msg,
                    sender: sender ? { _id: sender._id, name: sender.name, role: sender.role } : null
                };
            })
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        // Mark messages as read
        messages.forEach(msg => {
            if (msg.recipient === userId && !msg.read) {
                db.findByIdAndUpdate('messages', msg._id, { read: true });
            }
        });

        res.status(200).json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
};

// Send a new message
exports.sendMessage = async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.user.id;
        const io = req.io;
        const userSockets = req.userSockets;

        if (!recipientId || !content) {
            return res.status(400).json({ message: 'Recipient ID and content are required' });
        }
        
        const recipient = db.findById('users', recipientId);
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient user not found' });
        }

        const conversation = getOrCreateConversation(senderId, recipientId);

        const newMessage = db.create('messages', {
            conversationId: conversation._id,
            sender: senderId,
            recipient: recipientId,
            content,
            read: false
        });

        // Update conversation
        db.findByIdAndUpdate('conversations', conversation._id, {
            lastMessage: newMessage._id,
            updatedAt: new Date().toISOString()
        });
        
        // Populate sender for response
        const sender = db.findById('users', senderId);
        const populatedMessage = {
            ...newMessage,
            sender: sender ? { _id: sender._id, name: sender.name, role: sender.role } : null
        };

        // Emit to recipient if online
        if (userSockets && userSockets[recipientId]) {
            io.to(userSockets[recipientId]).emit('receiveMessage', populatedMessage);
        }

        res.status(201).json(populatedMessage);
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

// Get unread message count
exports.getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = db.find('messages');
        const unreadCount = messages.filter(m => m.recipient === userId && !m.read).length;
        res.status(200).json({ count: unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count', error: error.message });
    }
};
