"use client";

import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { LinkIcon } from "@heroicons/react/24/outline";
import { dateFields, EducationItem } from "../types/resume";
import {
  createUniqueItemId,
  hasValidIdentifier,
  isPresentDateValue,
  normalizeEducationDate,
} from "../utils/resumeNormalizer";

const normalizeDateFields = (date?: unknown): dateFields => {
  return normalizeEducationDate(date);
};

const MONTHS = [
  { value: "Jan", label: "January" },
  { value: "Feb", label: "February" },
  { value: "Mar", label: "March" },
  { value: "Apr", label: "April" },
  { value: "May", label: "May" },
  { value: "Jun", label: "June" },
  { value: "Jul", label: "July" },
  { value: "Aug", label: "August" },
  { value: "Sep", label: "September" },
  { value: "Oct", label: "October" },
  { value: "Nov", label: "November" },
  { value: "Dec", label: "December" },
];

const MonthYearSelector: React.FC<{
  selectedMonth?: string;
  selectedYear?: string;
  disabled?: boolean;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}> = ({
  selectedMonth,
  selectedYear,
  disabled = false,
  onMonthChange,
  onYearChange,
}) => {
  const currentYear = new Date().getFullYear();
  const baseYears = Array.from({ length: 45 }, (_, i) =>
    (currentYear + 5 - i).toString()
  );
  const years =
    selectedYear && !baseYears.includes(selectedYear)
      ? [...baseYears, selectedYear]
      : baseYears;

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={selectedMonth || ""}
        onChange={onMonthChange}
        disabled={disabled}
      >
        <SelectTrigger className="border-gray-300 text-gray-900">
          <SelectValue placeholder="Month" />
        </SelectTrigger>
        <SelectContent className="max-h-56 overflow-y-auto border-gray-200">
          {MONTHS.map((month) => (
            <SelectItem key={month.value} value={month.value}>
              {month.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedYear || ""}
        onChange={onYearChange}
        disabled={disabled}
      >
        <SelectTrigger className="border-gray-300 text-gray-900">
          <SelectValue placeholder="Year" />
        </SelectTrigger>
        <SelectContent className="max-h-56 overflow-y-auto border-gray-200">
          {years.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default function EducationForm({
  initialContent,
  onSave,
  onCancel,
}: {
  initialContent?: EducationItem;
  onSave: (content: any) => void;
  onCancel: () => void;
}) {
  const usesInstitutionField = Boolean(initialContent?.institution);

  const [content, setContent] = useState<EducationItem>(() => {
    const resolvedId = hasValidIdentifier(initialContent?.id)
      ? initialContent!.id.trim()
      : createUniqueItemId("edu");

    if (!initialContent) {
      return {
        id: resolvedId,
        degree: "",
        field: "",
        location: "",
        current: false,
        startDate: { month: "", year: "" },
        endDate: { month: "", year: "" },
        description: "",
      };
    }

    const rawEnd = (initialContent as any).endDate;
    const endIsPresent = isPresentDateValue(rawEnd);

    return {
      ...initialContent,
      id: resolvedId,
      degree: initialContent.degree ?? "",
      field: initialContent.field ?? "",
      current:
        initialContent.current !== undefined
          ? Boolean(initialContent.current)
          : endIsPresent,
      startDate: normalizeDateFields((initialContent as any).startDate),
      endDate: endIsPresent
        ? { month: "", year: "" }
        : normalizeDateFields(rawEnd),
    };
  });

  const handleSave = () => {
    onSave({
      ...content,
      id: hasValidIdentifier(content.id)
        ? content.id.trim()
        : createUniqueItemId("edu"),
      startDate: normalizeDateFields(content.startDate),
      endDate: normalizeDateFields(content.endDate),
    });
  };

  const handleChange = (field: keyof EducationItem | string, value: any) => {
    setContent((prevContent) => ({
      ...prevContent,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="edu-degree"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Degree / Qualification
          </label>
          <Input
            id="edu-degree"
            placeholder="e.g. B.S. in Computer Science"
            className="bg-white text-gray-900 placeholder-gray-400 border-gray-300"
            value={content.degree || ""}
            onChange={(e) => handleChange("degree", e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="edu-school"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            School / Institution
          </label>
          <div className="flex gap-2">
            <Input
              id="edu-school"
              placeholder="Enter school or university"
              className="bg-white text-gray-900 placeholder-gray-400 border-gray-300 flex-1"
              value={
                usesInstitutionField
                  ? content.institution || ""
                  : content.field || ""
              }
              onChange={(e) =>
                handleChange(
                  usesInstitutionField ? "institution" : "field",
                  e.target.value
                )
              }
            />
            <Button
              type="button"
              variant="outline"
              className="border-gray-300 text-gray-700 shrink-0"
              title="Institution website"
              aria-label="Institution website"
            >
              <LinkIcon className="h-4 w-4 mr-1.5" />
              Link
            </Button>
          </div>
        </div>

        <div>
          <label
            htmlFor="edu-location"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Location
          </label>
          <Input
            id="edu-location"
            placeholder="e.g. Boston, MA"
            className="bg-white text-gray-900 placeholder-gray-400 border-gray-300"
            value={content.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <MonthYearSelector
              selectedMonth={content.startDate?.month}
              selectedYear={content.startDate?.year}
              onMonthChange={(value) =>
                setContent((prevContent) => ({
                  ...prevContent,
                  startDate: {
                    ...normalizeDateFields(prevContent.startDate),
                    month: value,
                  },
                }))
              }
              onYearChange={(value) =>
                setContent((prevContent) => ({
                  ...prevContent,
                  startDate: {
                    ...normalizeDateFields(prevContent.startDate),
                    year: value,
                  },
                }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <MonthYearSelector
              selectedMonth={content.endDate?.month}
              selectedYear={content.endDate?.year}
              disabled={Boolean(content.current)}
              onMonthChange={(value) =>
                setContent((prevContent) => ({
                  ...prevContent,
                  endDate: {
                    ...normalizeDateFields(prevContent.endDate),
                    month: value,
                  },
                }))
              }
              onYearChange={(value) =>
                setContent((prevContent) => ({
                  ...prevContent,
                  endDate: {
                    ...normalizeDateFields(prevContent.endDate),
                    year: value,
                  },
                }))
              }
            />
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(content.current)}
                onChange={(e) => handleChange("current", e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Currently studying here
            </label>
          </div>
        </div>

        <div>
          <label
            htmlFor="edu-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="edu-description"
            className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="Relevant coursework, honors, thesis, or activities..."
            value={content.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6"
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
