import { Id } from "@convex/_generated/dataModel";

export interface Collage {
  _id: Id<"collages">;
  _creationTime: number;
  name: string;
  description?: string;
  tags?: string[];
  isPrivate?: boolean;
  previewImageUrl?: string;
  previewImageKey?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface CollageFormData {
  name: string;
  description: string;
  tags: string[];
  isPrivate: boolean;
} 