const express = require('express');
const router = express.Router();
const { db } = require('../config/fileDB');
const { authenticateToken } = require('../middleware/auth');
const { 
    getAllChapters, 
    getChapterById, 
    createChapter, 
    updateChapter, 
    deleteChapter 
} = require('../controllers/ChapterController');

// Get all chapters (public)
router.get('/', getAllChapters);

// Get a chapter by ID (public)
router.get('/:id', getChapterById);

// Create a chapter (protected)
router.post('/', authenticateToken, createChapter);

// Update a chapter (protected)
router.put('/:id', authenticateToken, updateChapter);

// Delete a chapter (protected)
router.delete('/:id', authenticateToken, deleteChapter);

// Get sections for a chapter (Python algorithm integration)
// Divides content into sections based on ## headers
router.get('/:id/sections', async (req, res) => {
    try {
        const chapterId = req.params.id;
        
        const chapter = db.findById('chapters', chapterId);
        if (!chapter) {
            return res.status(404).json({ error: 'Cours non trouvé' });
        }

        const content = chapter.content || '';
        const sections = [];
        let currentSection = { title: 'Introduction', content: '' };

        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('## ')) {
                if (currentSection.content.trim()) {
                    sections.push(currentSection);
                }
                currentSection = { 
                    title: line.replace('## ', '').trim(), 
                    content: '' 
                };
            } else {
                currentSection.content += line + '\n';
            }
        }

        if (currentSection.content.trim()) {
            sections.push(currentSection);
        }

        res.status(200).json({
            name: chapter.title,
            type: chapter.type || 'course',
            sections: sections,
            total_sections: sections.length
        });
    } catch (error) {
        console.error('Error fetching chapter sections:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Get content items for a chapter (videos, games, images)
router.get('/:id/content', async (req, res) => {
    try {
        const chapterId = req.params.id;
        
        const chapter = db.findById('chapters', chapterId);
        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        // Content items based on chapter
        const contentItems = [
            {
                id: `video-${chapterId}-1`,
                type: 'video',
                title: 'Introduction aux concepts clés',
                description: 'Introduction complète aux idées principales de ce chapitre.',
                url: '#',
                duration: 12,
                chapterId: chapterId,
                difficulty: 'beginner',
                tags: ['introduction', 'concepts']
            },
            {
                id: `game-${chapterId}-1`,
                type: 'game',
                title: 'Résolution interactive',
                description: 'Pratiquez les concepts avec cet exercice interactif.',
                url: '#',
                duration: 15,
                chapterId: chapterId,
                difficulty: 'intermediate',
                tags: ['pratique', 'interactif']
            }
        ];

        res.status(200).json(contentItems);
    } catch (error) {
        console.error('Error fetching chapter content:', error);
        res.status(500).json({ message: 'Error retrieving content data' });
    }
});

module.exports = router;
