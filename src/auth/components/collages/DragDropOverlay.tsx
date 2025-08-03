import React from "react";
import { Upload } from "lucide-react";

interface DragDropOverlayProps {
  isDragOver: boolean;
  onDragOver: (event: React.DragEvent) => void;
  onDragLeave: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  children: React.ReactNode;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  children,
}) => {
  return (
    <div
      className={`w-full h-full ${isDragOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 pointer-events-none">
          <div className="text-center">
            <Upload className="w-16 h-16 mx-auto mb-4 text-blue-500" />
            <p className="text-xl font-semibold text-blue-700">
              Drop images here to add them to your collage
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 