import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import { useTemplateContext } from './TemplateContext';

export interface BulletsProps {
  items?: string[];
  sectionId?: string;
  itemId?: string;
  field?: string;
  readOnly?: boolean;
  onChange?: (nextItems: string[]) => void;
  className?: string;
}

export const Bullets: React.FC<BulletsProps> = ({
  items = [],
  sectionId,
  itemId,
  field = 'highlights',
  readOnly,
  onChange,
  className = '',
}) => {
  const ctx = useTemplateContext();
  const isReadOnly = readOnly ?? ctx.readOnly;
  const filtered = items.filter((b) => typeof b === 'string' && b.trim().length > 0);
  if (!filtered.length) return null;

  const canInlineEdit = !isReadOnly && Boolean(onChange || (sectionId && itemId));

  const handleBulletChange = (index: number, nextValue: string) => {
    const cleaned = nextValue.trim();
    const updated = filtered
      .map((entry, idx) => (idx === index ? cleaned : entry.trim()))
      .filter((entry) => entry.length > 0);

    if (onChange) {
      onChange(updated);
    } else if (sectionId && itemId) {
      ctx.updateSectionItemPatch(sectionId, itemId, { [field]: updated });
    }
  };

  return (
    <ul
      className={`mt-1.5 list-disc pl-4 space-y-0.5 text-[0.96em] text-slate-600 ${className}`}
      style={{
        lineHeight: 'var(--theme-line-height, 1.5)',
        color: 'var(--theme-text-color, #475569)',
      }}
    >
      {filtered.map((bullet, idx) => (
        <li key={idx}>
          {canInlineEdit ? (
            <InlineEdit
              value={bullet}
              onChange={(val) => handleBulletChange(idx, val)}
              readOnly={isReadOnly}
              placeholder="Bullet point..."
            />
          ) : (
            bullet
          )}
        </li>
      ))}
    </ul>
  );
};
