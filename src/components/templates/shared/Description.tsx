import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import { useTemplateContext } from './TemplateContext';

export interface DescriptionProps {
  value?: string;
  onChange?: (val: string) => void;
  sectionId?: string;
  itemId?: string;
  field?: string;
  readOnly?: boolean;
  placeholder?: string;
  showWhenEmptyInEdit?: boolean;
  className?: string;
  textClassName?: string;
  style?: React.CSSProperties;
}

export const Description: React.FC<DescriptionProps> = ({
  value = '',
  onChange,
  sectionId,
  itemId,
  field = 'description',
  readOnly,
  placeholder = 'Describe key responsibilities and achievements...',
  showWhenEmptyInEdit = true,
  className = '',
  textClassName = 'text-[0.96em] text-slate-600 mt-1.5 block whitespace-pre-wrap break-words',
  style,
}) => {
  const ctx = useTemplateContext();
  const isReadOnly = readOnly ?? ctx.readOnly;

  const handleEdit =
    onChange ||
    (!isReadOnly && sectionId && itemId
      ? (val: string) => ctx.updateSectionItem(sectionId, itemId, field, val)
      : undefined);

  if (!value && (isReadOnly || !showWhenEmptyInEdit || !handleEdit)) {
    return null;
  }

  return (
    <InlineEdit
      value={value}
      onChange={isReadOnly ? undefined : handleEdit}
      readOnly={isReadOnly}
      multiline
      placeholder={placeholder}
      className={className}
      textClassName={textClassName}
      style={{
        lineHeight: 'var(--theme-line-height, 1.5)',
        color: 'var(--theme-text-color, #475569)',
        ...style,
      }}
    />
  );
};
