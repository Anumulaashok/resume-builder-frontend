import React, { useState } from "react";
import { Input } from "../ui/input";
import { TechnicalSkillItem } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  ProficiencySelect,
  TagInput,
  mergeTagsWithDraft,
  normalizeSkillLevel,
  parseTagsList,
} from "./primitives";

export const TechnicalSkillsForm: React.FC<
  SectionFormProps<TechnicalSkillItem>
> = ({ initialContent, onSave, onCancel }) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [level, setLevel] = useState<number | undefined>(() =>
    normalizeSkillLevel(initialAny.level)
  );
  const [technologies, setTechnologies] = useState<string[]>(() =>
    parseTagsList(initialAny.technologies)
  );
  const [techDraft, setTechDraft] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Category or technical skill name is required." });
      return;
    }

    const mergedTech = mergeTagsWithDraft(technologies, techDraft);

    const payload: TechnicalSkillItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      ...(level !== undefined ? { level } : { level: undefined }),
      technologies: mergedTech,
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="techskill-name"
          label="Category or Skill Name"
          required
          error={errors.name}
        >
          <Input
            id="techskill-name"
            placeholder="e.g. Backend Engineering"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "techskill-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <ProficiencySelect
          id="techskill-level"
          label="Proficiency Level"
          value={level}
          onChange={setLevel}
        />

        <TagInput
          id="techskill-technologies"
          label="Technologies"
          tags={technologies}
          draftValue={techDraft}
          placeholder="e.g. Go, PostgreSQL, Kubernetes"
          onChange={setTechnologies}
          onDraftChange={setTechDraft}
        />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default TechnicalSkillsForm;
