import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Clock } from "lucide-react";

interface SaveButtonProps {
  onSave: () => void;
  isSaving: boolean;
  isAutoSaving?: boolean;
}

export const SaveButton: React.FC<SaveButtonProps> = ({ onSave, isSaving, isAutoSaving }) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
      <Button
        onClick={onSave}
        disabled={isSaving || isAutoSaving}
        className="shadow-lg"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Saving..." : "Save All Positions"}
      </Button>
      
      {isAutoSaving && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/80 px-2 py-1 rounded-md shadow-sm">
          <Clock className="w-3 h-3 animate-spin" />
          Auto-saving...
        </div>
      )}
    </div>
  );
}; 