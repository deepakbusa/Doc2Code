// ─── Email Service (Gmail API) ──────────────────────────────────────
// Sends HTML-formatted collaboration invitation emails via Gmail API.

import { google } from "googleapis";
import { logger } from "../engine/logger";

const OAuth2 = google.auth.OAuth2;

/**
 * Create authenticated Gmail client using OAuth2 refresh token.
 */
function createGmailClient() {
    const oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI || "https://developers.google.com/oauthplayground"
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    return google.gmail({ version: "v1", auth: oauth2Client });
}

/**
 * Build an HTML email for collaboration invitation.
 */
function buildInviteEmail(params: {
    inviterName: string;
    inviterEmail: string;
    recipientEmail: string;
    projectName: string;
    sessionPin: string;
    sessionLink: string;
    expiresAt: Date;
}): string {
    const expiryStr = params.expiresAt.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#111118;border-radius:16px;border:1px solid #1e1e2e;overflow:hidden;">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5,#2563eb);padding:32px 28px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;margin-bottom:16px;">
        <span style="font-size:24px;">🤝</span>
      </div>
      <h1 style="color:#fff;font-size:22px;margin:0 0 6px;font-weight:700;">Collaboration Invite</h1>
      <p style="color:rgba(255,255,255,0.8);font-size:14px;margin:0;">You've been invited to collaborate on Doc2Code</p>
    </div>

    <!-- Body -->
    <div style="padding:28px;">
      <p style="color:#e2e8f0;font-size:15px;line-height:1.6;margin:0 0 20px;">
        <strong style="color:#a78bfa;">${params.inviterName}</strong> has invited you to collaborate on a code generation session.
      </p>

      <!-- Project Card -->
      <div style="background:#1a1a2e;border-radius:12px;padding:18px;margin-bottom:20px;border:1px solid #2a2a3e;">
        <div style="display:flex;align-items:center;margin-bottom:10px;">
          <span style="font-size:16px;margin-right:8px;">📂</span>
          <span style="color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Project</span>
        </div>
        <p style="color:#f1f5f9;font-size:16px;font-weight:600;margin:0 0 12px;">${params.projectName}</p>
        
        <div style="display:flex;gap:16px;">
          <div>
            <span style="color:#64748b;font-size:11px;display:block;">Session PIN</span>
            <span style="color:#a78bfa;font-size:15px;font-weight:700;letter-spacing:2px;">${params.sessionPin}</span>
          </div>
          <div>
            <span style="color:#64748b;font-size:11px;display:block;">Expires</span>
            <span style="color:#f97316;font-size:13px;font-weight:500;">${expiryStr}</span>
          </div>
        </div>
      </div>

      <!-- Join Button -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${params.sessionLink}" style="display:inline-block;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
          Join Collaboration →
        </a>
      </div>

      <p style="color:#64748b;font-size:12px;text-align:center;margin:16px 0 0;">
        Or copy this link: <a href="${params.sessionLink}" style="color:#818cf8;">${params.sessionLink}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 28px;border-top:1px solid #1e1e2e;text-align:center;">
      <p style="color:#475569;font-size:11px;margin:0;">
        Sent by Doc2Code · This invite expires ${expiryStr}
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Encode email to base64url format required by Gmail API.
 */
function encodeEmail(to: string, from: string, subject: string, htmlBody: string): string {
    const messageParts = [
        `From: ${from}`,
        `To: ${to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        htmlBody,
    ];
    const message = messageParts.join("\r\n");
    return Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

/**
 * Send a collaboration invitation email.
 */
export async function sendCollabInviteEmail(params: {
    inviterName: string;
    inviterEmail: string;
    recipientEmail: string;
    projectName: string;
    sessionPin: string;
    sessionLink: string;
    expiresAt: Date;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
        const gmail = createGmailClient();
        const html = buildInviteEmail(params);
        const subject = `${params.inviterName} invited you to collaborate — ${params.projectName}`;
        const raw = encodeEmail(
            params.recipientEmail,
            params.inviterEmail,
            subject,
            html
        );

        const result = await gmail.users.messages.send({
            userId: "me",
            requestBody: { raw },
        });

        logger.info("Collaboration invite email sent", {
            to: params.recipientEmail,
            messageId: result.data.id,
        });

        return { success: true, messageId: result.data.id || undefined };
    } catch (error: any) {
        logger.error("Failed to send collaboration email", {
            to: params.recipientEmail,
            error: error.message,
        });
        return { success: false, error: error.message };
    }
}
