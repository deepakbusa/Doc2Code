// ─── Notification Model ─────────────────────────────────────────────
// In-app notification for collaboration invites, system alerts, etc.

import mongoose, { Document, Schema, Types } from "mongoose";

export interface INotification extends Document {
    userId: Types.ObjectId;
    type: "collab_invite" | "collab_joined" | "collab_message" | "system";
    title: string;
    message: string;
    link: string;
    read: boolean;
    metadata: Record<string, any>;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
        type: {
            type: String,
            enum: ["collab_invite", "collab_joined", "collab_message", "system"],
            required: true,
        },
        title: { type: String, required: true, maxlength: 200 },
        message: { type: String, required: true, maxlength: 500 },
        link: { type: String, default: "" },
        read: { type: Boolean, default: false },
        metadata: { type: Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
);

// Compound index for efficient queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-delete after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

notificationSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    return obj;
};

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
