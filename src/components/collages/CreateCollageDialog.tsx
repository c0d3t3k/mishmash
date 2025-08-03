import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CollageForm } from "./CollageForm";

interface CreateCollageDialogProps {
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateCollageDialog({ isOpen = false, onOpenChange, onSuccess }: CreateCollageDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    isPrivate: false,
  });

  const createCollage = useMutation(api.collages.create);

  const handleCreate = async () => {
    try {
      await createCollage({
        name: formData.name,
        description: formData.description || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        isPrivate: formData.isPrivate,
      });
      onOpenChange?.(false);
      setFormData({ name: "", description: "", tags: [], isPrivate: false });
      toast.success("Collage created successfully");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create collage");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Collage</DialogTitle>
          <DialogDescription>
            Create a new collage to organize your images.
          </DialogDescription>
        </DialogHeader>
        <CollageForm
          data={formData}
          onChange={setFormData}
        />
        <DialogFooter>
          <Button onClick={handleCreate} disabled={!formData.name}>
            Create Collage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 