import React, { useEffect, useState, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
  ReactFlowProvider,
} from "@xyflow/react";
import { MdGridOn, MdGridOff } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Id } from "@convex/_generated/dataModel";
import { SimpleErrorBoundary } from "@/components/ui/error-boundary";
import { ImageNode } from "@/auth/components/collages/ImageNode";
import { ImageDetailsSidebar } from "@/auth/components/collages/ImageDetailsSidebar";
import { DragDropOverlay } from "@/auth/components/collages/DragDropOverlay";
import { ContextMenu } from "@/auth/components/collages/ContextMenu";
import { useCanvasLogic, ImageData } from "@/auth/components/collages/hooks/useCanvasLogic";
import { useAutoPreview } from "@/auth/components/collages/hooks/useAutoPreview";
import { useAuth } from "@/auth/use-auth-hooks.convex";
import { useAuthToken } from "@convex-dev/auth/react";
import { CanvasProvider } from "@/auth/components/collages/CanvasContext";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

import "@xyflow/react/dist/style.css";

const nodeTypes: NodeTypes = {
  imageNode: ImageNode,
};

interface CanvasProps {
  collageId: Id<"collages">;
  images: ImageData[];
  collage?: any; // Add collage data  
  collageName?: string;
  shareComponent?: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({ collageId, images, collage, collageName, shareComponent }) => {
  const { isLoaded, isSignedIn, user } = useAuth();
  const token = useAuthToken();
  const [menu, setMenu] = useState<{
    id: string;
    top?: number | false;
    left?: number | false;
    right?: number | false;
    bottom?: number | false;
  } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showGrid, setShowGrid] = useState(() => {
    // Load grid state from localStorage
    const saved = typeof window !== 'undefined' ? localStorage.getItem('collage-grid-visible') : null;
    return saved ? JSON.parse(saved) : true;
  });
  const ref = useRef<HTMLDivElement>(null);

  // Toggle grid and save to localStorage
  const toggleGrid = useCallback(() => {
    setShowGrid((prev: boolean) => {
      const newValue = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('collage-grid-visible', JSON.stringify(newValue));
      }
      return newValue;
    });
  }, []);
  
  // Debug authentication state
  useEffect(() => {
    console.log("Canvas auth state:", { 
      isSignedIn, 
      user: user?._id, 
      isLoaded, 
      hasToken: !!token,
      tokenLength: token?.length || 0
    });
  }, [isSignedIn, user, isLoaded, token]);
  
  const canvasLogic = useCanvasLogic({ collageId, images, collage });
  
  // Auto-preview generation hook
  const autoPreview = useAutoPreview({
    collageId,
    collageName: collageName || "Untitled Collage",
    nodes: canvasLogic.nodes,
    edges: canvasLogic.edges,
    savePositions: canvasLogic.handleSavePositions,
  });

  // Debug: Log when nodes change
  useEffect(() => {
    console.log("Canvas nodes changed:", canvasLogic.nodes.length, "nodes");
  }, [canvasLogic.nodes]);

  // Automatic preview generation disabled

  // Portal the share component to the header container
  const shareContainer = document.getElementById('share-button-container');

  // Handle context menu
  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: any) => {
    // Prevent native context menu from showing
    event.preventDefault();

    console.log(`Context menu opened for node ${node.id} at position (${event.clientX}, ${event.clientY})`);
    console.log(`Node current z-index: ${node.zIndex || 0}`);

    // Calculate position of the context menu. We want to make sure it
    // doesn't get positioned off-screen.
    const pane = ref.current?.getBoundingClientRect();
    if (!pane) return;

    const menuPosition = {
      id: node.id,
      top: event.clientY < pane.height - 200 && event.clientY,
      left: event.clientX < pane.width - 200 && event.clientX,
      right: event.clientX >= pane.width - 200 && pane.width - event.clientX,
      bottom: event.clientY >= pane.height - 200 && pane.height - event.clientY,
    };

    console.log(`Context menu position:`, menuPosition);
    setMenu(menuPosition);
  }, []);

  // Close the context menu if it's open whenever the window is clicked.
  const onPaneClick = useCallback(() => {
    setMenu(null);
    canvasLogic.onPaneClick();
  }, [canvasLogic]);

  // Handle keyboard events for delete key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle delete key if an image is selected and no input is focused
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        canvasLogic.selectedImageId &&
        !canvasLogic.sidebarOpen && // Don't trigger if sidebar is open (user might be editing text)
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement) &&
        !(event.target as HTMLElement)?.isContentEditable
      ) {
        event.preventDefault();
        setShowDeleteDialog(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [canvasLogic.selectedImageId, canvasLogic.sidebarOpen]);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    setShowDeleteDialog(false);
    await canvasLogic.handleImageDelete();
  }, [canvasLogic]);

  
  // Note: Authentication is handled by the parent SignedIn component,
  // but we still need to wait for the auth state to be loaded
  if (!isLoaded) {
    return <div className="flex justify-center items-center h-64">Loading authentication...</div>;
  }

  return (
    <SimpleErrorBoundary message="Error loading collage canvas. Please refresh the page.">
      <CanvasProvider nodes={canvasLogic.nodes} edges={canvasLogic.edges}>
        <div className="w-full h-full relative">
        
        {/* Preview generation overlay */}
        {autoPreview.isGeneratingPreview && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium">Generating preview...</span>
            </div>
          </div>
        )}
        <DragDropOverlay
          isDragOver={canvasLogic.isDragOver}
          onDragOver={canvasLogic.onDragOver}
          onDragLeave={canvasLogic.onDragLeave}
          onDrop={canvasLogic.onDrop}
        >
          <ReactFlow
            ref={ref}
            nodes={canvasLogic.nodes}
            edges={canvasLogic.edges}
            onNodesChange={canvasLogic.onNodesChange}
            onEdgesChange={canvasLogic.onEdgesChange}
            onNodeClick={canvasLogic.onNodeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes}
            elevateNodesOnSelect={true}
            fitView
            attributionPosition="bottom-left"
          >
            {showGrid && <Background variant={BackgroundVariant.Dots} gap={20} size={1} />}
            <Controls />
            {menu && (
              <ContextMenu
                onClick={() => setMenu(null)}
                onMoveForward={canvasLogic.handleMoveForward}
                onMoveBackward={canvasLogic.handleMoveBackward}
                {...menu}
              />
            )}
          </ReactFlow>
        </DragDropOverlay>

        <ImageDetailsSidebar
          isOpen={canvasLogic.sidebarOpen}
          onClose={() => canvasLogic.setSidebarOpen(false)}
          selectedImage={canvasLogic.selectedImage}
          onImageUpdate={canvasLogic.handleImageUpdate}
          onImageDelete={canvasLogic.handleImageDelete}
        />

        {/* Delete confirmation dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Image</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this image? This action cannot be undone and will permanently remove the image from your collage and storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
        
        {/* Portal grid toggle button to header */}
        {shareContainer && createPortal(
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleGrid}
                  className="mr-2"
                >
                  {showGrid ? <MdGridOff className="w-4 h-4" /> : <MdGridOn className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showGrid ? 'Hide grid' : 'Show grid'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>,
          shareContainer
        )}
        
        {/* Portal share component to header */}
        {shareComponent && shareContainer && createPortal(shareComponent, shareContainer)}
        
        {/* Preview generation is only on navigate away - no manual button needed */}
      </CanvasProvider>
    </SimpleErrorBoundary>
  );
};

// Wrapper component to provide ReactFlow context
export default function CanvasWrapper(props: CanvasProps) {
  return (
    <SimpleErrorBoundary message="Error initializing ReactFlow. Please refresh the page.">
      <ReactFlowProvider>
        <Canvas {...props} />
      </ReactFlowProvider>
    </SimpleErrorBoundary>
  );
}
