import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    avatar?: string;
    googleId?: string;
    plan: "free" | "pro" | "enterprise";
    requestsUsed: number;
    requestsLimit: number;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 255,
        },
        password: {
            type: String,
            minlength: 8,
            select: false, // don't return password by default
        },
        avatar: {
            type: String,
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true, // allows multiple null values
        },
        plan: {
            type: String,
            enum: ["free", "pro", "enterprise"],
            default: "free",
        },
        requestsUsed: {
            type: Number,
            default: 0,
        },
        requestsLimit: {
            type: Number,
            default: 50,
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before save
userSchema.pre("save", async function (next) {
    if (!this.isModified("password") || !this.password) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

// Transform output to match frontend User interface
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.password;
    delete obj.googleId;
    return obj;
};

export const User = mongoose.model<IUser>("User", userSchema);
