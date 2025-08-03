import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { r2, deleteFile } from "./r2";
import { nanoid } from "nanoid";

// Action to upload collage image and create share record
export const createSharedCollage = action({
  args: {
    collageId: v.id("collages"),
    imageBlob: v.bytes(),
    filename: v.string(),
    contentType: v.optional(v.string()),
    exportViewport: v.optional(v.any()),
    exportBounds: v.optional(v.any()),
    exportDimensions: v.optional(v.object({ width: v.number(), height: v.number() })),
  },
  handler: async (ctx, { collageId, imageBlob, filename, contentType, exportViewport, exportBounds, exportDimensions }): Promise<{
    shareId: string;
    imageUrl: string;
    sharedCollageId: string;
    publicUrl: string;
  }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the collage
    const collage = await ctx.runQuery(api.collages.get, { id: collageId });
    if (!collage || collage.createdBy !== userId) {
      throw new Error("Not authorized to share this collage");
    }

    try {
      // Generate unique share ID (obfuscated public identifier)
      const shareId = nanoid(12); // 12 characters should be unique enough
      
      console.log("Starting share process:", { shareId, filename, contentType, imageBlobSize: imageBlob.byteLength });
      
      // Generate unique storage key for the shared image - flat structure
      const storageKey = `shared-collages/${shareId}.png`;
      
      console.log("Attempting R2 upload:", { storageKey, blobSize: imageBlob.byteLength });
      
      // Upload image to R2 storage
      const uploadResult = await r2.store(ctx, new Blob([imageBlob]), {
        key: storageKey,
        type: contentType || 'image/png'
      });
      
      console.log("R2 upload result:", uploadResult);
      
      // Generate public URL for the image
      const imageUrl = await r2.getUrl(storageKey);
      
      // Create shared collage record
      const sharedCollageId: string = await ctx.runMutation(api.sharing.createSharedRecord, {
        collageId,
        shareId,
        imageStorageKey: storageKey,
        imageUrl,
        createdBy: userId,
        exportViewport,
        exportBounds,
        exportDimensions,
      });
      
      return {
        shareId,
        imageUrl,
        sharedCollageId,
        publicUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/shared/${shareId}`,
      };
    } catch (error) {
      console.error("Failed to create shared collage:", error);
      throw new Error("Failed to create shared collage");
    }
  },
});

// Mutation to create the shared collage database record
export const createSharedRecord = mutation({
  args: {
    collageId: v.id("collages"),
    shareId: v.string(),
    imageStorageKey: v.string(),
    imageUrl: v.string(),
    createdBy: v.string(),
    sharedEmails: v.optional(v.array(v.string())),
    exportViewport: v.optional(v.any()),
    exportBounds: v.optional(v.any()),
    exportDimensions: v.optional(v.object({ width: v.number(), height: v.number() })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sharedCollages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Query to get shared collage by share ID (public access)
export const getSharedCollage = query({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const sharedCollage = await ctx.db
      .query("sharedCollages")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
    
    if (!sharedCollage || sharedCollage.isRevoked) {
      return null;
    }
    
    // Get the original collage data
    const collage = await ctx.db.get(sharedCollage.collageId);
    if (!collage) {
      return null;
    }
    
    // Get the images for annotations
    const images = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("collageId"), sharedCollage.collageId))
      .collect();
    
    return {
      ...sharedCollage,
      collage: {
        name: collage.name,
        description: collage.description,
      },
      images: images.map(img => ({
        _id: img._id,
        title: img.title,
        description: img.description,
        price: img.price,
        includePrice: img.includePrice,
        tags: img.tags,
        pageUrl: img.pageUrl,
        otherUrls: img.otherUrls,
        position: img.position,
      })),
      exportViewport: sharedCollage.exportViewport,
      exportBounds: sharedCollage.exportBounds,
      exportDimensions: sharedCollage.exportDimensions,
    };
  },
});

// Mutation to revoke shared collage
export const revokeSharedCollage = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const sharedCollage = await ctx.db
      .query("sharedCollages")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
    
    if (!sharedCollage) {
      throw new Error("Shared collage not found");
    }
    
    if (sharedCollage.createdBy !== userId) {
      throw new Error("Not authorized to revoke this shared collage");
    }
    
    await ctx.db.patch(sharedCollage._id, {
      isRevoked: true,
      revokedAt: Date.now(),
    });
    
    return true;
  },
});

// Query to list user's shared collages
export const listUserSharedCollages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    return await ctx.db
      .query("sharedCollages")
      .withIndex("by_createdBy", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();
  },
});

// Mutation to regenerate share link with new ID
export const regenerateShareLink = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const sharedCollage = await ctx.db
      .query("sharedCollages")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
    
    if (!sharedCollage) {
      throw new Error("Shared collage not found");
    }
    
    if (sharedCollage.createdBy !== userId) {
      throw new Error("Not authorized to regenerate this shared collage link");
    }
    
    // Generate new share ID
    const newShareId = nanoid(12);
    
    await ctx.db.patch(sharedCollage._id, {
      shareId: newShareId,
    });
    
    return {
      newShareId,
      publicUrl: `${process.env.SITE_URL || 'http://localhost:3000'}/shared/${newShareId}`,
    };
  },
});

// Mutation to bulk revoke shared collages
export const bulkRevokeSharedCollages = mutation({
  args: { shareIds: v.array(v.string()) },
  handler: async (ctx, { shareIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const results = [];
    
    for (const shareId of shareIds) {
      const sharedCollage = await ctx.db
        .query("sharedCollages")
        .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
        .first();
      
      if (!sharedCollage) {
        results.push({ shareId, success: false, error: "Not found" });
        continue;
      }
      
      if (sharedCollage.createdBy !== userId) {
        results.push({ shareId, success: false, error: "Not authorized" });
        continue;
      }
      
      await ctx.db.patch(sharedCollage._id, {
        isRevoked: true,
        revokedAt: Date.now(),
      });
      
      results.push({ shareId, success: true });
    }
    
    return results;
  },
});
// Mutation to permanently delete shared collage
export const deleteSharedCollage = mutation({
  args: { shareId: v.string() },
  handler: async (ctx, { shareId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const sharedCollage = await ctx.db
      .query("sharedCollages")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
    
    if (!sharedCollage) {
      throw new Error("Shared collage not found");
    }
    
    if (sharedCollage.createdBy !== userId) {
      throw new Error("Not authorized to delete this shared collage");
    }
    
    // Delete the shared image file from R2
    try {
      await deleteFile(ctx, sharedCollage.imageStorageKey);
    } catch (error) {
      console.error("Failed to delete shared image from R2:", error);
      // Continue with database deletion even if R2 deletion fails
    }
    
    await ctx.db.delete(sharedCollage._id);
    
    return true;
  },
});

// Mutation to update shared emails when sending
export const updateSharedEmails = mutation({
  args: { 
    shareId: v.string(),
    emails: v.array(v.string())
  },
  handler: async (ctx, { shareId, emails }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    
    const sharedCollage = await ctx.db
      .query("sharedCollages")
      .withIndex("by_shareId", (q) => q.eq("shareId", shareId))
      .first();
    
    if (!sharedCollage) {
      throw new Error("Shared collage not found");
    }
    
    if (sharedCollage.createdBy !== userId) {
      throw new Error("Not authorized to update this shared collage");
    }
    
    await ctx.db.patch(sharedCollage._id, {
      sharedEmails: emails,
    });
    
    return true;
  },
});
