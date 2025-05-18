// UI for managing a single section and its items using the API

import React, { useEffect, useState } from "react";
import { sectionApi } from "../../services/section.api";
import {
  ResumeSection,
  SectionItem,
  WorkExperienceItem,
  SkillItem,
} from "../../types/resume";
import {
  PlusIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { WorkExperienceItemEditor } from "./items/WorkExperienceItem";
import { SkillItemEditor } from "./items/SkillItem";

interface SectionEditorProps {
  resumeId: string;
  section: ResumeSection;
  onSectionUpdated: (section: ResumeSection) => void;
  onSectionDeleted: (sectionId: string) => void;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  resumeId,
  section,
  onSectionUpdated,
  onSectionDeleted,
}) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SectionItem[]>(section.content || []);
  const [error, setError] = useState<string | null>(null);

  // Add new item
  const handleAddItem = async () => {
    setLoading(true);
    setError(null);
    try {
      const newItem = await sectionApi.addSectionItem(resumeId, section.id, {});
      setItems((prev) => [...prev, newItem]);
      onSectionUpdated({ ...section, content: [...items, newItem] });
    } catch (e) {
      setError("Failed to add item");
    } finally {
      setLoading(false);
    }
  };

  // Update item
  const handleUpdateItem = async (
    itemId: string,
    updated: Partial<SectionItem>
  ) => {
    setLoading(true);
    setError(null);
    try {
      const updatedItem = await sectionApi.updateSectionItem(
        resumeId,
        section.id,
        itemId,
        updated
      );
      const newItems = items.map((item) =>
        item.id === itemId ? updatedItem : item
      );
      setItems(newItems);
      onSectionUpdated({ ...section, content: newItems });
    } catch (e) {
      setError("Failed to update item");
    } finally {
      setLoading(false);
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    setLoading(true);
    setError(null);
    try {
      await sectionApi.deleteSectionItem(resumeId, section.id, itemId);
      const newItems = items.filter((item) => item.id !== itemId);
      setItems(newItems);
      onSectionUpdated({ ...section, content: newItems });
    } catch (e) {
      setError("Failed to delete item");
    } finally {
      setLoading(false);
    }
  };

  // Toggle enable/disable
  const handleToggleItem = async (itemId: string, enabled: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const updatedItem = await sectionApi.toggleSectionItemStatus(
        resumeId,
        section.id,
        itemId,
        enabled
      );
      const newItems = items.map((item) =>
        item.id === itemId ? updatedItem : item
      );
      setItems(newItems);
      onSectionUpdated({ ...section, content: newItems });
    } catch (e) {
      setError("Failed to update item status");
    } finally {
      setLoading(false);
    }
  };

  // Delete section
  const handleDeleteSection = async () => {
    setLoading(true);
    setError(null);
    try {
      await sectionApi.deleteSection(resumeId, section.id);
      onSectionDeleted(section.id);
    } catch (e) {
      setError("Failed to delete section");
    } finally {
      setLoading(false);
    }
  };

  const handleItemUpdate = (index: number, updates: Partial<SectionItem>) => {
    const newContent = [...section.content];
    switch (section.type) {
      case "work":
        newContent[index] = {
          ...newContent[index],
          ...updates,
        } as WorkExperienceItem;
        break;
      case "skills":
      case "softSkills":
      case "technicalSkills":
        newContent[index] = { ...newContent[index], ...updates } as SkillItem;
        break;
      default:
        newContent[index] = { ...newContent[index], ...updates };
    }
    onSectionUpdated({ ...section, content: newContent });
  };

  const handleItemDelete = (index: number) => {
    onSectionUpdated({
      ...section,
      content: section.content.filter((_, i) => i !== index),
    });
  };

  const handleItemToggle = (index: number) => {
    const item = section.content[index];
    handleItemUpdate(index, { enabled: item.enabled === false });
  };

  const handleAddItemNew = () => {
    let newItem: SectionItem;

    switch (section.type) {
      case "work":
        newItem = {
          id: `${section.type}-${Date.now()}`,
          enabled: true,
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          description: "",
          isCurrent: false,
        } as WorkExperienceItem;
        break;
      case "skills":
      case "softSkills":
      case "technicalSkills":
        newItem = {
          id: `${section.type}-${Date.now()}`,
          enabled: true,
          name: "",
          level: 3,
          subSkills: [],
        } as SkillItem;
        break;
      default:
        newItem = {
          id: `${section.type}-${Date.now()}`,
          enabled: true,
        };
    }

    onSectionUpdated({
      ...section,
      content: [...section.content, newItem],
    });
  };

  const renderItem = (item: SectionItem, index: number) => {
    const commonProps = {
      onUpdate: (updates: any) => handleItemUpdate(index, updates),
      onDelete: () => handleItemDelete(index),
      onToggle: () => handleItemToggle(index),
    };

    switch (section.type) {
      case "work":
        return (
          <WorkExperienceItemEditor
            key={item.id}
            item={item as WorkExperienceItem}
            {...commonProps}
          />
        );
      case "skills":
      case "softSkills":
      case "technicalSkills":
        return (
          <SkillItemEditor
            key={item.id}
            item={item as SkillItem}
            {...commonProps}
          />
        );
      default:
        return null;
    }
  };

  // Render items (simplified, you can expand with custom editors per type)
  return (
    <div className="border rounded-lg p-4 mb-4 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{section.title}</h3>
        <button onClick={handleDeleteSection} disabled={loading}>
          <XMarkIcon className="h-5 w-5 text-red-500" />
        </button>
      </div>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <ul>
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2 mb-2">
            {renderItem(item, index)}
          </li>
        ))}
      </ul>
      <button
        onClick={handleAddItemNew}
        className="mt-2 flex items-center px-3 py-1 bg-blue-600 text-white rounded"
        disabled={loading}
      >
        <PlusIcon className="h-4 w-4 mr-1" />
        Add Item
      </button>
      {loading && (
        <ArrowPathIcon className="h-4 w-4 animate-spin ml-2 inline" />
      )}
    </div>
  );
};

export default SectionEditor;
