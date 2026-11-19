import React, { useState } from "react";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { LanguageItem } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
} from "./primitives";

const FLUENCY_OPTIONS = [
  "Native or Bilingual",
  "Full Professional Proficiency",
  "Professional Working Proficiency",
  "Limited Working Proficiency",
  "Elementary Proficiency",
];

export const LanguagesForm: React.FC<SectionFormProps<LanguageItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.language || ""
  );
  const [level, setLevel] = useState<string>(
    initialAny.level || initialAny.fluency || ""
  );
  const [proficiency, setProficiency] = useState<string>(
    typeof initialAny.proficiency === "number"
      ? String(initialAny.proficiency)
      : ""
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
      nextErrors.name = "Language is required.";
    }

    let parsedProficiency: number | undefined;
    if (proficiency.trim() !== "") {
      const num = Number(proficiency);
      if (Number.isNaN(num) || num < 0 || num > 100) {
        nextErrors.proficiency =
          "Proficiency percentage must be a number between 0 and 100.";
      } else {
        parsedProficiency = Math.round(num);
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedName = name.trim();
    const trimmedLevel = level.trim();

    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedName,
      level: trimmedLevel,
      ...(parsedProficiency !== undefined
        ? { proficiency: parsedProficiency }
        : { proficiency: undefined }),
    };

    if ("language" in initialAny) {
      payload.language = trimmedName;
    }
    if ("fluency" in initialAny) {
      payload.fluency = trimmedLevel;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="language-name"
          label="Language Name"
          required
          error={errors.name}
        >
          <Input
            id="language-name"
            placeholder="e.g. English, Spanish, Mandarin"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "language-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
          />
        </FormField>

        <FormField id="language-level" label="Fluency Level">
          <Select value={level} onChange={setLevel}>
            <SelectTrigger
              id="language-level"
              className="border-gray-300 text-gray-900"
            >
              <SelectValue placeholder="Select fluency level" />
            </SelectTrigger>
            <SelectContent className="max-h-56 overflow-y-auto border-gray-200">
              {FLUENCY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id="language-proficiency"
          label="Proficiency (%)"
          error={errors.proficiency}
        >
          <Input
            id="language-proficiency"
            type="number"
            min={0}
            max={100}
            placeholder="e.g. 95"
            aria-invalid={Boolean(errors.proficiency)}
            aria-describedby={
              errors.proficiency ? "language-proficiency-error" : undefined
            }
            className={
              errors.proficiency ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME
            }
            value={proficiency}
            onChange={(e) => {
              setProficiency(e.target.value);
              clearError("proficiency");
            }}
          />
        </FormField>
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default LanguagesForm;
