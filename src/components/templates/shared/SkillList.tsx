import React from 'react';
import { ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import { extractKeywords } from '../templateHelpers';
import { SkillStyleVariant, useTemplateContext } from './TemplateContext';

function resolveProficiencyPercent(item: Record<string, any>): number {
  if (typeof item.proficiency === 'number' && !Number.isNaN(item.proficiency)) {
    return Math.max(15, Math.min(100, item.proficiency <= 5 ? item.proficiency * 20 : item.proficiency));
  }
  if (typeof item.level === 'number' && !Number.isNaN(item.level)) {
    return Math.max(20, Math.min(100, item.level <= 5 ? item.level * 20 : item.level));
  }
  if (typeof item.level === 'string') {
    const normalized = item.level.trim().toLowerCase();
    if (/expert|master|native|fluent/.test(normalized)) return 100;
    if (/advanced|senior|strong|proficient/.test(normalized)) return 85;
    if (/intermediate|working|moderate/.test(normalized)) return 65;
    if (/beginner|basic|elementary|novice/.test(normalized)) return 40;
  }
  return 80;
}

export interface KeywordListProps {
  keywords: string[];
  variant?: 'chips' | 'comma';
}

export const KeywordList: React.FC<KeywordListProps> = ({
  keywords,
  variant = 'chips',
}) => {
  if (!keywords.length) return null;

  if (variant === 'comma') {
    return (
      <div className="mt-1 text-xs text-slate-600 leading-relaxed">
        {keywords.map((kw, idx) => (
          <React.Fragment key={`${kw}-${idx}`}>
            {idx > 0 && <span className="text-slate-400">, </span>}
            <span>{kw}</span>
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {keywords.map((kw, idx) => (
        <span
          key={`${kw}-${idx}`}
          className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
        >
          {kw}
        </span>
      ))}
    </div>
  );
};

export interface SkillListProps {
  section?: ISection;
  items?: Array<Record<string, any>>;
  sectionId?: string;
  variant?: SkillStyleVariant;
  readOnly?: boolean;
  onUpdateItem?: (itemId: string, field: string, value: string) => void;
}

export const SkillList: React.FC<SkillListProps> = ({
  section,
  items,
  sectionId,
  variant,
  readOnly,
  onUpdateItem,
}) => {
  const ctx = useTemplateContext();
  const isReadOnly = readOnly ?? ctx.readOnly;
  const effectiveVariant: SkillStyleVariant = ctx.atsMode
    ? 'comma'
    : variant || ctx.skillStyle || 'chips';
  const effectiveSectionId = sectionId || section?.id;

  const rawItems = items ?? (Array.isArray(section?.content) ? section!.content : []);
  const enabledItems = rawItems.filter(
    (item: any) => item && item.enabled !== false
  );

  if (!enabledItems.length) return null;

  const handleEditName = (itemId: string, val: string) => {
    if (isReadOnly) return;
    if (onUpdateItem) {
      onUpdateItem(itemId, 'name', val);
      return;
    }
    if (effectiveSectionId) {
      ctx.updateSectionItem(effectiveSectionId, itemId, 'name', val);
    }
  };

  const canEdit = Boolean(!isReadOnly && (onUpdateItem || effectiveSectionId));

  const renderEditableLabel = (
    item: any,
    placeholder: string,
    textClassName: string,
    style?: React.CSSProperties
  ) => {
    const label = item.name || item.category || item.title || '';
    if (!canEdit) {
      return label ? (
        <span className={textClassName} style={style}>
          {label}
        </span>
      ) : null;
    }
    return (
      <InlineEdit
        value={label}
        onChange={(v) => handleEditName(item.id, v)}
        readOnly={isReadOnly}
        placeholder={placeholder}
        textClassName={textClassName}
        style={style}
      />
    );
  };

  if (effectiveVariant === 'bars') {
    return (
      <div data-skill-variant="bars" className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {enabledItems.map((item: any, idx: number) => {
          const label = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          const pct = resolveProficiencyPercent(item);
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div key={item.id || `${label}-${idx}`} className="break-inside-avoid">
              <div className="flex justify-between items-baseline mb-1 gap-2">
                {renderEditableLabel(item, 'Skill', 'text-[0.95em] font-medium', {
                  color: 'var(--theme-heading-color, #1e293b)',
                })}
                {typeof item.level === 'string' && item.level.trim() && (
                  <span className="text-[11px] text-slate-500">{item.level.trim()}</span>
                )}
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden print:border print:border-slate-300">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
                  }}
                />
              </div>
              {keywords.length > 0 && (
                <div className="mt-1 text-xs text-slate-600">
                  {keywords.map((kw, kwIdx) => (
                    <React.Fragment key={`${kw}-${kwIdx}`}>
                      {kwIdx > 0 && <span className="text-slate-400">, </span>}
                      <span>{kw}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (effectiveVariant === 'dots') {
    return (
      <div data-skill-variant="dots" className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {enabledItems.map((item: any, idx: number) => {
          const label = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          const filledDots = Math.max(1, Math.min(5, Math.round(resolveProficiencyPercent(item) / 20)));
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div key={item.id || `${label}-${idx}`} className="break-inside-avoid">
              <div className="flex items-center justify-between gap-2">
                {renderEditableLabel(item, 'Skill', 'text-[0.95em] font-medium', {
                  color: 'var(--theme-heading-color, #1e293b)',
                })}
                <span className="inline-flex items-center gap-1 shrink-0" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((dot) => (
                    <span
                      key={dot}
                      className="w-2 h-2 rounded-full border"
                      style={
                        dot <= filledDots
                          ? {
                              backgroundColor:
                                'var(--theme-accent, var(--theme-primary, #2563eb))',
                              borderColor:
                                'var(--theme-accent, var(--theme-primary, #2563eb))',
                            }
                          : {
                              backgroundColor: 'transparent',
                              borderColor: '#cbd5e1',
                            }
                      }
                    />
                  ))}
                </span>
              </div>
              {keywords.length > 0 && (
                <div className="mt-0.5 text-xs text-slate-600">
                  {keywords.map((kw, kwIdx) => (
                    <React.Fragment key={`${kw}-${kwIdx}`}>
                      {kwIdx > 0 && <span className="text-slate-400">, </span>}
                      <span>{kw}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (effectiveVariant === 'columns') {
    const hasGrouped = enabledItems.some((item: any) => extractKeywords(item).length > 0);
    return (
      <div
        data-skill-variant="columns"
        className={`grid ${
          hasGrouped ? 'grid-cols-1 sm:grid-cols-2 gap-3' : 'grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5'
        }`}
      >
        {enabledItems.map((item: any, idx: number) => {
          const label = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div key={item.id || `${label}-${idx}`} className="break-inside-avoid">
              <div className="flex items-baseline gap-1.5">
                <span
                  aria-hidden="true"
                  className="text-xs"
                  style={{ color: 'var(--theme-accent, var(--theme-primary, #2563eb))' }}
                >
                  ▪
                </span>
                {renderEditableLabel(
                  item,
                  'Skill',
                  keywords.length > 0 ? 'text-[0.96em] font-semibold' : 'text-[0.95em]',
                  keywords.length > 0
                    ? {
                        fontFamily: 'var(--theme-heading-font)',
                        color: 'var(--theme-heading-color, #111827)',
                      }
                    : undefined
                )}
              </div>
              {keywords.length > 0 && (
                <div className="pl-3.5 mt-0.5 text-xs text-slate-600 leading-relaxed">
                  {keywords.map((kw, kwIdx) => (
                    <React.Fragment key={`${kw}-${kwIdx}`}>
                      {kwIdx > 0 && <span className="text-slate-400">, </span>}
                      <span>{kw}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  const hasGroupedKeywords = enabledItems.some(
    (item: any) => extractKeywords(item).length > 0
  );

  if (effectiveVariant === 'comma') {
    if (!hasGroupedKeywords) {
      return (
        <div
          data-skill-variant="comma"
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.96em] text-slate-700"
        >
          {enabledItems.map((item: any, idx: number) => {
            const label = item.name || item.title || '';
            if (!canEdit && !label) return null;
            return (
              <React.Fragment key={item.id || `${label}-${idx}`}>
                {idx > 0 && (
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                )}
                {renderEditableLabel(item, 'Skill', 'text-[0.96em]')}
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div data-skill-variant="comma" className="space-y-2">
        {enabledItems.map((item: any, idx: number) => {
          const groupName = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          const levelLabel =
            typeof item.level === 'string' && item.level.trim() ? item.level.trim() : '';

          return (
            <div
              key={item.id || `${groupName}-${idx}`}
              className="break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-[0.96em] leading-relaxed"
            >
              <div className="flex items-baseline shrink-0">
                {renderEditableLabel(item, 'Skill Group', 'text-[0.96em] font-bold', {
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #1e293b)',
                })}
                {keywords.length > 0 && groupName && (
                  <span className="font-bold text-slate-700 mr-1">:</span>
                )}
                {levelLabel && !keywords.length && (
                  <span className="text-xs italic text-slate-500 ml-1.5">
                    ({levelLabel})
                  </span>
                )}
              </div>
              {keywords.length > 0 && (
                <div className="text-[0.96em] text-slate-700 flex-1">
                  {keywords.map((kw, kwIdx) => (
                    <React.Fragment key={`${kw}-${kwIdx}`}>
                      {kwIdx > 0 && <span className="text-slate-400">, </span>}
                      <span>{kw}</span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Default: 'chips'
  if (!hasGroupedKeywords) {
    return (
      <div data-skill-variant="chips" className="flex flex-wrap gap-1.5">
        {enabledItems.map((item: any, idx: number) => {
          const label = item.name || item.title || '';
          if (!canEdit) {
            if (!label) return null;
            return (
              <span
                key={item.id || `${label}-${idx}`}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
              >
                {label}
              </span>
            );
          }
          return (
            <div
              key={item.id || idx}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90"
            >
              {renderEditableLabel(item, 'Skill', 'text-xs font-medium')}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div data-skill-variant="chips" className="space-y-2.5">
      {enabledItems.map((item: any, idx: number) => {
        const groupName = item.name || item.category || item.title || '';
        const keywords = extractKeywords(item);
        const levelLabel =
          typeof item.level === 'string' && item.level.trim() ? item.level.trim() : '';

        return (
          <div
            key={item.id || `${groupName}-${idx}`}
            className="break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
          >
            <div className="sm:w-40 shrink-0 flex items-baseline gap-1.5">
              {renderEditableLabel(item, 'Skill Group', 'text-[0.96em] font-semibold', {
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-heading-color, #111827)',
              })}
              {levelLabel && !keywords.length && (
                <span className="text-xs text-slate-500">({levelLabel})</span>
              )}
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 flex-1">
                {keywords.map((kw, kwIdx) => (
                  <span
                    key={`${kw}-${kwIdx}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
