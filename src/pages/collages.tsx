import { useState } from "react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { SignedIn, SignedOut } from "@/auth/components";
import { SignInButton } from "@/components/auth/SignInButton";
import { Button } from "@/components/ui/button";
import { Share2, Plus } from "lucide-react";
import { Link, useSearch, useNavigate } from "@tanstack/react-router";
import {
  CollageFilters,
  CollageGrid,
  CreateCollageDialog,
  EditCollageDialog,
  DeleteCollageDialog,
  type Collage,
} from "@/components/collages";

function CollagesContent() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "name">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [editingCollage, setEditingCollage] = useState<Collage | null>(null);
  const [deletingCollage, setDeletingCollage] = useState<{ id: Id<"collages">; name: string } | null>(null);
  
  const searchParams = useSearch({ from: "/collages" }) as { dialog?: string };
  const navigate = useNavigate({ from: "/collages" });
  
  const isEditDialogOpen = searchParams.dialog === "edit";
  const isCreateDialogOpen = searchParams.dialog === "create";

  const collages = useQuery(api.collages.list, {
    search: search || undefined,
    tag: tagFilter === "all" ? undefined : tagFilter,
    sortBy,
    sortOrder,
  });

  const getAllTags = () => {
    if (!collages) return [];
    const tagSet = new Set<string>();
    collages.forEach(collage => {
      if (collage.tags) {
        collage.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet);
  };

  const handleEditCollage = (collage: Collage) => {
    setEditingCollage(collage);
    navigate({ search: { dialog: "edit" } });
  };

  const handleCreateCollage = () => {
    navigate({ search: { dialog: "create" } });
  };

  const handleCloseDialog = () => {
    navigate({ search: {} });
  };

  const handleDeleteCollage = (id: Id<"collages">, name: string) => {
    setDeletingCollage({ id, name });
  };

  if (collages === undefined) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Collages</h1>
        <div className="flex items-center gap-3">
          <Link to="/shares">
            <Button
              variant="outline"
              className="flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Manage Shares
            </Button>
          </Link>
          <Button onClick={handleCreateCollage}>
            <Plus className="w-4 h-4 mr-2" />
            Create Collage
          </Button>
        </div>
      </div>

      <CollageFilters
        search={search}
        onSearchChange={setSearch}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
        availableTags={getAllTags()}
      />

      <CollageGrid
        collages={collages}
        onEdit={handleEditCollage}
        onDelete={handleDeleteCollage}
      />

      <CreateCollageDialog
        isOpen={isCreateDialogOpen}
        onOpenChange={(open) => !open && handleCloseDialog()}
      />

      <EditCollageDialog
        collage={editingCollage}
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseDialog();
            setEditingCollage(null);
          }
        }}
        onSuccess={() => {
          handleCloseDialog();
          setEditingCollage(null);
        }}
      />

      <DeleteCollageDialog
        collage={deletingCollage}
        isOpen={!!deletingCollage}
        onOpenChange={(open) => !open && setDeletingCollage(null)}
        onSuccess={() => setDeletingCollage(null)}
      />
    </div>
  );
}

export default function CollagesPage() {
  return (
    <>
      <SignedIn>
        <CollagesContent />
      </SignedIn>
      <SignedOut>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-3xl font-bold mb-4">Welcome to Collages</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to create and manage your image collages.
            </p>
            <SignInButton />
          </div>
        </div>
      </SignedOut>
    </>
  );
}
