const { db } = require('../config/fileDB');

// Get learning tree structure based on chapters and domains
exports.getTree = async (req, res) => {
    try {
        const chapters = db.find('chapters');
        const quizzes = db.find('quizzes');

        // Create tree structure from chapters
        const tree = {
            _id: 'tree-main',
            name: 'Mathématiques',
            ageRanges: [
                {
                    _id: 'range-7-10',
                    range: '7-10',
                    domains: [
                        {
                            _id: 'domain-basics',
                            name: 'Bases des Mathématiques',
                            chapters: chapters.filter(c => c.difficulty === 'beginner').map(chapter => ({
                                ...chapter,
                                quizzes: quizzes.filter(q => q.chapter === chapter._id)
                            }))
                        }
                    ]
                },
                {
                    _id: 'range-11-14',
                    range: '11-14',
                    domains: [
                        {
                            _id: 'domain-math-inter',
                            name: 'Mathématiques Intermédiaires',
                            chapters: chapters.filter(c => c.difficulty !== 'advanced').map(chapter => ({
                                ...chapter,
                                quizzes: quizzes.filter(q => q.chapter === chapter._id)
                            }))
                        }
                    ]
                },
                {
                    _id: 'range-15-18',
                    range: '15-18',
                    domains: [
                        {
                            _id: 'domain-math-advanced',
                            name: 'Mathématiques Lycée',
                            chapters: chapters.map(chapter => ({
                                ...chapter,
                                quizzes: quizzes.filter(q => q.chapter === chapter._id)
                            }))
                        }
                    ]
                }
            ]
        };

        res.status(200).json([tree]);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trees', error: error.message });
    }
};

// Add a tree node (creates a chapter)
exports.addTreeNode = async (req, res) => {
    try {
        const chapter = db.create('chapters', req.body);
        res.status(201).json({ message: 'Tree node created successfully', tree: chapter });
    } catch (error) {
        res.status(500).json({ message: 'Error creating tree node', error: error.message });
    }
};

// Update a tree node (updates a chapter)
exports.updateTreeNode = async (req, res) => {
    try {
        const chapter = db.findByIdAndUpdate('chapters', req.params.id, req.body, { new: true });
        if (!chapter) return res.status(404).json({ message: 'Tree node not found' });
        res.status(200).json({ message: 'Tree node updated successfully', tree: chapter });
    } catch (error) {
        res.status(500).json({ message: 'Error updating tree node', error: error.message });
    }
};

// Delete a tree node (deletes a chapter)
exports.deleteTreeNode = async (req, res) => {
    try {
        const chapter = db.findByIdAndDelete('chapters', req.params.id);
        if (!chapter) return res.status(404).json({ message: 'Tree node not found' });
        res.status(200).json({ message: 'Tree node deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting tree node', error: error.message });
    }
};

// Add a domain to age range (simplified - just returns success)
exports.addDomainToAgeRange = async (req, res) => {
    try {
        res.status(200).json({ message: 'Domain added to age range successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error adding domain to age range', error: error.message });
    }
};

// Remove a domain from age range (simplified - just returns success)
exports.removeDomainFromAgeRange = async (req, res) => {
    try {
        res.status(200).json({ message: 'Domain removed from age range successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error removing domain from age range', error: error.message });
    }
};

