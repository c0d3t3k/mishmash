import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  images: defineTable({
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
    createdBy: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }),
  
  collages: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    images: v.optional(v.array(v.id("images"))),
    isPrivate: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    previewImageUrl: v.optional(v.string()),
    previewImageKey: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }),
  
  sharedCollages: defineTable({
    collageId: v.id("collages"),
    shareId: v.string(), // Obfuscated public identifier
    imageStorageKey: v.string(), // R2 storage key for generated image
    imageUrl: v.string(), // Public URL for the generated image
    createdBy: v.string(),
    createdAt: v.number(),
    isRevoked: v.optional(v.boolean()),
    revokedAt: v.optional(v.number()),
    sharedEmails: v.optional(v.array(v.string())), // Array of emails this was shared with
    exportViewport: v.optional(v.any()), // Viewport transformation used during export
    exportBounds: v.optional(v.any()), // Node bounds used during export
    exportDimensions: v.optional(v.object({ width: v.number(), height: v.number() })), // Export image dimensions
  }).index("by_shareId", ["shareId"])
    .index("by_collageId", ["collageId"])
    .index("by_createdBy", ["createdBy"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});