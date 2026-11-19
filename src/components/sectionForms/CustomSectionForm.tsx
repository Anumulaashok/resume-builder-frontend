import React, { useState } from "react";
import { Input } from "../ui/input";
import { CustomItem, dateFields } from "../../types/resume";
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

export const CustomSectionForm: React.FC<SectionFormProps<CustomItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [title, setTitle] = useState<string>(
    initialAny.title || initialAny.name || ""
  );
  const [subtitle, setSubtitle] = useState<string>(initialAny.subtitle || "");
  const [location, setLocation] = useState<string>(initialAny.location || "");
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
  const [keywords, setKeywords] = useState<string[]>(() =>
    parseTagsList(initialAny.keywords)
  );
  const [keywordsDraft, setKeywordsDraft] = useState<string>("");
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
      nextErrors.title = "Item title is required.";
    }
    if (!isValidOptionalUrl(url)) {
      nextErrors.url = "Please enter a valid URL.";
    }
    if (isEndDateBeforeStartDate(startDate, endDate, current)) {
      nextErrors.dateRange = "End date cannot be earlier than start date.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const trimmedTitle = title.trim();
    const mergedKeywords = mergeTagsWithDraft(keywords, keywordsDraft);

    const payload: CustomItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      title: trimmedTitle,
      name: trimmedTitle,
      subtitle: subtitle.trim(),
      location: location.trim(),
      url: url.trim(),
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
      keywords: mergedKeywords,
      description: description.trim(),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="custom-title"
          label="Title"
          required
          error={errors.title}
        >
          <Input
            id="custom-title"
            placeholder="Enter item title"
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "custom-title-error" : undefined}
            className={errors.title ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearError("title");
            }}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="custom-subtitle" label="Subtitle">
            <Input
              id="custom-subtitle"
              placeholder="Optional subtitle or role"
              className={INPUT_CLASSNAME}
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </FormField>

          <FormField id="custom-location" label="Location">
            <Input
              id="custom-location"
              placeholder="Optional location"
              className={INPUT_CLASSNAME}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </FormField>
        </div>

        <FormField id="custom-url" label="Link / URL" error={errors.url}>
          <Input
            id="custom-url"
            type="url"
            placeholder="https://..."
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? "custom-url-error" : undefined}
            className={errors.url ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              clearError("url");
            }}
          />
        </FormField>

        <DateRangeFields
          idPrefix="custom"
          startDate={startDate}
          endDate={endDate}
          current={current}
          currentLabel="Ongoing"
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
          id="custom-keywords"
          label="Tags / Keywords"
          tags={keywords}
          draftValue={keywordsDraft}
          placeholder="e.g. Leadership, Public Speaking"
          onChange={setKeywords}
          onDraftChange={setKeywordsDraft}
        />

        <FormField id="custom-description" label="Description">
          <textarea
            id="custom-description"
            rows={3}
            placeholder="Enter details..."
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

export default CustomSectionForm;
