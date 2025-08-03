import React from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export interface SignOutButtonProps {
  children?: React.ReactNode;
  redirectUrl?: string;
  signOutOptions?: {
    sessionId?: string;
  };
  [key: string]: any;
}

export function SignOutButton({ 
  children,
  redirectUrl = "/pricing-page",
  signOutOptions,
  ...props 
}: SignOutButtonProps) {
  const { signOut } = useAuthActions();
  
  const handleSignOut = () => {
    signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  // If children are provided, render them as the trigger
  if (children) {
    return (
      <div onClick={handleSignOut} style={{ cursor: 'pointer', display: 'inline-block' }} {...props}>
        {children}
      </div>
    );
  }

  // Default button when no children provided
  return (
    <Button onClick={handleSignOut} variant="outline" {...props}>
      <LogOut />
      Sign Out
    </Button>
  );
} 