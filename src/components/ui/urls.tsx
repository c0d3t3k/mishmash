import * as React from "react";
import { Badge } from "./badge";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { X, Link, ExternalLink } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

export interface UrlItem {
  url: string;
  title?: string;
}

export interface UrlsProps {
  urls: UrlItem[];
  onUrlsChange: (urls: UrlItem[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  maxUrls?: number;
  allowDuplicates?: boolean;
}

const Urls = React.forwardRef<HTMLDivElement, UrlsProps>(
  ({
    urls,
    onUrlsChange,
    label = "URLs",
    placeholder = "Enter URL",
    className,
    maxUrls,
    allowDuplicates = false,
    ...props
  }, ref) => {
    const [urlInput, setUrlInput] = React.useState("");
    const [titleInput, setTitleInput] = React.useState("");
    const [isAddingUrl, setIsAddingUrl] = React.useState(false);

    const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setUrlInput(e.target.value);
      // Auto-populate title with URL if title is empty
      if (!titleInput) {
        setTitleInput(e.target.value);
      }
    };

    const handleTitleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setTitleInput(e.target.value);
    };

    const handleUrlInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (urlInput.trim()) {
          setIsAddingUrl(true);
          // Focus on title input
          setTimeout(() => {
            const titleInputElement = document.getElementById("title-input");
            titleInputElement?.focus();
          }, 0);
        }
      } else if (e.key === "Escape") {
        resetInputs();
      }
    };

    const handleTitleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addUrl();
      } else if (e.key === "Escape") {
        resetInputs();
      }
    };

    const resetInputs = () => {
      setUrlInput("");
      setTitleInput("");
      setIsAddingUrl(false);
    };

    const addUrl = () => {
      const trimmedUrl = urlInput.trim();
      const trimmedTitle = titleInput.trim();
      
      if (!trimmedUrl) {
        resetInputs();
        return;
      }
      
      const newUrls = [...urls];
      
      // Check for duplicates if not allowed
      if (!allowDuplicates && newUrls.some(item => item.url === trimmedUrl)) {
        resetInputs();
        return;
      }
      
      // Check max urls limit
      if (maxUrls && newUrls.length >= maxUrls) {
        resetInputs();
        return;
      }
      
      const newUrlItem: UrlItem = {
        url: trimmedUrl,
        title: trimmedTitle || trimmedUrl
      };
      
      newUrls.push(newUrlItem);
      onUrlsChange(newUrls);
      resetInputs();
    };

    const removeUrl = (urlToRemove: string) => {
      const newUrls = urls.filter(item => item.url !== urlToRemove);
      onUrlsChange(newUrls);
    };

    const openUrl = (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
      <TooltipProvider>
        <div ref={ref} className={cn("space-y-2", className)} {...props}>
          <Label htmlFor="url-input">{label}</Label>
          <div className="space-y-2">
            <div className="relative group">
              <Input
                id="url-input"
                value={urlInput}
                onChange={handleUrlInputChange}
                onKeyDown={handleUrlInputKeyDown}
                placeholder={placeholder}
                disabled={maxUrls ? urls.length >= maxUrls : false}
                className="pr-8"
              />
              {urlInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUrlInput("");
                    // Refocus the input after clearing
                    setTimeout(() => {
                      document.getElementById("url-input")?.focus();
                    }, 0);
                  }}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
                  title="Clear URL input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {isAddingUrl && (
              <div className="relative group">
                <Input
                  id="title-input"
                  value={titleInput}
                  onChange={handleTitleInputChange}
                  onKeyDown={handleTitleInputKeyDown}
                  placeholder="Enter title (optional)"
                  className="animate-in slide-in-from-top-2 duration-200 pr-8"
                />
                {titleInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleInput("");
                      // Refocus the input after clearing
                      setTimeout(() => {
                        document.getElementById("title-input")?.focus();
                      }, 0);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
                    title="Clear title input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          {urls.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {urls.map((urlItem, index) => (
                <Badge
                  key={`${urlItem.url}-${index}`}
                  variant="secondary"
                  className="text-xs cursor-pointer group hover:bg-destructive hover:text-destructive-foreground transition-colors flex items-center gap-1"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => openUrl(urlItem.url)}
                        className="flex items-center gap-1 hover:underline"
                      >
                        <Link className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">
                          {urlItem.title || urlItem.url}
                        </span>
                        <ExternalLink className="h-2 w-2 opacity-50" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="max-w-xs">
                        <p className="font-medium">{urlItem.title || urlItem.url}</p>
                        {urlItem.title && urlItem.title !== urlItem.url && (
                          <p className="text-xs text-muted-foreground break-all">
                            {urlItem.url}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <button
                    onClick={() => removeUrl(urlItem.url)}
                    className="ml-1 opacity-50 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {maxUrls && (
            <div className="text-xs text-muted-foreground">
              {urls.length}/{maxUrls} URLs
            </div>
          )}
        </div>
      </TooltipProvider>
    );
  }
);

Urls.displayName = "Urls";

export { Urls }; 