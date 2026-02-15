// ─── Global Error Handler Middleware ─────────────────────────────────
// Catches unhandled errors in Express routes and returns structured JSON responses.

import { Request, Response, NextFunction } from "express";
import { logger } from "../engine/logger";

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
}

export function errorHandler(
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational ?? false;

    // Log the error
    if (statusCode >= 500) {
        logger.error("Unhandled server error", {
            message: err.message,
            stack: err.stack,
            statusCode,
        });
    } else {
        logger.warn("Client error", {
            message: err.message,
            statusCode,
        });
    }

    res.status(statusCode).json({
        message: isOperational ? err.message : "Internal server error",
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
    });
}

/**
 * Validate required environment variables at startup.
 * Throws if any critical variable is missing.
 */
export function validateEnv(): void {
    const required = [
        "MONGODB_URI",
        "JWT_SECRET",
        "AZURE_OPENAI_API_KEY",
        "AZURE_OPENAI_ENDPOINT",
        "AZURE_OPENAI_API_VERSION",
    ];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    logger.info("✅ Environment validated", {
        azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT?.substring(0, 30) + "...",
        port: process.env.PORT || 5000,
    });
}
