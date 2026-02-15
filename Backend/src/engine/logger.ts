// ─── Winston Logger ─────────────────────────────────────────────────
import winston from "winston";

const { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}]${stack ? ` ${stack}` : ` ${message}`}${metaStr}`;
});

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(
        errors({ stack: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
    ),
    transports: [
        // Console — colorized for development
        new winston.transports.Console({
            format: combine(colorize(), logFormat),
        }),
        // File — structured JSON for production analysis
        new winston.transports.File({
            filename: "logs/engine.log",
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            format: combine(winston.format.json()),
        }),
        // Separate error log
        new winston.transports.File({
            filename: "logs/engine-error.log",
            level: "error",
            maxsize: 5 * 1024 * 1024,
            maxFiles: 3,
            format: combine(winston.format.json()),
        }),
    ],
});
