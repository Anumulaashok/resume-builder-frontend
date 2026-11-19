import React from "react";

export interface SectionFormProps<T = any> {
  initialContent?: T;
  onSave: (content: T) => void;
  onCancel: () => void;
}

export interface SectionFormRegistryEntry<T = any> {
  title: string;
  component: React.ComponentType<SectionFormProps<T>>;
}
