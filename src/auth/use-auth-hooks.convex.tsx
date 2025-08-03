import React from "react";
import { 
  ConvexAuthProvider,
  useAuthActions,
  useAuthToken
} from "@convex-dev/auth/react";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { ConvexReactClient } from "convex/react";

// Type for the user from Convex Auth
type ConvexUser = {
  _id: string;
  _creationTime: number;
  name?: string;
  email?: string;
  image?: string;
  emailVerified?: boolean;
  emailVerificationTime?: number;
  phone?: string;
  phoneVerificationTime?: number;
  isAnonymous?: boolean;
  role?: string;
  // Additional fields from our enhanced query
  _hasOAuthAccount?: boolean;
  _accounts?: Array<{ provider: string }>;
};

/**
 * Configuration options for AuthWrapper
 */
export interface AuthWrapperProps {
  children: React.ReactNode;
  /** 
   * Optional storage implementation for token persistence 
   * Useful for React Native with expo-secure-store
   */
  storage?: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
  };
  /**
   * Optional callback to determine if auth should handle OAuth code parameter
   * Useful for custom OAuth flows on specific routes
   */
  shouldHandleCode?: () => boolean;
  /**
   * Custom Convex URL override (defaults to VITE_CONVEX_URL)
   */
  convexUrl?: string;
  /**
   * Additional ConvexReactClient options
   */
  clientOptions?: {
    unsavedChangesWarning?: boolean;
    [key: string]: any;
  };
}

/**
 * Wrapper component that sets up authentication provider with our project configuration
 * Currently uses Convex Auth but designed to be pluggable for different auth providers
 * 
 * To switch auth providers in the future:
 * 1. Update the implementation inside this component
 * 2. Ensure the interface (props) remains compatible
 * 3. Update the auth hooks to match the new provider's API
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AuthWrapper>
 *   <App />
 * </AuthWrapper>
 * 
 * // With custom storage (React Native)
 * <AuthWrapper storage={secureStorage}>
 *   <App />
 * </AuthWrapper>
 * 
 * // With custom OAuth handling
 * <AuthWrapper 
 *   shouldHandleCode={() => !location.pathname.startsWith('/custom-oauth')}
 * >
 *   <App />
 * </AuthWrapper>
 * ```
 */
export function AuthWrapper({ 
  children, 
  storage,
  shouldHandleCode,
  convexUrl,
  clientOptions = {}
}: AuthWrapperProps) {
  // Get the Convex URL from props or environment variables
  const CONVEX_URL = convexUrl || (import.meta as any).env.VITE_CONVEX_URL;
  
  if (!CONVEX_URL) {
    throw new Error('VITE_CONVEX_URL environment variable is required or provide convexUrl prop');
  }

  // Create the Convex client with merged options
  const convexClient = React.useMemo(() => {
    const defaultOptions = {
      unsavedChangesWarning: false,
    };
    
    return new ConvexReactClient(CONVEX_URL, {
      ...defaultOptions,
      ...clientOptions,
    });
  }, [CONVEX_URL, clientOptions]);

  return (
    <ConvexAuthProvider 
      client={convexClient}
      storage={storage}
      shouldHandleCode={shouldHandleCode}
    >
      {children}
    </ConvexAuthProvider>
  );
}

/**
 * Hook that provides the current session
 */
export function useSession() {
  const currentUser = useQuery(api.auth.currentUser) as ConvexUser | null | undefined;
  const token = useAuthToken();

  return {
    data: currentUser
      ? {
          user: {
            id: currentUser._id,
            email: currentUser.email,
            name: currentUser.name,
            image: currentUser.image,
            // Enhanced email verification logic:
            // 1. Explicit emailVerified field
            // 2. emailVerificationTime exists (indicates verification happened)
            // 3. Has OAuth account (OAuth providers verify emails automatically)
            // 4. If user has an email and is not anonymous, assume verified for OAuth providers
            emailVerified: currentUser.emailVerified || 
                          !!currentUser.emailVerificationTime || 
                          currentUser._hasOAuthAccount ||
                          (!currentUser.isAnonymous && !!currentUser.email),
            isAnonymous: currentUser.isAnonymous || false,
            role: currentUser.role || "user",
          },
        }
      : null,
    status: currentUser !== undefined ? "authenticated" : "loading",
  };
}

/**
 * Hook that provides admin status
 */
export function useAdminStatus() {
  const currentUser = useQuery(api.auth.currentUser) as ConvexUser | null | undefined;
  
  const isAdmin = currentUser?.role === "admin";
  const isImpersonating = false; // TODO: Implement impersonation logic if needed

  return {
    isAdmin,
    isImpersonating,
  };
} 

export function useAuth() {
  const currentUser = useQuery(api.auth.currentUser) as ConvexUser | null | undefined;
  const token = useAuthToken();

  return {
    isLoaded: currentUser !== undefined,
    isSignedIn: !!currentUser,
    userId: currentUser?._id,
    user: currentUser
  };
}

export function useOrganization() {
  // Placeholder for organization functionality
  // In Convex, this would need to be implemented based on your organization schema
  return null;
}



/**
 * Enhanced Convex auth hook that provides navigation-aware auth actions
 * Consolidates functionality from useConvexAuth.ts
 */
export function useConvexAuth() {
  const { signIn, signOut } = useAuthActions();
  const token = useAuthToken();
  const navigate = useNavigate();
  
  // Get current user from Convex
  const currentUser = useQuery(api.auth.currentUser);
  
  const isLoading = currentUser === undefined;
  const isAuthenticated = !!currentUser && !!token;
  
  const handleSignOut = async (redirectTo?: string) => {
    await signOut();
    if (redirectTo) {
      navigate({ to: redirectTo });
    } else {
      navigate({ to: "/" });
    }
  };

  const handleSignIn = async (
    provider: string, 
    formDataOrOptions?: FormData | Record<string, any>,
    redirectTo?: string
  ) => {
    try {
      await signIn(provider, formDataOrOptions);
      if (redirectTo) {
        navigate({ to: redirectTo });
      } else {
        navigate({ to: "/" });
      }
    } catch (error) {
      throw error;
    }
  };

  return {
    // User state
    user: currentUser,
    isLoading,
    isAuthenticated,
    token,
    
    // Auth actions
    signIn: handleSignIn,
    signOut: handleSignOut,
    
    // Raw actions (for advanced use cases)
    rawSignIn: signIn,
    rawSignOut: signOut,
  };
}


function useSignIn() {
  const { signIn } = useAuthActions();
  return { 
    signIn: (strategy: string, options?: any) => signIn(strategy, options)
  };
}

function useSignUp() {
  const { signIn } = useAuthActions();
  return { 
    signUp: (strategy: string, options?: any) => signIn(strategy, { ...options, flow: "signUp" })
  };
}

function getAuth() {
  // Placeholder for server-side auth getter
  // This would need to be implemented differently in Convex
  return null;
}

// Export components from components directory
export {
  // Components from components directory
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  SignOutButton,
} from './components';

// Export types from components directory
export type { 
  SignInButtonProps,
  SignUpButtonProps,
  UserButtonProps,
  SignOutButtonProps 
} from './components';

// Export auth utilities (not already exported above)
export {    
  ConvexAuthProvider as AuthProvider,
  useAuthToken,
  useSignIn,
  useSignUp,
  getAuth,
}; 