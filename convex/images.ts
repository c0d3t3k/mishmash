import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { r2, getFileUrl, deleteFile } from "./r2";
import { internal } from "./_generated/api";

// Position interface for the position field
export interface Position {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zindex?: number;
  zoom?: number;
}

// Query to get all images for a collage in proper z-index order
export const listByCollage = query({
  args: { collageId: v.id("collages") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify user owns the collage
    const collage = await ctx.db.get(args.collageId);
    if (!collage || collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const images = await ctx.db
      .query("images")
      .filter((q) => q.eq(q.field("collageId"), args.collageId))
      .collect();

    // Generate URLs for each image
    const imagesWithUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        imageUrl: await getFileUrl(image.storageKey),
      }))
    );

    // If collage has an ordered images array, use that order
    if (collage.images && collage.images.length > 0) {
      const orderedImages = [];
      const imageMap = new Map(imagesWithUrls.map(img => [img._id, img]));
      
      // Add images in the order specified by collage.images
      for (const imageId of collage.images) {
        const image = imageMap.get(imageId);
        if (image) {
          orderedImages.push(image);
          imageMap.delete(imageId);
        }
      }
      
      // Add any remaining images that aren't in the order array (newly added)
      // These will appear at the end (top layer)
      orderedImages.push(...imageMap.values());
      
      return orderedImages;
    }

    // Fallback to z-index ordering if no collage order exists
    return imagesWithUrls.sort((a, b) => {
      const aZIndex = (a.position as Position)?.zindex || 0;
      const bZIndex = (b.position as Position)?.zindex || 0;
      return aZIndex - bZIndex;
    });
  },
});

// Query to get a single image
export const get = query({
  args: { id: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    return {
      ...image,
      imageUrl: await getFileUrl(image.storageKey),
    };
  },
});

// Mutation to create a new image
export const create = mutation({
  args: {
    collageId: v.id("collages"),
    storageKey: v.string(),
    pageUrl: v.optional(v.string()),
    otherUrls: v.optional(v.any()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    position: v.optional(v.any()),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    includePrice: v.optional(v.boolean()),
    // Legacy fields for backward compatibility during migration
    rotation: v.optional(v.number()),
    top: v.optional(v.number()),
    zindex: v.optional(v.number()),
    left: v.optional(v.number()),
    zoom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify user owns the collage
    const collage = await ctx.db.get(args.collageId);
    if (!collage || collage.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const now = Date.now();
    
    // Create position object from either new position field or legacy fields
    const position: Position = args.position || {
      x: args.left,
      y: args.top,
      width: args.width,
      height: args.height,
      rotation: args.rotation,
      zindex: args.zindex,
      zoom: args.zoom,
    };

    const imageId = await ctx.db.insert("images", {
      collageId: args.collageId,
      storageKey: args.storageKey,
      pageUrl: args.pageUrl,
      otherUrls: args.otherUrls,
      width: args.width,
      height: args.height,
      position,
      title: args.title,
      tags: args.tags,
      description: args.description,
      price: args.price,
      includePrice: args.includePrice,
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    });

    // Add the new image to the collage's ordered images array
    const currentImages = collage.images || [];
    await ctx.db.patch(args.collageId, {
      images: [...currentImages, imageId],
      updatedAt: now,
    });

    return imageId;
  },
});

// Mutation to update an image
export const update = mutation({
  args: {
    id: v.id("images"),
    storageKey: v.optional(v.string()),
    pageUrl: v.optional(v.string()),
    otherUrls: v.optional(v.any()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    position: v.optional(v.any()),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    includePrice: v.optional(v.boolean()),
    // Legacy fields for backward compatibility during migration
    rotation: v.optional(v.number()),
    top: v.optional(v.number()),
    zindex: v.optional(v.number()),
    left: v.optional(v.number()),
    zoom: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.storageKey !== undefined) updates.storageKey = args.storageKey;
    if (args.pageUrl !== undefined) updates.pageUrl = args.pageUrl;
    if (args.otherUrls !== undefined) updates.otherUrls = args.otherUrls;
    if (args.width !== undefined) updates.width = args.width;
    if (args.height !== undefined) updates.height = args.height;
    if (args.title !== undefined) updates.title = args.title;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.description !== undefined) updates.description = args.description;
    if (args.price !== undefined) updates.price = args.price;
    if (args.includePrice !== undefined) updates.includePrice = args.includePrice;

    // Handle position updates - merge with existing position if needed
    if (args.position !== undefined || args.left !== undefined || args.top !== undefined || 
        args.width !== undefined || args.height !== undefined || args.rotation !== undefined ||
        args.zindex !== undefined || args.zoom !== undefined) {
      
      const currentPosition = (image.position as Position) || {};
      const newPosition: Position = args.position || {
        ...currentPosition,
        x: args.left !== undefined ? args.left : currentPosition.x,
        y: args.top !== undefined ? args.top : currentPosition.y,
        width: args.width !== undefined ? args.width : currentPosition.width,
        height: args.height !== undefined ? args.height : currentPosition.height,
        rotation: args.rotation !== undefined ? args.rotation : currentPosition.rotation,
        zindex: args.zindex !== undefined ? args.zindex : currentPosition.zindex,
        zoom: args.zoom !== undefined ? args.zoom : currentPosition.zoom,
      };
      
      updates.position = newPosition;
    }

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Mutation to update image position/transform (for canvas operations)
export const updateTransform = mutation({
  args: {
    id: v.id("images"),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    rotation: v.optional(v.number()),
    top: v.optional(v.number()),
    zindex: v.optional(v.number()),
    left: v.optional(v.number()),
    zoom: v.optional(v.number()),
    position: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }
    
    if (image.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    const updates: any = { updatedAt: Date.now() };
    
    // Handle position updates - merge with existing position
    const currentPosition = (image.position as Position) || {};
    const newPosition: Position = args.position || {
      ...currentPosition,
      x: args.left !== undefined ? args.left : currentPosition.x,
      y: args.top !== undefined ? args.top : currentPosition.y,
      width: args.width !== undefined ? args.width : currentPosition.width,
      height: args.height !== undefined ? args.height : currentPosition.height,
      rotation: args.rotation !== undefined ? args.rotation : currentPosition.rotation,
      zindex: args.zindex !== undefined ? args.zindex : currentPosition.zindex,
      zoom: args.zoom !== undefined ? args.zoom : currentPosition.zoom,
    };
    
    updates.position = newPosition;

    await ctx.db.patch(args.id, updates);
    return args.id;
  },
});

// Mutation to delete an image
export const remove = mutation({
  args: { id: v.id("images") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const image = await ctx.db.get(args.id);
    if (!image) {
      throw new Error("Image not found");
    }

    if (image.createdBy !== userId) {
      throw new Error("Not authorized");
    }

    // Delete the file from R2
    try {
      await deleteFile(ctx,image.storageKey);
    } catch (error) {
      console.error("Failed to delete file from R2:", error);
      // Continue with database deletion even if R2 deletion fails
    }

    await ctx.db.delete(args.id);
    return args.id;
  },
}); 