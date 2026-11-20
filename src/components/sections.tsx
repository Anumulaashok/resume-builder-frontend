import React, { useState } from "react";
import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { dateFields, SectionType } from "../types/resume";
import { formatResumeDate } from "../utils/date";
import { normalizeSectionItem } from "../utils/resumeNormalizer";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface ContntProps {
  type: SectionType;
  item: any;
}

interface SectionEditorProps {
  content: ContntProps;
  onClose: () => void;
  onSave: (type: SectionType, item: any) => void;
}

export interface FieldDescriptor {
  key: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "checkbox" | "tags" | "month-year";
  dateObjectFallback?: boolean;
  halfWidth?: boolean;
}

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

const MONTH_TOKEN_MAP: Record<string, string> = {
  "1": "Jan",
  "01": "Jan",
  jan: "Jan",
  january: "Jan",
  "2": "Feb",
  "02": "Feb",
  feb: "Feb",
  february: "Feb",
  "3": "Mar",
  "03": "Mar",
  mar: "Mar",
  march: "Mar",
  "4": "Apr",
  "04": "Apr",
  apr: "Apr",
  april: "Apr",
  "5": "May",
  "05": "May",
  may: "May",
  "6": "Jun",
  "06": "Jun",
  jun: "Jun",
  june: "Jun",
  "7": "Jul",
  "07": "Jul",
  jul: "Jul",
  july: "Jul",
  "8": "Aug",
  "08": "Aug",
  aug: "Aug",
  august: "Aug",
  "9": "Sep",
  "09": "Sep",
  sep: "Sep",
  sept: "Sep",
  september: "Sep",
  "10": "Oct",
  oct: "Oct",
  october: "Oct",
  "11": "Nov",
  nov: "Nov",
  november: "Nov",
  "12": "Dec",
  dec: "Dec",
  december: "Dec",
};

function normalizeMonthToken(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const cleaned = raw.trim().replace(/\.$/, "").toLowerCase();
  if (!cleaned) return "";
  return MONTH_TOKEN_MAP[cleaned] || raw.trim();
}

export function parseMonthYearDateValue(
  raw: unknown
): dateFields | string {
  if (!raw) {
    return { month: "", year: "" };
  }

  if (typeof raw === "object") {
    const obj = raw as Partial<dateFields>;
    return {
      month: normalizeMonthToken(obj.month),
      year: typeof obj.year === "string" ? obj.year.trim() : "",
    };
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { month: "", year: "" };
    }

    if (/^\d{4}$/.test(trimmed)) {
      return { month: "", year: trimmed };
    }

    const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})(?:[-/]\d{1,2})?$/);
    if (isoMatch) {
      const month = MONTH_TOKEN_MAP[isoMatch[2]];
      if (month) {
        return { month, year: isoMatch[1] };
      }
    }

    const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const month = MONTH_TOKEN_MAP[slashMatch[1]];
      if (month) {
        return { month, year: slashMatch[2] };
      }
    }

    const namedMatch = trimmed.match(/^([A-Za-z]+)\.?\s*,?\s*(\d{4})$/);
    if (namedMatch) {
      const month = MONTH_TOKEN_MAP[namedMatch[1].toLowerCase()];
      if (month) {
        return { month, year: namedMatch[2] };
      }
    }

    const yearFirstNamed = trimmed.match(/^(\d{4})\s+([A-Za-z]+)\.?$/);
    if (yearFirstNamed) {
      const month = MONTH_TOKEN_MAP[yearFirstNamed[2].toLowerCase()];
      if (month) {
        return { month, year: yearFirstNamed[1] };
      }
    }

    const monthOnly = MONTH_TOKEN_MAP[trimmed.replace(/\.$/, "").toLowerCase()];
    if (monthOnly) {
      return { month: monthOnly, year: "" };
    }

    // Preserve non-standard string dates (e.g., "Present", "Spring 2020") without erasing them
    return trimmed;
  }

  return { month: "", year: "" };
}

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
      ? [...baseYears, selectedYear].sort((a, b) => Number(b) - Number(a))
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

export const SECTION_META: Record<
  SectionType,
  { title: string; fields: FieldDescriptor[] }
> = {
  [SectionType.WORK]: {
    title: "Professional Experience",
    fields: [
      {
        key: "company",
        label: "Company",
        placeholder: "e.g. Acme Corp",
      },
      {
        key: "position",
        label: "Position / Role",
        placeholder: "e.g. Senior Software Engineer",
      },
      {
        key: "location",
        label: "Location",
        placeholder: "e.g. San Francisco, CA",
      },
      {
        key: "startDate",
        label: "Start Date",
        placeholder: "e.g. Jan 2021",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Dec 2023",
        dateObjectFallback: true,
        halfWidth: true,
      },
      { key: "current", label: "Currently working here", type: "checkbox" },
      {
        key: "description",
        label: "Description & Key Achievements",
        placeholder: "Highlight responsibilities, impact, and metrics...",
        type: "textarea",
      },
    ],
  },
  [SectionType.EDUCATION]: {
    title: "Education",
    fields: [
      {
        key: "degree",
        label: "Degree / Qualification",
        placeholder: "e.g. B.S. in Computer Science",
        halfWidth: true,
      },
      {
        key: "institution",
        label: "School / Institution",
        placeholder: "e.g. Massachusetts Institute of Technology",
        halfWidth: true,
      },
      {
        key: "field",
        label: "Field of Study",
        placeholder: "e.g. Computer Science",
        halfWidth: true,
      },
      {
        key: "gpa",
        label: "GPA / Score",
        placeholder: "e.g. 3.9 / 4.0",
        halfWidth: true,
      },
      {
        key: "location",
        label: "Location",
        placeholder: "e.g. Cambridge, MA",
        halfWidth: true,
      },
      {
        key: "url",
        label: "Institution / Credential URL",
        placeholder: "https://...",
        halfWidth: true,
      },
      {
        key: "startDate",
        label: "Start Date",
        type: "month-year",
        halfWidth: true,
      },
      {
        key: "endDate",
        label: "End Date",
        type: "month-year",
        halfWidth: true,
      },
      { key: "current", label: "Currently studying here", type: "checkbox" },
      {
        key: "description",
        label: "Description",
        placeholder: "Relevant coursework, honors, thesis, or activities...",
        type: "textarea",
      },
    ],
  },
  [SectionType.SKILLS]: {
    title: "Skill",
    fields: [
      {
        key: "name",
        label: "Skill Name",
        placeholder: "e.g. TypeScript, System Design",
      },
      {
        key: "level",
        label: "Proficiency Level",
        placeholder: "e.g. Expert, Advanced, Intermediate",
      },
      {
        key: "subSkills",
        label: "Related Keywords (comma-separated)",
        placeholder: "e.g. React, Node.js, GraphQL",
        type: "tags",
      },
    ],
  },
  [SectionType.TECK_SKILLS]: {
    title: "Technical Skill",
    fields: [
      {
        key: "name",
        label: "Category or Skill Name",
        placeholder: "e.g. Backend Engineering",
      },
      {
        key: "level",
        label: "Proficiency Level",
        placeholder: "e.g. Advanced",
      },
      {
        key: "technologies",
        label: "Technologies (comma-separated)",
        placeholder: "e.g. Go, PostgreSQL, Kubernetes",
        type: "tags",
      },
    ],
  },
  [SectionType.SOFTSKILSS]: {
    title: "Soft Skill",
    fields: [
      {
        key: "name",
        label: "Soft Skill",
        placeholder: "e.g. Cross-functional Leadership",
      },
      {
        key: "level",
        label: "Proficiency Level",
        placeholder: "e.g. Strong",
      },
    ],
  },
  [SectionType.PROJECTS]: {
    title: "Project",
    fields: [
      {
        key: "name",
        label: "Project Name",
        placeholder: "e.g. Distributed Task Scheduler",
      },
      {
        key: "url",
        label: "Project URL",
        placeholder: "https://github.com/...",
      },
      {
        key: "startDate",
        label: "Start Date",
        placeholder: "e.g. Mar 2023",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Aug 2023",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "current",
        label: "Currently working on this",
        type: "checkbox",
      },
      {
        key: "technologies",
        label: "Technologies (comma-separated)",
        placeholder: "e.g. React, TypeScript, Tailwind CSS",
        type: "tags",
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Describe what you built and its impact...",
        type: "textarea",
      },
    ],
  },
  [SectionType.LANGUAGES]: {
    title: "Language",
    fields: [
      {
        key: "name",
        label: "Language",
        placeholder: "e.g. English, Spanish",
      },
      {
        key: "level",
        label: "Fluency",
        placeholder: "e.g. Native, Professional Working Proficiency",
      },
    ],
  },
  [SectionType.CERTIFICATES]: {
    title: "Certificate",
    fields: [
      {
        key: "name",
        label: "Certificate Name",
        placeholder: "e.g. AWS Certified Solutions Architect",
      },
      {
        key: "issuer",
        label: "Issuing Organization",
        placeholder: "e.g. Amazon Web Services",
      },
      {
        key: "date",
        label: "Issue Date",
        placeholder: "e.g. Jun 2024",
        dateObjectFallback: true,
      },
      {
        key: "url",
        label: "Credential URL",
        placeholder: "https://...",
      },
    ],
  },
  [SectionType.INTERESTS]: {
    title: "Interest",
    fields: [
      {
        key: "name",
        label: "Interest",
        placeholder: "e.g. Open Source Contributions",
      },
      {
        key: "description",
        label: "Details",
        placeholder: "Optional details...",
        type: "textarea",
      },
    ],
  },
  [SectionType.COURSES]: {
    title: "Course",
    fields: [
      {
        key: "name",
        label: "Course Name",
        placeholder: "e.g. Machine Learning Specialization",
      },
      {
        key: "institution",
        label: "Institution / Platform",
        placeholder: "e.g. Stanford Online",
      },
      {
        key: "date",
        label: "Completion Date",
        placeholder: "e.g. 2024",
        dateObjectFallback: true,
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Key topics covered...",
        type: "textarea",
      },
    ],
  },
  [SectionType.AWARDS]: {
    title: "Award",
    fields: [
      {
        key: "name",
        label: "Award Title",
        placeholder: "e.g. Engineering Excellence Award",
      },
      {
        key: "issuer",
        label: "Awarded By",
        placeholder: "e.g. Acme Corp",
      },
      {
        key: "date",
        label: "Date",
        placeholder: "e.g. Nov 2023",
        dateObjectFallback: true,
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Context and recognition details...",
        type: "textarea",
      },
    ],
  },
  [SectionType.ACHIVEMENTS]: {
    title: "Achievement",
    fields: [
      {
        key: "name",
        label: "Achievement Title",
        placeholder: "e.g. Reduced API P99 latency by 45%",
      },
      {
        key: "issuer",
        label: "Organization / Issuer",
        placeholder: "e.g. Acme Corp",
      },
      {
        key: "date",
        label: "Date",
        placeholder: "e.g. 2024",
        dateObjectFallback: true,
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Details of your accomplishment...",
        type: "textarea",
      },
    ],
  },
  [SectionType.ORGANIZATIONS]: {
    title: "Organization",
    fields: [
      {
        key: "name",
        label: "Organization Name",
        placeholder: "e.g. Women Who Code",
      },
      {
        key: "position",
        label: "Role / Position",
        placeholder: "e.g. Chapter Lead",
      },
      {
        key: "startDate",
        label: "Start Date",
        placeholder: "e.g. Jan 2022",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Dec 2023",
        dateObjectFallback: true,
        halfWidth: true,
      },
      { key: "current", label: "Currently active", type: "checkbox" },
      {
        key: "description",
        label: "Description",
        placeholder: "Contributions and initiatives...",
        type: "textarea",
      },
    ],
  },
  [SectionType.PUBLICATIONS]: {
    title: "Publication",
    fields: [
      {
        key: "title",
        label: "Publication Title",
        placeholder: "e.g. Scalable Microservices in Practice",
      },
      {
        key: "publisher",
        label: "Publisher / Journal",
        placeholder: "e.g. IEEE Software",
      },
      {
        key: "date",
        label: "Publication Date",
        placeholder: "e.g. Oct 2023",
        dateObjectFallback: true,
      },
      {
        key: "url",
        label: "URL",
        placeholder: "https://...",
      },
      {
        key: "description",
        label: "Summary",
        placeholder: "Brief abstract or summary...",
        type: "textarea",
      },
    ],
  },
  [SectionType.REFERENCES]: {
    title: "Reference",
    fields: [
      {
        key: "name",
        label: "Reference Name",
        placeholder: "e.g. Jordan Taylor",
      },
      {
        key: "position",
        label: "Position",
        placeholder: "e.g. VP of Engineering",
      },
      {
        key: "company",
        label: "Company",
        placeholder: "e.g. Acme Corp",
      },
      {
        key: "contact",
        label: "Contact Info (Email / Phone)",
        placeholder: "e.g. jordan@example.com",
      },
      {
        key: "description",
        label: "Reference Note",
        placeholder: "Optional relationship or endorsement...",
        type: "textarea",
      },
    ],
  },
  [SectionType.CUSTOM]: {
    title: "Custom Item",
    fields: [
      {
        key: "title",
        label: "Title",
        placeholder: "Enter item title",
      },
      {
        key: "subtitle",
        label: "Subtitle",
        placeholder: "Optional subtitle or role",
      },
      {
        key: "location",
        label: "Location",
        placeholder: "Optional location",
      },
      {
        key: "startDate",
        label: "Start Date",
        placeholder: "e.g. 2023",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. 2024",
        dateObjectFallback: true,
        halfWidth: true,
      },
      {
        key: "current",
        label: "Currently ongoing",
        type: "checkbox",
      },
      {
        key: "description",
        label: "Description",
        placeholder: "Enter details...",
        type: "textarea",
      },
    ],
  },
};

export const GenericSectionItemForm: React.FC<{
  type: SectionType;
  initialItem?: any;
  onSave: (item: any) => void;
  onCancel: () => void;
}> = ({ type, initialItem, onSave, onCancel }) => {
  const meta = SECTION_META[type] || SECTION_META[SectionType.CUSTOM];

  const [formState, setFormState] = useState<Record<string, any>>(() => {
    const normalized = normalizeSectionItem(
      type,
      initialItem ? { ...initialItem } : { id: Date.now().toString() }
    );
    const base: Record<string, any> = { ...normalized };
    meta.fields.forEach((field) => {
      if (field.type === "month-year") {
        base[field.key] = parseMonthYearDateValue(base[field.key]);
      } else if (field.dateObjectFallback) {
        base[field.key] = formatResumeDate(base[field.key]);
      } else if (field.type === "tags") {
        const val = base[field.key];
        base[field.key] = Array.isArray(val) ? val.join(", ") : val || "";
      } else if (field.type === "checkbox") {
        base[field.key] = Boolean(base[field.key]);
      } else if (base[field.key] === undefined || base[field.key] === null) {
        base[field.key] = "";
      }
    });
    return base;
  });

  const updateField = (field: FieldDescriptor, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field.key]: value,
    }));
  };

  const updateMonthYearField = (
    field: FieldDescriptor,
    part: "month" | "year",
    value: string
  ) => {
    setFormState((prev) => {
      const currentVal = prev[field.key];
      const baseDate =
        currentVal && typeof currentVal === "object"
          ? {
              month: typeof currentVal.month === "string" ? currentVal.month : "",
              year: typeof currentVal.year === "string" ? currentVal.year : "",
            }
          : { month: "", year: "" };
      return {
        ...prev,
        [field.key]: {
          ...baseDate,
          [part]: value,
        },
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prepared: Record<string, any> = { ...formState };
    meta.fields.forEach((field) => {
      if (field.type === "tags") {
        const raw = prepared[field.key];
        prepared[field.key] =
          typeof raw === "string"
            ? raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : Array.isArray(raw)
            ? raw
            : [];
      } else if (field.type === "month-year") {
        prepared[field.key] = parseMonthYearDateValue(prepared[field.key]);
      }
    });
    const canonicalItem = normalizeSectionItem(type, prepared, {
      explicitKeys: meta.fields.map((f) => f.key),
    });
    onSave(canonicalItem);
  };

  const renderFieldNode = (field: FieldDescriptor) => {
    const inputId = `section-item-${field.key}`;
    if (field.type === "checkbox") {
      return (
        <label
          key={field.key}
          htmlFor={inputId}
          className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
        >
          <input
            id={inputId}
            type="checkbox"
            checked={Boolean(formState[field.key])}
            onChange={(e) => updateField(field, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          {field.label}
        </label>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key}>
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {field.label}
          </label>
          <textarea
            id={inputId}
            rows={4}
            value={formState[field.key] ?? ""}
            placeholder={field.placeholder}
            onChange={(e) => updateField(field, e.target.value)}
            className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      );
    }

    const isEndDateDisabled =
      field.key === "endDate" && Boolean(formState.current);

    if (field.type === "month-year") {
      const dateVal = formState[field.key];
      const selectedMonth =
        dateVal && typeof dateVal === "object" ? dateVal.month : "";
      const selectedYear =
        dateVal && typeof dateVal === "object" ? dateVal.year : "";

      return (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <MonthYearSelector
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            disabled={isEndDateDisabled}
            onMonthChange={(val) => updateMonthYearField(field, "month", val)}
            onYearChange={(val) => updateMonthYearField(field, "year", val)}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {field.label}
        </label>
        <Input
          id={inputId}
          type="text"
          disabled={isEndDateDisabled}
          value={
            isEndDateDisabled ? "Present" : String(formState[field.key] ?? "")
          }
          placeholder={field.placeholder}
          onChange={(e) => updateField(field, e.target.value)}
          className="bg-white text-gray-900 placeholder-gray-400 border-gray-300 disabled:bg-neutral-100 disabled:text-gray-500"
        />
      </div>
    );
  };

  const renderedRows: React.ReactNode[] = [];
  for (let i = 0; i < meta.fields.length; i += 1) {
    const field = meta.fields[i];
    const nextField = meta.fields[i + 1];
    if (field.halfWidth && nextField?.halfWidth) {
      renderedRows.push(
        <div
          key={`${field.key}-${nextField.key}`}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {renderFieldNode(field)}
          {renderFieldNode(nextField)}
        </div>
      );
      i += 1;
    } else {
      renderedRows.push(renderFieldNode(field));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
      {renderedRows}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        >
          Save
        </button>
      </div>
    </form>
  );
};

const SectionEditors: React.FC<SectionEditorProps> = ({
  content,
  onClose,
  onSave,
}) => {
  if (!content) {
    return null;
  }

  const meta = SECTION_META[content.type];
  if (!meta) {
    return (
      <DialogBox title="Unsupported Section" onClose={onClose}>
        <p className="text-sm text-gray-600">
          Unknown content type: {String(content.type)}
        </p>
      </DialogBox>
    );
  }

  return (
    <DialogBox title={meta.title} onClose={onClose} hideFooter>
      <GenericSectionItemForm
        type={content.type}
        initialItem={content.item}
        onSave={(updatedItem) => onSave(content.type, updatedItem)}
        onCancel={onClose}
      />
    </DialogBox>
  );
};

export const DialogBox: React.FC<{
  title?: string;
  id?: string;
  onClose?: () => void;
  children: React.ReactNode;
  onSave?: (id: string) => void;
  hideFooter?: boolean;
  saveText?: string;
  className?: string;
  [key: string]: any;
}> = ({
  title,
  onClose,
  children,
  onSave,
  id,
  hideFooter = false,
  saveText,
  className = "",
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      className={`fixed inset-0 bg-gray-900/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm w-full ${className}`}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 12 }}
        className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-auto max-h-[90vh] overflow-y-auto text-gray-900"
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-5">
            {title ? (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            ) : (
              <span />
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                title="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-neutral-100 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        )}

        {children}

        {!hideFooter && (onClose || (onSave && id)) && (
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                {onSave && id ? "Cancel" : "Close"}
              </button>
            )}
            {onSave && id && (
              <button
                type="button"
                onClick={() => onSave(id)}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  saveText === "Delete"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saveText ?? "Save"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SectionEditors;
