"use client"

import * as React from "react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, FolderIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface Collection {
  id: string
  name: string
  documentCount: number
}

interface ReleaseHoverCardProps {
  children: React.ReactNode
  releaseName: string
  codename?: string
  releaseDate: string
  description?: string
  collections?: Collection[]
}

export function ReleaseHoverCard({
  children,
  releaseName,
  codename,
  releaseDate,
  description,
  collections = [],
}: ReleaseHoverCardProps) {
  // Debug logging
  console.log('ReleaseHoverCard props:', {
    releaseName,
    codename,
    releaseDate,
    description,
    collections
  });

  const formattedDate = React.useMemo(() => {
    try {
      const date = new Date(releaseDate)
      return {
        formatted: date.toLocaleDateString(),
        relative: formatDistanceToNow(date, { addSuffix: true })
      }
    } catch (e) {
      return { formatted: releaseDate, relative: "" }
    }
  }, [releaseDate])

  return (
    <HoverCard>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{releaseName}</h3>
            {codename && (
              <Badge variant="outline" className="ml-2">
                {codename}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <CalendarIcon className="mr-1 h-4 w-4" />
            <span title={formattedDate.relative}>{formattedDate.formatted}</span>
          </div>
          
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          
          {collections && collections.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium mb-1">Collections</h4>
              <div className="flex flex-col space-y-1">
                {collections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FolderIcon className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span className="text-xs">{collection.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {collection.documentCount} docs
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
} 