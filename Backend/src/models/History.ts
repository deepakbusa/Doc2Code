import mongoose, { Document, Schema } from "mongoose";

export interface IHistory extends Document {
    userId: mongoose.Types.ObjectId;
    generationId?: mongoose.Types.ObjectId;
    docUrl: string;
    taskDescription: string;
    language: string;
    code: string;
    createdAt: Date;
}

const historySchema = new Schema<IHistory>({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    generationId: {
        type: Schema.Types.ObjectId,
        ref: "Generation",
        required: false,
        index: true,
    },
    docUrl: {
        type: String,
        required: true,
    },
    taskDescription: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: -1,
    },
});

// Transform output to match frontend HistoryItem interface
historySchema.methods.toJSON = function () {
    const obj = this.toObject();
    // Use generationId if available, otherwise fallback to _id
    obj.id = obj.generationId ? obj.generationId.toString() : obj._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.userId;
    delete obj.generationId;
    return obj;
};

export const History = mongoose.model<IHistory>("History", historySchema);
