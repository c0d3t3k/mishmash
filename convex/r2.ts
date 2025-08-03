import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const r2 = new R2(components.r2);

export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (ctx, bucket) => {
    // Verify user is authenticated
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
  },
  onUpload: async (ctx, key) => {
    // This runs after upload but before syncMetadata
    // We can use this to create relations or validate uploads
    console.log("File uploaded with key:", key);
  },
});

// Helper function to get file URL with proper expiration
export const getFileUrl = async (key: string, expiresIn: number = 3600) => {
  return await r2.getUrl(key, { expiresIn });
};

// Helper function to delete file - uses the R2 deleteByKey method
export const deleteFile = async (ctx: any, key: string) => {
  return await r2.deleteObject(ctx,key);
};

// Helper function to store file from action
export const storeFile = async (ctx: any, blob: Blob, options?: { key?: string; type?: string }) => {
  return await r2.store(ctx, blob, options);
};

// Action to delete file from R2 - exposed for client use
export const deleteFileAction = action({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await deleteFile(ctx, key);
  },
}); 