import { Id } from "@convex/_generated/dataModel";
import { CollageCard } from "./CollageCard";
import { Collage } from "./types";

interface CollageGridProps {
  collages: Collage[];
  onEdit: (collage: Collage) => void;
  onDelete: (id: Id<"collages">, name: string) => void;
}

export function CollageGrid({ collages, onEdit, onDelete }: CollageGridProps) {
  if (collages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No collages found. Create your first collage!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {collages.map((collage) => (
        <CollageCard
          key={collage._id}
          collage={collage}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
} 