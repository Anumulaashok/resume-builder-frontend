import React from "react";
import { BaseItemEditor, BaseItemEditorProps } from "./BaseItemEditor";
import { SkillItem } from "../../../types/resume";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SkillEditorProps extends Omit<BaseItemEditorProps, "item"> {
  item: SkillItem;
}

export const SkillEditor: React.FC<SkillEditorProps> = ({
  item,
  onUpdate,
  ...props
}) => {
  const handleSubSkillAdd = (newSubSkill: string) => {
    const updatedItem: SkillItem = {
      ...item,
      subSkills: [...(item.subSkills || []), newSubSkill],
    };
    onUpdate(updatedItem);
  };

  const handleSubSkillRemove = (index: number) => {
    if (!item.subSkills) return;
    const updatedItem: SkillItem = {
      ...item,
      subSkills: item.subSkills.filter((_, i) => i !== index),
    };
    onUpdate(updatedItem);
  };

  return (
    <BaseItemEditor item={item} onUpdate={onUpdate} {...props}>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Skill Name
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate({ ...item, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Level
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={item.level || 1}
            onChange={(e) =>
              onUpdate({ ...item, level: Number(e.target.value) })
            }
            className="mt-1 block w-full"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Beginner</span>
            <span>Intermediate</span>
            <span>Expert</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Sub-skills
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(item.subSkills || []).map((subSkill, index) => (
              <div
                key={index}
                className="flex items-center bg-gray-100 rounded-full px-3 py-1"
              >
                <span className="text-sm">{subSkill}</span>
                <button
                  type="button"
                  onClick={() => handleSubSkillRemove(index)}
                  className="ml-2"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            ))}
            <input
              type="text"
              placeholder="Add sub-skill"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter" && e.currentTarget.value.trim()) {
                  handleSubSkillAdd(e.currentTarget.value.trim());
                  e.currentTarget.value = "";
                }
              }}
              className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>
    </BaseItemEditor>
  );
};
