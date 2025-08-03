import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tags } from "@/components/ui/tags";
import { Urls, UrlItem } from "@/components/ui/urls";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { X } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

// Debounce delay for form inputs to prevent excessive backend saves
const DEBOUNCE_DELAY = 1500; // 1.5 seconds

import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { ImgComparisonSlider } from "@img-comparison-slider/react";
import { Id } from "@convex/_generated/dataModel";
import { Position } from "@convex/images";
import { processImage, initializeModel } from "../bg-remove/process";
import { useAction, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useUploadFile } from "@convex-dev/r2/react";

export interface ImageData {
  _id: Id<"images">;
  storageKey: string;
  imageUrl?: string; // Generated URL for display
  title?: string;
  tags?: string[];
  description?: string;
  price?: number;
  includePrice?: boolean;
  otherUrls?: UrlItem[];
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

interface ImageDetailsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedImage: ImageData | null;
  onImageUpdate: (updates: Partial<ImageData>) => void;
  onImageDelete: () => void;
}

export const ImageDetailsSidebar: React.FC<ImageDetailsSidebarProps> = ({
  isOpen,
  onClose,
  selectedImage,
  onImageUpdate,
  onImageDelete,
}) => {
  const [showComparison, setShowComparison] = useState(false);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local state for form inputs to enable immediate UI updates
  const [localTitle, setLocalTitle] = useState(selectedImage?.title || "");
  const [localDescription, setLocalDescription] = useState(selectedImage?.description || "");
  const [localPrice, setLocalPrice] = useState(selectedImage?.price || 0);

  // Update local state when selectedImage changes
  useEffect(() => {
    setLocalTitle(selectedImage?.title || "");
    setLocalDescription(selectedImage?.description || "");
    setLocalPrice(selectedImage?.price || 0);
  }, [selectedImage]);

  // Debounced update functions using use-debounce library
  // These won't fire if user is still typing (leading: false, trailing: true)
  const debouncedUpdateTitle = useDebouncedCallback(
    (title: string) => onImageUpdate({ title }),
    DEBOUNCE_DELAY,
    { leading: false, trailing: true }
  );

  const debouncedUpdateDescription = useDebouncedCallback(
    (description: string) => onImageUpdate({ description }),
    DEBOUNCE_DELAY,
    { leading: false, trailing: true }
  );

  const debouncedUpdatePrice = useDebouncedCallback(
    (price: number) => onImageUpdate({ price }),
    DEBOUNCE_DELAY,
    { leading: false, trailing: true }
  );

  // Use the same R2 upload hook as the working Canvas component
  const uploadFile = useUploadFile({
    generateUploadUrl: api.r2.generateUploadUrl,
    syncMetadata: api.r2.syncMetadata,
  });

  // Action to delete file from R2
  const deleteFile = useAction(api.r2.deleteFileAction);

  // Get fresh image data to ensure we have a valid URL
  const freshImageData = useQuery(api.images.get, 
    selectedImage ? { id: selectedImage._id } : "skip"
  );

  const handleProcessBackground = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    try {
      // Initialize model if needed
      await initializeModel();
      
      // Use fresh image URL if available, fallback to the passed one
      const imageUrl = freshImageData?.imageUrl || selectedImage.imageUrl;
      
      if (!imageUrl) {
        throw new Error('No image URL available');
      }
      
      // Create a temporary image element to load the image
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Enable CORS for canvas operations
      
      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = imageUrl;
      });
      
      // Create a canvas to convert the image to a blob
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
          'image/png'
        );
      });
      
      // Create a File object from the blob
      const file = new File([blob], selectedImage.title || 'image.png', { type: 'image/png' });
      
      // Process the image
      const processedFile = await processImage(file);
      const processedUrl = URL.createObjectURL(processedFile);
      
      setProcessedImageUrl(processedUrl);
      setShowComparison(true);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error("Error processing image:", error);
      // Show a more user-friendly error message
      let errorMessage = 'Failed to process image';
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to load image')) {
          errorMessage = 'Unable to load the image. The image URL may have expired or be inaccessible. Please try refreshing the page.';
        } else if (error.message.includes('CORS')) {
          errorMessage = 'Image access blocked by security policy. Please try refreshing the page.';
        } else if (error.message.includes('canvas')) {
          errorMessage = 'Failed to process the image. Your browser may not support this feature.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveProcessedImage = async () => {
    if (!processedImageUrl || !selectedImage) return;
    
    setIsSaving(true);
    try {
      // Convert the processed image to a blob
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();
      
      // Create a File object from the blob (same as working Canvas component)
      const timestamp = Date.now();
      const fileName = `processed-${timestamp}-${selectedImage.title || 'image'}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });
      
      // Upload using the same R2 upload hook as the working Canvas component
      const storageKey = await uploadFile(file);
      
      if (!storageKey) {
        throw new Error("Failed to upload processed image to R2");
      }
      
      // Delete the old/original image file to save space
      const oldStorageKey = selectedImage.storageKey;
      if (oldStorageKey) {
        try {
          await deleteFile({ key: oldStorageKey });
          console.log("Deleted original image file:", oldStorageKey);
        } catch (deleteError) {
          console.error("Failed to delete original image file:", deleteError);
          // Continue anyway - the processed image was uploaded successfully
        }
      }
      
      // Update the image record with the new storage key
      onImageUpdate({ storageKey });
      
      // Reset state
      setShowComparison(false);
      setProcessedImageUrl(null);
      
      // Clean up the object URL
      URL.revokeObjectURL(processedImageUrl);
      toast.success("Processed image saved successfully!");
    } catch (error) {
      console.error("Error saving processed image:", error);
      toast.error("Failed to save processed image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelProcessing = () => {
    if (processedImageUrl) {
      URL.revokeObjectURL(processedImageUrl);
    }
    setShowComparison(false);
    setProcessedImageUrl(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onImageDelete();
      toast.success("Image deleted successfully!");
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!selectedImage) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[400px] overflow-y-auto">
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>Image Details</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 px-6 py-4 pb-6">
          {/* Image Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative">
              {showComparison && processedImageUrl ? (
                <div className="space-y-4">
                  <div className="w-full h-48 border rounded-lg overflow-hidden">
                    <ImgComparisonSlider>
                      <img 
                        slot="first" 
                        src={selectedImage.imageUrl} 
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                      <img 
                        slot="second" 
                        src={processedImageUrl} 
                        alt="Processed"
                        className="w-full h-full object-cover"
                      />
                    </ImgComparisonSlider>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSaveProcessedImage} 
                      className="flex-1"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Processed Image"
                      )}
                    </Button>
                    <Button 
                      onClick={handleCancelProcessing} 
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-full h-48 border rounded-lg overflow-hidden relative">
                    <img 
                      src={selectedImage.imageUrl} 
                      alt={selectedImage.title || "Image"}
                      className="w-full h-full object-cover"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="flex flex-col items-center space-y-2">
                          <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span className="text-white text-sm">Processing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button 
                    onClick={handleProcessBackground} 
                    disabled={isProcessing}
                    variant="outline"
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      "Remove Background"
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <div className="relative group">
              <Input
                id="title"
                value={localTitle}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setLocalTitle(newTitle);
                  debouncedUpdateTitle(newTitle);
                }}
                placeholder="Enter image title"
                className="pr-8"
              />
{localTitle.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalTitle("");
                    debouncedUpdateTitle("");
                    // Refocus the input after clearing
                    setTimeout(() => {
                      document.getElementById("title")?.focus();
                    }, 0);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
                  title="Clear title"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <div className="relative group">
              <Textarea
                id="description"
                value={localDescription}
                onChange={(e) => {
                  const newDescription = e.target.value;
                  setLocalDescription(newDescription);
                  debouncedUpdateDescription(newDescription);
                }}
                placeholder="Enter image description"
                rows={3}
                className="pr-8"
              />
{localDescription.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setLocalDescription("");
                    debouncedUpdateDescription("");
                    // Refocus the textarea after clearing
                    setTimeout(() => {
                      document.getElementById("description")?.focus();
                    }, 0);
                  }}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
                  title="Clear description"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            {/* <Label>Tags</Label> */}
            <Tags
              tags={selectedImage.tags || []}
              onTagsChange={(tags) => onImageUpdate({ tags })}
              placeholder="Add tags..."
            />
          </div>

          {/* Price */}
          <div className="space-y-2">
            {/* <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includePrice"
                checked={selectedImage.includePrice || false}
                onChange={(e) => onImageUpdate({ includePrice: e.target.checked })}
              />
              <Label htmlFor="includePrice">Include Price</Label>
            </div> */}
            {selectedImage.includePrice && (
              <Input
                type="number"
                value={localPrice || ""}
                onChange={(e) => {
                  const newPrice = parseFloat(e.target.value) || 0;
                  setLocalPrice(newPrice);
                  debouncedUpdatePrice(newPrice);
                }}
                placeholder="Enter price"
                min="0"
                step="0.01"
              />
            )}
          </div>

          {/* Other URLs */}
          <div className="space-y-2">
            <Label>Related URLs</Label>
            <Urls
              urls={selectedImage.otherUrls || []}
              onUrlsChange={(urls) => onImageUpdate({ otherUrls: urls })}
            />
          </div>



          {/* Delete Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Image"
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the image
                  from your collage and remove it from storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SheetContent>
    </Sheet>
  );
}; 