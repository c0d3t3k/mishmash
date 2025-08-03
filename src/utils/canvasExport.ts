import { Node, Edge, getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";

interface ExportCanvasOptions {
  nodes: Node[];
  edges: Edge[];
  canvasElement: HTMLElement;
  width?: number;
  height?: number;
  backgroundColor?: string;
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Export React Flow canvas to PNG image
 * Based on: https://reactflow.dev/examples/misc/download-image
 */
export async function exportCanvasToImage({
  nodes,
  edges,
  canvasElement,
  width = 1024,
  height = 768,
  backgroundColor = '#ffffff',
  padding = 0.1,
  minZoom = 0.5,
  maxZoom = 2
}: ExportCanvasOptions): Promise<{ dataUrl: string; viewport: any; nodesBounds: any }> {
  console.log('🎯 exportCanvasToImage - Starting export with params:', {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    width,
    height,
    backgroundColor,
    padding,
    minZoom,
    maxZoom,
    canvasElement: !!canvasElement
  });

  try {
    // Validate inputs
    if (!nodes || nodes.length === 0) {
      throw new Error('No nodes provided for export');
    }
    
    if (!canvasElement) {
      throw new Error('Canvas element is null or undefined');
    }

    // Get the bounds of all nodes
    console.log('📐 Calculating node bounds...');
    let nodesBounds;
    try {
      nodesBounds = getNodesBounds(nodes);
      console.log('✅ Node bounds calculated:', nodesBounds);
    } catch (boundsError) {
      console.error('❌ Failed to calculate node bounds:', boundsError);
      throw new Error(`Failed to calculate node bounds: ${boundsError instanceof Error ? boundsError.message : 'Unknown error'}`);
    }
    
    // Calculate the viewport to fit all nodes
    console.log('📊 Calculating viewport for bounds...');
    let viewport;
    try {
      viewport = getViewportForBounds(
        nodesBounds,
        width,
        height,
        minZoom,
        maxZoom,
        padding
      );
      console.log('✅ Viewport calculated:', viewport);
    } catch (viewportError) {
      console.error('❌ Failed to calculate viewport:', viewportError);
      throw new Error(`Failed to calculate viewport: ${viewportError instanceof Error ? viewportError.message : 'Unknown error'}`);
    }

    // Find the React Flow viewport element
    console.log('🔍 Finding React Flow viewport element...');
    const reactFlowViewport = canvasElement.querySelector('.react-flow__viewport') as HTMLElement;
    
    if (!reactFlowViewport) {
      console.error('❌ React Flow viewport not found in canvas element');
      console.log('Available elements in canvas:', {
        childElementCount: canvasElement.childElementCount,
        className: canvasElement.className,
        children: Array.from(canvasElement.children).map(child => ({
          tagName: child.tagName,
          className: child.className
        }))
      });
      throw new Error('React Flow viewport not found');
    }
    
    console.log('✅ React Flow viewport found');

    // Store original transform to restore later
    const originalTransform = reactFlowViewport.style.transform;
    console.log('💾 Stored original transform:', originalTransform);
    
    try {
      // Apply the calculated viewport transform to show all nodes
      const newTransform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
      console.log('🔄 Applying viewport transform:', newTransform);
      reactFlowViewport.style.transform = newTransform;
      
      // Wait a bit for the transform to take effect
      console.log('⏱️ Waiting for transform to take effect...');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Generate the image using html-to-image on the entire canvas
      console.log('📸 Starting toPng conversion...', {
        canvasElement,
        width,
        height,
      });
      let dataUrl;
      try {
        dataUrl = await toPng(canvasElement, {
          backgroundColor,
          width,
          height,
          pixelRatio: 2, // Higher quality
          skipAutoScale: true,
          filter: (node) => {
            // Exclude certain elements that might interfere
            return !node.classList?.contains('react-flow__minimap') &&
                   !node.classList?.contains('react-flow__controls');
          },
          fetchRequestInit: {mode:'no-cors'}
        });
        console.log('✅ toPng conversion completed, dataUrl length:', dataUrl.length);
      } catch (toPngError) {
        console.error('❌ toPng conversion failed:', {
          error: toPngError,
          message: toPngError instanceof Error ? toPngError.message : 'Unknown toPng error',
          stack: toPngError instanceof Error ? toPngError.stack : 'No stack trace'
        });
        throw new Error(`Image generation failed: ${toPngError instanceof Error ? toPngError.message : 'Unknown error'}`);
      }
      
      console.log('🎉 Canvas export completed successfully');
      return { dataUrl, viewport, nodesBounds };
    } finally {
      // Restore original transform
      console.log('🔄 Restoring original transform:', originalTransform);
      reactFlowViewport.style.transform = originalTransform;
    }
  } catch (error) {
    console.error('❌ exportCanvasToImage failed:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw error;
  }
}

/**
 * Convert data URL to Blob for upload
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  console.log('🔄 Converting dataUrl to blob, length:', dataUrl.length);
  
  try {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid dataUrl provided');
    }

    const arr = dataUrl.split(',');
    if (arr.length !== 2) {
      throw new Error('Invalid dataUrl format - missing comma separator');
    }

    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch?.[1] || 'image/png';
    console.log('📄 Detected MIME type:', mime);

    if (!arr[1]) {
      throw new Error('Invalid dataUrl format - missing base64 data');
    }

    let bstr;
    try {
      bstr = atob(arr[1]);
    } catch (atobError) {
      console.error('❌ Failed to decode base64 data:', atobError);
      throw new Error('Failed to decode base64 data from dataUrl');
    }

    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    const blob = new Blob([u8arr], { type: mime });
    console.log('✅ Blob created successfully:', {
      size: blob.size,
      type: blob.type
    });
    
    return blob;
  } catch (error) {
    console.error('❌ dataUrlToBlob failed:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      dataUrlLength: dataUrl?.length || 0
    });
    throw error;
  }
}

/**
 * Generate a unique filename for the exported image
 */
export function generateImageFilename(collageName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeName = collageName.replace(/[^a-zA-Z0-9-_]/g, '_');
  return `collage-${safeName}-${timestamp}.png`;
}