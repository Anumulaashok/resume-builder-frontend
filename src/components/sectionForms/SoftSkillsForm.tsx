import React, { useState } from "react";
import { Input } from "../ui/input";
import { SoftSkillItem } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  ProficiencySelect,
  normalizeSkillLevel,
} from "./primitives";

export const SoftSkillsForm: React.FC<SectionFormProps<SoftSkillItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [level, setLevel] = useState<number | undefined>(() =>
    normalizeSkillLevel(initialAny.level)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Soft skill name is required." });
      return;
    }

    const payload: SoftSkillItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      ...(level !== undefined ? { level } : { level: undefined }),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="softskill-name"
          label="Soft Skill Name"
          required
          error={errors.name}
        >
          <Input
            id="softskill-name"
            placeholder="e.g. Cross-functional Leadership"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "softskill-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <ProficiencySelect
          id="softskill-level"
          label="Proficiency Level"
          value={level}
          onChange={setLevel}
        />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default SoftSkillsForm;
