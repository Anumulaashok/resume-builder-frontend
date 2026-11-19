import React, { useState } from "react";
import { Input } from "../ui/input";
import { PublicationItem, dateFields } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  DateField,
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
  dateFieldsToString,
  isValidOptionalUrl,
  parseToDateFields,
} from "./primitives";

export const PublicationsForm: React.FC<SectionFormProps<PublicationItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [title, setTitle] = useState<string>(initialAny.title || "");
  const [publisher, setPublisher] = useState<string>(
    initialAny.publisher || ""
  );
  const [date, setDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.date)
  );
  const [dateTouched, setDateTouched] = useState(false);
  const [url, setUrl] = useState<string>(initialAny.url || "");
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

    if (!title.trim()) {
      nextErrors.title = "Publication title is required.";
    }
    if (!isValidOptionalUrl(url)) {
      nextErrors.url = "Please enter a valid publication URL.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: PublicationItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      title: title.trim(),
      publisher: publisher.trim(),
      date: dateFieldsToString(
        date,
        dateTouched ? undefined : initialAny.date
      ),
      url: url.trim(),
      description: description.trim(),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="pub-title"
          label="Publication Title"
          required
          error={errors.title}
        >
          <Input
            id="pub-title"
            placeholder="e.g. Scalable Microservices in Practice"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "pub-title-error" : undefined}
            className={errors.title ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
          />
        </FormField>

        <FormField id="pub-publisher" label="Publisher / Journal">
          <Input
            id="pub-publisher"
            placeholder="e.g. IEEE Software, ACM"
            className={INPUT_CLASSNAME}
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
          />
        </FormField>

        <DateField
          idPrefix="pub-date"
          label="Publication Date"
          value={date}
          onChange={(next) => {
            setDate(next);
            setDateTouched(true);
          }}
        />

        <FormField
          id="pub-url"
          label="Publication URL"
          error={errors.url}
        >
          <Input
            id="pub-url"
            type="url"
            placeholder="https://doi.org/..."
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? "pub-url-error" : undefined}
            className={errors.url ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              clearError("url");
            }}
          />
        </FormField>

        <FormField id="pub-description" label="Summary / Abstract">
          <textarea
            id="pub-description"
            rows={3}
            placeholder="Brief abstract or key findings..."
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

export default PublicationsForm;
