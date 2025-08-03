import { useEffect, useState, useRef } from "react";

// Global in-memory cache for object URLs
const objectUrlCache = new Map<string, string>();
const refCountCache = new Map<string, number>();
const revokeTimeouts = new Map<string, NodeJS.Timeout>();

// Timeout before actually revoking unused object URLs (prevents cache breaks on re-renders)
const REVOKE_TIMEOUT = 5000; // 5 seconds

// Helper functions for reference counting
function incrementRefCount(imageUrl: string): void {
  const currentCount = refCountCache.get(imageUrl) || 0;
  refCountCache.set(imageUrl, currentCount + 1);
  
  // Cancel any pending revocation since we have a new reference
  const existingTimeout = revokeTimeouts.get(imageUrl);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
    revokeTimeouts.delete(imageUrl);
    console.log(`⏸️ Cancelled revocation timeout for ${imageUrl.substring(0, 50)}... (new reference)`);
  }
  
  console.log(`📈 Incremented ref count for ${imageUrl.substring(0, 50)}... to ${currentCount + 1}`);
}

function decrementRefCount(imageUrl: string): void {
  const currentCount = refCountCache.get(imageUrl) || 0;
  const newCount = Math.max(0, currentCount - 1);
  
  if (newCount === 0) {
    // No more references, schedule revocation after timeout
    const objectUrl = objectUrlCache.get(imageUrl);
    if (objectUrl) {
      console.log(`⏰ Scheduling revocation for ${imageUrl.substring(0, 50)}... in ${REVOKE_TIMEOUT}ms`);
      
      const timeout = setTimeout(() => {
        // Double-check that ref count is still 0 and URL is still cached
        const finalCount = refCountCache.get(imageUrl) || 0;
        const finalObjectUrl = objectUrlCache.get(imageUrl);
        
        if (finalCount === 0 && finalObjectUrl) {
          console.log(`🗑️ Revoking object URL for ${imageUrl.substring(0, 50)}... (timeout reached, ref count still 0)`);
          URL.revokeObjectURL(finalObjectUrl);
          objectUrlCache.delete(imageUrl);
          refCountCache.delete(imageUrl);
        } else {
          console.log(`✅ Skipping revocation for ${imageUrl.substring(0, 50)}... (ref count now ${finalCount})`);
        }
        
        revokeTimeouts.delete(imageUrl);
      }, REVOKE_TIMEOUT);
      
      revokeTimeouts.set(imageUrl, timeout);
    }
    refCountCache.delete(imageUrl);
  } else {
    refCountCache.set(imageUrl, newCount);
    console.log(`📉 Decremented ref count for ${imageUrl.substring(0, 50)}... to ${newCount}`);
  }
}

export function useImageObjectUrl(imageUrl: string | null) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentImageUrlRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear previous state
    setError(null);
    
    if (!imageUrl) {
      // Clean up previous URL if switching to null
      if (currentImageUrlRef.current) {
        decrementRefCount(currentImageUrlRef.current);
        currentImageUrlRef.current = null;
      }
      setObjectUrl(null);
      setIsLoading(false);
      return;
    }

    // If URL hasn't changed, don't do anything
    if (currentImageUrlRef.current === imageUrl) {
      return;
    }

    // Clean up previous URL reference
    if (currentImageUrlRef.current) {
      decrementRefCount(currentImageUrlRef.current);
    }

    // Update current URL reference
    currentImageUrlRef.current = imageUrl;

    // Check if we already have this URL cached
    const cachedObjectUrl = objectUrlCache.get(imageUrl);
    if (cachedObjectUrl) {
      console.log('✅ Using cached object URL for:', imageUrl.substring(0, 50) + '...');
      incrementRefCount(imageUrl);
      setObjectUrl(cachedObjectUrl);
      setIsLoading(false);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    setObjectUrl(null);

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    console.log('🔄 Fetching image as blob:', imageUrl);

    fetch(imageUrl, { 
      signal: abortController.signal,
      cache: 'force-cache' // Use browser cache aggressively
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.blob();
      })
      .then(blob => {
        // Check if request was cancelled
        if (abortController.signal.aborted) {
          return;
        }

        console.log('✅ Blob created, generating object URL:', {
          size: blob.size,
          type: blob.type
        });

        const url = URL.createObjectURL(blob);
        
        // Cache the object URL and increment reference count
        objectUrlCache.set(imageUrl, url);
        incrementRefCount(imageUrl);
        
        setObjectUrl(url);
        setIsLoading(false);
      })
      .catch(err => {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          console.log('🚫 Image fetch aborted');
          return;
        }

        console.error('❌ Failed to fetch image as blob:', {
          error: err,
          message: err.message,
          imageUrl
        });

        setError(err.message);
        setIsLoading(false);
      });

    // Cleanup function
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [imageUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentImageUrlRef.current) {
        console.log('🧹 Cleaning up object URL reference on unmount');
        decrementRefCount(currentImageUrlRef.current);
        currentImageUrlRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return { 
    objectUrl, 
    isLoading, 
    error 
  };
}