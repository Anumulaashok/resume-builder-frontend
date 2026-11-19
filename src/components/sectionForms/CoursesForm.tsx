import React, { useState } from "react";
import { Input } from "../ui/input";
import { CourseItem, dateFields } from "../../types/resume";
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

export const CoursesForm: React.FC<SectionFormProps<CourseItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(
    initialAny.name || initialAny.course || ""
  );
  const [institution, setInstitution] = useState<string>(
    initialAny.institution || ""
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
      setErrors({ name: "Course name is required." });
      return;
    }

    const trimmedName = name.trim();
    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: trimmedName,
      course: trimmedName,
      institution: institution.trim(),
      date: dateFieldsToString(
        date,
        dateTouched ? undefined : initialAny.date
      ),
      description: description.trim(),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="course-name"
          label="Course Name"
          required
          error={errors.name}
        >
          <Input
            id="course-name"
            placeholder="e.g. Machine Learning Specialization"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "course-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <FormField id="course-institution" label="Institution / Platform">
          <Input
            id="course-institution"
            placeholder="e.g. Stanford Online, Coursera"
            className={INPUT_CLASSNAME}
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />
        </FormField>

        <DateField
          idPrefix="course-date"
          label="Completion Date"
          value={date}
          onChange={(next) => {
            setDate(next);
            setDateTouched(true);
          }}
        />

        <FormField id="course-description" label="Description">
          <textarea
            id="course-description"
            rows={3}
            placeholder="Key topics covered or capstone work..."
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

export default CoursesForm;
