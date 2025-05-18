import React, { KeyboardEvent } from "react";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { SkillItem } from "../../../types/resume";

interface Props {
  item: SkillItem;
  onUpdate: (updated: Partial<SkillItem>) => void;
  onDelete: () => void;
  onToggle: () => void;
}

export const SkillItemEditor: React.FC<Props> = ({
  item,
  onUpdate,
  onDelete,
  onToggle,
}) => {
  const handleSubSkillAdd = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && e.currentTarget.value.trim()) {
      onUpdate({
        subSkills: [...(item.subSkills || []), e.currentTarget.value.trim()],
      });
      e.currentTarget.value = "";
    }
  };

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

      <div className="mt-6 space-y-4">
        <input
          className="w-full px-3 py-2 border rounded"
          placeholder="Skill Name"
          value={item.name || ""}
          onChange={(e) => onUpdate({ name: e.target.value })}
        />

        <div className="space-y-2">
          <label className="flex justify-between text-sm">
            <span>Skill Level</span>
            <span>{item.level || 3}/5</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={item.level || 3}
            onChange={(e) => onUpdate({ level: Number(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <input
            className="w-full px-3 py-2 border rounded"
            placeholder="Add sub-skill (press Enter)"
            onKeyDown={handleSubSkillAdd}
          />
          <div className="flex flex-wrap gap-2">
            {(item.subSkills || []).map((subSkill, index) => (
              <span
                key={index}
                className="inline-flex items-center bg-gray-100 rounded-full px-3 py-1 text-sm"
              >
                {subSkill}
                <button
                  onClick={() =>
                    onUpdate({
                      subSkills: item.subSkills?.filter((_, i) => i !== index),
                    })
                  }
                  className="ml-2"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
