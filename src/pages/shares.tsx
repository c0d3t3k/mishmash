import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { SignedIn, SignedOut } from "@/auth/components";
import { SignInButton } from "@/components/auth/SignInButton";
import { Link } from "@tanstack/react-router";
import { 
  Share2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Trash2, 
  Copy, 
  ExternalLink,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function SharesContent() {
  const [selectedShares, setSelectedShares] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCollapsed, setActiveCollapsed] = useState(false);
  const [revokedCollapsed, setRevokedCollapsed] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareToDelete, setShareToDelete] = useState<string | null>(null);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);

  const sharedCollages = useQuery(api.sharing.listUserSharedCollages);
  const revokeShare = useMutation(api.sharing.revokeSharedCollage);
  const deleteShare = useMutation(api.sharing.deleteSharedCollage);
  const regenerateLink = useMutation(api.sharing.regenerateShareLink);
  const bulkRevoke = useMutation(api.sharing.bulkRevokeSharedCollages);

  const handleSelectShare = (shareId: string, checked: boolean) => {
    if (checked) {
      setSelectedShares(prev => [...prev, shareId]);
    } else {
      setSelectedShares(prev => prev.filter(id => id !== shareId));
    }
  };

  const handleSelectAll = () => {
    if (!sharedCollages) return;
    const activeShares = sharedCollages.filter(share => !share.isRevoked);
    if (selectedShares.length === activeShares.length) {
      setSelectedShares([]);
    } else {
      setSelectedShares(activeShares.map(share => share.shareId));
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    setIsLoading(true);
    try {
      await revokeShare({ shareId });
      toast.success("Share revoked");
    } catch (error) {
      toast.error("Failed to revoke");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteShare = (shareId: string) => {
    setShareToDelete(shareId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteShare = async () => {
    if (!shareToDelete) return;
    
    setIsLoading(true);
    try {
      await deleteShare({ shareId: shareToDelete });
      toast.success("Share deleted");
      setDeleteDialogOpen(false);
      setShareToDelete(null);
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateLink = async (shareId: string) => {
    setIsLoading(true);
    try {
      const result = await regenerateLink({ shareId });
      await navigator.clipboard.writeText(result.publicUrl);
      toast.success("New link copied");
    } catch (error) {
      toast.error("Failed to regenerate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRevoke = async () => {
    if (selectedShares.length === 0) return;
    setIsLoading(true);
    try {
      await bulkRevoke({ shareIds: selectedShares });
      toast.success(`${selectedShares.length} shares revoked`);
      setSelectedShares([]);
    } catch (error) {
      toast.error("Failed to revoke");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeAll = async () => {
    setIsLoading(true);
    try {
      const activeShareIds = activeShares.map(share => share.shareId);
      await bulkRevoke({ shareIds: activeShareIds });
      toast.success(`${activeShares.length} shares revoked`);
      setSelectedShares([]);
      setRevokeAllDialogOpen(false);
    } catch (error) {
      toast.error("Failed to revoke all");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsLoading(true);
    try {
      const revokedShareIds = revokedShares.map(share => share.shareId);
      const results = await Promise.allSettled(
        revokedShareIds.map(shareId => deleteShare({ shareId }))
      );
      
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      
      if (failCount > 0) {
        toast.warning(`${successCount} shares deleted, ${failCount} failed`);
      } else {
        toast.success(`${successCount} shares deleted`);
      }
      
      setDeleteAllDialogOpen(false);
    } catch (error) {
      toast.error("Failed to delete all");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch (error) {
      toast.error("Failed to copy");
    }
  };

  const generatePublicUrl = (shareId: string) => {
    return `${window.location.origin}/shared/${shareId}`;
  };

  if (!sharedCollages) {
    return <div className="p-4 text-sm">Loading...</div>;
  }

  const activeShares = sharedCollages.filter(share => !share.isRevoked);
  const revokedShares = sharedCollages.filter(share => share.isRevoked);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-3">
        <Link to="/collages">
          <Button variant="ghost" size="sm" className="text-xs h-7">
            <ArrowLeft className="w-3 h-3 mr-1" />
            Back
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Share Management</h1>
      </div>

      {/* {activeShares.length > 0 && (
        <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded text-xs">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-6 px-2">
              {selectedShares.length === activeShares.length ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            </Button>
            <span>{selectedShares.length} selected</span>
          </div>
          {selectedShares.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleBulkRevoke} disabled={isLoading} className="h-6 px-2 text-xs">
              Revoke ({selectedShares.length})
            </Button>
          )}
        </div>
      )} */}

      {/* Active Shares */}
      <Collapsible open={!activeCollapsed} onOpenChange={(open) => setActiveCollapsed(!open)}>
        <CollapsibleTrigger className="group flex items-center justify-between w-full p-2 hover:bg-muted rounded text-sm font-medium">
          <div className="flex items-center gap-2">
            {activeCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <Eye className="w-4 h-4 text-green-600" />
            <span className="text-muted-foreground opacity-75">Active ({activeShares.length})</span>
          </div>
          {activeShares.length > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                setRevokeAllDialogOpen(true);
              }} 
              disabled={isLoading} 
              className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Revoke All
            </Button>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {activeShares.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">No active shares</div>
          ) : (
            activeShares.map((share) => (
              <div key={share._id} className="group flex items-center gap-2 p-2 border rounded text-xs hover:bg-muted/50">
                <Checkbox
                  checked={selectedShares.includes(share.shareId)}
                  onCheckedChange={(checked) => handleSelectShare(share.shareId, checked as boolean)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium" title={generatePublicUrl(share.shareId)}>Collage Share</span>
                    <span 
                      className="text-xs text-muted-foreground opacity-60 cursor-help" 
                      title={new Date(share.createdAt).toLocaleString()}
                    >
                      {formatDistanceToNow(share.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  {share.sharedEmails && share.sharedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {share.sharedEmails.map((email, index) => (
                        <span key={index} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500 px-1 py-0.5 rounded opacity-60">
                          {email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatePublicUrl(share.shareId))} className="h-6 w-6 p-0" title="Copy link">
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(generatePublicUrl(share.shareId), '_blank')} className="h-6 w-6 p-0" title="Open link">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRegenerateLink(share.shareId)} disabled={isLoading} className="h-6 w-6 p-0" title="Regenerate">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleRevokeShare(share.shareId)} disabled={isLoading} className="h-6 w-6 p-0" title="Revoke">
                    <EyeOff className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteShare(share.shareId)} disabled={isLoading} className="h-6 w-6 p-0" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Revoked Shares */}
      {revokedShares.length > 0 && (
        <Collapsible open={!revokedCollapsed} onOpenChange={(open) => setRevokedCollapsed(!open)} className="mt-3">
          <CollapsibleTrigger className="group flex items-center justify-between w-full p-2 hover:bg-muted rounded text-sm font-medium">
            <div className="flex items-center gap-2">
              {revokedCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <EyeOff className="w-4 h-4 text-red-600" />
              <span className="text-muted-foreground opacity-75">Revoked ({revokedShares.length})</span>
            </div>
            {revokedShares.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteAllDialogOpen(true);
                }} 
                disabled={isLoading} 
                className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Delete All
              </Button>
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {revokedShares.map((share) => (
              <div key={share._id} className="group flex items-center gap-2 p-2 border rounded text-xs opacity-60 hover:bg-muted/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium line-through" title={generatePublicUrl(share.shareId)}>Collage Share</span>
                    <span 
                      className="text-xs text-muted-foreground opacity-60 cursor-help" 
                      title={new Date(share.createdAt).toLocaleString()}
                    >
                      {formatDistanceToNow(share.createdAt, { addSuffix: true })}
                    </span>
                    {share.revokedAt && (
                      <span 
                        className="text-xs text-red-700 dark:text-red-400 cursor-help" 
                        title={new Date(share.revokedAt).toLocaleString()}
                      >
                        revoked {formatDistanceToNow(share.revokedAt, { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {share.sharedEmails && share.sharedEmails.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {share.sharedEmails.map((email, index) => (
                        <span key={index} className="text-xs bg-muted text-muted-foreground px-1 py-0.5 rounded">
                          {email}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteShare(share.shareId)} disabled={isLoading} className="h-6 w-6 p-0" title="Delete">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Share</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this share? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteShare}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Confirmation Dialog */}
      <AlertDialog open={revokeAllDialogOpen} onOpenChange={setRevokeAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke All Active Shares</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke all {activeShares.length} active shares? This will make all shared links inaccessible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Revoked Shares</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete all {revokedShares.length} revoked shares? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SharesPage() {
  return (
    <>
      <SignedIn>
        <SharesContent />
      </SignedIn>
      <SignedOut>
        <div className="p-6 text-center">
          <Share2 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-lg font-semibold mb-2">Sign In Required</h1>
          <p className="text-sm text-muted-foreground mb-4">Please sign in to manage your shared collages.</p>
          <SignInButton />
        </div>
      </SignedOut>
    </>
  );
}