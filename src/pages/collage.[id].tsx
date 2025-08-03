import { useParams, useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import CanvasWrapper from "@/auth/components/collages/Canvas";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, Edit, Share } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut } from "@/auth/components";
import { SignInButton } from "@/components/auth/SignInButton";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareCollageDialog } from "@/components/collages/ShareCollageDialog";
import { EditCollageDialog } from "@/components/collages/EditCollageDialog";
import { useRef, useState, useEffect } from "react";

function CollageNotFoundError({ collageId }: { collageId: string }) {
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
            <CardTitle className="text-2xl font-bold">Collage Not Found</CardTitle>
            <CardDescription className="text-lg mt-2">
              The collage you're looking for doesn't exist or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Collage ID:</strong> {collageId}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Link to="/collages">
                <Button className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Collages
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full">
                  Go to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CollageContent() {
  const { id } = useParams({ from: "/collage/$id" });
  const collageId = id as Id<"collages">;
  const search = useSearch({ from: "/collage/$id" });
  const navigate = useNavigate({ from: "/collage/$id" });
  
  const collage = useQuery(api.collages.get, { id: collageId });
  const images = useQuery(api.images.listByCollage, { collageId });

  // URL-controlled dialog states
  const searchParams = search as { dialog?: string };
  const isEditDialogOpen = searchParams.dialog === "edit";
  const isShareDialogOpen = searchParams.dialog === "share";

  const handleCloseDialog = () => {
    navigate({ search: { ...search, dialog: undefined } });
  };

  const handleEditClick = () => {
    navigate({ search: { ...search, dialog: "edit" } });
  };

  const handleShareClick = () => {
    navigate({ search: { ...search, dialog: "share" } });
  };


  if (collage === undefined || images === undefined) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (collage === null) {
    return <CollageNotFoundError collageId={collageId} />;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Link to="/collages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">{collage.name}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEditClick}
            className="ml-2"
          >
            <Edit className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2" id="share-button-container">
          {/* Share button will be rendered here by CanvasWrapper */}
        </div>
      </div>
      
      <div className="flex-1">
        <ErrorBoundary
          level="component"
          fallback={
            <div className="flex justify-center items-center h-full">
              <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                      <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                  </div>
                  <CardTitle className="text-xl font-bold">Canvas Error</CardTitle>
                  <CardDescription>
                    The collage canvas encountered an error and cannot be displayed.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => window.location.reload()}>
                      Try Again
                    </Button>
                    <Link to="/collages">
                      <Button variant="outline" className="w-full">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Collages
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          }
        >
          <CanvasWrapper 
            collageId={collageId} 
            images={images || []} 
            collage={collage}
            shareComponent={
              <ShareCollageDialog 
                collageId={collageId} 
                collageName={collage.name}
                isOpen={isShareDialogOpen}
                onOpenChange={(open) => !open && handleCloseDialog()}
                onShare={() => {
                  handleCloseDialog();
                }}
                onButtonClick={handleShareClick}
              />
            }
          />
        </ErrorBoundary>
      </div>

      <EditCollageDialog
        collage={collage as any}
        isOpen={isEditDialogOpen}
        onOpenChange={(open) => !open && handleCloseDialog()}
        onSuccess={() => {
          handleCloseDialog();
        }}
      />

    </div>
  );
}

export default function CollagePage() {
  return (
    <ErrorBoundary
      level="page"
      onError={(error, errorInfo) => {
        console.error('Collage page error:', error, errorInfo);
        // You could send this to an error tracking service here
      }}
    >
      <SignedIn>
        <CollageContent />
      </SignedIn>
      <SignedOut>
        <div className="container mx-auto p-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <h1 className="text-3xl font-bold mb-4">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Please sign in to view and edit collages.
            </p>
            <SignInButton />
          </div>
        </div>
      </SignedOut>
    </ErrorBoundary>
  );
} 