const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../config/fileDB');
const {
    getAllQuizzes,
    getQuizById,
    getQuizzesByChapter,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    submitQuizAttempt
} = require('../controllers/QuizController');

// Routes
router.get('/', authenticateToken, getAllQuizzes);
router.get('/:id', authenticateToken, getQuizById);
router.get('/chapter/:chapterId', authenticateToken, getQuizzesByChapter);
router.post('/', authenticateToken, createQuiz);
router.put('/:id', authenticateToken, updateQuiz);
router.delete('/:id', authenticateToken, deleteQuiz);
router.post('/:id/attempt', authenticateToken, submitQuizAttempt);

module.exports = router;
