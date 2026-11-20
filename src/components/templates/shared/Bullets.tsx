import React from 'react';

export interface BulletsProps {
  items?: string[];
  className?: string;
}

export const Bullets: React.FC<BulletsProps> = ({ items = [], className = '' }) => {
  const filtered = items.filter((b) => typeof b === 'string' && b.trim().length > 0);
  if (!filtered.length) return null;

  return (
    <ul
      className={`mt-1.5 list-disc pl-4 space-y-0.5 text-[0.96em] ${className}`}
      style={{
        lineHeight: 'var(--theme-line-height, 1.5)',
        color: 'var(--theme-text-color, #475569)',
      }}
    >
      {filtered.map((bullet, idx) => (
        <li key={idx}>{bullet}</li>
      ))}
    </ul>
  );
};
