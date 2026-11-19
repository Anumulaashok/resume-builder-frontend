import React, { useState } from "react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { dateFields } from "../../types/resume";

export const MONTHS = [
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

const MONTH_INDEX_BY_VALUE: Record<string, number> = MONTHS.reduce(
  (acc, m, idx) => {
    acc[m.value.toLowerCase()] = idx;
    acc[m.label.toLowerCase()] = idx;
    return acc;
  },
  {} as Record<string, number>
);

export function normalizeMonthToken(raw?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  const idx = MONTH_INDEX_BY_VALUE[lower];
  if (idx !== undefined) {
    return MONTHS[idx].value;
  }
  const num = parseInt(trimmed, 10);
  if (!Number.isNaN(num) && num >= 1 && num <= 12 && /^\d{1,2}$/.test(trimmed)) {
    return MONTHS[num - 1].value;
  }
  return "";
}

export function parseToDateFields(
  value?: string | Partial<dateFields> | null
): dateFields {
  if (!value) {
    return { month: "", year: "" };
  }

  if (typeof value === "object") {
    return {
      month: normalizeMonthToken(value.month) || (value.month ?? "").toString().trim(),
      year: (value.year ?? "").toString().trim(),
    };
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || /^present$/i.test(trimmed)) {
      return { month: "", year: "" };
    }

    // ISO-like YYYY-MM or YYYY/MM
    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})/);
    if (isoMatch) {
      return {
        year: isoMatch[1],
        month: normalizeMonthToken(isoMatch[2]),
      };
    }

    const yearMatch = trimmed.match(/\b(19\d{2}|20\d{2})\b/);
    const year = yearMatch ? yearMatch[1] : "";
    const remainder = year ? trimmed.replace(year, "").replace(/[,/-]/g, " ").trim() : trimmed;
    const tokens = remainder.split(/\s+/).filter(Boolean);
    let month = "";
    for (const token of tokens) {
      const normalized = normalizeMonthToken(token);
      if (normalized) {
        month = normalized;
        break;
      }
    }

    return { month, year };
  }

  return { month: "", year: "" };
}

export function dateFieldsToString(
  fields?: Partial<dateFields>,
  fallbackOriginal?: unknown
): string {
  const month = (fields?.month ?? "").toString().trim();
  const year = (fields?.year ?? "").toString().trim();
  const formatted = `${month} ${year}`.trim();
  if (formatted) {
    return formatted;
  }
  if (typeof fallbackOriginal === "string" && fallbackOriginal.trim()) {
    return fallbackOriginal.trim();
  }
  return "";
}

export function isEndDateBeforeStartDate(
  start?: Partial<dateFields>,
  end?: Partial<dateFields>,
  isCurrent?: boolean
): boolean {
  if (isCurrent) return false;
  const startYear = parseInt(start?.year || "", 10);
  const endYear = parseInt(end?.year || "", 10);
  if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
    return false;
  }
  if (endYear < startYear) {
    return true;
  }
  if (endYear > startYear) {
    return false;
  }
  const startMonthIdx = start?.month
    ? MONTH_INDEX_BY_VALUE[start.month.toLowerCase()]
    : undefined;
  const endMonthIdx = end?.month
    ? MONTH_INDEX_BY_VALUE[end.month.toLowerCase()]
    : undefined;
  if (startMonthIdx !== undefined && endMonthIdx !== undefined) {
    return endMonthIdx < startMonthIdx;
  }
  return false;
}

export function isValidOptionalUrl(raw?: string): boolean {
  if (!raw || !raw.trim()) return true;
  const trimmed = raw.trim();
  if (/\s/.test(trimmed)) return false;
  if (/^(javascript|data|vbscript):/i.test(trimmed)) return false;
  try {
    const candidate = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname && parsed.hostname.includes("."));
  } catch {
    return false;
  }
}

export const INPUT_CLASSNAME =
  "bg-white text-gray-900 placeholder-gray-400 border-gray-300";

export const ERROR_INPUT_CLASSNAME =
  "bg-white text-gray-900 placeholder-gray-400 border-red-500 focus:ring-red-500 focus:border-red-500";

export const TEXTAREA_CLASSNAME =
  "w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors";

export const FormField: React.FC<{
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ id, label, required = false, error, hint, children }) => {
  return (
    <div>
      <div className="flex items-center gap-0.5 mb-1">
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
        {required && (
          <span className="text-sm font-medium text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p
          id={id ? `${id}-error` : undefined}
          role="alert"
          className="mt-1 text-xs font-medium text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
};

export const MonthYearSelector: React.FC<{
  idPrefix?: string;
  labelPrefix?: string;
  selectedMonth?: string;
  selectedYear?: string;
  disabled?: boolean;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
}> = ({
  idPrefix,
  labelPrefix,
  selectedMonth,
  selectedYear,
  disabled = false,
  onMonthChange,
  onYearChange,
}) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 45 }, (_, i) =>
    (currentYear + 5 - i).toString()
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={selectedMonth || ""}
        onChange={onMonthChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={idPrefix ? `${idPrefix}-month` : undefined}
          aria-label={labelPrefix ? `${labelPrefix} Month` : undefined}
          className="border-gray-300 text-gray-900"
        >
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
        <SelectTrigger
          id={idPrefix ? `${idPrefix}-year` : undefined}
          aria-label={labelPrefix ? `${labelPrefix} Year` : undefined}
          className="border-gray-300 text-gray-900"
        >
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

export const DateField: React.FC<{
  idPrefix: string;
  label: string;
  value: dateFields;
  onChange: (next: dateFields) => void;
  error?: string;
}> = ({ idPrefix, label, value, onChange, error }) => {
  return (
    <FormField id={`${idPrefix}-month`} label={label} error={error}>
      <MonthYearSelector
        idPrefix={idPrefix}
        labelPrefix={label}
        selectedMonth={value.month}
        selectedYear={value.year}
        onMonthChange={(month) => onChange({ ...value, month })}
        onYearChange={(year) => onChange({ ...value, year })}
      />
    </FormField>
  );
};

export const DateRangeFields: React.FC<{
  idPrefix: string;
  startDate: dateFields;
  endDate: dateFields;
  current?: boolean;
  currentLabel?: string;
  onStartDateChange: (next: dateFields) => void;
  onEndDateChange: (next: dateFields) => void;
  onCurrentChange?: (checked: boolean) => void;
  error?: string;
}> = ({
  idPrefix,
  startDate,
  endDate,
  current = false,
  currentLabel = "Currently active",
  onStartDateChange,
  onEndDateChange,
  onCurrentChange,
  error,
}) => {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${idPrefix}-start-month`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Start Date
          </label>
          <MonthYearSelector
            idPrefix={`${idPrefix}-start`}
            labelPrefix="Start Date"
            selectedMonth={startDate.month}
            selectedYear={startDate.year}
            onMonthChange={(month) =>
              onStartDateChange({ ...startDate, month })
            }
            onYearChange={(year) => onStartDateChange({ ...startDate, year })}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-end-month`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            End Date
          </label>
          <MonthYearSelector
            idPrefix={`${idPrefix}-end`}
            labelPrefix="End Date"
            selectedMonth={endDate.month}
            selectedYear={endDate.year}
            disabled={Boolean(current)}
            onMonthChange={(month) => onEndDateChange({ ...endDate, month })}
            onYearChange={(year) => onEndDateChange({ ...endDate, year })}
          />
          {onCurrentChange && (
            <label
              htmlFor={`${idPrefix}-current`}
              className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer"
            >
              <input
                id={`${idPrefix}-current`}
                type="checkbox"
                checked={Boolean(current)}
                onChange={(e) => onCurrentChange(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              {currentLabel}
            </label>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export function parseTagsList(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function mergeTagsWithDraft(tags: string[], draft: string): string[] {
  const combined = [...tags];
  const fromDraft = parseTagsList(draft);
  fromDraft.forEach((tag) => {
    if (!combined.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      combined.push(tag);
    }
  });
  return combined;
}

export const TagInput: React.FC<{
  id: string;
  label: string;
  tags: string[];
  draftValue?: string;
  placeholder?: string;
  onChange: (tags: string[]) => void;
  onDraftChange?: (draft: string) => void;
  error?: string;
}> = ({
  id,
  label,
  tags,
  draftValue,
  placeholder = "Type a tag and press Enter or comma...",
  onChange,
  onDraftChange,
  error,
}) => {
  const [internalDraft, setInternalDraft] = useState("");
  const currentDraft = draftValue !== undefined ? draftValue : internalDraft;

  const setDraft = (next: string) => {
    if (draftValue === undefined) {
      setInternalDraft(next);
    }
    onDraftChange?.(next);
  };

  const commitDraft = (rawInput: string) => {
    const nextTags = mergeTagsWithDraft(tags, rawInput);
    if (nextTags.length !== tags.length) {
      onChange(nextTags);
    }
    setDraft("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      if (currentDraft.trim()) {
        e.preventDefault();
        commitDraft(currentDraft);
      } else if (e.key === ",") {
        e.preventDefault();
      }
    } else if (e.key === "Backspace" && !currentDraft && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <FormField
      id={id}
      label={label}
      error={error}
      hint="Press Enter, comma, or click Add to create tags"
    >
      <div className="space-y-2">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="list">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                role="listitem"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  aria-label={`Remove ${tag}`}
                  className="text-blue-500 hover:text-blue-800 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            id={id}
            value={currentDraft}
            placeholder={placeholder}
            className={`${INPUT_CLASSNAME} flex-1`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (currentDraft.trim()) {
                commitDraft(currentDraft);
              }
            }}
            className="border-gray-300 text-gray-700 shrink-0"
            aria-label="Add tag"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </FormField>
  );
};

export const PROFICIENCY_OPTIONS = [
  { value: "1", numeric: 1, label: "1 - Beginner" },
  { value: "2", numeric: 2, label: "2 - Elementary" },
  { value: "3", numeric: 3, label: "3 - Intermediate" },
  { value: "4", numeric: 4, label: "4 - Advanced" },
  { value: "5", numeric: 5, label: "5 - Expert" },
];

export function normalizeSkillLevel(raw: unknown): number | undefined {
  if (typeof raw === "number" && !Number.isNaN(raw)) {
    if (raw >= 1 && raw <= 5) return Math.round(raw);
    if (raw > 5) return Math.min(5, Math.max(1, Math.round(raw / 20)));
    return undefined;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return undefined;
    const asNum = Number(trimmed);
    if (!Number.isNaN(asNum) && asNum >= 1 && asNum <= 5) {
      return Math.round(asNum);
    }
    if (trimmed.includes("begin") || trimmed.includes("novice")) return 1;
    if (trimmed.includes("elem") || trimmed.includes("basic")) return 2;
    if (trimmed.includes("inter") || trimmed.includes("moderate")) return 3;
    if (trimmed.includes("advan") || trimmed.includes("profic") || trimmed.includes("strong"))
      return 4;
    if (trimmed.includes("expert") || trimmed.includes("master") || trimmed.includes("senior"))
      return 5;
  }
  return undefined;
}

export const ProficiencySelect: React.FC<{
  id: string;
  label?: string;
  value?: number;
  onChange: (next?: number) => void;
}> = ({ id, label = "Proficiency Level", value, onChange }) => {
  const selectedOption = PROFICIENCY_OPTIONS.find((o) => o.numeric === value);

  return (
    <FormField id={id} label={label}>
      <Select
        value={selectedOption ? selectedOption.value : ""}
        onChange={(val) => {
          const parsed = parseInt(val, 10);
          onChange(Number.isNaN(parsed) ? undefined : parsed);
        }}
      >
        <SelectTrigger id={id} className="border-gray-300 text-gray-900">
          <SelectValue
            placeholder="Select proficiency level"
            displayValue={selectedOption?.label}
          />
        </SelectTrigger>
        <SelectContent className="max-h-56 overflow-y-auto border-gray-200">
          {PROFICIENCY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
};

export const FormActions: React.FC<{
  onCancel: () => void;
  saveLabel?: string;
}> = ({ onCancel, saveLabel = "Save" }) => {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-6"
      >
        {saveLabel}
      </Button>
    </div>
  );
};
