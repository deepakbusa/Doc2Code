import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User";

export const configurePassport = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID!,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                callbackURL: "/api/auth/google/callback",
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    // Check if user already exists with this Google ID
                    let user = await User.findOne({ googleId: profile.id });

                    if (user) {
                        return done(null, user);
                    }

                    // Check if user exists with same email
                    const email = profile.emails?.[0]?.value;
                    if (email) {
                        user = await User.findOne({ email });
                        if (user) {
                            // Link Google account to existing user
                            user.googleId = profile.id;
                            if (!user.avatar && profile.photos?.[0]?.value) {
                                user.avatar = profile.photos[0].value;
                            }
                            await user.save();
                            return done(null, user);
                        }
                    }

                    // Create new user
                    user = await User.create({
                        name: profile.displayName || "Google User",
                        email: email || `${profile.id}@google.user`,
                        googleId: profile.id,
                        avatar: profile.photos?.[0]?.value,
                        plan: "free",
                        requestsUsed: 0,
                        requestsLimit: 50,
                    });

                    done(null, user);
                } catch (error) {
                    done(error as Error, undefined);
                }
            }
        )
    );

    passport.serializeUser((user: any, done) => {
        done(null, user._id || user.id);
    });

    passport.deserializeUser(async (id: string, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    });
};
