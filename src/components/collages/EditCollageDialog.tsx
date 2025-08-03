import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CollageForm } from "./CollageForm";
import { Collage } from "./types";

interface EditCollageDialogProps {
  collage: Collage | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditCollageDialog({ collage, isOpen, onOpenChange, onSuccess }: EditCollageDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tags: [] as string[],
    isPrivate: false,
  });

  const updateCollage = useMutation(api.collages.update);

  useEffect(() => {
    if (collage) {
      setFormData({
        name: collage.name,
        description: collage.description || "",
        tags: collage.tags || [],
        isPrivate: collage.isPrivate || false,
      });
    }
  }, [collage]);

  const handleUpdate = async () => {
    if (!collage) return;
    
    try {
      await updateCollage({
        id: collage._id,
        name: formData.name,
        description: formData.description || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        isPrivate: formData.isPrivate,
      });
      onOpenChange(false);
      toast.success("Collage updated successfully");
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update collage");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Collage</DialogTitle>
          <DialogDescription>
            Update your collage details.
          </DialogDescription>
        </DialogHeader>
        <CollageForm
          data={formData}
          onChange={setFormData}
          nameId="edit-name"
          descriptionId="edit-description"
          tagsId="edit-tags"
        />
        <DialogFooter>
          <Button onClick={handleUpdate} disabled={!formData.name}>
            Update Collage
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 