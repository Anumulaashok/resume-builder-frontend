import React, { useEffect, useRef, useState } from 'react';
import { ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  extractKeywords,
  formatSkillLevel,
  parseSkillLevelInput,
  readCanonicalField,
} from '../templateHelpers';
import { SkillStyleVariant, useTemplateContext } from './TemplateContext';

export const NARROW_SKILL_CONTAINER_WIDTH_PX = 260;

export interface NarrowSkillDecisionInput {
  narrow?: boolean;
  layout?: string | null;
  containerWidth?: number | null;
  thresholdPx?: number;
}

export function isNarrowSkillLayout({
  narrow,
  layout,
  containerWidth,
  thresholdPx = NARROW_SKILL_CONTAINER_WIDTH_PX,
}: NarrowSkillDecisionInput = {}): boolean {
  if (typeof narrow === 'boolean') {
    return narrow;
  }
  if (
    layout === 'sidebar' ||
    layout === 'sidebar-left' ||
    layout === 'sidebar-right'
  ) {
    return true;
  }
  if (
    typeof containerWidth === 'number' &&
    !Number.isNaN(containerWidth) &&
    containerWidth > 0 &&
    containerWidth < thresholdPx
  ) {
    return true;
  }
  return false;
}

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
      <div
        className="mt-1 flex flex-wrap gap-x-1 min-w-0 max-w-full text-xs text-slate-600 leading-relaxed [overflow-wrap:anywhere]"
        style={{ overflowWrap: 'anywhere' }}
      >
        {keywords.map((kw, idx) => (
          <span
            key={`${kw}-${idx}`}
            className="max-w-full min-w-0 [overflow-wrap:anywhere]"
            style={{ overflowWrap: 'anywhere' }}
          >
            {kw}
            {idx < keywords.length - 1 && (
              <span className="text-slate-400">{', '}</span>
            )}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5 min-w-0 max-w-full">
      {keywords.map((kw, idx) => (
        <span
          key={`${kw}-${idx}`}
          className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
          style={{ overflowWrap: 'anywhere' }}
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
  narrow?: boolean;
  readOnly?: boolean;
  onUpdateItem?: (itemId: string, field: string, value: string) => void;
}

export const SkillList: React.FC<SkillListProps> = ({
  section,
  items,
  sectionId,
  variant,
  narrow,
  readOnly,
  onUpdateItem,
}) => {
  const ctx = useTemplateContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const isReadOnly = readOnly ?? ctx.readOnly;
  const effectiveVariant: SkillStyleVariant = variant || ctx.skillStyle || 'chips';
  const effectiveSectionId = sectionId || section?.id;

  const rawItems = items ?? (Array.isArray(section?.content) ? section!.content : []);
  const enabledItems = rawItems.filter(
    (item: any) => item && item.enabled !== false
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = (rectWidth?: number) => {
      const measured =
        typeof rectWidth === 'number' && rectWidth > 0
          ? rectWidth
          : el.clientWidth;
      if (measured > 0) {
        setContainerWidth((prev) => (prev === measured ? prev : measured));
      }
    };

    updateWidth();

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateWidth(entry.contentRect?.width);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabledItems.length, effectiveVariant]);

  if (!enabledItems.length) return null;

  const isNarrow = isNarrowSkillLayout({
    narrow,
    containerWidth,
  });

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

  const handleEditLevel = (item: any, rawVal: string) => {
    if (isReadOnly) return;
    const parsed = parseSkillLevelInput(rawVal);
    if (onUpdateItem) {
      onUpdateItem(item.id, 'level', String(parsed));
      return;
    }
    if (effectiveSectionId) {
      ctx.updateSectionItemPatch(effectiveSectionId, item.id, { level: parsed });
    }
  };

  const canEdit = Boolean(!isReadOnly && (onUpdateItem || effectiveSectionId));

  const renderEditableLevel = (item: any, textClassName = 'text-xs text-slate-500') => {
    const levelLabel = formatSkillLevel(item?.level);
    if (!levelLabel) return null;
    if (!canEdit) {
      return <span className={textClassName}>{levelLabel}</span>;
    }
    return (
      <InlineEdit
        value={levelLabel}
        onChange={(v) => handleEditLevel(item, v)}
        readOnly={isReadOnly}
        placeholder="Level"
        textClassName={textClassName}
      />
    );
  };

  const renderEditableLabel = (
    item: any,
    placeholder: string,
    textClassName: string,
    style?: React.CSSProperties
  ) => {
    const label = readCanonicalField(item, 'name', 'category', 'title');
    const mergedStyle: React.CSSProperties = {
      overflowWrap: 'anywhere',
      ...style,
    };
    if (!canEdit) {
      return label ? (
        <span
          className={`min-w-0 max-w-full [overflow-wrap:anywhere] ${textClassName}`}
          style={mergedStyle}
        >
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
        className="min-w-0 max-w-full"
        textClassName={`[overflow-wrap:anywhere] ${textClassName}`}
        style={mergedStyle}
      />
    );
  };

  if (effectiveVariant === 'bars') {
    return (
      <div
        ref={containerRef}
        data-skill-variant="bars"
        data-skill-layout={isNarrow ? 'stacked' : 'inline'}
        className={`grid min-w-0 max-w-full ${
          isNarrow
            ? 'grid-cols-1 gap-y-2.5'
            : 'grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5'
        }`}
      >
        {enabledItems.map((item: any, idx: number) => {
          const label = readCanonicalField(item, 'name', 'category', 'title');
          const keywords = extractKeywords(item);
          const pct = resolveProficiencyPercent(item);
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div
              key={item.id || `${label}-${idx}`}
              className="break-inside-avoid min-w-0 max-w-full"
            >
              <div className="flex flex-wrap justify-between items-baseline mb-1 gap-x-2 gap-y-0.5 min-w-0">
                {renderEditableLabel(item, 'Skill', 'text-[0.95em] font-medium', {
                  color: 'var(--theme-heading-color, #1e293b)',
                })}
                {renderEditableLevel(item, 'text-[11px] text-slate-500 shrink-0')}
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
                <div
                  className="mt-1 flex flex-wrap gap-x-1 min-w-0 max-w-full text-xs text-slate-600 [overflow-wrap:anywhere]"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {keywords.map((kw, kwIdx) => (
                    <span
                      key={`${kw}-${kwIdx}`}
                      className="max-w-full min-w-0 [overflow-wrap:anywhere]"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {kw}
                      {kwIdx < keywords.length - 1 && (
                        <span className="text-slate-400">{', '}</span>
                      )}
                    </span>
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
      <div
        ref={containerRef}
        data-skill-variant="dots"
        data-skill-layout={isNarrow ? 'stacked' : 'inline'}
        className={`grid min-w-0 max-w-full ${
          isNarrow
            ? 'grid-cols-1 gap-y-2'
            : 'grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2'
        }`}
      >
        {enabledItems.map((item: any, idx: number) => {
          const label = readCanonicalField(item, 'name', 'category', 'title');
          const keywords = extractKeywords(item);
          const filledDots = Math.max(1, Math.min(5, Math.round(resolveProficiencyPercent(item) / 20)));
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div
              key={item.id || `${label}-${idx}`}
              className="break-inside-avoid min-w-0 max-w-full"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
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
                <div
                  className="mt-0.5 flex flex-wrap gap-x-1 min-w-0 max-w-full text-xs text-slate-600 [overflow-wrap:anywhere]"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {keywords.map((kw, kwIdx) => (
                    <span
                      key={`${kw}-${kwIdx}`}
                      className="max-w-full min-w-0 [overflow-wrap:anywhere]"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {kw}
                      {kwIdx < keywords.length - 1 && (
                        <span className="text-slate-400">{', '}</span>
                      )}
                    </span>
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
    const columnsGridClass = isNarrow
      ? 'grid-cols-1 gap-2'
      : hasGrouped
      ? 'grid-cols-1 sm:grid-cols-2 gap-3'
      : 'grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5';

    return (
      <div
        ref={containerRef}
        data-skill-variant="columns"
        data-skill-layout={isNarrow ? 'stacked' : 'inline'}
        className={`grid min-w-0 max-w-full ${columnsGridClass}`}
      >
        {enabledItems.map((item: any, idx: number) => {
          const label = readCanonicalField(item, 'name', 'category', 'title');
          const keywords = extractKeywords(item);
          if (!label && !canEdit && !keywords.length) return null;

          return (
            <div
              key={item.id || `${label}-${idx}`}
              className="break-inside-avoid min-w-0 max-w-full"
            >
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className="text-xs shrink-0"
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
                {renderEditableLevel(item, 'text-xs text-slate-500')}
              </div>
              {keywords.length > 0 && (
                <div
                  className="pl-3.5 mt-0.5 flex flex-wrap gap-x-1 min-w-0 max-w-full text-xs text-slate-600 leading-relaxed [overflow-wrap:anywhere]"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {keywords.map((kw, kwIdx) => (
                    <span
                      key={`${kw}-${kwIdx}`}
                      className="max-w-full min-w-0 [overflow-wrap:anywhere]"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {kw}
                      {kwIdx < keywords.length - 1 && (
                        <span className="text-slate-400">{', '}</span>
                      )}
                    </span>
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
          ref={containerRef}
          data-skill-variant="comma"
          data-skill-layout={isNarrow ? 'stacked' : 'inline'}
          className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 max-w-full text-[0.96em] text-slate-700 [overflow-wrap:anywhere]"
          style={{ overflowWrap: 'anywhere' }}
        >
          {enabledItems.map((item: any, idx: number) => {
            const label = readCanonicalField(item, 'name', 'category', 'title');
            const levelNode = renderEditableLevel(item, 'text-xs italic text-slate-500');
            if (!canEdit && !label) return null;
            return (
              <React.Fragment key={item.id || `${label}-${idx}`}>
                {idx > 0 && (
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                )}
                <span className="inline-flex items-baseline gap-1">
                  {renderEditableLabel(item, 'Skill', 'text-[0.96em]')}
                  {levelNode}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        data-skill-variant="comma"
        data-skill-layout={isNarrow ? 'stacked' : 'inline'}
        className="space-y-2 min-w-0 max-w-full"
      >
        {enabledItems.map((item: any, idx: number) => {
          const groupName = readCanonicalField(item, 'name', 'category', 'title');
          const keywords = extractKeywords(item);
          const levelNode = renderEditableLevel(item, 'text-xs italic text-slate-500');

          const groupRowClass = isNarrow
            ? 'break-inside-avoid flex flex-col gap-0.5 min-w-0 max-w-full text-[0.96em] leading-relaxed'
            : 'break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 min-w-0 max-w-full text-[0.96em] leading-relaxed';

          const labelContainerClass = isNarrow
            ? 'w-full min-w-0 max-w-full flex flex-wrap items-baseline gap-x-1.5 [overflow-wrap:anywhere]'
            : 'flex flex-wrap items-baseline gap-x-1.5 shrink-0 min-w-0 max-w-full [overflow-wrap:anywhere]';

          const commaListClass = isNarrow
            ? 'flex flex-wrap gap-x-1 min-w-0 max-w-full text-[0.96em] text-slate-700 [overflow-wrap:anywhere]'
            : 'flex flex-wrap gap-x-1 flex-1 min-w-0 max-w-full text-[0.96em] text-slate-700 [overflow-wrap:anywhere]';

          return (
            <div
              key={item.id || `${groupName}-${idx}`}
              data-skill-group={groupName || idx}
              className={groupRowClass}
            >
              <div className={labelContainerClass}>
                {renderEditableLabel(item, 'Skill Group', 'text-[0.96em] font-bold', {
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #1e293b)',
                })}
                {levelNode}
                {keywords.length > 0 && groupName && (
                  <span className="font-bold text-slate-700 mr-0.5">:</span>
                )}
              </div>
              {keywords.length > 0 && (
                <div
                  className={commaListClass}
                  style={{ overflowWrap: 'anywhere' }}
                >
                  {keywords.map((kw, kwIdx) => (
                    <span
                      key={`${kw}-${kwIdx}`}
                      className="max-w-full min-w-0 [overflow-wrap:anywhere]"
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {kw}
                      {kwIdx < keywords.length - 1 && (
                        <span className="text-slate-400">{', '}</span>
                      )}
                    </span>
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
      <div
        ref={containerRef}
        data-skill-variant="chips"
        data-skill-layout={isNarrow ? 'stacked' : 'inline'}
        className="flex flex-wrap gap-1.5 min-w-0 max-w-full"
      >
        {enabledItems.map((item: any, idx: number) => {
          const label = readCanonicalField(item, 'name', 'category', 'title');
          const levelLabel = formatSkillLevel(item.level);
          if (!canEdit) {
            if (!label) return null;
            return (
              <span
                key={item.id || `${label}-${idx}`}
                className="inline-flex items-center gap-1.5 max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
                style={{ overflowWrap: 'anywhere' }}
              >
                {levelLabel ? (
                  <>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
                    <span className="text-[11px] text-slate-500 font-normal shrink-0">
                      {levelLabel}
                    </span>
                  </>
                ) : (
                  label
                )}
              </span>
            );
          }
          return (
            <div
              key={item.id || idx}
              className="inline-flex items-center gap-1.5 max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90"
              style={{ overflowWrap: 'anywhere' }}
            >
              {renderEditableLabel(item, 'Skill', 'text-xs font-medium')}
              {renderEditableLevel(item, 'text-[11px] text-slate-500 font-normal')}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-skill-variant="chips"
      data-skill-layout={isNarrow ? 'stacked' : 'inline'}
      className="space-y-2.5 min-w-0 max-w-full"
    >
      {enabledItems.map((item: any, idx: number) => {
        const groupName = readCanonicalField(item, 'name', 'category', 'title');
        const keywords = extractKeywords(item);
        const levelNode = renderEditableLevel(item, 'text-xs text-slate-500');

        const groupRowClass = isNarrow
          ? 'break-inside-avoid flex flex-col gap-1 min-w-0 max-w-full'
          : 'break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0 max-w-full';

        const labelContainerClass = isNarrow
          ? 'w-full min-w-0 max-w-full flex flex-wrap items-baseline gap-1.5 [overflow-wrap:anywhere]'
          : 'sm:w-40 shrink-0 min-w-0 max-w-full flex flex-wrap items-baseline gap-1.5 [overflow-wrap:anywhere]';

        const chipListClass = isNarrow
          ? 'flex flex-wrap gap-1.5 min-w-0 max-w-full'
          : 'flex flex-wrap gap-1.5 flex-1 min-w-0 max-w-full';

        return (
          <div
            key={item.id || `${groupName}-${idx}`}
            data-skill-group={groupName || idx}
            className={groupRowClass}
          >
            <div className={labelContainerClass}>
              {renderEditableLabel(item, 'Skill Group', 'text-[0.96em] font-semibold', {
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-heading-color, #111827)',
              })}
              {levelNode}
            </div>
            {keywords.length > 0 && (
              <div className={chipListClass}>
                {keywords.map((kw, kwIdx) => (
                  <span
                    key={`${kw}-${kwIdx}`}
                    className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
                    style={{ overflowWrap: 'anywhere' }}
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
