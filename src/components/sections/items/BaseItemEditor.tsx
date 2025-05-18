import React from "react";
import { SectionItem } from "../../../types/resume";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export interface BaseItemEditorProps extends React.PropsWithChildren {
  item: SectionItem;
  onUpdate: (updatedItem: SectionItem) => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (id: string) => void;
}

export const BaseItemEditor: React.FC<BaseItemEditorProps> = ({
  item,
  onUpdate,
  onDelete,
  onToggleEnabled,
  children,
}) => {
  return (
    <div
      className={`relative p-4 border rounded-lg mb-4 ${
        !item.enabled ? "opacity-60 bg-gray-50" : "bg-white"
      }`}
    >
      <div className="absolute right-2 top-2 flex gap-2">
        <button
          onClick={() => onToggleEnabled(item.id)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          {item.enabled ? (
            <EyeIcon className="h-5 w-5 text-gray-500" />
          ) : (
            <EyeSlashIcon className="h-5 w-5 text-gray-500" />
          )}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <XMarkIcon className="h-5 w-5 text-red-500" />
        </button>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
};
