import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { Link, Outlet } from '@tanstack/react-router'
import { ConvexReactClient } from 'convex/react';
import { Header } from '@/components/header';
import { ThemeProvider } from '@/components/ui/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache';

import "@/pages/index.css"

export default function App() {

  const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
  
  return (
    
    <ConvexAuthProvider client={convex}>
      <ConvexQueryCacheProvider>
      <ThemeProvider defaultTheme="system" storageKey="ui-theme">
        <div className="min-h-screen bg-background">
          <Header />
          <main>
            <Outlet />
          </main>
          <Toaster />
        </div>
      </ThemeProvider>
    
    </ConvexQueryCacheProvider>
    </ConvexAuthProvider> 
  )
}
