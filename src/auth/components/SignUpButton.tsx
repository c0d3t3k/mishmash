import React, { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface SignUpButtonProps {
  children?: React.ReactNode;
  mode?: "modal" | "redirect";
  redirectUrl?: string;
  signInForceRedirectUrl?: string;
  signInFallbackRedirectUrl?: string;
  signUpForceRedirectUrl?: string;
  signUpFallbackRedirectUrl?: string;
  [key: string]: any;
}

export function SignUpButton({ 
  children,
  mode = "redirect",
  redirectUrl,
  signInForceRedirectUrl,
  signInFallbackRedirectUrl,
  signUpForceRedirectUrl,
  signUpFallbackRedirectUrl,
  ...props 
}: SignUpButtonProps) {
  const { signIn } = useAuthActions();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignUp = async () => {
    setIsLoading(true);
    try {
      // For now, we'll use a simple OAuth flow with GitHub for sign up
      // This can be extended to support different providers
      await signIn("github", { flow: "signUp" });
      
      // Handle redirect if specified
      if (redirectUrl || signUpForceRedirectUrl || signUpFallbackRedirectUrl) {
        const targetUrl = redirectUrl || signUpForceRedirectUrl || signUpFallbackRedirectUrl;
        window.location.href = targetUrl!;
      }
    } catch (error) {
      console.error("Sign up failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If children are provided, render them as the trigger
  if (children) {
    return (
      <div 
        onClick={handleSignUp} 
        style={{ cursor: isLoading ? 'not-allowed' : 'pointer', display: 'inline-block' }} 
        {...props}
      >
        {children}
      </div>
    );
  }

  // Default button when no children provided
  return (
    <Button 
      onClick={handleSignUp} 
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Signing up...
        </>
      ) : (
        "Sign Up"
      )}
    </Button>
  );
} 