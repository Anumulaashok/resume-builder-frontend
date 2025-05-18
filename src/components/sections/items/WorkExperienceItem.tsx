import React from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { WorkExperienceItem } from "../../../types/resume";

interface Props {
  item: WorkExperienceItem;
  onUpdate: (updated: Partial<WorkExperienceItem>) => void;
  onDelete: () => void;
  onToggle: () => void;
}

export const WorkExperienceItemEditor: React.FC<Props> = ({
  item,
  onUpdate,
  onDelete,
  onToggle,
}) => {
  return (
    <div className="relative bg-white rounded-lg border p-4 mb-4">
      <div className="absolute right-2 top-2 flex space-x-2">
        <button onClick={onToggle} className="p-1 hover:bg-gray-100 rounded">
          {item.enabled !== false ? (
            <EyeIcon className="h-4 w-4" />
          ) : (
            <EyeSlashIcon className="h-4 w-4" />
          )}
        </button>
        <button onClick={onDelete} className="p-1 hover:bg-gray-100 rounded">
          <XMarkIcon className="h-4 w-4 text-red-500" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6">
        <input
          className="px-3 py-2 border rounded"
          placeholder="Company Name"
          value={item.company || ""}
          onChange={(e) => onUpdate({ company: e.target.value })}
        />
        <input
          className="px-3 py-2 border rounded"
          placeholder="Position"
          value={item.position || ""}
          onChange={(e) => onUpdate({ position: e.target.value })}
        />
        <div className="col-span-2 flex gap-4 items-center">
          <input
            type="date"
            className="px-3 py-2 border rounded flex-1"
            value={item.startDate || ""}
            onChange={(e) => onUpdate({ startDate: e.target.value })}
          />
          <input
            type="date"
            className="px-3 py-2 border rounded flex-1"
            value={item.endDate || ""}
            onChange={(e) => onUpdate({ endDate: e.target.value })}
            disabled={item.isCurrent}
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={item.isCurrent || false}
              onChange={(e) =>
                onUpdate({
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? "" : item.endDate,
                })
              }
              className="mr-2"
            />
            <span className="text-sm">Current</span>
          </label>
        </div>
        <div className="col-span-2">
          <input
            className="w-full px-3 py-2 border rounded mb-4"
            placeholder="Location"
            value={item.location || ""}
            onChange={(e) => onUpdate({ location: e.target.value })}
          />
          <textarea
            className="w-full px-3 py-2 border rounded"
            rows={3}
            placeholder="Description"
            value={item.description || ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};
