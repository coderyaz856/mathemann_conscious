const { db, generateId } = require('../config/fileDB');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new user
exports.register = async (req, res) => {
    const { name, email, password, role, birthday } = req.body;

    if (!name || !email || !password || !role || !birthday) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = db.findOne('users', { email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = db.create('users', {
            name,
            email,
            password: hashedPassword,
            role,
            birthday,
            studies: [],
            quizAttempts: []
        });

        console.log('User saved successfully:', newUser._id);

        const token = jwt.sign(
            { id: newUser._id, role: newUser.role, name: newUser.name, email: newUser.email },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '24h' }
        );

        res.status(201).json({ message: "User registered successfully", token });
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({ message: "Error registering user", error: error.message });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const user = db.findOne('users', { email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role, 
                email: user.email,
                name: user.name,
                birthday: user.birthday 
            },
            process.env.JWT_SECRET || 'fallback_secret_key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                role: user.role,
                name: user.name,
                email: user.email,
                birthday: user.birthday
            }
        });
    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).json({ message: "An error occurred during login" });
    }
};

// Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = db.find('users');
        // Remove passwords from response
        const safeUsers = users.map(u => ({ ...u, password: undefined }));
        res.status(200).json(safeUsers);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

// Get all students (for teacher dashboard)
exports.getAllStudents = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const teacher = db.findById('users', userId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ message: 'Access denied. Only teachers can view student lists.' });
        }
        
        const students = db.find('users', { role: 'student' });
        const safeStudents = students.map(s => ({
            _id: s._id,
            name: s.name,
            email: s.email,
            birthday: s.birthday,
            studies: s.studies || [],
            quizAttempts: s.quizAttempts || []
        }));
            
        res.status(200).json(safeStudents);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ 
            message: 'Error fetching students', 
            error: error.message 
        });
    }
};

// Get user by ID
exports.getUserById = async (req, res) => {
    const { id } = req.params;

    try {
        const user = db.findById('users', id);
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password, ...safeUser } = user;
        res.status(200).json(safeUser);
    } catch (error) {
        res.status(500).json({ message: "Error fetching user", error: error.message });
    }
};

// Update a user
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    try {
        const user = db.findByIdAndUpdate('users', id, updates, { new: true });
        if (!user) return res.status(404).json({ message: "User not found" });
        const { password, ...safeUser } = user;
        res.status(200).json({ message: "User updated successfully", user: safeUser });
    } catch (error) {
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
};

// Delete a user
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = db.findByIdAndDelete('users', id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};

// Fetch user role by email
exports.getUserRole = async (req, res) => {
    const { email } = req.params;

    try {
        const user = db.findOne('users', { email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ role: user.role });
    } catch (error) {
        console.error("Error fetching user role:", error);
        res.status(500).json({ message: "Error fetching user role" });
    }
};

// Add new getProfile method
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = db.findById('users', userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Get chapter details for studies
        const chapters = db.find('chapters');
        const studiesWithChapters = (user.studies || []).map(study => {
            const chapter = chapters.find(c => c._id === study.chapter);
            return { ...study, chapter };
        });

        // Format the response
        const profile = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            birthday: user.birthday,
            studies: studiesWithChapters,
            joinedDate: user.createdAt,
            lastActive: new Date()
        };

        res.status(200).json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: "Error fetching profile data" });
    }
};

// Add profile update method
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, currentPassword, newPassword } = req.body;

        const user = db.findById('users', userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const updates = {};

        // If updating password, verify current password
        if (currentPassword && newPassword) {
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            updates.password = await bcrypt.hash(newPassword, 10);
        }

        // Update other fields
        if (name) updates.name = name;
        if (email) {
            // Check if email is already in use by another user
            const users = db.find('users');
            const existingUser = users.find(u => u.email === email && u._id !== userId);
            if (existingUser) {
                return res.status(400).json({ message: "Email already in use" });
            }
            updates.email = email;
        }

        const updatedUser = db.findByIdAndUpdate('users', userId, updates, { new: true });
        const { password, ...safeUser } = updatedUser;
        res.status(200).json(safeUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: "Error updating profile" });
    }
};

