import { useCallback, useState } from "react";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Node, Edge } from "@xyflow/react";
import { exportCanvasToImage, dataUrlToBlob, generateImageFilename } from "@/utils/canvasExport";

interface UseSavePreviewProps {
  collageId: Id<"collages">;
  collageName: string;
}

interface SavePreviewOptions {
  nodes: Node[];
  edges: Edge[];
  canvasElement: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  isSharing?: boolean;
}

export const useSavePreview = ({ collageId, collageName }: UseSavePreviewProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const updatePreviewImage = useAction(api.collages.updatePreviewImage);
  const createSharedCollage = useAction(api.sharing.createSharedCollage);

  const savePreview = useCallback(async (options: SavePreviewOptions): Promise<any> => {
    const {
      nodes,
      edges,
      canvasElement,
      width = 800,
      height = 600,
      backgroundColor = document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
      padding = 0.1,
      minZoom = 0.05,
      maxZoom = 1.4,
      isSharing = false
    } = options;

    if (!nodes || nodes.length === 0) {
      throw new Error("No images to generate preview from");
    }

    if (!canvasElement) {
      throw new Error("Canvas not available for preview generation");
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        setIsLoading(true);

        // Generate collage image with specific error handling
        let exportResult;
        try {
          console.log(`📸 Starting canvas export (attempt ${attempt}/${maxRetries}):`, {
            nodeCount: nodes.length,
            canvasElement: !!canvasElement,
            dimensions: { width, height },
            context: isSharing ? 'sharing' : 'preview'
          });

          exportResult = await exportCanvasToImage({
            nodes,
            edges,
            canvasElement,
            width,
            height,
            backgroundColor,
            padding,
            minZoom,
            maxZoom
          });

          console.log(`✅ Canvas export completed successfully (attempt ${attempt}):`, {
            dataUrlLength: exportResult.dataUrl.length,
            viewport: exportResult.viewport,
            bounds: exportResult.nodesBounds
          });
        } catch (exportError) {
          console.error(`❌ Canvas export failed (attempt ${attempt}/${maxRetries}):`, {
            error: exportError,
            message: exportError instanceof Error ? exportError.message : 'Unknown export error',
            stack: exportError instanceof Error ? exportError.stack : 'No stack trace',
            nodeCount: nodes.length,
            canvasElement: !!canvasElement,
            dimensions: { width, height }
          });
          throw new Error(`Canvas export failed: ${exportError instanceof Error ? exportError.message : 'Unknown error'}`);
        }

        // Convert to blob for upload
        const imageBlob = dataUrlToBlob(exportResult.dataUrl);
        const filename = isSharing 
          ? generateImageFilename(collageName)
          : `preview-${generateImageFilename(collageName)}`;

        const arrayBuffer = await imageBlob.arrayBuffer();

        // Upload based on context (sharing vs preview)
        if (isSharing) {
          console.log(`📤 Uploading shared collage (attempt ${attempt}/${maxRetries}):`, {
            filename,
            size: arrayBuffer.byteLength,
            type: imageBlob.type,
            collageId,
            nodeCount: nodes.length
          });
          
          const result = await createSharedCollage({
            collageId,
            imageBlob: arrayBuffer,
            filename,
            contentType: imageBlob.type,
            exportViewport: exportResult.viewport,
            exportBounds: exportResult.nodesBounds,
            exportDimensions: { width, height },
          });
          
          console.log(`✅ Shared collage uploaded successfully on attempt ${attempt}:`, {
            shareId: result.shareId,
            filename
          });
          
          return result;
        } else {
          console.log(`📤 Uploading preview image (attempt ${attempt}/${maxRetries}):`, {
            filename,
            size: arrayBuffer.byteLength,
            type: imageBlob.type,
            collageId,
            nodeCount: nodes.length
          });
          
          await updatePreviewImage({
            collageId,
            imageBlob: arrayBuffer,
            filename,
            contentType: imageBlob.type,
          });
          
          console.log(`✅ Preview image uploaded successfully on attempt ${attempt}:`, {
            filename,
            collageId
          });
          
          return { success: true };
        }
      } catch (error) {
        console.error("Raw Upload Error", error)

        lastError = error instanceof Error ? error : new Error(`Upload attempt ${attempt} failed`);
        
        // Log detailed error information
        console.error(`❌ Preview upload attempt ${attempt}/${maxRetries} failed:`, {
          message: lastError.message,
          stack: lastError.stack,
          attempt,
          context: isSharing ? 'sharing' : 'preview',
          collageId,
          collageName,
          nodeCount: nodes.length,
          error: lastError
        });
        
        if (attempt === maxRetries) {
          console.error(`❌ All ${maxRetries} upload attempts failed. Final error:`, lastError);
          throw lastError;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(`⏳ Retrying upload in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } finally {
        if (attempt === maxRetries) {
          setIsLoading(false);
        }
      }
    }

    throw lastError || new Error("All retry attempts failed");
  }, [collageId, collageName, updatePreviewImage, createSharedCollage]);

  return {
    savePreview,
    isLoading
  };
};