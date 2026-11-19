import React, { useState } from "react";
import { Input } from "../ui/input";
import { ProjectItem, dateFields } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  DateRangeFields,
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
  TagInput,
  dateFieldsToString,
  isEndDateBeforeStartDate,
  isValidOptionalUrl,
  mergeTagsWithDraft,
  parseTagsList,
  parseToDateFields,
} from "./primitives";

export const ProjectsForm: React.FC<SectionFormProps<ProjectItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.title || ""
  );
  const [url, setUrl] = useState<string>(initialAny.url || "");
  const [startDate, setStartDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.startDate)
  );
  const [endDate, setEndDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.endDate)
  );
  const [startTouched, setStartTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const [current, setCurrent] = useState<boolean>(Boolean(initialAny.current));
  const [technologies, setTechnologies] = useState<string[]>(() =>
    parseTagsList(initialAny.technologies)
  );
  const [techDraft, setTechDraft] = useState<string>("");
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
      nextErrors.name = "Project title is required.";
    }
    if (!isValidOptionalUrl(url)) {
      nextErrors.url = "Please enter a valid project link (e.g. https://github.com/...).";
    }
    if (isEndDateBeforeStartDate(startDate, endDate, current)) {
      nextErrors.dateRange = "End date cannot be earlier than start date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedName = name.trim();
    const mergedTechnologies = mergeTagsWithDraft(technologies, techDraft);
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
      name: trimmedName,
      url: url.trim(),
      startDate: formattedStart,
      endDate: formattedEnd,
      current,
      technologies: mergedTechnologies,
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
          id="project-title"
          label="Project Title"
          required
          error={errors.name}
        >
          <Input
            id="project-title"
            placeholder="e.g. Distributed Task Scheduler"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "project-title-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
          />
        </FormField>

        <FormField
          id="project-link"
          label="Project Link"
          error={errors.url}
        >
          <Input
            id="project-link"
            type="url"
            placeholder="https://github.com/username/project"
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? "project-link-error" : undefined}
            className={errors.url ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              clearError("url");
            }}
          />
        </FormField>

        <DateRangeFields
          idPrefix="project"
          startDate={startDate}
          endDate={endDate}
          current={current}
          currentLabel="Ongoing project"
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

        <TagInput
          id="project-technologies"
          label="Technology Tags"
          tags={technologies}
          draftValue={techDraft}
          placeholder="e.g. React, TypeScript, Tailwind CSS"
          onChange={setTechnologies}
          onDraftChange={setTechDraft}
        />

        <FormField id="project-summary" label="Project Summary">
          <textarea
            id="project-summary"
            rows={4}
            placeholder="Describe what you built, architecture decisions, and impact..."
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

export default ProjectsForm;
