import React, { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogOut, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/auth/use-auth-hooks.convex";

export interface UserButtonProps {
  afterSignOutUrl?: string;
  appearance?: {
    elements?: Record<string, string>;
    variables?: Record<string, string>;
  };
  showName?: boolean;
  userProfileMode?: "modal" | "navigation";
  userProfileUrl?: string;
  [key: string]: any;
}

export function UserButton({
  afterSignOutUrl = "/",
  appearance,
  showName = false,
  userProfileMode = "modal",
  userProfileUrl,
  ...props
}: UserButtonProps) {
  const { signOut } = useAuthActions();
  // const { effectiveUser, isImpersonating } = useAdminStatus();
  const [isLoading, setIsLoading] = useState(false);


  
  // Use effective user (impersonated user if impersonating, otherwise actual user)
  const currentUser = useAuth().user;

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      if (afterSignOutUrl) {
        window.location.href = afterSignOutUrl;
      }
    } catch (error) {
      console.error("Sign out failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileClick = () => {
    if (userProfileUrl) {
      if (userProfileMode === "navigation") {
        window.location.href = userProfileUrl;
      } else {
        // Modal mode - you might want to implement a modal here
        console.log("Profile modal not implemented yet");
      }
    }
  };

  if (!currentUser) {
    return null;
  }

  const userInitials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : currentUser.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full"
          {...props}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser.image} alt={currentUser.name || "User"} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            {currentUser.name && (
              <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            )}
            {currentUser.email && (
              <p className="text-xs leading-none text-muted-foreground">
                {currentUser.email}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {userProfileUrl && (
          <DropdownMenuItem onClick={handleProfileClick}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex items-center cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isLoading ? "Signing out..." : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 