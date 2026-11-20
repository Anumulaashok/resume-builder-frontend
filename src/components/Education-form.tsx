"use client";

import React from "react";
import { EducationItem, SectionType } from "../types/resume";
import { GenericSectionItemForm } from "./sections";

export default function EducationForm({
  initialContent,
  onSave,
  onCancel,
}: {
  initialContent?: EducationItem;
  onSave: (content: any) => void;
  onCancel: () => void;
}) {
  return (
    <GenericSectionItemForm
      type={SectionType.EDUCATION}
      initialItem={initialContent}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
}
