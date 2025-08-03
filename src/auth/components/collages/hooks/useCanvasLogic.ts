import { useState, useCallback, useEffect } from "react";
import { Node, useNodesState, useEdgesState } from "@xyflow/react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { useAuth } from "@/auth/use-auth-hooks.convex";
// Remove the import and define ImageData locally to match the new schema
export interface ImageData {
  _id: Id<"images">;
  storageKey: string;
  imageUrl?: string; // Generated URL for display
  title?: string;
  tags?: string[];
  description?: string;
  price?: number;
  includePrice?: boolean;
  otherUrls?: any;
  width?: number;
  height?: number;
  position?: Position;
  // Legacy fields for backward compatibility
  left?: number;
  top?: number;
  zindex?: number;
  rotation?: number;
  zoom?: number;
}
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Position } from "@convex/images";
import { useUploadFile } from "@convex-dev/r2/react";

interface UseCanvasLogicProps {
  collageId: Id<"collages">;
  images: ImageData[];
  collage?: any;
}

// Helper function to get position values with fallback to legacy fields
const getPosition = (image: ImageData): Position => {
  if (image.position) {
    return image.position;
  }
  
  // Fallback to legacy fields
  return {
    x: image.left,
    y: image.top,
    width: image.width,
    height: image.height,
    zindex: image.zindex,
    rotation: image.rotation,
    zoom: image.zoom,
  };
};

export const useCanvasLogic = ({ collageId, images, collage }: UseCanvasLogicProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedImageId, setSelectedImageId] = useState<Id<"images"> | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const { isLoaded, isSignedIn, user } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ from: "/collage/$id" });

  const updateImageTransform = useMutation(api.images.updateTransform);
  const updateImage = useMutation(api.images.update);
  const createImage = useMutation(api.images.create);
  const deleteImage = useMutation(api.images.remove);
  const updateCollageImageOrder = useMutation(api.collages.updateImageOrder);

  // Use R2 upload hook
  const uploadFile = useUploadFile({
    generateUploadUrl: api.r2.generateUploadUrl,
    syncMetadata: api.r2.syncMetadata,
  });

  // Handle URL decoration for selected image
  const updateUrlWithSelection = useCallback((imageId: Id<"images"> | null) => {
    const newSearch = { ...search };
    if (imageId) {
      newSearch.selected = imageId;
    } else {
      delete newSearch.selected;
    }
    
    navigate({
      search: newSearch,
      replace: true,
    });
  }, [navigate, search]);

  // Restore selection from URL on page load
  useEffect(() => {
    const selectedFromUrl = (search as any)?.selected;
    if (selectedFromUrl && images.length > 0) {
      const image = images.find(img => img._id === selectedFromUrl);
      if (image) {
        setSelectedImageId(selectedFromUrl);
        setSelectedImage(image);
        // Don't automatically open sidebar - only open on gear icon click
        // setSidebarOpen(true);
      }
    }
  }, [images, search]);

  // Handle gear icon click to open sidebar
  const handleGearClick = useCallback((imageId: Id<"images">) => {
    const image = images.find(img => img._id === imageId);
    if (image) {
      setSelectedImageId(imageId);
      setSelectedImage(image);
      setSidebarOpen(true);
      // Update URL with selected image
      updateUrlWithSelection(imageId);
    }
  }, [images, updateUrlWithSelection]);

  // Convert images to nodes and sync selection state (restore positions from database)
  useEffect(() => {
    if (!images || images.length === 0) {
      setNodes([]);
      return;
    }
    
    // Sort images by collage.images array order if available, otherwise fallback to z-index
    let sortedImages: ImageData[];
    if (collage?.images && Array.isArray(collage.images)) {
      // Use collage.images array order (this is the authoritative source)
      sortedImages = collage.images.map((imageId: Id<"images">) => 
        images.find(img => img._id === imageId)
      ).filter(Boolean); // Remove any undefined entries
      
      // Add any images that aren't in the collage.images array (shouldn't happen, but safety)
      const imageIdsInOrder = new Set(collage.images);
      const missingImages = images.filter(img => !imageIdsInOrder.has(img._id));
      sortedImages.push(...missingImages);
    } else {
      // Fallback to z-index sorting if collage.images array isn't available
      sortedImages = [...images].sort((a, b) => {
        const aPosition = getPosition(a);
        const bPosition = getPosition(b);
        return (aPosition.zindex || 0) - (bPosition.zindex || 0);
      });
    }
    
    const imageNodes: Node[] = sortedImages.map((image) => {
      const position = getPosition(image);
      
      return {
        id: image._id,
        type: "imageNode",
        position: {
          x: position.x || 0,
          y: position.y || 0,
        },
        data: {
          imageId: image._id,
          imageUrl: image.imageUrl,
          title: image.title,
          tags: image.tags,
          description: image.description,
          price: image.price,
          includePrice: image.includePrice,
          isSelected: selectedImageId === image._id,
          onGearClick: handleGearClick,
          onMoveForward: handleMoveForward,
          onMoveBackward: handleMoveBackward,
          rotation: position.rotation,
        },
        style: {
          width: position.width || 200,
          height: position.height || 200,
        },
        selected: selectedImageId === image._id,
        dragHandle: '.drag-handle',
      };
    });
    
    // Log z-indexes of all images on canvas load (restore from database)
    // console.log("=== Canvas Images Position Restore Report ===");
    // console.log(`Total images: ${imageNodes.length}`);
    // console.log("=== Images in array order (bottom to top layering) ===");
    // imageNodes.forEach((node, index) => {
    //   const originalImage = images.find(img => img._id === node.id);
    //   const position = getPosition(originalImage!);
    //   console.log(`Array index ${index}: ID=${node.id}, restored position=(${position.x || 0}, ${position.y || 0}), size=(${position.width || 200}x${position.height || 200}), z-index=${position.zindex || 0}, title="${node.data.title || 'Untitled'}"`);
    // });
    // console.log("=== End Position Restore Report ===");
    
    setNodes(imageNodes);
  }, [images, collage, selectedImageId, handleGearClick, setNodes]);

  // Handle node selection (for visual feedback only)
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const imageId = node.id as Id<"images">;
    setSelectedImageId(imageId);
    const image = images.find(img => img._id === imageId);
    setSelectedImage(image || null);
    // Don't automatically open sidebar - only open on gear icon click
    // setSidebarOpen(true);
    
    // Update URL with selected image
    updateUrlWithSelection(imageId);
  }, [images, updateUrlWithSelection]);

  // Handle pane click to clear selection
  const onPaneClick = useCallback(() => {
    setSelectedImageId(null);
    setSelectedImage(null);
    // Remove selection from URL
    updateUrlWithSelection(null);
  }, [updateUrlWithSelection]);

  // Handle sidebar close
  const handleSidebarClose = useCallback((open: boolean) => {
    setSidebarOpen(open);
    if (!open) {
      setSelectedImageId(null);
      setSelectedImage(null);
      // Remove selection from URL
      updateUrlWithSelection(null);
    }
  }, [updateUrlWithSelection]);

  // Handle node changes with automatic position saving
  // This implements the save/restore functionality similar to React Flow's example:
  // https://reactflow.dev/examples/interaction/save-and-restore
  const handleNodesChange = useCallback((changes: any[]) => {
    // Debug: Log all changes
    // console.log("Node changes received:", changes.map(c => ({ 
    //   id: c.id, 
    //   type: c.type, 
    //   dragging: c.dragging, 
    //   resizing: c.resizing,
    //   position: c.position,
    //   dimensions: c.dimensions
    // })));
    
    // First, apply the changes to ReactFlow's internal state
    onNodesChange(changes);
    
    // Auto-save positions when drag or resize operations complete
    // Check if any changes are position-related drag completions or dimension changes
    const positionChanges = changes.filter(change => 
      change.type === 'position' && change.dragging === false
    );
    
    const dimensionChanges = changes.filter(change => 
      change.type === 'dimensions' && change.resizing === false
    );
    
    if (positionChanges.length > 0 || dimensionChanges.length > 0) {
      // Save positions automatically after drag or resize completion
      setTimeout(() => {
        const allChanges = [...positionChanges, ...dimensionChanges];
        
        if (allChanges.length > 0) {
          // console.log("Auto-saving positions for moved/resized nodes:", allChanges.length);
          // console.log("Changes:", allChanges.map(c => ({ id: c.id, type: c.type, position: c.position, dimensions: c.dimensions })));
          setIsAutoSaving(true);
          
          const savePromises = allChanges.map(async (change) => {
            const imageId = change.id as Id<"images">;
            
            // For dimension changes, we need to get the updated dimensions
            // For position changes, we can use the position from the change
            let position: Position;
            
            if (change.type === 'dimensions') {
              // Get the current node to combine position with new dimensions
              const currentNode = nodes.find(node => node.id === change.id);
              if (!currentNode) {
                // console.warn(`Node ${change.id} not found in nodes array for dimension change`);
                return;
              }
              
              position = {
                x: currentNode.position.x,
                y: currentNode.position.y,
                width: change.dimensions?.width ?? (currentNode.style?.width ? Number(currentNode.style.width) : undefined),
                height: change.dimensions?.height ?? (currentNode.style?.height ? Number(currentNode.style.height) : undefined),
                // Preserve existing zindex and rotation from database
                zindex: (() => {
                  const originalImage = images.find(img => img._id === imageId);
                  if (originalImage) {
                    const originalPosition = getPosition(originalImage);
                    return originalPosition.zindex;
                  }
                  return 0;
                })(),
                rotation: (() => {
                  const originalImage = images.find(img => img._id === imageId);
                  if (originalImage) {
                    const originalPosition = getPosition(originalImage);
                    return originalPosition.rotation;
                  }
                  return undefined;
                })(),
              };
            } else if (change.type === 'position') {
              // For position changes, use the new position and preserve existing dimensions
              const currentNode = nodes.find(node => node.id === change.id);
              if (!currentNode) {
                // console.warn(`Node ${change.id} not found in nodes array for position change`);
                return;
              }
              
              position = {
                x: change.position?.x ?? currentNode.position.x,
                y: change.position?.y ?? currentNode.position.y,
                width: currentNode.style?.width ? Number(currentNode.style.width) : undefined,
                height: currentNode.style?.height ? Number(currentNode.style.height) : undefined,
                // Preserve existing zindex and rotation from database
                zindex: (() => {
                  const originalImage = images.find(img => img._id === imageId);
                  if (originalImage) {
                    const originalPosition = getPosition(originalImage);
                    return originalPosition.zindex;
                  }
                  return 0;
                })(),
                rotation: (() => {
                  const originalImage = images.find(img => img._id === imageId);
                  if (originalImage) {
                    const originalPosition = getPosition(originalImage);
                    return originalPosition.rotation;
                  }
                  return undefined;
                })(),
              };
            } else {
              // console.warn(`Unknown change type: ${change.type}`);
              return;
            }
            
            // console.log("Auto-saving position for image:", { imageId, position, changeType: change.type });
            return updateImageTransform({ id: imageId, position });
          });

          Promise.all(savePromises.filter(Boolean))
            .then(() => {
              // console.log("Auto-save completed successfully");
            })
            .catch(error => {
              // console.error("Failed to auto-save positions:", error);
            })
            .finally(() => {
              setIsAutoSaving(false);
            });
        }
      }, 100); // Small delay to ensure state is updated
    }
  }, [onNodesChange, nodes, images, updateImageTransform]);

  // Save all current positions
  const handleSavePositions = useCallback(async () => {
    if (!isLoaded) {
      toast.error("Please wait for authentication to complete.");
      return;
    }

    setIsSaving(true);
    try {
      // console.log("Saving all positions for nodes:", nodes.length);
      
      const savePromises = nodes.map(async (node, index) => {
        const imageId = node.id as Id<"images">;
        const position: Position = {
          x: node.position.x,
          y: node.position.y,
          width: node.style?.width ? Number(node.style.width) : undefined,
          height: node.style?.height ? Number(node.style.height) : undefined,
          zindex: index, // Use array index as z-index (0 = bottom, higher = top)
          // Preserve existing rotation from database
          rotation: (() => {
            const originalImage = images.find(img => img._id === imageId);
            if (originalImage) {
              const originalPosition = getPosition(originalImage);
              return originalPosition.rotation;
            }
            return undefined;
          })(),
        };
        
        // console.log("Saving position for image:", { imageId, position });
        return updateImageTransform({ id: imageId, position });
      });

      await Promise.all(savePromises);
      // console.log("Successfully saved all positions");
    } catch (error) {
      // console.error("Failed to save positions:", error);
      
      if (error instanceof Error && error.message.includes("Not authenticated")) {
        toast.error("Authentication error. Please try refreshing the page.");
      } else {
        toast.error("Failed to save positions. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [nodes, updateImageTransform, isLoaded]);

  // Handle file upload with R2
  const handleFileUpload = useCallback(async (file: File) => {
    if (!isLoaded) {
      toast.error("Please wait for authentication to complete.");
      return;
    }
    
    try {
      // Upload file to R2 and get the storage key
      const storageKey = await uploadFile(file);
      
      if (!storageKey) {
        throw new Error("Failed to upload file to R2");
      }

      // Get actual image dimensions
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      const { naturalWidth, naturalHeight } = await new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve, reject) => {
        img.onload = () => {
          URL.revokeObjectURL(imageUrl);
          resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
        };
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        img.src = imageUrl;
      });

      // Create image record with storage key and actual dimensions
      const position: Position = {
        x: Math.random() * 400,
        y: Math.random() * 400,
        width: 200,
        height: 200,
        zindex: 0,
      };
      
      await createImage({
        collageId,
        storageKey,
        title: file.name,
        width: naturalWidth,
        height: naturalHeight,
        position,
      });

      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      
      if (error instanceof Error && error.message.includes("Not authenticated")) {
        toast.error("Authentication error. Please try refreshing the page.");
      } else {
        toast.error("Failed to upload image");
      }
    }
  }, [uploadFile, createImage, collageId, isLoaded]);

  // Handle drag and drop
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast.error("Please drop image files only");
      return;
    }

    imageFiles.forEach(handleFileUpload);
  }, [handleFileUpload]);

  // Handle image details update
  const handleImageUpdate = useCallback(async (updates: Partial<ImageData>) => {
    if (!selectedImageId) return;
    
    if (!isLoaded) {
      toast.error("Please wait for authentication to complete.");
      return;
    }
    
    try {
      await updateImage({ id: selectedImageId, ...updates });
    } catch (error) {
      console.error("Failed to update image:", error);
      
      if (error instanceof Error && error.message.includes("Not authenticated")) {
        toast.error("Authentication error. Please try refreshing the page.");
      } else {
        toast.error("Failed to update image");
      }
    }
  }, [selectedImageId, updateImage, isLoaded]);

  // Handle image deletion
  const handleImageDelete = useCallback(async () => {
    if (!selectedImageId) return;
    
    if (!isLoaded) {
      toast.error("Please wait for authentication to complete.");
      return;
    }
    
    try {
      await deleteImage({ id: selectedImageId });
      handleSidebarClose(false);
      toast.success("Image deleted successfully");
    } catch (error) {
      console.error("Failed to delete image:", error);
      
      if (error instanceof Error && error.message.includes("Not authenticated")) {
        toast.error("Authentication error. Please try refreshing the page.");
      } else {
        toast.error("Failed to delete image");
      }
    }
  }, [selectedImageId, deleteImage, isLoaded, handleSidebarClose]);

  // Handle z-index management by reordering nodes array and persisting to collage
  const handleMoveForward = useCallback(async (nodeId: string) => {
    console.log(`Moving node ${nodeId} forward in z-index`);
    
    setNodes((nds) => {
      const nodeIndex = nds.findIndex(node => node.id === nodeId);
      if (nodeIndex === -1 || nodeIndex === nds.length - 1) {
        console.log(`Node ${nodeId} is already at the top or not found`);
        return nds; // Node not found or already at the top
      }

      // Create new array with the node moved one position forward (higher in z-index)
      const newNodes = [...nds];
      const [nodeToMove] = newNodes.splice(nodeIndex, 1);
      newNodes.splice(nodeIndex + 1, 0, nodeToMove);

      console.log(`Node ${nodeId}: moved from index ${nodeIndex} to ${nodeIndex + 1}`);
      console.log('New node order (bottom to top):', newNodes.map((n, i) => ({ index: i, id: n.id })));
      
      // Immediately persist the new order to the collage
      setTimeout(async () => {
        try {
          const imageIds = newNodes.map(node => node.id as Id<"images">);
          console.log('Updating collage image order:', imageIds);
          await updateCollageImageOrder({ 
            collageId, 
            imageIds 
          });
          console.log('Successfully persisted image order to collage');
        } catch (error) {
          console.error('Failed to persist image order:', error);
        }
      }, 0);
      
      return newNodes;
    });
  }, [setNodes, collageId, updateCollageImageOrder]);

  const handleMoveBackward = useCallback(async (nodeId: string) => {
    // console.log(`Moving node ${nodeId} backward in z-index`);
    
    setNodes((nds) => {
      const nodeIndex = nds.findIndex(node => node.id === nodeId);
      if (nodeIndex === -1 || nodeIndex === 0) {
        // console.log(`Node ${nodeId} is already at the bottom or not found`);
        return nds; // Node not found or already at the bottom
      }

      // Create new array with the node moved one position backward (lower in z-index)
      const newNodes = [...nds];
      const [nodeToMove] = newNodes.splice(nodeIndex, 1);
      newNodes.splice(nodeIndex - 1, 0, nodeToMove);

      // console.log(`Node ${nodeId}: moved from index ${nodeIndex} to ${nodeIndex - 1}`);
      // console.log('New node order (bottom to top):', newNodes.map((n, i) => ({ index: i, id: n.id })));
      
      // Immediately persist the new order to the collage
      setTimeout(async () => {
        try {
          const imageIds = newNodes.map(node => node.id as Id<"images">);
          // console.log('Updating collage image order:', imageIds);
          await updateCollageImageOrder({ 
            collageId, 
            imageIds 
          });
          // console.log('Successfully persisted image order to collage');
        } catch (error) {
          // console.error('Failed to persist image order:', error);
        }
      }, 0);
      
      return newNodes;
    });
  }, [setNodes, collageId, updateCollageImageOrder]);

  return {
    nodes,
    edges,
    selectedImage,
    selectedImageId,
    sidebarOpen,
    isDragOver,
    isSaving,
    isAutoSaving,
    isLoaded,
    onNodesChange: handleNodesChange,
    onEdgesChange,
    onNodeClick,
    onDragOver,
    onDragLeave,
    onDrop,
    handleSavePositions,
    handleImageUpdate,
    handleImageDelete,
    setSidebarOpen: handleSidebarClose,
    setSelectedImage,
    onPaneClick,
    handleMoveForward,
    handleMoveBackward,
  };
}; 