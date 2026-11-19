"use client";

import React, { useState } from "react";
import { LinkIcon } from "@heroicons/react/24/outline";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { EducationItem } from "../types/resume";
import { SectionFormProps } from "./sectionForms/types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  MonthYearSelector,
  TEXTAREA_CLASSNAME,
  isEndDateBeforeStartDate,
  parseToDateFields,
} from "./sectionForms/primitives";

export default function EducationForm({
  initialContent,
  onSave,
  onCancel,
}: SectionFormProps<EducationItem>) {
  const [content, setContent] = useState<EducationItem>(() => {
    const base = initialContent ?? {
      id: Date.now().toString(),
      degree: "",
      field: "",
      location: "",
      current: false,
      startDate: { month: "", year: "" },
      endDate: { month: "", year: "" },
      description: "",
    };
    return {
      ...base,
      id: base.id || Date.now().toString(),
      degree: base.degree || "",
      field: base.field || (base as any).institution || "",
      location: base.location || "",
      current: Boolean(base.current),
      startDate: parseToDateFields(base.startDate),
      endDate: parseToDateFields(base.endDate),
      description: base.description || "",
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof EducationItem | string, value: any) => {
    setContent((prevContent) => ({
      ...prevContent,
      [field]: value,
    }));
    if (errors[field] || errors.dateRange) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        if (field === "startDate" || field === "endDate" || field === "current") {
          delete next.dateRange;
        }
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!content.degree.trim()) {
      nextErrors.degree = "Degree or qualification is required.";
    }
    if (
      isEndDateBeforeStartDate(
        content.startDate,
        content.endDate,
        content.current
      )
    ) {
      nextErrors.dateRange = "End date cannot be earlier than start date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const prepared: any = {
      ...content,
      degree: content.degree.trim(),
      field: content.field.trim(),
      location: (content.location || "").trim(),
      description: (content.description || "").trim(),
      startDate: content.startDate || { month: "", year: "" },
      endDate: content.current
        ? { month: "", year: "" }
        : content.endDate || { month: "", year: "" },
    };

    if ("institution" in (initialContent || {})) {
      prepared.institution = content.field.trim();
    }

    onSave(prepared);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="edu-degree"
          label="Degree / Qualification"
          required
          error={errors.degree}
        >
          <Input
            id="edu-degree"
            placeholder="e.g. B.S. in Computer Science"
            aria-invalid={Boolean(errors.degree)}
            aria-describedby={errors.degree ? "edu-degree-error" : undefined}
            className={errors.degree ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={content.degree || ""}
            onChange={(e) => handleChange("degree", e.target.value)}
          />
        </FormField>

        <FormField
          id="edu-school"
          label="School / Institution"
          error={errors.field}
        >
          <div className="flex gap-2">
            <Input
              id="edu-school"
              placeholder="Enter school or university"
              aria-invalid={Boolean(errors.field)}
              aria-describedby={errors.field ? "edu-school-error" : undefined}
              className={`${
                errors.field ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME
              } flex-1`}
              value={content.field || ""}
              onChange={(e) => handleChange("field", e.target.value)}
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
        </FormField>

        <FormField id="edu-location" label="Location">
          <Input
            id="edu-location"
            placeholder="e.g. Boston, MA"
            className={INPUT_CLASSNAME}
            value={content.location || ""}
            onChange={(e) => handleChange("location", e.target.value)}
          />
        </FormField>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edu-start-month"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Start Date
              </label>
              <MonthYearSelector
                idPrefix="edu-start"
                labelPrefix="Start Date"
                selectedMonth={content.startDate?.month}
                selectedYear={content.startDate?.year}
                onMonthChange={(value) =>
                  handleChange("startDate", {
                    ...(content.startDate || { month: "", year: "" }),
                    month: value,
                  })
                }
                onYearChange={(value) =>
                  handleChange("startDate", {
                    ...(content.startDate || { month: "", year: "" }),
                    year: value,
                  })
                }
              />
            </div>
            <div>
              <label
                htmlFor="edu-end-month"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                End Date
              </label>
              <MonthYearSelector
                idPrefix="edu-end"
                labelPrefix="End Date"
                selectedMonth={content.endDate?.month}
                selectedYear={content.endDate?.year}
                disabled={Boolean(content.current)}
                onMonthChange={(value) =>
                  handleChange("endDate", {
                    ...(content.endDate || { month: "", year: "" }),
                    month: value,
                  })
                }
                onYearChange={(value) =>
                  handleChange("endDate", {
                    ...(content.endDate || { month: "", year: "" }),
                    year: value,
                  })
                }
              />
              <label
                htmlFor="edu-current"
                className="mt-2 inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer"
              >
                <input
                  id="edu-current"
                  type="checkbox"
                  checked={Boolean(content.current)}
                  onChange={(e) => handleChange("current", e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Currently studying here
              </label>
            </div>
          </div>
          {errors.dateRange && (
            <p role="alert" className="mt-1.5 text-xs font-medium text-red-600">
              {errors.dateRange}
            </p>
          )}
        </div>

        <FormField id="edu-description" label="Description">
          <textarea
            id="edu-description"
            className={TEXTAREA_CLASSNAME}
            rows={4}
            placeholder="Relevant coursework, honors, thesis, or activities..."
            value={content.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </FormField>
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
}
