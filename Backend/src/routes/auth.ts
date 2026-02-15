import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import passport from "passport";
import { User } from "../models/User";
import { auth, generateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// POST /api/auth/signup
router.post(
    "/signup",
    [
        body("name").trim().isLength({ min: 2, max: 100 }).withMessage("Name must be 2-100 characters"),
        body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
        body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { name, email, password } = req.body;

            // Check if user already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                res.status(409).json({ message: "An account with this email already exists" });
                return;
            }

            // Create user
            const user = await User.create({ name, email, password });
            const token = generateToken(user._id.toString());

            res.status(201).json({ token, user: user.toJSON() });
        } catch (error) {
            console.error("Signup error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// POST /api/auth/login
router.post(
    "/login",
    [
        body("email").trim().isEmail().normalizeEmail().withMessage("Valid email is required"),
        body("password").notEmpty().withMessage("Password is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { email, password } = req.body;

            // Find user with password field included
            const user = await User.findOne({ email }).select("+password");
            if (!user) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            if (!user.password) {
                res.status(401).json({
                    message: "This account uses Google sign-in. Please use Google to log in.",
                });
                return;
            }

            const isMatch = await user.comparePassword(password);
            if (!isMatch) {
                res.status(401).json({ message: "Invalid email or password" });
                return;
            }

            const token = generateToken(user._id.toString());
            res.json({ token, user: user.toJSON() });
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ message: "Server error" });
        }
    }
);

// GET /api/auth/google — redirect to Google consent screen
router.get(
    "/google",
    passport.authenticate("google", {
        scope: ["profile", "email"],
        session: false,
    })
);

// GET /api/auth/google/callback — handle Google OAuth callback
router.get(
    "/google/callback",
    passport.authenticate("google", {
        session: false,
        failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`,
    }),
    (req: AuthRequest, res: Response) => {
        try {
            const user = req.user as any;
            const token = generateToken(user._id.toString());
            // Redirect to frontend with token in URL
            res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
        } catch (error) {
            console.error("Google callback error:", error);
            res.redirect(`${process.env.CLIENT_URL}/login?error=server_error`);
        }
    }
);

// GET /api/auth/me — get current user from token
router.get("/me", auth, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json({ user: user.toJSON() });
    } catch (error) {
        console.error("Get me error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;
