// ─── Engine Routes ──────────────────────────────────────────────────
// POST /enhance, POST /generate, POST /process-doc, POST /chat, POST /node-explain,
// GET /generation/:id, GET /generations, GET /visualize/:id, GET /doc-chunk/:chunkId

import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import { auth, AuthRequest } from "../middleware/auth";
import { enhanceTask } from "../engine/services/enhancementService";
import { codeChat } from "../engine/services/chatService";
import { ingestDocument } from "../engine/services/documentIngestionService";
import { explainNode, type NodeMode } from "../engine/services/nodeIntelligenceService";
import { runPipeline } from "../engine/orchestrator";
import { Generation } from "../models/Generation";
import { User } from "../models/User";
import { Notification } from "../models/Notification";
import { DocChunk } from "../models/DocChunk";
import { logger } from "../engine/logger";
import { sendCollabInviteEmail } from "../services/emailService";
import { emitNotification, getIO } from "../engine/socketManager";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// All engine routes require authentication
router.use(auth);

// ─── POST /api/engine/enhance ───────────────────────────────────────
router.post(
    "/enhance",
    [
        body("taskDescription").notEmpty().withMessage("Task description is required"),
        body("language").notEmpty().withMessage("Language is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { taskDescription, language } = req.body;
            const tasks = await enhanceTask(taskDescription, language);

            res.json({ tasks });
        } catch (error: any) {
            logger.error("Enhance endpoint error", { error: error.message });
            res.status(500).json({ message: error.message || "Enhancement failed" });
        }
    }
);

// ─── POST /api/engine/process-doc ───────────────────────────────────
// Fetch, clean, chunk, and embed a documentation URL.
router.post(
    "/process-doc",
    [body("url").notEmpty().withMessage("Documentation URL is required")],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { url, forceRefresh } = req.body;
            const result = await ingestDocument(url, { forceRefresh: !!forceRefresh });

            res.json(result);
        } catch (error: any) {
            logger.error("Process-doc endpoint error", { error: error.message });
            res.status(500).json({ message: error.message || "Document processing failed" });
        }
    }
);

// ─── POST /api/engine/generate ──────────────────────────────────────
router.post(
    "/generate",
    [
        body("taskDescription").notEmpty().withMessage("Task description is required"),
        body("docUrl").notEmpty().withMessage("Documentation URL is required"),
        body("language").notEmpty().withMessage("Language is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const {
                taskDescription, docUrl, docContent, language, selectedTaskIndex,
                enableCollaboration, collaboratorEmails, qrPin,
            } = req.body;

            const result = await runPipeline({
                userId: req.userId!,
                taskDescription,
                docUrl,
                docContent: docContent || "",
                language,
                selectedTaskIndex,
            });

            let qrUrl: string | null = null;

            // ── Collaboration setup ──────────────────────────────
            if (enableCollaboration && collaboratorEmails?.length > 0 && qrPin) {
                const pinHash = await bcrypt.hash(qrPin, 10);
                const sessionToken = uuidv4();
                const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

                const collaborators = collaboratorEmails.map((email: string) => ({
                    email: email.toLowerCase().trim(),
                    status: "pending" as const,
                    joinedAt: null,
                    failedPinAttempts: 0,
                }));

                await Generation.findByIdAndUpdate(result.generationId, {
                    collaboration: {
                        enabled: true,
                        sessionToken,
                        pinHash,
                        expiresAt,
                        collaborators,
                    },
                });

                // Generate QR URL
                const clientUrl = process.env.CLIENT_URL || "http://localhost:8080";
                const liveUrl = `${clientUrl}/dashboard/live/${result.generationId}?token=${sessionToken}`;
                qrUrl = await QRCode.toDataURL(liveUrl, { width: 300, margin: 2 });

                // Send email invites (fire & forget)
                const owner = await User.findById(req.userId);
                for (const collab of collaborators) {
                    sendCollabInviteEmail({
                        inviterName: owner?.name || "A team member",
                        inviterEmail: owner?.email || "",
                        recipientEmail: collab.email,
                        projectName: taskDescription.substring(0, 60),
                        sessionPin: qrPin,
                        sessionLink: liveUrl,
                        expiresAt,
                    }).catch((err: any) => logger.warn("Email invite failed", { email: collab.email, error: err.message }));

                    // In-app notification for registered users
                    const targetUser = await User.findOne({ email: collab.email });
                    if (targetUser) {
                        const notif = await Notification.create({
                            userId: targetUser._id,
                            type: "collab_invite",
                            title: "Collaboration Invite",
                            message: `${owner?.name || "Someone"} invited you to a live session`,
                            link: `/dashboard/live/${result.generationId}?token=${sessionToken}`,
                            metadata: { generationId: result.generationId },
                        });
                        emitNotification(targetUser._id.toString(), notif.toJSON());
                    }
                }
            }

            res.json({ ...result, qrUrl });
        } catch (error: any) {
            logger.error("Generate endpoint error", { error: error.message });
            res.status(500).json({ message: error.message || "Generation failed" });
        }
    }
);

// ─── POST /api/engine/chat ──────────────────────────────────────────
router.post(
    "/chat",
    [
        body("generationId").notEmpty().withMessage("Generation ID is required"),
        body("question").notEmpty().withMessage("Question is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { generationId, question, history } = req.body;

            let generation = await Generation.findOne({
                _id: generationId,
                userId: req.userId,
            });

            // If not found in Generation, check if it's a legacy History ID
            let codeToChat = "";
            let languageToChat = "";
            
            if (!generation) {
                const { History } = await import("../models/History");
                const historyItem = await History.findOne({
                    _id: generationId,
                    userId: req.userId,
                });
                
                if (historyItem) {
                    codeToChat = historyItem.code;
                    languageToChat = historyItem.language;
                } else {
                    res.status(404).json({ message: "Generation not found" });
                    return;
                }
            } else {
                codeToChat = generation.selectedCode;
                languageToChat = generation.language;
            }

            const answer = await codeChat(
                codeToChat,
                languageToChat,
                question,
                history || []
            );

            res.json({ answer });
        } catch (error: any) {
            logger.error("Chat endpoint error", { error: error.message });
            res.status(500).json({ message: error.message || "Chat failed" });
        }
    }
);

// ─── GET /api/engine/generation/:id ─────────────────────────────────
router.get("/generation/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let generation = await Generation.findById(req.params.id);

        // If not found in Generation, check if it's a legacy History ID
        if (!generation) {
            const { History } = await import("../models/History");
            const historyItem = await History.findById(req.params.id);
            
            if (historyItem) {
                // Convert History to Generation format for backward compatibility
                const legacyGeneration = {
                    id: historyItem._id.toString(),
                    taskDescription: historyItem.taskDescription,
                    enhancedTask: historyItem.taskDescription,
                    docUrl: historyItem.docUrl,
                    language: historyItem.language,
                    selectedCode: historyItem.code,
                    candidates: [],
                    judgeResult: { selectedIndex: 0, scores: [], reasoning: "Legacy entry" },
                    validationResult: {
                        staticScore: 0,
                        runtimeScore: 0,
                        staticIssues: [],
                        runtimeError: null,
                        passed: true
                    },
                    securityAudit: {
                        overallRisk: "unknown",
                        findings: [],
                        performanceNotes: [],
                        score: 0
                    },
                    confidenceScore: 0,
                    verificationStatus: "unverified",
                    stages: [],
                    createdAt: historyItem.createdAt
                };
                res.json({ generation: legacyGeneration });
                return;
            }
            
            res.status(404).json({ message: "Generation not found" });
            return;
        }

        // Check ownership
        const isOwner = generation.userId.toString() === req.userId;

        // Check collaboration access
        let isCollaborator = false;
        if (!isOwner && generation.collaboration?.enabled) {
            const user = await User.findById(req.userId);
            if (user) {
                const userEmail = user.email.toLowerCase();
                isCollaborator = generation.collaboration.collaborators.some(
                    (c) => c.email === userEmail && (c.status === "joined" || c.status === "accepted")
                );
            }
        }

        if (!isOwner && !isCollaborator) {
            res.status(403).json({ message: "Access denied" });
            return;
        }

        res.json({ generation: generation.toJSON() });
    } catch (error: any) {
        logger.error("Get generation error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── GET /api/engine/generations ────────────────────────────────────
router.get("/generations", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const generations = await Generation.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50)
            .select("taskDescription language status confidenceScore verificationStatus createdAt");

        res.json({ generations });
    } catch (error: any) {
        logger.error("List generations error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── GET /api/engine/visualize/:id ──────────────────────────────────
// Parse generated code into AST-like node/edge structure.
router.get("/visualize/:id", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        let generation = await Generation.findOne({
            _id: req.params.id,
            userId: req.userId,
        });

        // If not found in Generation, check if it's a legacy History ID
        if (!generation) {
            const { History } = await import("../models/History");
            const historyItem = await History.findOne({
                _id: req.params.id,
                userId: req.userId,
            });
            
            if (historyItem) {
                // Parse the legacy code
                const graph = parseCodeToGraph(historyItem.code, historyItem.language);
                res.json(graph);
                return;
            }
            
            res.status(404).json({ message: "Generation not found" });
            return;
        }

        const graph = parseCodeToGraph(generation.selectedCode, generation.language);
        res.json(graph);
    } catch (error: any) {
        logger.error("Visualize endpoint error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── POST /api/engine/node-explain ──────────────────────────────────
router.post(
    "/node-explain",
    [
        body("generationId").notEmpty().withMessage("generationId is required"),
        body("nodeId").notEmpty().withMessage("nodeId is required"),
        body("nodeType").notEmpty().withMessage("nodeType is required"),
        body("nodeLabel").notEmpty().withMessage("nodeLabel is required"),
        body("codeSnippet").notEmpty().withMessage("codeSnippet is required"),
        body("mode").isIn(["explain", "optimize", "security", "usage", "alternative"]).withMessage("Invalid mode"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { generationId, nodeId, nodeType, nodeLabel, codeSnippet, mode } = req.body;

            const result = await explainNode({
                generationId,
                nodeId,
                nodeType,
                nodeLabel,
                codeSnippet,
                mode: mode as NodeMode,
            });

            res.json(result);
        } catch (error: any) {
            logger.error("Node explain error", { error: error.message });
            res.status(500).json({ message: "Failed to analyze node" });
        }
    }
);

// ─── GET /api/engine/doc-chunk/:chunkId ─────────────────────────────
router.get("/doc-chunk/:chunkId", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const chunk = await DocChunk.findById(req.params.chunkId);
        if (!chunk) {
            res.status(404).json({ message: "Document chunk not found" });
            return;
        }
        // toJSON strips embedding automatically
        res.json(chunk.toJSON());
    } catch (error: any) {
        logger.error("Doc chunk fetch error", { error: error.message });
        res.status(500).json({ message: "Failed to fetch document chunk" });
    }
});

export default router;

// ─── POST /api/engine/collab/verify-pin ─────────────────────────────
router.post(
    "/collab/verify-pin",
    [
        body("generationId").notEmpty().withMessage("generationId is required"),
        body("pin").notEmpty().withMessage("PIN is required"),
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({ message: errors.array()[0].msg });
                return;
            }

            const { generationId, pin } = req.body;
            const generation = await Generation.findById(generationId);

            if (!generation || !generation.collaboration?.enabled) {
                res.status(404).json({ message: "Collaboration session not found" });
                return;
            }

            // Check expiry
            if (new Date() > generation.collaboration.expiresAt) {
                res.status(410).json({ message: "Session has expired" });
                return;
            }

            // Find the collaborator by email
            const userDoc = await User.findById(req.userId);
            if (!userDoc) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const collabIdx = generation.collaboration.collaborators.findIndex(
                (c) => c.email === userDoc.email.toLowerCase()
            );

            if (collabIdx === -1) {
                res.status(403).json({ message: "You are not invited to this session" });
                return;
            }

            const collaborator = generation.collaboration.collaborators[collabIdx];

            // Rate limit PIN attempts
            if (collaborator.failedPinAttempts >= 5) {
                res.status(429).json({ message: "Too many failed attempts. Access locked." });
                return;
            }

            // Verify PIN
            const isValid = await bcrypt.compare(pin, generation.collaboration.pinHash);
            if (!isValid) {
                await Generation.updateOne(
                    { _id: generationId, "collaboration.collaborators.email": userDoc.email.toLowerCase() },
                    { $inc: { "collaboration.collaborators.$.failedPinAttempts": 1 } }
                );
                const remaining = 4 - collaborator.failedPinAttempts;
                res.status(401).json({ message: `Invalid PIN. ${remaining} attempts remaining.` });
                return;
            }

            // Success — mark as joined
            await Generation.updateOne(
                { _id: generationId, "collaboration.collaborators.email": userDoc.email.toLowerCase() },
                {
                    $set: {
                        "collaboration.collaborators.$.status": "joined",
                        "collaboration.collaborators.$.joinedAt": new Date(),
                    },
                }
            );

            // Emit status update via socket
            const { getIO } = await import("../engine/socketManager");
            getIO().to(`collab_${generationId}`).emit("collab:status-update", {
                email: userDoc.email,
                status: "joined",
                name: userDoc.name,
            });

            // Notify owner
            const owner = await User.findById(generation.userId);
            if (owner) {
                const notif = await Notification.create({
                    userId: owner._id,
                    type: "collab_joined",
                    title: "Collaborator Joined",
                    message: `${userDoc.name} joined your live session`,
                    link: `/dashboard/live/${generationId}`,
                    metadata: { generationId },
                });
                emitNotification(owner._id.toString(), notif.toJSON());
            }

            res.json({ success: true, generationId });
        } catch (error: any) {
            logger.error("Verify-pin error", { error: error.message });
            res.status(500).json({ message: "Verification failed" });
        }
    }
);

// ─── GET /api/engine/collab/accept/:sessionToken ────────────────────
router.get("/collab/accept/:sessionToken", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { sessionToken } = req.params;

        const generation = await Generation.findOne({
            "collaboration.sessionToken": sessionToken,
            "collaboration.enabled": true,
        });

        if (!generation || !generation.collaboration) {
            res.status(404).json({ message: "Session not found" });
            return;
        }

        if (new Date() > generation.collaboration.expiresAt) {
            res.status(410).json({ message: "Session has expired" });
            return;
        }

        const userDoc = await User.findById(req.userId);
        if (!userDoc) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        // Update status to accepted (if still pending)
        await Generation.updateOne(
            {
                _id: generation._id,
                "collaboration.collaborators.email": userDoc.email.toLowerCase(),
                "collaboration.collaborators.status": "pending",
            },
            { $set: { "collaboration.collaborators.$.status": "accepted" } }
        );

        getIO().to(`collab_${generation._id}`).emit("collab:status-update", {
            email: userDoc.email,
            status: "accepted",
            name: userDoc.name,
        });

        res.json({
            success: true,
            generationId: generation._id.toString(),
            title: generation.taskDescription,
        });
    } catch (error: any) {
        logger.error("Accept session error", { error: error.message });
        res.status(500).json({ message: "Failed to accept invitation" });
    }
});

// ─── GET /api/engine/collab/sessions ────────────────────────────────
// Fetch all generations where current user is owner or invited collaborator
router.get("/collab/sessions", async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userDoc = await User.findById(req.userId);
        if (!userDoc) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const sessions = await Generation.find({
            "collaboration.enabled": true,
            "collaboration.expiresAt": { $gt: new Date() },
            $or: [
                { userId: req.userId },
                { "collaboration.collaborators.email": userDoc.email.toLowerCase() },
            ],
        })
            .sort({ createdAt: -1 })
            .limit(20)
            .select("taskDescription language status collaboration userId createdAt");

        const mapped = sessions.map((gen) => {
            const isOwner = gen.userId.toString() === req.userId;
            return {
                id: gen._id.toString(),
                title: gen.taskDescription.substring(0, 80),
                language: gen.language,
                role: isOwner ? "owner" : "collaborator",
                expiresAt: gen.collaboration?.expiresAt,
                collaborators: gen.collaboration?.collaborators.map((c) => ({
                    email: c.email,
                    status: c.status,
                })),
            };
        });

        res.json({ sessions: mapped });
    } catch (error: any) {
        logger.error("Collab sessions error", { error: error.message });
        res.status(500).json({ message: "Server error" });
    }
});

// ─── Code Graph Parser ──────────────────────────────────────────────

interface GraphNode {
    id: string;
    type: string;
    label: string;
    data: { code: string; lineStart: number };
}

interface GraphEdge {
    id: string;
    source: string;
    target: string;
    label: string;
}

function parseCodeToGraph(code: string, language: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const lines = code.split("\n");

    // --- Extract imports ---
    const importNodes: string[] = [];
    lines.forEach((line, i) => {
        const importMatch = line.match(/^(?:import|from|require|using|#include)\s+(.+)/);
        if (importMatch) {
            const id = `import_${i}`;
            nodes.push({
                id,
                type: "import",
                label: importMatch[1].replace(/['"`;]/g, "").trim().substring(0, 50),
                data: { code: line.trim(), lineStart: i + 1 },
            });
            importNodes.push(id);
        }
    });

    // --- Extract functions / classes / middleware ---
    const funcRegex = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class|def|func|fn|pub\s+fn|public\s+(?:static\s+)?(?:void|int|string|async))\s+(\w+)/gm;
    const funcNodeIds: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = funcRegex.exec(code)) !== null) {
        const lineNum = code.substring(0, match.index).split("\n").length;
        const name = match[1];
        const id = `func_${name}_${lineNum}`;

        // Determine node type
        const isClass = match[0].includes("class");
        const isMiddleware = /middleware|handler|router|app\.(use|get|post|put|delete)/i.test(name);

        nodes.push({
            id,
            type: isClass ? "class" : isMiddleware ? "middleware" : "function",
            label: name,
            data: { code: match[0].trim(), lineStart: lineNum },
        });
        funcNodeIds.push(id);
    }

    // --- Build edges ---
    // Imports → first function
    if (importNodes.length > 0 && funcNodeIds.length > 0) {
        importNodes.forEach((imp) => {
            edges.push({
                id: `edge_${imp}_${funcNodeIds[0]}`,
                source: imp,
                target: funcNodeIds[0],
                label: "imports",
            });
        });
    }

    // Sequential function execution flow
    for (let i = 0; i < funcNodeIds.length - 1; i++) {
        edges.push({
            id: `edge_${funcNodeIds[i]}_${funcNodeIds[i + 1]}`,
            source: funcNodeIds[i],
            target: funcNodeIds[i + 1],
            label: "calls",
        });
    }

    // Cross-reference: function calls other functions
    funcNodeIds.forEach((srcId) => {
        const srcNode = nodes.find((n) => n.id === srcId);
        if (!srcNode) return;

        funcNodeIds.forEach((tgtId) => {
            if (srcId === tgtId) return;
            const tgtNode = nodes.find((n) => n.id === tgtId);
            if (!tgtNode) return;

            // Check if source function body calls target function
            const funcBody = extractFunctionBody(code, srcNode.data.lineStart - 1);
            if (funcBody.includes(tgtNode.label)) {
                const edgeId = `ref_${srcId}_${tgtId}`;
                if (!edges.find((e) => e.id === edgeId)) {
                    edges.push({
                        id: edgeId,
                        source: srcId,
                        target: tgtId,
                        label: "references",
                    });
                }
            }
        });
    });

    // If no nodes were found, create a single node with the full code
    if (nodes.length === 0) {
        nodes.push({
            id: "main",
            type: "function",
            label: "Main Code",
            data: { code: code.substring(0, 200) + "...", lineStart: 1 },
        });
    }

    return { nodes, edges };
}

function extractFunctionBody(code: string, startLine: number): string {
    const lines = code.split("\n");
    let depth = 0;
    let started = false;
    const body: string[] = [];

    for (let i = startLine; i < Math.min(startLine + 100, lines.length); i++) {
        const line = lines[i];
        body.push(line);

        for (const ch of line) {
            if (ch === "{" || ch === "(") { depth++; started = true; }
            if (ch === "}" || ch === ")") depth--;
        }

        if (started && depth <= 0) break;
    }

    return body.join("\n");
}
