import React, { useState } from "react";
import { Tags } from "./tags";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

export const TagsExample: React.FC = () => {
  const [tags, setTags] = useState<string[]>(["react", "typescript", "tailwind"]);
  const [limitedTags, setLimitedTags] = useState<string[]>(["tag1", "tag2"]);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Tags Example</CardTitle>
        </CardHeader>
        <CardContent>
          <Tags
            tags={tags}
            onTagsChange={setTags}
            label="Project Tags"
            placeholder="Add tags (press Enter or comma to add)"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limited Tags Example</CardTitle>
        </CardHeader>
        <CardContent>
          <Tags
            tags={limitedTags}
            onTagsChange={setLimitedTags}
            label="Skills (Max 5)"
            placeholder="Add up to 5 skills"
            maxTags={5}
            variant="outline"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Type a tag and press Enter or comma to add it</p>
          <p>• Click on a tag to remove it</p>
          <p>• Press Backspace on empty input to remove the last tag</p>
          <p>• Paste multiple tags separated by commas, tabs, or newlines</p>
          <p>• Hover over tags to see remove indicator</p>
        </CardContent>
      </Card>
    </div>
  );
}; 