import React, { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export interface SignInButtonProps {
  children?: React.ReactNode;
  mode?: "modal" | "redirect";
  redirectUrl?: string;
  signInForceRedirectUrl?: string;
  signInFallbackRedirectUrl?: string;
  signUpForceRedirectUrl?: string;
  signUpFallbackRedirectUrl?: string;
  [key: string]: any;
}

export function SignInButton({ 
  children,
  mode = "redirect",
  redirectUrl,
  signInForceRedirectUrl,
  signInFallbackRedirectUrl,
  signUpForceRedirectUrl,
  signUpFallbackRedirectUrl,
  ...props 
}: SignInButtonProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      // Navigate to the sign-in page
      await navigate({ 
        to: "/login",
        search: redirectUrl ? { redirectTo: redirectUrl } : undefined
      });
    } catch (error) {
      console.error("Navigation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // If children are provided, render them as the trigger
  if (children) {
    return (
      <div 
        onClick={handleSignIn} 
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
      onClick={handleSignIn} 
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Navigating...
        </>
      ) : (
        "Sign In"
      )}
    </Button>
  );
} 