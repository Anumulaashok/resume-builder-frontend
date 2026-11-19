import React, { useState } from "react";
import { Input } from "../ui/input";
import { CertificateItem, dateFields } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  DateField,
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  dateFieldsToString,
  isValidOptionalUrl,
  parseToDateFields,
} from "./primitives";

export const CertificatesForm: React.FC<SectionFormProps<CertificateItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [issuer, setIssuer] = useState<string>(initialAny.issuer || "");
  const [date, setDate] = useState<dateFields>(() =>
    parseToDateFields(initialAny.date)
  );
  const [dateTouched, setDateTouched] = useState(false);
  const [url, setUrl] = useState<string>(initialAny.url || "");
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
      nextErrors.name = "Certificate name is required.";
    }
    if (!isValidOptionalUrl(url)) {
      nextErrors.url = "Please enter a valid credential URL.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: CertificateItem = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      issuer: issuer.trim(),
      date: dateFieldsToString(
        date,
        dateTouched ? undefined : initialAny.date
      ),
      url: url.trim(),
    };

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="cert-name"
          label="Certificate Name"
          required
          error={errors.name}
        >
          <Input
            id="cert-name"
            placeholder="e.g. AWS Certified Solutions Architect"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "cert-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError("name");
            }}
          />
        </FormField>

        <FormField id="cert-issuer" label="Issuing Organization">
          <Input
            id="cert-issuer"
            placeholder="e.g. Amazon Web Services"
            className={INPUT_CLASSNAME}
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
          />
        </FormField>

        <DateField
          idPrefix="cert-date"
          label="Issue Date"
          value={date}
          onChange={(next) => {
            setDate(next);
            setDateTouched(true);
          }}
        />

        <FormField
          id="cert-url"
          label="Credential URL"
          error={errors.url}
        >
          <Input
            id="cert-url"
            type="url"
            placeholder="https://..."
            aria-invalid={Boolean(errors.url)}
            aria-describedby={errors.url ? "cert-url-error" : undefined}
            className={errors.url ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              clearError("url");
            }}
          />
        </FormField>
      </div>

      <FormActions onCancel={onCancel} />
    </form>
  );
};

export default CertificatesForm;
