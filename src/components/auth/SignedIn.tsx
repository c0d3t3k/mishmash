import React from "react";
import { useAuth } from "@/auth/use-auth-hooks.convex";

interface SignedInProps {
  children: React.ReactNode;
}

export function SignedIn({ children }: SignedInProps) {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <>{children}</> : null;
} 