import React, { useState } from "react";
import { Input } from "../ui/input";
import { WorkItem, dateFields } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  DateRangeFields,
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
  dateFieldsToString,
  isEndDateBeforeStartDate,
  parseToDateFields,
} from "./primitives";

export const WorkForm: React.FC<SectionFormProps<WorkItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [company, setCompany] = useState<string>(
    initialAny.name || initialAny.company || ""
  );
  const [position, setPosition] = useState<string>(initialAny.position || "");
  const [location, setLocation] = useState<string>(initialAny.location || "");
  const [startDate, setStartDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.startDate)
  );
  const [endDate, setEndDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.endDate)
  );
  const [startTouched, setStartTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const [current, setCurrent] = useState<boolean>(Boolean(initialAny.current));
  const [description, setDescription] = useState<string>(
    initialAny.description || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (key: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!company.trim()) {
      nextErrors.company = "Company name is required.";
    }
    if (!position.trim()) {
      nextErrors.position = "Position or job title is required.";
    }
    if (isEndDateBeforeStartDate(startDate, endDate, current)) {
      nextErrors.dateRange = "End date cannot be earlier than start date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedCompany = company.trim();
    const formattedStart = dateFieldsToString(
      startDate,
      startTouched ? undefined : initialAny.startDate
    );
    const formattedEnd = current
      ? ""
      : dateFieldsToString(
          endDate,
          endTouched ? undefined : initialAny.endDate
        );

    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedCompany,
      position: position.trim(),
      location: location.trim(),
      startDate: formattedStart,
      endDate: formattedEnd,
      current,
      description: description.trim(),
    };

    if ("company" in initialAny) {
      payload.company = trimmedCompany;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="work-company"
          label="Company"
          required
          error={errors.company}
        >
          <Input
            id="work-company"
            placeholder="e.g. Acme Corp"
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? "work-company-error" : undefined}
            className={errors.company ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={company}
            onChange={(e) => {
              setCompany(e.target.value);
              clearError("company");
            }}
          />
        </FormField>

        <FormField
          id="work-position"
          label="Position / Role"
          required
          error={errors.position}
        >
          <Input
            id="work-position"
            placeholder="e.g. Senior Software Engineer"
            aria-invalid={Boolean(errors.position)}
            aria-describedby={
              errors.position ? "work-position-error" : undefined
            }
            className={
              errors.position ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME
            }
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              clearError("position");
            }}
          />
        </FormField>

        <FormField id="work-location" label="Location">
          <Input
            id="work-location"
            placeholder="e.g. San Francisco, CA"
            className={INPUT_CLASSNAME}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </FormField>

        <DateRangeFields
          idPrefix="work"
          startDate={startDate}
          endDate={endDate}
          current={current}
          currentLabel="Currently working here"
          error={errors.dateRange}
          onStartDateChange={(next) => {
            setStartDate(next);
            setStartTouched(true);
            clearError("dateRange");
          }}
          onEndDateChange={(next) => {
            setEndDate(next);
            setEndTouched(true);
            clearError("dateRange");
          }}
          onCurrentChange={(checked) => {
            setCurrent(checked);
            clearError("dateRange");
          }}
        />

        <FormField id="work-description" label="Role Description">
          <textarea
            id="work-description"
            rows={4}
            placeholder="Highlight responsibilities, impact, and measurable results..."
            className={TEXTAREA_CLASSNAME}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default WorkForm;
