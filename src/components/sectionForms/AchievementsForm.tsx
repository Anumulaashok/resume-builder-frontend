import React, { useState } from "react";
import { Input } from "../ui/input";
import { AchievementItem, dateFields } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  DateField,
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
  dateFieldsToString,
  parseToDateFields,
} from "./primitives";

export const AchievementsForm: React.FC<SectionFormProps<AchievementItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.title || ""
  );
  const [date, setDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.date)
  );
  const [dateTouched, setDateTouched] = useState(false);
  const [description, setDescription] = useState<string>(
    initialAny.description || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Achievement title is required." });
      return;
    }

    const trimmedName = name.trim();
    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedName,
      date: dateFieldsToString(
        date,
        dateTouched ? undefined : initialAny.date
      ),
      description: description.trim(),
    };

    if ("title" in initialAny) {
      payload.title = trimmedName;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="achievement-name"
          label="Achievement Title"
          required
          error={errors.name}
        >
          <Input
            id="achievement-name"
            placeholder="e.g. Reduced API P99 latency by 45%"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={
              errors.name ? "achievement-name-error" : undefined
            }
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <DateField
          idPrefix="achievement-date"
          label="Date"
          value={date}
          onChange={(next) => {
            setDate(next);
            setDateTouched(true);
          }}
        />

        <FormField id="achievement-description" label="Description">
          <textarea
            id="achievement-description"
            rows={3}
            placeholder="Details and measurable impact of your accomplishment..."
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

export default AchievementsForm;
