const { db } = require('../config/fileDB');

// Get all mnemonics for the logged-in teacher
exports.getMyMnemonics = async (req, res) => {
    try {
        const userId = req.user.id;
        const mnemonics = db.find('mnemonics').filter(m => m.teacher === userId);
        res.status(200).json(mnemonics);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching mnemonics', error: error.message });
    }
};

// Get a specific mnemonic by ID
exports.getMnemonicById = async (req, res) => {
    try {
        const mnemonic = db.findById('mnemonics', req.params.id);
        if (!mnemonic) {
            return res.status(404).json({ message: 'Mnemonic not found' });
        }
        res.status(200).json(mnemonic);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching mnemonic', error: error.message });
    }
};

// Create a new mnemonic
exports.createMnemonic = async (req, res) => {
    try {
        const { title, content, chapter, category } = req.body;
        const mnemonic = db.create('mnemonics', {
            title,
            content,
            chapter,
            category,
            teacher: req.user.id
        });
        res.status(201).json({ message: 'Mnemonic created successfully', mnemonic });
    } catch (error) {
        res.status(500).json({ message: 'Error creating mnemonic', error: error.message });
    }
};

// Update a mnemonic
exports.updateMnemonic = async (req, res) => {
    try {
        const mnemonic = db.findByIdAndUpdate('mnemonics', req.params.id, req.body, { new: true });
        if (!mnemonic) {
            return res.status(404).json({ message: 'Mnemonic not found' });
        }
        res.status(200).json({ message: 'Mnemonic updated successfully', mnemonic });
    } catch (error) {
        res.status(500).json({ message: 'Error updating mnemonic', error: error.message });
    }
};

// Delete a mnemonic
exports.deleteMnemonic = async (req, res) => {
    try {
        const mnemonic = db.findByIdAndDelete('mnemonics', req.params.id);
        if (!mnemonic) {
            return res.status(404).json({ message: 'Mnemonic not found' });
        }
        res.status(200).json({ message: 'Mnemonic deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting mnemonic', error: error.message });
    }
};
