// ─── DocChunk Model ─────────────────────────────────────────────────
// Stores embedded document chunks for RAG retrieval with dedup by URL hash.

import mongoose, { Document, Schema } from "mongoose";

export interface IDocChunk extends Document {
    docId: string;
    url: string;
    urlHash: string;
    version: string;
    chunkIndex: number;
    text: string;
    embedding: number[];
    tokenCount: number;
    createdAt: Date;
}

const docChunkSchema = new Schema<IDocChunk>({
    docId: { type: String, required: true, index: true },
    url: { type: String, required: true },
    urlHash: { type: String, required: true, index: true },
    version: { type: String, default: "unknown" },
    chunkIndex: { type: Number, required: true },
    text: { type: String, required: true },
    embedding: { type: [Number], required: true },
    tokenCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: -1 },
});

// Compound index for efficient lookup
docChunkSchema.index({ urlHash: 1, chunkIndex: 1 });

docChunkSchema.methods.toJSON = function () {
    const obj = this.toObject();
    obj.id = obj._id.toString();
    delete obj._id;
    delete obj.__v;
    delete obj.embedding; // Don't expose raw embeddings in API responses
    return obj;
};

export const DocChunk = mongoose.model<IDocChunk>("DocChunk", docChunkSchema);
