const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/models/User'); // Update with the correct path to your User model

const hashPasswords = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/DBC'); // Replace with your DB connection string

        const users = await User.find(); // Fetch all users

        for (const user of users) {
            if (!user.password.startsWith('$2a$')) { // Skip already hashed passwords
                console.log(`Hashing password for user: ${user.email}`);
                const hashedPassword = await bcrypt.hash(user.password, 10);
                user.password = hashedPassword;
                await user.save();
                console.log(`Password hashed for user: ${user.email}`);
            } else {
                console.log(`Password already hashed for user: ${user.email}`);
            }
        }

        console.log('All passwords hashed successfully!');
        process.exit();
    } catch (error) {
        console.error('Error hashing passwords:', error);
        process.exit(1);
    }
};

hashPasswords();
