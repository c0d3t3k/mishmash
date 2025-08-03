import { useParams, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface SharedCollageData {
  shareId: string;
  imageUrl: string;
  collage: {
    name: string;
    description?: string;
  };
  images: Array<{
    _id: string;
    title?: string;
    description?: string;
    price?: number;
    includePrice?: boolean;
    tags?: string[];
    pageUrl?: string;
    otherUrls?: any;
    position?: any;
  }>;
  exportViewport?: any;
  exportBounds?: any;
  exportDimensions?: { width: number; height: number };
}

function SharedCollageNotFound({ shareId }: { shareId: string }) {
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Shared Collage Not Found</CardTitle>
            <CardDescription className="text-lg mt-2">
              This shared collage doesn't exist, has been removed, or the link has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Share ID:</strong> {shareId}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button 
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Visit Mishmash
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnnotationsOverlay({ 
  images, 
  imageWidth, 
  imageHeight, 
  exportViewport,
  exportBounds,
  exportDimensions,
  onAnnotationClick,
  selectedImageId
}: {
  images: SharedCollageData['images'];
  imageWidth: number;
  imageHeight: number;
  exportViewport?: any;
  exportBounds?: any;
  exportDimensions?: { width: number; height: number };
  onAnnotationClick: (image: SharedCollageData['images'][0]) => void;
  selectedImageId?: string | null;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {images.map((image, index) => {
        if (!image.position) return null;
        
        let annotationX: number;
        let annotationY: number;
        
        if (exportViewport && exportBounds && exportDimensions) {
          // Apply the exact same transformation that React Flow export uses
          const nodeX = image.position.x || 0;
          const nodeY = image.position.y || 0;
          
          // Transform coordinates to match the exported image:
          // Apply the same viewport transformation that was used during export
          const exportedX = (nodeX * exportViewport.zoom) + exportViewport.x;
          const exportedY = (nodeY * exportViewport.zoom) + exportViewport.y;
          
          // Scale to match actual displayed image size
          annotationX = (exportedX / exportDimensions.width) * imageWidth;
          annotationY = (exportedY / exportDimensions.height) * imageHeight;
        } else {
          // Fallback to simple scaling (legacy behavior)
          annotationX = (image.position.x || 0) * (imageWidth / 1200);
          annotationY = (image.position.y || 0) * (imageHeight / 800);
        }
        
        const isSelected = selectedImageId === image._id;
        const isMuted = selectedImageId && selectedImageId !== image._id;
        
        // Calculate image rectangle for selected image
        let rectX = 0, rectY = 0, rectWidth = 0, rectHeight = 0;
        if (isSelected && image.position) {
          if (exportViewport && exportBounds && exportDimensions) {
            const nodeX = image.position.x || 0;
            const nodeY = image.position.y || 0;
            const nodeWidth = image.position.width || 200;
            const nodeHeight = image.position.height || 200;
            
            // Transform coordinates to match the exported image
            const exportedX = (nodeX * exportViewport.zoom) + exportViewport.x;
            const exportedY = (nodeY * exportViewport.zoom) + exportViewport.y;
            const exportedWidth = nodeWidth * exportViewport.zoom;
            const exportedHeight = nodeHeight * exportViewport.zoom;
            
            // Scale to match actual displayed image size
            rectX = (exportedX / exportDimensions.width) * imageWidth;
            rectY = (exportedY / exportDimensions.height) * imageHeight;
            rectWidth = (exportedWidth / exportDimensions.width) * imageWidth;
            rectHeight = (exportedHeight / exportDimensions.height) * imageHeight;
          } else {
            // Fallback calculation
            const nodeX = image.position.x || 0;
            const nodeY = image.position.y || 0;
            const nodeWidth = image.position.width || 200;
            const nodeHeight = image.position.height || 200;
            
            rectX = (nodeX / 1200) * imageWidth;
            rectY = (nodeY / 800) * imageHeight;
            rectWidth = (nodeWidth / 1200) * imageWidth;
            rectHeight = (nodeHeight / 800) * imageHeight;
          }
        }

        return (
          <div key={image._id}>
            {/* Blue rectangle for selected image */}
            {isSelected && (
              <div
                className="absolute border-2 border-blue-500 pointer-events-none"
                style={{
                  left: `${rectX}px`,
                  top: `${rectY}px`,
                  width: `${rectWidth}px`,
                  height: `${rectHeight}px`,
                }}
                title={`Debug: pos=(${rectX},${rectY}) size=(${rectWidth},${rectHeight})`}
              />
            )}
            
            {/* Annotation button */}
            <button
              className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg transition-colors pointer-events-auto ${
                isMuted 
                  ? 'bg-gray-400 text-white hover:bg-gray-500 opacity-50' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
              style={{
                left: `${annotationX}px`,
                top: `${annotationY}px`,
                transform: 'translate(-50%, -50%)',
              }}
              onClick={() => onAnnotationClick(image)}
            >
              {index + 1}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ImageDetailsSidebar({
  image,
  isOpen,
  onClose,
  images,
}: {
  image: SharedCollageData['images'][0] | null;
  isOpen: boolean;
  onClose: () => void;
  images: SharedCollageData['images'];
}) {
  if (!isOpen || !image) return null;

  // Find the annotation number for this image
  const annotationNumber = images.findIndex(img => img._id === image._id) + 1;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
              {annotationNumber}
            </div>
            <h3 className="text-lg font-semibold">Item Details</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Title</h4>
            <p className="text-base">
              {image.title && !image.title.includes('.jpg') && !image.title.includes('.png') && !image.title.includes('-') 
                ? image.title 
                : 'Untitled Item'
              }
            </p>
          </div>
          
          {image.description && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Description</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {image.description}
              </p>
            </div>
          )}
          
          {image.includePrice && typeof image.price === 'number' && image.price > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Price</h4>
              <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                ${image.price.toFixed(2)}
              </p>
            </div>
          )}
          
          {image.tags && image.tags.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-1">
                {image.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-200 dark:border-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">Links</h4>
            <div className="flex flex-wrap gap-1">
              {image.otherUrls && Array.isArray(image.otherUrls) && image.otherUrls.map((urlObj, index) => (
                <button
                  key={index}
                  onClick={() => window.open(urlObj.url, '_blank')}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-xs rounded-full flex items-center gap-1"
                >
                  🔗 {image.title || 'Link'}
                </button>
              ))}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function SharedCollageViewer({ sharedData }: { sharedData: SharedCollageData }) {
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [selectedImage, setSelectedImage] = useState<SharedCollageData['images'][0] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [imageError, setImageError] = useState<string | null>(null);
  
  const search = useSearch({ from: "/shared/$shareId" });
  const navigate = useNavigate({ from: "/shared/$shareId" });
  
  // Handle URL state for selected annotation
  useEffect(() => {
    const searchParams = search as { item?: string };
    const selectedItemNumber = searchParams.item;
    
    if (selectedItemNumber) {
      const itemIndex = parseInt(selectedItemNumber, 10) - 1; // Convert to 0-based index
      if (itemIndex >= 0 && itemIndex < sharedData.images.length) {
        const image = sharedData.images[itemIndex];
        setSelectedImage(image);
        setSidebarOpen(true);
      }
    } else {
      setSelectedImage(null);
      setSidebarOpen(false);
    }
  }, [search, sharedData.images]);


  const handleAnnotationClick = (image: SharedCollageData['images'][0]) => {
    console.log('IMAGE DATA:', image);
    const annotationNumber = sharedData.images.findIndex(img => img._id === image._id) + 1;
    
    if (selectedImage?._id === image._id) {
      // Clicking same annotation - close sidebar and deselect
      navigate({ search: {} });
    } else {
      // Clicking different annotation - select and open sidebar
      navigate({ search: { item: annotationNumber.toString() } });
    }
  };

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageSize({ width: img.offsetWidth, height: img.offsetHeight });
    setImageError(null);
  };

  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    console.error("Image failed to load:", sharedData.imageUrl);
    setImageError("Failed to load image");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{sharedData.collage.name}</h1>
              {sharedData.collage.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {sharedData.collage.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {sharedData.images.length > 0 && (
                <Button
                  variant={showAnnotations ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAnnotations(!showAnnotations)}
                >
                  {showAnnotations ? "Hide" : "Show"} Annotations
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="flex justify-center">
          <div className="relative inline-block max-w-full">
            {sharedData.images.length === 0 ? (
              // Show placeholder for empty collages instead of trying to load image
              <div className="w-full max-w-2xl h-96 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Empty Collage</p>
                </div>
              </div>
            ) : imageError ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p>Error loading image: {imageError}</p>
                <p className="text-sm">URL: {sharedData.imageUrl}</p>
              </div>
            ) : (
              <div 
                className="relative"
                onClick={(e) => {
                  // Only deselect if clicking directly on the image container, not on annotations
                  if (e.target === e.currentTarget) {
                    navigate({ search: {} });
                  }
                }}
              >
                <img
                  src={sharedData.imageUrl}
                  alt={sharedData.collage.name}
                  className="max-w-full h-auto"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  onClick={(e) => {
                    // Clicking on the image itself should deselect
                    navigate({ search: {} });
                  }}
                />
              </div>
            )}
            
            {!imageError && showAnnotations && imageSize.width > 0 && sharedData.images.length > 0 && (
              <AnnotationsOverlay
                images={sharedData.images}
                imageWidth={imageSize.width}
                imageHeight={imageSize.height}
                exportViewport={sharedData.exportViewport}
                exportBounds={sharedData.exportBounds}
                exportDimensions={sharedData.exportDimensions}
                onAnnotationClick={handleAnnotationClick}
                selectedImageId={selectedImage?._id}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              {sharedData.images.length === 0 ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This collage doesn't contain any images yet.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    The creator may still be working on it.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {showAnnotations 
                    ? "Click on the numbered annotations to learn more about each item"
                    : "Toggle annotations above to explore this collage interactively"
                  }
                </p>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Sidebar */}
      <ImageDetailsSidebar
        image={selectedImage}
        isOpen={sidebarOpen}
        onClose={() => navigate({ search: {} })}
        images={sharedData.images}
      />

      {/* Overlay for closing sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => navigate({ search: {} })}
        />
      )}
    </div>
  );
}

export default function SharedCollagePage() {
  const { shareId } = useParams({ from: "/shared/$shareId" });
  const sharedData = useQuery(api.sharing.getSharedCollage, { shareId });

  if (sharedData === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading shared collage...</p>
        </div>
      </div>
    );
  }

  if (sharedData === null) {
    return <SharedCollageNotFound shareId={shareId} />;
  }

  return <SharedCollageViewer sharedData={sharedData} />;
}