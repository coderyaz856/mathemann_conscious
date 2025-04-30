const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("./backend/models/User"); // Adjust path to your User model

const rehashPasswords = async () => {
    try {
        // Connect to your MongoDB
        await mongoose.connect("mongodb://127.0.0.1:27017/DBC");


        console.log("Connected to the database");

        // Fetch all users
        const users = await User.find();
        console.log("Users fetched:", users);

        for (let user of users) {
            if (!user.password.startsWith("$2b$")) { // Check if already hashed
                console.log(`Rehashing password for user: ${user.email}`);
                const hashedPassword = await bcrypt.hash(user.password, 10);

                // Update the user with the hashed password
                await User.updateOne(
                    { _id: user._id },
                    { $set: { password: hashedPassword } }
                );

                console.log(`Password rehashed for user: ${user.email}`);
            } else {
                console.log(`Password already hashed for user: ${user.email}`);
            }
        }

        console.log("All user passwords processed.");
        mongoose.connection.close();
    } catch (error) {
        console.error("Error rehashing passwords:", error);
        mongoose.connection.close();
    }
};

rehashPasswords();
