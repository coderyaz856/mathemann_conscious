const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/fileDB');
const { authenticateToken } = require('../middleware/authMiddleware');

// Helper function to calculate age
const calculateAge = (birthday) => {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const calculateStudyHours = (studies) => {
    if (!studies || studies.length === 0) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const currentMonthStudies = studies.filter(study => {
        const studyDate = new Date(study.session_start);
        return studyDate.getMonth() === currentMonth && studyDate.getFullYear() === currentYear;
    });
    
    return currentMonthStudies.length;
};

const calculateActiveStreak = (studies) => {
    if (!studies || studies.length === 0) return 0;
    
    const sortedStudies = [...studies].sort((a, b) => 
        new Date(b.session_start) - new Date(a.session_start)
    );
    
    const studyDates = new Set();
    sortedStudies.forEach(study => {
        const date = new Date(study.session_start);
        studyDates.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    
    const dateArray = Array.from(studyDates).map(dateStr => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month, day);
    }).sort((a, b) => b - a);
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentDate = dateArray[0] > today ? dateArray[0] : today;
    
    for (const date of dateArray) {
        const daysDiff = Math.floor((currentDate - date) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 1) {
            if (daysDiff === 1) streak++;
            else if (daysDiff === 0 && streak === 0) streak = 1;
            currentDate = date;
        } else {
            break;
        }
    }
    
    return streak;
};

const calculateQuizAverage = (quizAttempts) => {
    if (!quizAttempts || quizAttempts.length === 0) return 0;
    const totalScore = quizAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
    return Math.round(totalScore / quizAttempts.length);
};

// GET route for student dashboard
router.get('/student', authenticateToken, async (req, res) => {
    try {
        const user = db.findById('users', req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({ message: 'Not authorized as student' });
        }

        const age = calculateAge(user.birthday);
        const chapters = db.find('chapters');
        const quizzes = db.find('quizzes');

        // Populate studies with chapter details
        const studiesWithChapters = (user.studies || []).map(study => {
            const chapter = chapters.find(c => c._id === study.chapter);
            return { ...study, chapter };
        });

        // Populate quiz attempts with quiz details
        const quizAttemptsWithDetails = (user.quizAttempts || []).map(attempt => {
            const quiz = quizzes.find(q => q._id === attempt.quiz);
            return { ...attempt, quiz };
        });

        // Create age-appropriate domains
        let domains = [];
        if (age >= 11 && age <= 14) {
            domains = chapters.filter(c => c.difficulty === 'beginner' || c.difficulty === 'intermediate');
        } else if (age >= 15 && age <= 18) {
            domains = chapters;
        } else {
            domains = chapters.filter(c => c.difficulty === 'beginner');
        }

        // Format domains with chapters and quizzes
        const formattedDomains = [
            {
                _id: 'domain-math',
                name: 'Mathématiques',
                chapters: chapters.map(chapter => ({
                    ...chapter,
                    quizzes: quizzes.filter(q => q.chapter === chapter._id)
                }))
            }
        ];

        const stats = {
            totalSessions: user.studies?.length || 0,
            uniqueChapters: user.studies ? [...new Set(user.studies.map(s => s.chapter))].length : 0,
            lastStudySession: user.studies?.length > 0 ? user.studies[user.studies.length - 1].session_start : null,
            studyHoursThisMonth: calculateStudyHours(user.studies || []),
            activeStreak: calculateActiveStreak(user.studies || []),
            quizAttempts: user.quizAttempts?.length || 0,
            quizAvgScore: calculateQuizAverage(user.quizAttempts || [])
        };

        const response = {
            studentName: user.name,
            studentAge: age,
            range: age >= 11 && age <= 14 ? '11-14' : (age >= 15 && age <= 18 ? '15-18' : '7-10'),
            domains: formattedDomains,
            stats,
            studies: studiesWithChapters,
            quizAttempts: quizAttemptsWithDetails
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ 
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
});

// Get teachers for a student
router.get('/student/teachers', authenticateToken, async (req, res) => {
    try {
        const teachers = db.find('users', { role: 'teacher' });
        const safeTeachers = teachers.map(t => ({
            _id: t._id,
            name: t.name,
            email: t.email,
            bio: 'Enseignant expérimenté en mathématiques.'
        }));
        res.status(200).json(safeTeachers);
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ message: 'Error fetching teachers data', error: error.message });
    }
});

// POST route for recording study sessions
router.post('/student/study', authenticateToken, async (req, res) => {
    try {
        const { chapterId } = req.body;
        const userId = req.user.id;

        console.log(`Recording study session for user ${userId}, chapter ${chapterId}`);

        const user = db.findById('users', userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can record study sessions' });
        }

        // Add study session
        db.findByIdAndUpdate('users', userId, {
            $push: {
                studies: {
                    chapter: chapterId,
                    session_start: new Date().toISOString()
                }
            }
        });

        res.status(200).json({ message: 'Study session recorded successfully' });
    } catch (error) {
        console.error('Error recording study session:', error);
        res.status(500).json({ message: 'Error recording study session', error: error.message });
    }
});

// GET teacher dashboard
router.get('/teacher', authenticateToken, async (req, res) => {
    try {
        const user = db.findById('users', req.user.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'teacher') {
            return res.status(403).json({ message: 'Not authorized as teacher' });
        }

        const students = db.find('users', { role: 'student' });
        const chapters = db.find('chapters');
        const quizzes = db.find('quizzes');

        // Calculate stats for each student
        const studentsWithStats = students.map(student => ({
            _id: student._id,
            name: student.name,
            email: student.email,
            age: calculateAge(student.birthday),
            totalSessions: student.studies?.length || 0,
            quizAttempts: student.quizAttempts?.length || 0,
            avgScore: calculateQuizAverage(student.quizAttempts || []),
            lastActive: student.studies?.length > 0 
                ? student.studies[student.studies.length - 1].session_start 
                : null
        }));

        res.status(200).json({
            teacherName: user.name,
            students: studentsWithStats,
            totalStudents: students.length,
            chapters: chapters.length,
            quizzes: quizzes.length
        });
    } catch (error) {
        console.error('Teacher dashboard error:', error);
        res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
    }
});

module.exports = router;
