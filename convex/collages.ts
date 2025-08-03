import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";
import { deleteFile, r2 } from "./r2";
import { nanoid } from "nanoid";

// Query to get all collages with search and filtering
export const list = query({
  args: {
    search: v.optional(v.string()),
    tag: v.optional(v.string()),
    sortBy: v.optional(v.union(v.literal("createdAt"), v.literal("updatedAt"), v.literal("name"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    let collages = await ctx.db
      .query("collages")
      .filter((q) => q.eq(q.field("createdBy"), userId))
      .collect();

    // Apply search filter
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      collages = collages.filter((collage) =>
        collage.name.toLowerCase().includes(searchLower) ||
        (collage.description && collage.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply tag filter
    if (args.tag) {
      collages = collages.filter((collage) =>
        collage.tags && collage.tags.includes(args.tag!)
      );
    }

    // Apply sorting
    const sortBy = args.sortBy || "createdAt";
    const sortOrder = args.sortOrder || "desc";
    
    collages.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;
      
      if (sortBy === "name") {
        aValue = a.name;
        bValue = b.name;
      } else if (sortBy === "createdAt") {
        aValue = a.createdAt || 0;
        bValue = b.createdAt || 0;
      } else if (sortBy === "updatedAt") {
        aValue = a.updatedAt || a.createdAt || 0;
        bValue = b.updatedAt || b.createdAt || 0;
      } else {
        aValue = a.createdAt || 0;
        bValue = b.createdAt || 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return collages;
  },
});

// Query to get a single collage by ID
export const get = query({
  args: { id: v.id("collages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const collage = await ctx.db.get(args.id);
    if (!collage) {
      throw new Error("Collage not found");
    }

    if (collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    return collage;
  },
});

// Mutation to create a new collage
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const collageId = await ctx.db.insert("collages", {
      name: args.name,
      description: args.description,
      tags: args.tags,
      isPrivate: args.isPrivate || false,
      isArchived: false,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    return collageId;
  },
});

// Mutation to update a collage
export const update = mutation({
  args: {
    id: v.id("collages"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPrivate: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const collage = await ctx.db.get(args.id);
    if (!collage) {
      throw new Error("Collage not found");
    }

    if (collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.isPrivate !== undefined) updates.isPrivate = args.isPrivate;
    if (args.isArchived !== undefined) updates.isArchived = args.isArchived;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Mutation to delete a collage
export const remove = mutation({
  args: { id: v.id("collages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const collage = await ctx.db.get(args.id);
    if (!collage) {
      throw new Error("Collage not found");
    }

    if (collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Delete collage preview image from R2 if it exists
    if (collage.previewImageKey) {
      try {
        await deleteFile(ctx, collage.previewImageKey);
      } catch (error) {
        console.error("Failed to delete preview image from R2:", error);
      }
    }

    // Delete all images associated with this collage
    const images = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("collageId"), args.id))
      .collect();

    // Delete files from R2 and database records
    for (const image of images) {
      try {
        await deleteFile(ctx, image.storageKey);
      } catch (error) {
        console.error("Failed to delete file from R2:", error);
      }
      await ctx.db.delete(image._id);
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Mutation to update image order in collage
export const updateImageOrder = mutation({
  args: {
    collageId: v.id("collages"),
    imageIds: v.array(v.id("images")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const collage = await ctx.db.get(args.collageId);
    if (!collage) {
      throw new Error("Collage not found");
    }

    if (collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Verify all images belong to this collage
    for (const imageId of args.imageIds) {
      const image = await ctx.db.get(imageId);
      if (!image || image.collageId !== args.collageId) {
        throw new Error(`Image ${imageId} does not belong to this collage`);
      }
    }

    await ctx.db.patch(args.collageId, {
      images: args.imageIds,
      updatedAt: Date.now(),
    });

    return args.collageId;
  },
});

// Action to update collage preview image
export const updatePreviewImage = action({
  args: {
    collageId: v.id("collages"),
    imageBlob: v.bytes(),
    filename: v.string(),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, { collageId, imageBlob, filename, contentType }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the collage
    const collage = await ctx.runQuery(api.collages.get, { id: collageId });
    if (!collage || collage.createdBy !== userId) {
      throw new Error("Not authorized to update this collage");
    }

    try {
      // Use collage ID as filename - this will always overwrite the same file
      const storageKey = `collage-previews/${collageId}.png`;
      
      console.log("Creating blob with size:", imageBlob.byteLength);
      
      // Try to delete existing file first to avoid potential overwrite issues
      try {
        await deleteFile(ctx, storageKey);
        console.log("Deleted existing preview file");
      } catch (deleteError) {
        console.log("No existing preview file to delete or delete failed:", deleteError);
        // Continue with upload - this is fine if file doesn't exist
      }
      
      // Upload new preview image to R2 storage
      const uploadResult = await r2.store(ctx, new Blob([imageBlob]), {
        key: storageKey,
        type: contentType || 'image/png'
      });
      
      console.log("R2 upload result:", uploadResult);
      
      // Generate public URL for the preview image
      const previewImageUrl = await r2.getUrl(storageKey);
      
      console.log("Generated preview URL:", previewImageUrl);
      
      // Update collage record with preview image info
      await ctx.runMutation(api.collages.updatePreviewImageRecord, {
        collageId,
        previewImageUrl,
        previewImageKey: storageKey,
      });
      
      console.log("Successfully updated collage preview record");
      
      return {
        previewImageUrl,
        previewImageKey: storageKey,
      };
    } catch (error) {
      console.error("Failed to update preview image - detailed error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to update preview image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Internal mutation to update the preview image record
export const updatePreviewImageRecord = mutation({
  args: {
    collageId: v.id("collages"),
    previewImageUrl: v.string(),
    previewImageKey: v.string(),
  },
  handler: async (ctx, { collageId, previewImageUrl, previewImageKey }) => {
    await ctx.db.patch(collageId, {
      previewImageUrl,
      previewImageKey,
      updatedAt: Date.now(),
    });
    return true;
  },
}); 