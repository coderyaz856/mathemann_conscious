const fs = require('fs');
const path = require('path');

// Base path for all data files
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Database collections - each collection is stored as a JSON file
const COLLECTIONS = {
    users: path.join(DATA_DIR, 'users.json'),
    chapters: path.join(DATA_DIR, 'chapters.json'),
    quizzes: path.join(DATA_DIR, 'quizzes.json'),
    messages: path.join(DATA_DIR, 'messages.json'),
    conversations: path.join(DATA_DIR, 'conversations.json'),
    meetingRequests: path.join(DATA_DIR, 'meetingRequests.json'),
    mnemonics: path.join(DATA_DIR, 'mnemonics.json'),
    notifications: path.join(DATA_DIR, 'notifications.json')
};

// Initialize empty collection files if they don't exist
const initializeCollections = () => {
    Object.values(COLLECTIONS).forEach(filePath => {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        }
    });
    console.log('File-based database initialized');
};

// Read a collection
const readCollection = (collectionName) => {
    const filePath = COLLECTIONS[collectionName];
    if (!filePath) {
        throw new Error(`Unknown collection: ${collectionName}`);
    }
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${collectionName}:`, error);
        return [];
    }
};

// Write to a collection
const writeCollection = (collectionName, data) => {
    const filePath = COLLECTIONS[collectionName];
    if (!filePath) {
        throw new Error(`Unknown collection: ${collectionName}`);
    }
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${collectionName}:`, error);
        return false;
    }
};

// Generate a unique ID (simple UUID-like)
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Generic CRUD operations
const db = {
    // Find all documents in a collection
    find: (collectionName, filter = {}) => {
        const data = readCollection(collectionName);
        if (Object.keys(filter).length === 0) {
            return data;
        }
        return data.filter(item => {
            return Object.keys(filter).every(key => item[key] === filter[key]);
        });
    },

    // Find one document
    findOne: (collectionName, filter) => {
        const data = readCollection(collectionName);
        return data.find(item => {
            return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
    },

    // Find by ID
    findById: (collectionName, id) => {
        const data = readCollection(collectionName);
        return data.find(item => item._id === id || item.id === id) || null;
    },

    // Check if document exists
    exists: (collectionName, filter) => {
        return db.findOne(collectionName, filter) !== null;
    },

    // Create a new document
    create: (collectionName, document) => {
        const data = readCollection(collectionName);
        const newDoc = {
            _id: generateId(),
            ...document,
            createdAt: new Date().toISOString()
        };
        data.push(newDoc);
        writeCollection(collectionName, data);
        return newDoc;
    },

    // Update a document by ID
    findByIdAndUpdate: (collectionName, id, update, options = {}) => {
        const data = readCollection(collectionName);
        const index = data.findIndex(item => item._id === id || item.id === id);
        if (index === -1) return null;
        
        // Handle $push operator
        if (update.$push) {
            Object.keys(update.$push).forEach(key => {
                if (!data[index][key]) data[index][key] = [];
                data[index][key].push(update.$push[key]);
            });
        } else {
            data[index] = { ...data[index], ...update, updatedAt: new Date().toISOString() };
        }
        
        writeCollection(collectionName, data);
        return options.new ? data[index] : data[index];
    },

    // Update one document matching filter
    findOneAndUpdate: (collectionName, filter, update, options = {}) => {
        const data = readCollection(collectionName);
        const index = data.findIndex(item => {
            return Object.keys(filter).every(key => item[key] === filter[key]);
        });
        if (index === -1) return null;
        
        // Handle $push operator
        if (update.$push) {
            Object.keys(update.$push).forEach(key => {
                if (!data[index][key]) data[index][key] = [];
                data[index][key].push(update.$push[key]);
            });
        } else {
            data[index] = { ...data[index], ...update, updatedAt: new Date().toISOString() };
        }
        
        writeCollection(collectionName, data);
        return options.new ? data[index] : data[index];
    },

    // Delete a document by ID
    findByIdAndDelete: (collectionName, id) => {
        const data = readCollection(collectionName);
        const index = data.findIndex(item => item._id === id || item.id === id);
        if (index === -1) return null;
        
        const deleted = data.splice(index, 1)[0];
        writeCollection(collectionName, data);
        return deleted;
    },

    // Delete many documents
    deleteMany: (collectionName, filter = {}) => {
        let data = readCollection(collectionName);
        const initialLength = data.length;
        
        if (Object.keys(filter).length > 0) {
            data = data.filter(item => {
                return !Object.keys(filter).every(key => item[key] === filter[key]);
            });
        } else {
            data = [];
        }
        
        writeCollection(collectionName, data);
        return { deletedCount: initialLength - data.length };
    },

    // Save a document (update or create)
    save: (collectionName, document) => {
        if (document._id) {
            return db.findByIdAndUpdate(collectionName, document._id, document, { new: true });
        }
        return db.create(collectionName, document);
    },

    // Count documents
    countDocuments: (collectionName, filter = {}) => {
        return db.find(collectionName, filter).length;
    }
};

// Initialize on module load
initializeCollections();

module.exports = { db, initializeCollections, generateId };
