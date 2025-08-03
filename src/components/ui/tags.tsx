import * as React from "react";
import { Badge } from "./badge";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface TagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  maxTags?: number;
  allowDuplicates?: boolean;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
}

const Tags = React.forwardRef<HTMLDivElement, TagsProps>(
  ({
    tags,
    onTagsChange,
    label = "Tags",
    placeholder = "Enter tags separated by commas",
    className,
    maxTags,
    allowDuplicates = false,
    variant = "secondary",
    ...props
  }, ref) => {
    const [inputValue, setInputValue] = React.useState("");
    const [isClearing, setIsClearing] = React.useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(inputValue.trim());
      } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        // Remove last tag when backspace is pressed on empty input
        removeTag(tags[tags.length - 1]);
      }
    };

    const handleInputBlur = () => {
      // Don't add tag if we're clearing the input
      if (isClearing) {
        setIsClearing(false);
        return;
      }
      
      if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    };

    const addTag = (tag: string) => {
      if (!tag) return;
      
      const newTags = [...tags];
      
      // Check for duplicates if not allowed
      if (!allowDuplicates && newTags.includes(tag)) {
        setInputValue("");
        return;
      }
      
      // Check max tags limit
      if (maxTags && newTags.length >= maxTags) {
        setInputValue("");
        return;
      }
      
      newTags.push(tag);
      onTagsChange(newTags);
      setInputValue("");
    };

    const removeTag = (tagToRemove: string) => {
      const newTags = tags.filter(tag => tag !== tagToRemove);
      onTagsChange(newTags);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pastedText = e.clipboardData.getData("text");
      const pastedTags = pastedText
        .split(/[,\n\t]/)
        .map(tag => tag.trim())
        .filter(Boolean);
      
      let newTags = [...tags];
      
      for (const tag of pastedTags) {
        if (maxTags && newTags.length >= maxTags) break;
        if (!allowDuplicates && newTags.includes(tag)) continue;
        newTags.push(tag);
      }
      
      onTagsChange(newTags);
      setInputValue("");
    };

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        <Label htmlFor="tags-input">{label}</Label>
        <div className="relative group">
          <Input
            id="tags-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            onPaste={handlePaste}
            placeholder={placeholder}
            disabled={maxTags ? tags.length >= maxTags : false}
            className="pr-8"
          />
          {inputValue.length > 0 && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent the input from losing focus
                setIsClearing(true);
              }}
              onClick={() => {
                setInputValue("");
                // Refocus the input after clearing
                setTimeout(() => {
                  document.getElementById("tags-input")?.focus();
                }, 0);
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200"
              title="Clear input"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag, index) => (
              <Badge
                key={`${tag}-${index}`}
                variant={variant}
                className="text-xs cursor-pointer group hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={() => removeTag(tag)}
              >
                {tag}
                <X className="ml-1 h-3 w-3 opacity-50 group-hover:opacity-100" />
              </Badge>
            ))}
          </div>
        )}
        {maxTags && (
          <div className="text-xs text-muted-foreground">
            {tags.length}/{maxTags} tags
          </div>
        )}
      </div>
    );
  }
);

Tags.displayName = "Tags";

export { Tags }; 