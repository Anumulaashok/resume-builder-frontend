import React, { useState } from "react";
import { motion } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { EducationItem, IResume, SectionType } from "../types/resume";
import { formatResumeDate } from "../utils/date";
import EducationForm from "./Education-form";
import InlineBulletCoach from "./common/InlineBulletCoach";

export interface ContntProps {
  type: SectionType;
  item: any;
}

interface SectionEditorProps {
  content: ContntProps;
  onClose: () => void;
  onSave: (type: SectionType, item: any) => void;
  resumeId?: string;
  resumeContext?: Partial<IResume> | null;
}

interface FieldDescriptor {
  key: string;
  syncKey?: string;
  label: string;
  placeholder?: string;
  type?: "text" | "textarea" | "checkbox" | "tags";
  dateObjectFallback?: boolean;
}

const SECTION_META: Record<
  SectionType,
  { title: string; fields: FieldDescriptor[] }
> = {
  [SectionType.WORK]: {
    title: "Professional Experience",
    fields: [
      {
        key: "name",
        syncKey: "company",
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
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Dec 2023",
        dateObjectFallback: true,
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
    fields: [],
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
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Aug 2023",
        dateObjectFallback: true,
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
        syncKey: "language",
        label: "Language",
        placeholder: "e.g. English, Spanish",
      },
      {
        key: "level",
        syncKey: "fluency",
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
        syncKey: "course",
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
        syncKey: "title",
        label: "Award Title",
        placeholder: "e.g. Engineering Excellence Award",
      },
      {
        key: "issuer",
        syncKey: "awarder",
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
        syncKey: "title",
        label: "Achievement Title",
        placeholder: "e.g. Reduced API P99 latency by 45%",
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
        syncKey: "organization",
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
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. Present",
        dateObjectFallback: true,
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
        syncKey: "email",
        label: "Contact Info (Email / Phone)",
        placeholder: "e.g. jordan@example.com",
      },
      {
        key: "description",
        syncKey: "reference",
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
        syncKey: "name",
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
      },
      {
        key: "endDate",
        label: "End Date",
        placeholder: "e.g. 2024",
        dateObjectFallback: true,
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

const GenericSectionItemForm: React.FC<{
  type: SectionType;
  initialItem: any;
  onSave: (item: any) => void;
  onCancel: () => void;
  resumeId?: string;
  resumeContext?: Partial<IResume> | null;
}> = ({
  type,
  initialItem,
  onSave,
  onCancel,
  resumeId,
  resumeContext,
}) => {
  const meta = SECTION_META[type] || SECTION_META[SectionType.CUSTOM];
  const [focusedFieldKey, setFocusedFieldKey] = useState<string | null>(null);

  const [formState, setFormState] = useState<Record<string, any>>(() => {
    const base = { ...(initialItem || { id: Date.now().toString() }) };
    meta.fields.forEach((field) => {
      if (field.syncKey) {
        const resolved = base[field.key] || base[field.syncKey] || "";
        base[field.key] = resolved;
        base[field.syncKey] = resolved;
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
    setFormState((prev) => {
      const next = { ...prev, [field.key]: value };
      if (field.syncKey) {
        next[field.syncKey] = value;
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prepared = { ...formState };
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
      }
    });
    onSave(prepared);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-gray-900">
      {meta.fields.map((field) => {
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
                onFocus={() => setFocusedFieldKey(field.key)}
                onBlur={() =>
                  setFocusedFieldKey((prev) => (prev === field.key ? null : prev))
                }
                onChange={(e) => updateField(field, e.target.value)}
                className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <InlineBulletCoach
                idPrefix={`section-${field.key}-coach`}
                value={String(formState[field.key] ?? "")}
                isFocused={focusedFieldKey === field.key}
                resumeId={resumeId}
                resumeContext={resumeContext}
                sectionType={type}
                fieldKey={field.key}
                itemContext={formState}
                existingSourceFactIds={
                  Array.isArray(formState.source_fact_ids)
                    ? formState.source_fact_ids
                    : undefined
                }
                onChange={(nextValue, sourceFactIds) => {
                  setFormState((prev) => {
                    const next: Record<string, any> = {
                      ...prev,
                      [field.key]: nextValue,
                    };
                    if (field.syncKey) {
                      next[field.syncKey] = nextValue;
                    }
                    if (sourceFactIds) {
                      next.source_fact_ids = sourceFactIds;
                    }
                    return next;
                  });
                }}
              />
            </div>
          );
        }

        const isEndDateDisabled =
          field.key === "endDate" && Boolean(formState.current);

        return (
          <div key={field.key}>
            <label
              htmlFor={inputId}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {field.label}
            </label>
            <input
              id={inputId}
              type="text"
              disabled={isEndDateDisabled}
              value={
                isEndDateDisabled ? "Present" : String(formState[field.key] ?? "")
              }
              placeholder={field.placeholder}
              onChange={(e) => updateField(field, e.target.value)}
              className="w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-neutral-100 disabled:text-gray-500"
            />
          </div>
        );
      })}

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
  resumeId,
  resumeContext,
}) => {
  if (!content) {
    return null;
  }

  if (content.type === SectionType.EDUCATION) {
    return (
      <DialogBox title="Education" onClose={onClose} hideFooter>
        <EducationForm
          initialContent={content.item as EducationItem}
          resumeId={resumeId}
          resumeContext={resumeContext}
          onSave={(newContent) => {
            onSave(content.type, newContent);
          }}
          onCancel={onClose}
        />
      </DialogBox>
    );
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
        resumeId={resumeId}
        resumeContext={resumeContext}
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
