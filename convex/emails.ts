import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api, components } from "./_generated/api";
import { Resend } from "@convex-dev/resend";

const resend: Resend = new Resend(components.resend, {
  // testMode: process.env.RESEND_IS_TEST_MODE === "true",
  testMode: false,
});

// Action to send shared collage emails
export const sendSharedCollageEmails = action({
  args: {
    shareId: v.string(),
    recipientEmails: v.array(v.string()),
    senderName: v.optional(v.string()),
  },
  handler: async (ctx, { shareId, recipientEmails, senderName }): Promise<{
    shareId: string;
    publicUrl: string;
    emailResults: Array<{
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get the shared collage data
    const sharedCollage = await ctx.runQuery(api.sharing.getSharedCollage, { shareId });
    if (!sharedCollage) {
      throw new Error("Shared collage not found");
    }

    // Verify user owns the shared collage
    if (sharedCollage.createdBy !== userId) {
      throw new Error("Not authorized to send emails for this shared collage");
    }

    const publicUrl: string = `${process.env.SITE_URL || 'http://localhost:3000'}/shared/${shareId}`;
    const collageName: string = sharedCollage.collage.name;
    
    // Send emails to all recipients
    const emailResults: Array<{
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }> = [];
    for (const email of recipientEmails) {
      try {
        const toEmail = process.env.RESEND_IS_TEST_MODE === "true" 
          ? `delivered+${email.split('@')[0]}@resend.dev` 
          // ? `delivered@resend.dev` 
          : email;

        console.log("Attempting to send email to:", toEmail, "test mode:", process.env.RESEND_IS_TEST_MODE === "true", "from:", process.env.RESEND_FROM_EMAIL || "noreply@mishmash.app");
        
        const emailResult = await resend.sendEmail(ctx, {
          from: process.env.RESEND_FROM_EMAIL || "noreply@mishmash.cmdpr.dev",
          // from: "noreply@mishmash.cmdpr.dev",
          to: toEmail,
          subject: `${senderName || 'Someone'} shared a collage: "${collageName}"`,
          html: generateEmailHTML({
            collageName,
            senderName,
            publicUrl,
            imageUrl: sharedCollage.imageUrl,
            description: sharedCollage.collage.description,
          }),
        });
        
        console.log("Email sent successfully:", emailResult);
        emailResults.push({ email, success: true, messageId: emailResult });
      } catch (error) {
        console.error(`Failed to send email to ${email}:`, error);
        emailResults.push({ 
          email, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    const failureCount = emailResults.filter(r => !r.success).length;

    return {
      shareId,
      publicUrl,
      emailResults,
      summary: {
        total: recipientEmails.length,
        successful: successCount,
        failed: failureCount,
      },
    };
  },
});

// Helper function to generate email HTML
function generateEmailHTML({
  collageName,
  senderName,
  publicUrl,
  imageUrl,
  description,
}: {
  collageName: string;
  senderName?: string;
  publicUrl: string;
  imageUrl: string;
  description?: string;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shared Collage: ${collageName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #1a1a1a;
            margin-bottom: 8px;
        }
        .subtitle {
            font-size: 16px;
            color: #666;
            margin-bottom: 24px;
        }
        .collage-preview {
            text-align: center;
            margin: 24px 0;
        }
        .collage-image {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .description {
            background-color: #f8f9fa;
            padding: 16px;
            border-radius: 8px;
            margin: 24px 0;
            font-style: italic;
            color: #555;
        }
        .cta-button {
            display: inline-block;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 24px 0;
            transition: background-color 0.2s;
        }
        .cta-button:hover {
            background-color: #0056b3;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eee;
            color: #888;
            font-size: 14px;
        }
        .features {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            margin: 24px 0;
        }
        .features h3 {
            margin-top: 0;
            color: #333;
            font-size: 18px;
        }
        .features ul {
            margin: 0;
            padding-left: 20px;
        }
        .features li {
            margin: 8px 0;
            color: #555;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${senderName || 'Someone'} shared a collage with you</div>
            <div class="subtitle">"${collageName}"</div>
        </div>

        <div class="collage-preview">
            <img src="${imageUrl}" alt="${collageName}" class="collage-image" />
        </div>

        ${description ? `<div class="description">${description}</div>` : ''}

        <div class="features">
            <h3>✨ Interactive Features</h3>
            <ul>
                <li>Click on numbered annotations to learn about each item</li>
                <li>View detailed information in an expandable side panel</li>
                <li>Explore links and pricing for items you love</li>
                <li>Perfect for mood boards, shopping lists, and inspiration</li>
            </ul>
        </div>

        <div style="text-align: center;">
            <a href="${publicUrl}" class="cta-button">View Interactive Collage</a>
        </div>

        <div class="footer">
            <p>This collage was created with Mishmash - where creativity meets discovery.</p>
            <p>No account required to view the shared collage.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}