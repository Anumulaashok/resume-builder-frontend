import React, { useState } from "react";
import { Input } from "../ui/input";
import { AwardItem, dateFields } from "../../types/resume";
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

export const AwardsForm: React.FC<SectionFormProps<AwardItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.title || ""
  );
  const [issuer, setIssuer] = useState<string>(
    initialAny.issuer || initialAny.awarder || ""
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
      setErrors({ name: "Award title is required." });
      return;
    }

    const trimmedName = name.trim();
    const trimmedIssuer = issuer.trim();

    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedName,
      issuer: trimmedIssuer,
      date: dateFieldsToString(
        date,
        dateTouched ? undefined : initialAny.date
      ),
      description: description.trim(),
    };

    if ("title" in initialAny) {
      payload.title = trimmedName;
    }
    if ("awarder" in initialAny) {
      payload.awarder = trimmedIssuer;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="award-name"
          label="Award Title"
          required
          error={errors.name}
        >
          <Input
            id="award-name"
            placeholder="e.g. Engineering Excellence Award"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "award-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <FormField id="award-issuer" label="Awarded By">
          <Input
            id="award-issuer"
            placeholder="e.g. Acme Corp"
            className={INPUT_CLASSNAME}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </FormField>

        <DateField
          idPrefix="award-date"
          label="Date Received"
          value={date}
          onChange={(next) => {
            setDate(next);
            setDateTouched(true);
          }}
        />

        <FormField id="award-description" label="Description">
          <textarea
            id="award-description"
            rows={3}
            placeholder="Context and recognition details..."
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

export default AwardsForm;
