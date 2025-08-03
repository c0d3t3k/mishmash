import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tags } from "@/components/ui/tags";
import { CollageFormData } from "./types";

interface CollageFormProps {
  data: CollageFormData;
  onChange: (data: CollageFormData) => void;
  nameId?: string;
  descriptionId?: string;
  tagsId?: string;
}

export function CollageForm({ 
  data, 
  onChange, 
  nameId = "name", 
  descriptionId = "description", 
  tagsId = "tags" 
}: CollageFormProps) {
  const handleChange = (field: keyof CollageFormData, value: string | boolean | string[]) => {
    onChange({ ...data, [field]: value });
  };

  const handleTagsChange = (tags: string[]) => {
    onChange({ ...data, tags });
  };

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={nameId} className="text-right">
          Name
        </Label>
        <Input
          id={nameId}
          value={data.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor={descriptionId} className="text-right">
          Description
        </Label>
        <Textarea
          id={descriptionId}
          value={data.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="col-span-3"
        />
      </div>
      <div className="grid grid-cols-4 items-start gap-4">
        <div className="text-right pt-2">
          <Label>Tags</Label>
        </div>
        <div className="col-span-3">
          <Tags
            tags={data.tags}
            onTagsChange={handleTagsChange}
            label=""
            placeholder="Enter tags and press Enter or comma"
            maxTags={10}
            allowDuplicates={false}
            variant="secondary"
          />
        </div>
      </div>
    </div>
  );
} 