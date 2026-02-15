import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { User } from "../models/User";
import { auth, AuthRequest } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(auth);

// PUT /api/user/profile — update name and/or email
router.put(
    "/profile",
    [
        body("name")
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 })
            .withMessage("Name must be 2-100 characters"),
        body("email")
            .optional()
            .trim()
            .isEmail()
            .normalizeEmail()
            .withMessage("Valid email is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const updates: Record<string, string> = {};
            if (req.body.name) updates.name = req.body.name;
            if (req.body.email) {
                // Check if email is taken by another user
                const existing = await User.findOne({
                    email: req.body.email,
                    _id: { $ne: req.userId },
                });
                if (existing) {
                    res.status(409).json({ message: "Email is already in use" });
                    return;
                }
                updates.email = req.body.email;
            }

            const user = await User.findByIdAndUpdate(req.userId, updates, {
                new: true,
                runValidators: true,
            });

            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            res.json({ user: user.toJSON() });
        } catch (error) {
            console.error("Update profile error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// PUT /api/user/password — change password
router.put(
    "/password",
    [
        body("currentPassword").notEmpty().withMessage("Current password is required"),
        body("newPassword")
            .isLength({ min: 8 })
            .withMessage("New password must be at least 8 characters"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { currentPassword, newPassword } = req.body;

            const user = await User.findById(req.userId).select("+password");
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }

            if (!user.password) {
                res.status(400).json({
                    message: "Cannot change password for Google-only accounts. Set a password first.",
                });
                return;
            }

            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                res.status(401).json({ message: "Current password is incorrect" });
                return;
            }

            user.password = newPassword;
            await user.save(); // triggers pre-save hash
            res.json({ message: "Password updated successfully" });
        } catch (error) {
            console.error("Change password error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

export default router;
