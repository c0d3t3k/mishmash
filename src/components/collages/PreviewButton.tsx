import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";

interface PreviewButtonProps {
  isGenerating: boolean;
  hasChanges: boolean;
  onGenerate: () => void;
}

export function PreviewButton({ isGenerating, hasChanges, onGenerate }: PreviewButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onGenerate}
      disabled={isGenerating}
      className={`flex items-center gap-2 ${hasChanges ? 'border-orange-500 text-orange-600' : ''}`}
      title={hasChanges ? "Changes detected - click to update preview" : "Generate preview image"}
    >
      {isGenerating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Camera className="w-4 h-4" />
      )}
      {isGenerating ? "Generating..." : "Preview"}
      {hasChanges && <span className="w-2 h-2 bg-orange-500 rounded-full" />}
    </Button>
  );
}