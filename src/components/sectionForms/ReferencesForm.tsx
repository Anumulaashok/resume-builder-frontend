import React, { useState } from "react";
import { Input } from "../ui/input";
import { ReferenceItem } from "../../types/resume";
import { SectionFormProps } from "./types";
import {
  ERROR_INPUT_CLASSNAME,
  FormActions,
  FormField,
  INPUT_CLASSNAME,
  TEXTAREA_CLASSNAME,
} from "./primitives";

export const ReferencesForm: React.FC<SectionFormProps<ReferenceItem>> = ({
  initialContent,
  onSave,
  onCancel,
}) => {
  const initialAny = (initialContent || {}) as Record<string, any>;
  const [name, setName] = useState<string>(initialAny.name || "");
  const [position, setPosition] = useState<string>(initialAny.position || "");
  const [company, setCompany] = useState<string>(initialAny.company || "");
  const [contact, setContact] = useState<string>(
    initialAny.contact || initialAny.email || initialAny.phone || ""
  );
  const [description, setDescription] = useState<string>(
    initialAny.description || initialAny.reference || ""
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: "Reference name is required." });
      return;
    }

    const trimmedContact = contact.trim();
    const trimmedDescription = description.trim();

    const payload: any = {
      ...(initialContent || {}),
      id: initialAny.id || Date.now().toString(),
      name: name.trim(),
      position: position.trim(),
      company: company.trim(),
      contact: trimmedContact,
      description: trimmedDescription,
    };

    if ("email" in initialAny) {
      payload.email = trimmedContact;
    }
    if ("reference" in initialAny) {
      payload.reference = trimmedDescription;
    }

    onSave(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5 text-gray-900">
      <div className="space-y-4">
        <FormField
          id="ref-name"
          label="Reference Name"
          required
          error={errors.name}
        >
          <Input
            id="ref-name"
            placeholder="e.g. Jordan Taylor"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "ref-name-error" : undefined}
            className={errors.name ? ERROR_INPUT_CLASSNAME : INPUT_CLASSNAME}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({});
            }}
          />
        </FormField>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="ref-position" label="Position / Title">
            <Input
              id="ref-position"
              placeholder="e.g. VP of Engineering"
              className={INPUT_CLASSNAME}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </FormField>

          <FormField id="ref-company" label="Company">
            <Input
              id="ref-company"
              placeholder="e.g. Acme Corp"
              className={INPUT_CLASSNAME}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </FormField>
        </div>

        <FormField id="ref-contact" label="Contact Info (Email / Phone)">
          <Input
            id="ref-contact"
            placeholder="e.g. jordan@example.com or +1 (555) 123-4567"
            className={INPUT_CLASSNAME}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </FormField>

        <FormField id="ref-description" label="Reference Note">
          <textarea
            id="ref-description"
            rows={3}
            placeholder="Optional working relationship or endorsement note..."
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

export default ReferencesForm;
