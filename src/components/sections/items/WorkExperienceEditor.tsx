import React from "react";
import { BaseItemEditor, BaseItemEditorProps } from "./BaseItemEditor";
import { WorkExperienceItem } from "../../../types/resume";

interface WorkExperienceEditorProps extends Omit<BaseItemEditorProps, "item"> {
  item: WorkExperienceItem;
}

export const WorkExperienceEditor: React.FC<WorkExperienceEditorProps> = ({
  item,
  onUpdate,
  ...props
}) => {
  return (
    <BaseItemEditor item={item} onUpdate={onUpdate} {...props}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Company
          </label>
          <input
            type="text"
            value={item.company}
            onChange={(e) => onUpdate({ ...item, company: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Position
          </label>
          <input
            type="text"
            value={item.position}
            onChange={(e) => onUpdate({ ...item, position: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start Date
          </label>
          <input
            type="date"
            value={item.startDate}
            onChange={(e) => onUpdate({ ...item, startDate: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            End Date
          </label>
          <input
            type="date"
            value={item.endDate}
            disabled={item.isCurrent}
            onChange={(e) => onUpdate({ ...item, endDate: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <div className="mt-1">
            <input
              type="checkbox"
              id={`current-${item.id}`}
              checked={item.isCurrent}
              onChange={(e) =>
                onUpdate({
                  ...item,
                  isCurrent: e.target.checked,
                  endDate: e.target.checked ? "" : item.endDate,
                })
              }
              className="mr-2"
            />
            <label
              htmlFor={`current-${item.id}`}
              className="text-sm text-gray-600"
            >
              Current Position
            </label>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            rows={3}
            value={item.description}
            onChange={(e) => onUpdate({ ...item, description: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
      </div>
    </BaseItemEditor>
  );
};
