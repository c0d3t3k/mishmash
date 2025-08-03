import React, { useState, useRef, useCallback } from "react";
import { type NodeProps, NodeResizer, useReactFlow } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Settings, RotateCcw, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type Id } from "@convex/_generated/dataModel";
import { SimpleErrorBoundary } from "@/components/ui/error-boundary";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useImageObjectUrl } from "@/hooks/useImageObjectUrl";

export interface ImageNodeData {
  imageId: Id<"images">;
  imageUrl: string;
  storageKey?: string;
  title?: string;
  tags?: string[];
  description?: string;
  price?: number;
  includePrice?: boolean;
  isSelected?: boolean;
  onGearClick?: (imageId: Id<"images">) => void;
  onMoveForward?: (nodeId: string) => void;
  onMoveBackward?: (nodeId: string) => void;
  lastUpdated?: number;
  rotation?: number;
  [key: string]: unknown;
}

export interface ImageNodeProps extends NodeProps {
  data: ImageNodeData;
}

export const ImageNode: React.FC<ImageNodeProps> = ({ data, selected, id }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [activeRotation, setActiveRotation] = useState(0); // Only for active rotation
  const [isSaving, setIsSaving] = useState(false); // Track if we're saving to prevent jitter
  const rotationRef = useRef<number>(data.rotation || 0);
  const startAngleRef = useRef<number>(0);
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);
  const { updateNodeData, getNode } = useReactFlow();
  
  // Convert signed URL to object URL for better caching and canvas export
  const { objectUrl, isLoading: isImageLoading, error: imageError } = useImageObjectUrl(data.imageUrl);
  
  // Add mutation for saving rotation to database
  const updateImageTransform = useMutation(api.images.updateTransform);

  // Use either ReactFlow's selected prop or our custom isSelected data
  const isSelected = selected || data.isSelected;

  // Update rotation ref when data changes, but only if we're not rotating or saving
  React.useEffect(() => {
    if (!isRotating && !isSaving && data.rotation !== undefined) {
      rotationRef.current = data.rotation;
      setActiveRotation(data.rotation); // Also update active rotation when data changes
    }
  }, [data.rotation, isRotating, isSaving]);

  // Check if the database rotation matches our active rotation to confirm save
  React.useEffect(() => {
    if (isSaving && data.rotation !== undefined && Math.abs(data.rotation - activeRotation) < 0.1) {
      console.log(`✅ Save confirmed: data.rotation (${data.rotation}) matches activeRotation (${activeRotation})`);
      setIsSaving(false);
    }
  }, [data.rotation, activeRotation, isSaving]);

  const handleGearClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection
    if (data.onGearClick) {
      data.onGearClick(data.imageId);
    }
  };

  const handleRotationStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsRotating(true);
    
    // Initialize active rotation with current data rotation
    setActiveRotation(data.rotation || 0);
    rotationRef.current = data.rotation || 0;
    
    const rect = nodeRef.current?.getBoundingClientRect();
    if (rect) {
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      
      const angle = Math.atan2(
        e.clientY - centerRef.current.y,
        e.clientX - centerRef.current.x
      );
      startAngleRef.current = angle - (rotationRef.current * Math.PI / 180);
    }
  }, [data.rotation]);

  const handleRotationMove = useCallback((e: MouseEvent) => {
    if (!isRotating) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const angle = Math.atan2(
      e.clientY - centerRef.current.y,
      e.clientX - centerRef.current.x
    );
    
    // Calculate rotation without snapping
    const rotation = (angle - startAngleRef.current) * 180 / Math.PI;
    
    // Update rotation continuously for smooth movement
    rotationRef.current = rotation;
    setActiveRotation(rotation);
  }, [isRotating]);

  const handleRotationEnd = useCallback(async () => {
    const finalRotation = rotationRef.current;
    setIsRotating(false);
    setIsSaving(true); // Start saving state to prevent jitter
    
    console.log(`Rotation ended, will save rotation ${finalRotation}° in 10ms`);
    
    // Add delay before saving to prevent jitter and allow fine adjustments
    const saveTimeout = setTimeout(async () => {
      console.log(`Starting database save for rotation ${finalRotation}°`);
      
      try {
        // Use React Flow's getNode to get current position and dimensions
        const currentNode = getNode(id);
        if (!currentNode) {
          console.error('Could not find current node for rotation save');
          setIsSaving(false);
          return;
        }
        
        // Preserve existing position and dimensions, only update rotation
        const currentPosition = {
          x: currentNode.position.x,
          y: currentNode.position.y,
          width: currentNode.style?.width ? Number(currentNode.style.width) : 200,
          height: currentNode.style?.height ? Number(currentNode.style.height) : 200,
        };
        
        console.log(`Saving to database:`, {
          imageId: data.imageId,
          position: {
            x: currentPosition.x,
            y: currentPosition.y,
            width: currentPosition.width,
            height: currentPosition.height,
            rotation: finalRotation,
          }
        });
        
        // Update only the rotation, preserve existing position and dimensions
        const result = await updateImageTransform({
          id: data.imageId,
          position: {
            x: currentPosition.x,
            y: currentPosition.y,
            width: currentPosition.width,
            height: currentPosition.height,
            rotation: finalRotation,
            // Preserve existing zindex - we don't want to change layer order during rotation
            zindex: undefined, // Let the mutation preserve the existing zindex
          }
        });
        
        console.log(`✅ Successfully saved rotation ${finalRotation}° for image ${data.imageId}`, result);
        // Don't clear isSaving here - wait for data.rotation to update via useEffect
      } catch (error) {
        console.error('❌ Failed to save rotation:', error);
        setIsSaving(false); // Clear saving state only on error
        // Could show a toast error here if needed
      }
    }, 500); // 500ms delay before saving
    
    // Store timeout ID in case we need to clear it (though we shouldn't need to)
    console.log(`Scheduled save timeout ID:`, saveTimeout);
  }, [data.imageId, updateImageTransform, id, getNode]);

  // Add global mouse event listeners for rotation
  React.useEffect(() => {
    if (isRotating) {
      document.addEventListener('mousemove', handleRotationMove);
      document.addEventListener('mouseup', handleRotationEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleRotationMove);
        document.removeEventListener('mouseup', handleRotationEnd);
      };
    }
  }, [isRotating, handleRotationMove, handleRotationEnd]);

  // Use active rotation during rotation or saving, data rotation otherwise
  const rotation = (isRotating || isSaving) ? activeRotation : (data.rotation || 0);

  return (
    <SimpleErrorBoundary message="Error loading image node">
      <TooltipProvider>
        <div ref={nodeRef} className="relative group">
          {/* Hide NodeResizer during rotation */}
          {isSelected && !isRotating && (
            <NodeResizer
              color="blue-500"
              isVisible={isSelected && !isRotating}
              minWidth={100}
              minHeight={100}
              keepAspectRatio={false}
            />
          )}
           {/* Gear icon button - appears on hover */}
           <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 noDrag z-50">
              <Button
                variant="secondary"
                size="sm"
                className="h-6 w-6 p-0 shadow-lg"
                onClick={handleGearClick}
              >
                <Settings className="h-3 w-3" />
              </Button>
            </div>

            {/* Layer control buttons - lower right corner */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 noDrag z-50 flex flex-col gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-5 w-5 p-0 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onMoveForward?.(id);
                    }}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move to foreground</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-5 w-5 p-0 shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onMoveBackward?.(id);
                    }}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Move to background</p>
                </TooltipContent>
              </Tooltip>
            </div>
        
        {/* Rotation handle - with noDrag class */}
        {isSelected && (
          <div
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 cursor-grab active:cursor-grabbing noDrag"
            style={{ 
              zIndex: 1000,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              MozUserSelect: 'none',
              msUserSelect: 'none',
              pointerEvents: 'auto'
            }}
            onMouseDown={handleRotationStart}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-600 transition-colors border-2 border-white">
              <RotateCcw className="h-4 w-4 text-white pointer-events-none" />
            </div>
          </div>
        )}
        
        <div
          className="drag-handle" // Add drag handle class to restrict dragging to this area
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center',
            // transition: isRotating ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          {isImageLoading && (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-gray-500 dark:text-gray-400 animate-spin" />
            </div>
          )}
          
          {imageError && (
            <div className="w-full h-full bg-red-100 dark:bg-red-900/20 rounded-lg shadow-md flex items-center justify-center border border-red-300 dark:border-red-700">
              <div className="text-red-600 dark:text-red-400 text-sm text-center p-2">
                <div>Failed to load image</div>
                <div className="text-xs mt-1">{imageError}</div>
              </div>
            </div>
          )}
          
          {objectUrl && !isImageLoading && !imageError && (
            <img
              src={objectUrl}
              alt={data.title || "Collage image"}
              className="max-w-full h-auto"
              style={{ width: "100%", height: "100%" }}
              draggable={false}
              onError={(e) => {
                console.error('❌ Object URL image failed to load:', {
                  objectUrl,
                  originalUrl: data.imageUrl,
                  error: e
                });
              }}
            />
          )}
          
         
        </div>
        </div>
      </TooltipProvider>
    </SimpleErrorBoundary>
  );
}; 