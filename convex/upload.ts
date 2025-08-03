import { v } from "convex/values";
import { action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { r2, storeFile } from "./r2";

// Generate upload URL for R2
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate a unique file name with user ID prefix
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Generate signed upload URL using R2 component
    const uploadUrl = await r2.generateUploadUrl(fileName);

    return { uploadUrl, fileName };
  },
});

// Store file directly from action (for processed images)
export const storeFileFromAction = action({
  args: {
    fileData: v.bytes(), // File data as ArrayBuffer/Uint8Array
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const fileName = args.fileName || `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    // Convert bytes to Blob for R2 storage
    const blob = new Blob([args.fileData], { type: args.contentType });
    
    // Store file directly using R2 component's store method
    const key = await r2.store(ctx, blob, {
      key: fileName,
      type: args.contentType,
    });

    return { key, fileName };
  },
});

// Get download URL for R2
export const getDownloadUrl = action({
  args: { 
    storageKey: v.string(),
    expiresIn: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate signed download URL using R2 component
    const downloadUrl = await r2.getUrl(args.storageKey, {
      expiresIn: args.expiresIn || 3600, // Default 1 hour
    });

    return downloadUrl;
  },
}); 