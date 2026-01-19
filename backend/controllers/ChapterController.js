const { db } = require('../config/fileDB');

// Get all chapters
exports.getAllChapters = async (req, res) => {
    try {
        const chapters = db.find('chapters');
        res.status(200).json(chapters);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching chapters', error: error.message });
    }
};

// Get a chapter by ID
exports.getChapterById = async (req, res) => {
    try {
        const chapterId = req.params.id;
        const chapter = db.findById('chapters', chapterId);

        if (!chapter) {
            return res.status(404).json({ message: 'Chapter not found' });
        }

        // Populate quizzes
        const quizzes = db.find('quizzes', { chapter: chapterId });
        const chapterWithQuizzes = { ...chapter, quizzes };

        res.status(200).json(chapterWithQuizzes);
    } catch (error) {
        console.error('Error fetching chapter:', error);
        res.status(500).json({ message: 'Error retrieving chapter data' });
    }
};

// Create a chapter
exports.createChapter = async (req, res) => {
    try {
        const chapter = db.create('chapters', req.body);
        res.status(201).json({ message: 'Chapter created successfully', chapter });
    } catch (error) {
        res.status(500).json({ message: 'Error creating chapter', error: error.message });
    }
};

// Update a chapter
exports.updateChapter = async (req, res) => {
    try {
        const chapter = db.findByIdAndUpdate('chapters', req.params.id, req.body, { new: true });
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
        res.status(200).json({ message: 'Chapter updated successfully', chapter });
    } catch (error) {
        res.status(500).json({ message: 'Error updating chapter', error: error.message });
    }
};

// Delete a chapter
exports.deleteChapter = async (req, res) => {
    try {
        const chapter = db.findByIdAndDelete('chapters', req.params.id);
        if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
        res.status(200).json({ message: 'Chapter deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting chapter', error: error.message });
    }
};
