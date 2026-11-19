import React, { useState } from "react";
import { Input } from "../ui/input";
import { InterestItem } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
} from "./primitives";

export const InterestsForm: React.FC<SectionFormProps<InterestItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [description, setDescription] = useState<string>(
    initialAny.description || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Interest name is required." });
      return;
    }

    const payload: InterestItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="interest-name"
          label="Interest Name"
          required
          error={errors.name}
        >
          <Input
            id="interest-name"
            placeholder="e.g. Open Source Contributions, Trail Running"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "interest-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <FormField id="interest-description" label="Description">
          <textarea
            id="interest-description"
            rows={3}
            placeholder="Optional context or highlights..."
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

export default InterestsForm;
