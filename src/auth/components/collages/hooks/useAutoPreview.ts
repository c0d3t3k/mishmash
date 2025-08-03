import { useEffect, useRef, useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Node, Edge, useReactFlow } from "@xyflow/react";
import { useSavePreview } from "@/hooks/useSavePreview";
import { toast } from "sonner";
import { useBlocker } from "@tanstack/react-router";

interface UseAutoPreviewProps {
  collageId: Id<"collages">;
  collageName: string;
  nodes: Node[];
  edges: Edge[];
  savePositions: () => Promise<void>;
}

export const useAutoPreview = ({ collageId, collageName, nodes, edges, savePositions }: UseAutoPreviewProps) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const initialNodesRef = useRef<string>("");
  const lastSavedNodesRef = useRef<string>("");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProcessingNavigationRef = useRef(false);
  const { setNodes } = useReactFlow();
  
  const { savePreview, isLoading: isSavingPreview } = useSavePreview({ collageId, collageName });

  // Generate preview image
  const generatePreview = useCallback(async (): Promise<boolean> => {
    console.log("🎯 Starting generatePreview", { collageId, collageName, nodeCount: nodes?.length });
    
    // Check if collage has any images
    if (!nodes || nodes.length === 0) {
      console.log("❌ No images to generate preview from");
      return false;
    }

    // Find the React Flow container element
    const canvasElement = document.querySelector('.react-flow') as HTMLElement;
    if (!canvasElement) {
      console.warn("❌ Canvas not available for preview generation");
      return false;
    }

    // Store original selection state
    const originalNodes = [...nodes];
    
    try {
      console.log("⏳ Setting isGeneratingPreview to true");
      setIsGeneratingPreview(true);
      
      // Temporarily deselect all nodes to hide blue resize handles and selection indicators
      const cleanNodes = nodes.map(node => ({ ...node, selected: false }));
      console.log("🧹 Cleaned nodes, setting to canvas");
      setNodes(cleanNodes);
      
      // Wait a brief moment for the UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log("📸 Calling savePreview...");
      // Use the new savePreview hook with retry logic
      await savePreview({
        nodes: cleanNodes,
        edges,
        canvasElement,
        width: 800, // Larger size for better quality
        height: 600,
        padding: 0.1, // Minimal padding to reduce whitespace
        minZoom: 0.05, // Allow much more zoom out to fit entire collage
        maxZoom: 1.4  // Higher max zoom to get closer to content
      });
      
      console.log("✅ Preview uploaded successfully");
      
      // Restore original selection state
      setNodes(originalNodes);
      
      // Update last saved state to reflect that preview is now current
      const currentNodesString = JSON.stringify(cleanNodes.map(node => ({
        id: node.id,
        position: node.position,
        style: node.style,
      })));
      lastSavedNodesRef.current = currentNodesString;
      setHasChanges(false); // Clear changes flag after successful preview
      
      console.log("🎉 Preview generation completed successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to generate preview:", error);
      console.error("❌ Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        error
      });
      // Restore original selection state even on error
      setNodes(originalNodes);
      return false;
    } finally {
      console.log("🏁 Setting isGeneratingPreview to false");
      setIsGeneratingPreview(false);
    }
  }, [nodes, edges, collageName, collageId, savePreview, setNodes]);

  // Track changes to nodes - NO AUTO GENERATION
  useEffect(() => {
    const currentNodesString = JSON.stringify(nodes.map(node => ({
      id: node.id,
      position: node.position,
      style: node.style,
    })));

    // Initialize on first load
    if (initialNodesRef.current === "") {
      console.log("🏁 Initializing node tracking", { nodeCount: nodes.length });
      initialNodesRef.current = currentNodesString;
      lastSavedNodesRef.current = currentNodesString;
      return;
    }

    // Check if there are changes compared to last saved state
    const hasChangesNow = currentNodesString !== lastSavedNodesRef.current && nodes.length > 0;
    console.log("🔍 Checking for changes", { 
      hasChangesNow, 
      nodeCount: nodes.length,
      currentHash: currentNodesString.slice(0, 50) + '...',
      lastSavedHash: lastSavedNodesRef.current.slice(0, 50) + '...'
    });
    setHasChanges(hasChangesNow);

    // Clear existing debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Just track changes, NO AUTO-GENERATION
  }, [nodes]);

  // Use TanStack Router blocker for navigation blocking
  const { proceed, reset, status } = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      // Only block if we're actually leaving the collage route (not just opening sidebar)
      const isLeavingCollage = current.routeId === '/collage/$id' && next.routeId !== '/collage/$id';
      
      // Block navigation if we have unsaved changes, not currently processing, AND leaving collage
      const shouldBlock = hasChanges && nodes.length > 0 && !isProcessingNavigationRef.current && isLeavingCollage;
      
      console.log("🤔 Should block navigation?", { 
        hasChanges, 
        nodeCount: nodes.length, 
        isProcessing: isProcessingNavigationRef.current, 
        isLeavingCollage,
        currentRoute: current.routeId,
        nextRoute: next.routeId,
        shouldBlock 
      });
      
      return shouldBlock;
    },
    withResolver: true,
  });

  // Handle blocked navigation
  useEffect(() => {
    if (status === 'blocked' && !isProcessingNavigationRef.current) {
      console.log("🛑 Navigation blocked - saving and generating preview");
      
      const handleBlockedNavigation = async () => {
        // Set flag to prevent multiple executions
        isProcessingNavigationRef.current = true;
        
        try {
          console.log("💾 SAVING POSITIONS...");
          await savePositions();
          
          // Update tracking after successful save
          const currentNodesString = JSON.stringify(nodes.map(node => ({
            id: node.id,
            position: node.position,
            style: node.style,
          })));
          lastSavedNodesRef.current = currentNodesString;
          
          console.log("📸 GENERATING PREVIEW...");
          await generatePreview();
          console.log("✅ SAVE AND PREVIEW COMPLETE - proceeding with navigation");
          
          // Reset processing flag before proceeding
          isProcessingNavigationRef.current = false;
          proceed(); // Allow navigation to continue
        } catch (error) {
          console.error("❌ FAILED:", error);
          console.error("❌ Navigation save/preview error details:", {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace',
            error
          });
          isProcessingNavigationRef.current = false;
          reset(); // Cancel navigation on error
        }
      };
      
      handleBlockedNavigation();
    }
  }, [status, proceed, reset, savePositions, generatePreview, nodes]);

  return {
    hasChanges,
    isGeneratingPreview: isGeneratingPreview || isSavingPreview,
    generatePreview, // Keep this for the navigation-away functionality
  };
};;