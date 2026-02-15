// ─── Notification Routes ────────────────────────────────────────────
// GET /api/notifications — user's notifications (latest 50)
// PATCH /api/notifications/:id/read — mark as read
// PATCH /api/notifications/read-all — mark all as read

import { Router, Response } from "express";
import { auth, AuthRequest } from "../middleware/auth";
import { Notification } from "../models/Notification";

const router = Router();

// ─── GET /api/notifications ─────────────────────────────────────────
router.get("/", auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notifications = await Notification.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        const unreadCount = await Notification.countDocuments({
            userId: req.userId,
            read: false,
        });

        res.json({ notifications, unreadCount });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to fetch notifications" });
    }
});

// ─── PATCH /api/notifications/:id/read ──────────────────────────────
router.patch("/:id/read", auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.userId },
            { read: true },
            { new: true }
        );

        if (!notification) {
            res.status(404).json({ message: "Notification not found" });
            return;
        }

        res.json(notification);
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update notification" });
    }
});

// ─── PATCH /api/notifications/read-all ──────────────────────────────
router.patch("/read-all", auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await Notification.updateMany(
            { userId: req.userId, read: false },
            { read: true }
        );
        res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
        res.status(500).json({ message: "Failed to update notifications" });
    }
});

export default router;
