import React, { useState } from "react";
import { Input } from "../ui/input";
import { OrganizationItem, dateFields } from "../../types/resume";
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

export const OrganizationsForm: React.FC<
  SectionFormProps<OrganizationItem>
> = ({ initialContent, onSave, onCancel }) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.organization || ""
  );
  const [position, setPosition] = useState<string>(initialAny.position || "");
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

    if (!name.trim()) {
      nextErrors.name = "Organization name is required.";
    }
    if (isEndDateBeforeStartDate(startDate, endDate, current)) {
      nextErrors.dateRange = "End date cannot be earlier than start date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedName = name.trim();
    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedName,
      position: position.trim(),
      startDate: dateFieldsToString(
        startDate,
        startTouched ? undefined : initialAny.startDate
      ),
      endDate: current
        ? ""
        : dateFieldsToString(
            endDate,
            endTouched ? undefined : initialAny.endDate
          ),
      current,
      description: description.trim(),
    };

    if ("organization" in initialAny) {
      payload.organization = trimmedName;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="org-name"
          label="Organization Name"
          required
          error={errors.name}
        >
          <Input
            id="org-name"
            placeholder="e.g. Women Who Code, ACM"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "org-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
          />
        </FormField>

        <FormField id="org-position" label="Role / Position">
          <Input
            id="org-position"
            placeholder="e.g. Chapter Lead, Volunteer Mentor"
            className={INPUT_CLASSNAME}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
          />
        </FormField>

        <DateRangeFields
          idPrefix="org"
          startDate={startDate}
          endDate={endDate}
          current={current}
          currentLabel="Currently active"
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

        <FormField id="org-description" label="Description">
          <textarea
            id="org-description"
            rows={3}
            placeholder="Contributions, events organized, and initiatives..."
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

export default OrganizationsForm;
