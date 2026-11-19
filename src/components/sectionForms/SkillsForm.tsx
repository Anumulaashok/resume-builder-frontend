import React, { useState } from "react";
import { Input } from "../ui/input";
import { SkillItem } from "../../types/resume";
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

export const SkillsForm: React.FC<SectionFormProps<SkillItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [level, setLevel] = useState<number | undefined>(() =>
    normalizeSkillLevel(initialAny.level)
  );
  const [subSkills, setSubSkills] = useState<string[]>(() =>
    parseTagsList(initialAny.subSkills)
  );
  const [subSkillsDraft, setSubSkillsDraft] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Skill name is required." });
      return;
    }

    const mergedSubSkills = mergeTagsWithDraft(subSkills, subSkillsDraft);

    const payload: SkillItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      ...(level !== undefined ? { level } : { level: undefined }),
      subSkills: mergedSubSkills,
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="skill-name"
          label="Skill Name"
          required
          error={errors.name}
        >
          <Input
            id="skill-name"
            placeholder="e.g. TypeScript, System Design"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "skill-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <ProficiencySelect
          id="skill-level"
          label="Proficiency Level"
          value={level}
          onChange={setLevel}
        />

        <TagInput
          id="skill-subskills"
          label="Sub-skills / Keywords"
          tags={subSkills}
          draftValue={subSkillsDraft}
          placeholder="e.g. React, GraphQL, Node.js"
          onChange={setSubSkills}
          onDraftChange={setSubSkillsDraft}
        />
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default SkillsForm;
