import React from "react";
import { Button } from "@/components/ui/button";
import { MoveUp, MoveDown } from "lucide-react";

interface ContextMenuProps {
  id: string;
  top?: number | false;
  left?: number | false;
  right?: number | false;
  bottom?: number | false;
  onClick: () => void;
  onMoveForward: (nodeId: string) => Promise<void>;
  onMoveBackward: (nodeId: string) => Promise<void>;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  id,
  top,
  left,
  right,
  bottom,
  onClick,
  onMoveForward,
  onMoveBackward,
}) => {
  return (
    <div
      className="absolute z-[1000] bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[150px] dark:bg-gray-800 dark:border-gray-700"
      style={{
        top: top || undefined,
        left: left || undefined,
        right: right || undefined,
        bottom: bottom || undefined,
      }}
    >
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start h-8 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Context menu: Move Forward clicked for node ${id}`);
            onMoveForward(id);
            onClick();
          }}
        >
          <MoveUp className="w-4 h-4 mr-2" />
          Move Forward
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start h-8 px-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={(e) => {
            e.stopPropagation();
            console.log(`Context menu: Move Backward clicked for node ${id}`);
            onMoveBackward(id);
            onClick();
          }}
        >
          <MoveDown className="w-4 h-4 mr-2" />
          Move Backward
        </Button>
      </div>
    </div>
  );
}; 