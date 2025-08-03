import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface DeleteCollageDialogProps {
  collage: { id: Id<"collages">; name: string } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteCollageDialog({ collage, isOpen, onOpenChange, onSuccess }: DeleteCollageDialogProps) {
  const deleteCollage = useMutation(api.collages.remove);

  const handleDelete = async () => {
    if (!collage) return;
    
    try {
      await deleteCollage({ id: collage.id });
      onOpenChange(false);
      toast.success("Collage deleted successfully");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to delete collage");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Collage</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{collage?.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 