import { Link } from "@tanstack/react-router";
import { Id } from "@convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, Image as ImageIcon } from "lucide-react";
import { Collage } from "./types";

interface CollageCardProps {
  collage: Collage;
  onEdit: (collage: Collage) => void;
  onDelete: (id: Id<"collages">, name: string) => void;
}

export function CollageCard({ collage, onEdit, onDelete }: CollageCardProps) {
  const formatTimeAgo = (timestamp?: number) => {
    if (!timestamp) return "";
    
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);
    
    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (weeks > 0) return `${weeks}w ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "now";
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden relative">
      <Link
        to="/collage/$id"
        params={{ id: collage._id }}
        className="block relative"
      >
        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 relative overflow-hidden">
          {collage.previewImageUrl ? (
            <img
              src={collage.previewImageUrl}
              alt={collage.name}
              className="w-full h-full object-cover blur-none group-hover:blur-none transition-all duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No preview</p>
              </div>
            </div>
          )}
          
          {/* Stronger gradient overlay for better text visibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Text overlay at bottom left */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <div className="text-white">
              <h3 className="text-sm font-black line-clamp-1 mb-1">{collage.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/60">
                  {formatTimeAgo(collage.updatedAt || collage.createdAt || collage._creationTime)}
                </p>
                {collage.tags && collage.tags.length > 0 && (
                  <div className="flex gap-1">
                    {collage.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5 bg-white/20 text-white border-white/30 hover:bg-white/30">
                        {tag}
                      </Badge>
                    ))}
                    {collage.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-white/10 text-white border-white/30">
                        +{collage.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Action buttons overlay - show only on hover */}
      <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Button
          variant="secondary"
          size="sm"
          title="Edit collage"
          className="h-7 w-7 p-0 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 border border-gray-200 dark:border-gray-600 shadow-sm backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onEdit(collage);
          }}
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          title="Delete collage"
          className="h-7 w-7 p-0 bg-white/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:text-red-600 dark:hover:text-red-400 border border-gray-200 dark:border-gray-600 shadow-sm backdrop-blur-sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(collage._id, collage.name);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
} 