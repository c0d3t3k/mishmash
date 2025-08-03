import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Share } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Node, Edge } from "@xyflow/react";
import { useSavePreview } from "@/hooks/useSavePreview";
import { useCanvasContext } from "@/auth/components/collages/CanvasContext";
import { useAction, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { useAuth } from "@/auth/use-auth-hooks.convex";

interface ShareCollageDialogProps {
  collageId: Id<"collages">;
  collageName: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onShare?: () => void;
  onButtonClick?: () => void;
}

export function ShareCollageDialog({ collageId, collageName, isOpen = false, onOpenChange, onShare, onButtonClick }: ShareCollageDialogProps) {
  const [emails, setEmails] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { nodes, edges } = useCanvasContext();
  const { user } = useAuth();
  const { savePreview, isLoading: isSavingPreview } = useSavePreview({ collageId, collageName });
  const sendEmails = useAction(api.emails.sendSharedCollageEmails);
  const updateSharedEmails = useMutation(api.sharing.updateSharedEmails);

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    }
  };

  // Basic email validation
  const validateEmails = (emailString: string): string[] => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailList = emailString
      .split(/[,\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);
    
    const validEmails = emailList.filter(email => emailRegex.test(email));
    const invalidEmails = emailList.filter(email => !emailRegex.test(email));
    
    if (invalidEmails.length > 0) {
      throw new Error(`Invalid email addresses: ${invalidEmails.join(", ")}`);
    }
    
    return validEmails;
  };

  const handleShare = async () => {
    if (!emails.trim()) {
      toast.error("Please enter at least one email address");
      return;
    }

    // Check if collage has any images
    if (!nodes || nodes.length === 0) {
      toast.error("Cannot share an empty collage. Please add some images first.");
      return;
    }

    // Find the React Flow container element
    const canvasElement = document.querySelector('.react-flow') as HTMLElement;
    if (!canvasElement) {
      toast.error("Canvas not available for export");
      return;
    }

    try {
      setIsLoading(true);
      
      // Validate emails
      const validEmails = validateEmails(emails);
      
      if (validEmails.length === 0) {
        toast.error("Please enter valid email addresses");
        return;
      }

      // Step 1: Generate collage image and upload
      toast.loading("Generating collage image...", { id: "share-progress" });
      
      // Clear any selections and transforms before export
      const cleanNodes = nodes.map(node => ({ ...node, selected: false }));
      
      toast.loading("Uploading image to storage...", { id: "share-progress" });
      
      const sharedResult = await savePreview({
        nodes: cleanNodes,
        edges,
        canvasElement,
        width: 1200,
        height: 800,
        isSharing: true
      });
      
      console.log("Shared collage created successfully");

      // Step 2: Send emails via Convex Resend
      toast.loading("Sending emails...", { id: "share-progress" });
      
      let emailResult;
      try {
        emailResult = await sendEmails({
          shareId: sharedResult.shareId,
          recipientEmails: validEmails,
          senderName: user?.name || user?.email || undefined,
        });
      } catch (emailError) {
        throw new Error("Failed to send notification emails");
      }
      
      console.log("Email sending completed successfully");
      
      // Step 3: Store shared emails in database
      try {
        await updateSharedEmails({
          shareId: sharedResult.shareId,
          emails: validEmails,
        });
      } catch (updateError) {
        console.error("Failed to update shared emails:", updateError);
        // Don't fail the whole operation if this fails
      }
      
      // Step 4: Handle email delivery confirmation
      const shareUrl = `${window.location.origin}/shared/${sharedResult.shareId}`;
      
      if (emailResult.summary.failed > 0) {
        toast.warning(
          <div>
            <div>Collage shared! {emailResult.summary.successful} email(s) sent successfully, {emailResult.summary.failed} failed.</div>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
              View shared collage →
            </a>
          </div>, 
          { id: "share-progress", duration: 8000 }
        );
      } else {
        toast.success(
          <div>
            <div>Collage shared successfully! Sent to {emailResult.summary.successful} recipient{emailResult.summary.successful > 1 ? 's' : ''}.</div>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm">
              View shared collage →
            </a>
          </div>, 
          { id: "share-progress", duration: 8000 }
        );
      }
      
      setIsLoading(false);
      onOpenChange?.(false);
      setEmails("");
      onShare?.();
    } catch (error) {
      console.error(error)

      const message = error instanceof Error ? error.message : "Failed to share collage";
      toast.error(message, { id: "share-progress" });
      // Safely log error without serializing binary data
      console.error("Share error:", error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onOpenChange?.(false);
    setEmails("");
  };

  const hasImages = nodes && nodes.length > 0;

  const handleOpenChange = (open: boolean) => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        disabled={!hasImages}
        title={!hasImages ? "Add images to your collage before sharing" : "Share this collage"}
        onClick={handleButtonClick}
      >
        <Share className="w-4 h-4 mr-2" />
        Share
      </Button>
      
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Collage</DialogTitle>
          <DialogDescription>
            Share "{collageName}" as an interactive mood board via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="emails" className="block text-sm font-medium mb-2">
              Email Addresses
            </label>
            <Input
              id="emails"
              type="email"
              placeholder="Enter email addresses separated by commas"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              disabled={isLoading || isSavingPreview}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate multiple email addresses with commas
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading || isSavingPreview}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isLoading || isSavingPreview || !emails.trim()}>
{isLoading || isSavingPreview ? "Sharing..." : "Share Collage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}