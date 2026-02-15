
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load env vars
dotenv.config({ path: path.join(__dirname, "../../.env") });

import { History } from "../models/History";
import { User } from "../models/User";

const resetDb = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI not found");
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB Atlas");

        // delete all history
        const historyResult = await History.deleteMany({});
        console.log(`🗑️ Deleted ${historyResult.deletedCount} history entries`);

        // reset requestsUsed for all users
        const userResult = await User.updateMany({}, {
            $set: { requestsUsed: 0 }
        });
        console.log(`🔄 Reset usage stats for ${userResult.modifiedCount} users`);

        console.log("✨ Database reset complete - Fresh start ready!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Reset failed:", error);
        process.exit(1);
    }
};

resetDb();
