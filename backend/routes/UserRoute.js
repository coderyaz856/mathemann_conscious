const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/fileDB');
const {
    getUsers,
    getUserById,
    updateUser,
    deleteUser,
    getUserRole,
    register
} = require('../controllers/UserController');

// Login route with file-based storage
router.post('/login', async (req, res) => {
    console.log("Login request received:", req.body);
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = db.findOne('users', { email });

        console.log("Found user:", user ? user.name : 'none');

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
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Return complete response
        return res.status(200).json({
            success: true,
            token,
            userRole: user.role,
            userName: user.name,
            userId: user._id,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred during login",
            error: error.message
        });
    }
});

// Profile route
router.get('/profile', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const user = db.findById('users', userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Error fetching profile' });
    }
});

// Get teachers route - for students to find teachers
router.get('/teachers', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const student = db.findById('users', decoded.id);
            
            if (!student || student.role !== 'student') {
                return res.status(403).json({ message: 'Access denied. Student role required.' });
            }

            // Get all teachers
            const teachers = db.find('users', { role: 'teacher' });

            // Remove passwords and add bio
            const teachersWithoutPasswords = teachers.map(teacher => {
                const { password, ...teacherData } = teacher;
                return {
                    ...teacherData,
                    bio: `Experienced educator specializing in Mathematics.`
                };
            });

            return res.status(200).json(teachersWithoutPasswords);
        } catch (error) {
            console.error('JWT verification error:', error);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Error fetching teachers:', error);
        return res.status(500).json({ message: 'Error fetching teachers', error: error.message });
    }
});

// Get students route - for teachers to find students
router.get('/students', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const teacher = db.findById('users', decoded.id);

            if (!teacher || teacher.role !== 'teacher') {
                return res.status(403).json({ message: 'Access denied. Teacher role required.' });
            }

            // Get all students
            const students = db.find('users', { role: 'student' });

            // Remove passwords
            const studentsWithoutPasswords = students.map(student => {
                const { password, ...studentData } = student;
                return studentData;
            });

            return res.status(200).json(studentsWithoutPasswords);
        } catch (error) {
            console.error('JWT verification error:', error);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Error fetching students:', error);
        return res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
});

// Get teachers for a student
router.get('/student/:studentId/teachers', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const student = db.findById('users', studentId);
        
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get all teachers
        const teachers = db.find('users', { role: 'teacher' });
        
        // Remove passwords
        const teachersWithoutPasswords = teachers.map(teacher => {
            const { password, ...teacherData } = teacher;
            return teacherData;
        });

        res.json(teachersWithoutPasswords);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching teachers', error: err.message });
    }
});

// Get students for a teacher
router.get('/teacher/:teacherId/students', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;
        const teacher = db.findById('users', teacherId);
        
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // Get all students
        const students = db.find('users', { role: 'student' });
        
        // Remove passwords
        const studentsWithoutPasswords = students.map(student => {
            const { password, ...studentData } = student;
            return studentData;
        });

        res.json(studentsWithoutPasswords);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching students', error: err.message });
    }
});

// Get students by domain
router.get('/students/domain/:domainId', async (req, res) => {
    try {
        const { domainId } = req.params;
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const teacher = db.findById('users', decoded.id);

            if (!teacher || teacher.role !== 'teacher') {
                return res.status(403).json({ message: 'Access denied. Teacher role required.' });
            }

            // Get all students (simplified - in real app would filter by domain)
            const students = db.find('users', { role: 'student' });
            
            // Remove passwords
            const studentsWithoutPasswords = students.map(student => {
                const { password, ...studentData } = student;
                return studentData;
            });

            return res.status(200).json(studentsWithoutPasswords);
        } catch (error) {
            console.error('JWT verification error:', error);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
    } catch (error) {
        console.error('Error fetching domain students:', error);
        return res.status(500).json({ message: 'Error fetching domain students', error: error.message });
    }
});

// Protected routes (use controller functions)
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.get('/role/:email', getUserRole);
router.post('/register', register);

module.exports = router;
