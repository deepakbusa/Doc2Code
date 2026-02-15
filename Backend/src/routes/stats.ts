import { Router, Response } from "express";
import { History } from "../models/History";
import { User } from "../models/User";
import { auth, AuthRequest } from "../middleware/auth";
import mongoose from "mongoose";

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/stats — aggregated dashboard stats from MongoDB
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = new mongoose.Types.ObjectId(req.userId);

        // Total history count
        const totalGenerations = await History.countDocuments({ userId });

        // Language distribution
        const languageDistribution = await History.aggregate([
            { $match: { userId } },
            { $group: { _id: "$language", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        // Monthly usage (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const monthlyUsage = await History.aggregate([
            { $match: { userId, createdAt: { $gte: twelveMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        // Daily usage (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyUsage = await History.aggregate([
            { $match: { userId, createdAt: { $gte: sevenDaysAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
        ]);

        // Recent activity (last 5 entries)
        const recentActivity = await History.find({ userId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("taskDescription language createdAt");

        // User data
        const user = await User.findById(userId);

        res.json({
            totalGenerations,
            languageDistribution: languageDistribution.map((l) => ({
                name: l._id,
                value: l.count,
            })),
            monthlyUsage: monthlyUsage.map((m) => ({
                year: m._id.year,
                month: m._id.month,
                count: m.count,
            })),
            dailyUsage: dailyUsage.map((d) => ({
                date: `${d._id.year}-${String(d._id.month).padStart(2, "0")}-${String(d._id.day).padStart(2, "0")}`,
                count: d.count,
            })),
            recentActivity: recentActivity.map((a) => ({
                id: a._id.toString(),
                title: a.taskDescription,
                language: a.language,
                createdAt: a.createdAt,
            })),
            requestsUsed: user?.requestsUsed || 0,
            requestsLimit: user?.requestsLimit || 50,
            plan: user?.plan || "free",
        });
    } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
