import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { History } from "../models/History";
import { User } from "../models/User";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(auth);

// GET /api/history — list user's history (newest first)
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const history = await History.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(100);
        res.json({ history: history.map((h) => h.toJSON()) });
    } catch (error) {
        console.error("Get history error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/history — create new history entry + increment requestsUsed
router.post(
    "/",
    [
        body("docUrl").notEmpty().withMessage("Documentation URL is required"),
        body("taskDescription").notEmpty().withMessage("Task description is required"),
        body("language").notEmpty().withMessage("Language is required"),
        body("code").notEmpty().withMessage("Code is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { docUrl, taskDescription, language, code } = req.body;
            const item = await History.create({
                userId: req.userId,
                docUrl,
                taskDescription,
                language,
                code,
            });

            // Increment user's requestsUsed counter in MongoDB
            await User.findByIdAndUpdate(req.userId, {
                $inc: { requestsUsed: 1 },
            });

            res.status(201).json({ history: item.toJSON() });
        } catch (error) {
            console.error("Create history error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// DELETE /api/history/:id — delete one history entry
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const item = await History.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        });

        if (!item) {
            res.status(404).json({ message: "History item not found" });
            return;
        }

        res.json({ message: "History item deleted" });
    } catch (error) {
        console.error("Delete history error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE /api/history — clear all user's history
router.delete("/", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        await History.deleteMany({ userId: req.userId });
        res.json({ message: "All history cleared" });
    } catch (error) {
        console.error("Clear history error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
