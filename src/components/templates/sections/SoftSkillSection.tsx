import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractKeywords,
  formatSkillLevel,
  parseSkillLevelInput,
  safeString,
} from '../templateHelpers';
import { getEnabledItems, SectionBadgeList } from './SectionPrimitives';
import {
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const SoftSkillSection: React.FC<SectionComponentProps> = ({
  section,
  variant,
  readOnly = false,
  onUpdateItem,
}) => {
  const items = getEnabledItems(section);
  if (!items.length) return null;

  const tokens = VARIANT_TOKENS[variant];
  const headingStyle = getHeadingStyle(variant);
  const isInteractive = !readOnly && Boolean(onUpdateItem);

  return (
    <div
      data-section-kind="soft_skills"
      data-template-variant={variant}
      className={
        variant === 'modern'
          ? 'flex flex-wrap gap-2'
          : 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2'
      }
    >
      {items.map((item, idx) => {
        const nameVal = safeString(item.name || item.title);
        const levelLabel = formatSkillLevel(item.level);
        const subSkills = extractKeywords(item);

        if (!isInteractive && !nameVal && !levelLabel && !subSkills.length) {
          return null;
        }

        if (variant === 'modern') {
          return (
            <div
              key={item.id || idx}
              data-section-item="soft-skill"
              className="break-inside-avoid inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-700 print:bg-slate-50 print:border-slate-300"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: 'var(--theme-primary, #334155)' }}
                aria-hidden="true"
              />
              <InlineEdit
                value={nameVal}
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(
                          section.id,
                          item.id,
                          buildSyncedFieldPatch(item, 'name', v, [
                            'name',
                            'title',
                          ])
                        )
                }
                readOnly={readOnly}
                placeholder="Soft Skill"
                textClassName="text-xs font-medium text-slate-800"
              />
              {(levelLabel || isInteractive) &&
                (isInteractive ? (
                  <InlineEdit
                    value={levelLabel}
                    onChange={(v) =>
                      onUpdateItem!(section.id, item.id, {
                        level: parseSkillLevelInput(v),
                      })
                    }
                    readOnly={readOnly}
                    placeholder="Level"
                    textClassName="text-[11px] text-slate-500"
                  />
                ) : (
                  <span className="text-[11px] text-slate-500">
                    · {levelLabel}
                  </span>
                ))}
              {subSkills.length > 0 && (
                <SectionBadgeList
                  items={subSkills}
                  variant={variant}
                  className="mt-0 ml-1"
                />
              )}
            </div>
          );
        }

        return (
          <div
            key={item.id || idx}
            data-section-item="soft-skill"
            className="break-inside-avoid flex flex-wrap items-baseline justify-between gap-x-2 border-b border-slate-200/70 pb-1"
          >
            <InlineEdit
              value={nameVal}
              onChange={
                !isInteractive
                  ? undefined
                  : (v) =>
                      onUpdateItem!(
                        section.id,
                        item.id,
                        buildSyncedFieldPatch(item, 'name', v, [
                          'name',
                          'title',
                        ])
                      )
              }
              readOnly={readOnly}
              placeholder="Soft Skill"
              textClassName="text-[13px] font-bold"
              style={headingStyle}
            />
            {(levelLabel || isInteractive) &&
              (isInteractive ? (
                <InlineEdit
                  value={levelLabel}
                  onChange={(v) =>
                    onUpdateItem!(section.id, item.id, {
                      level: parseSkillLevelInput(v),
                    })
                  }
                  readOnly={readOnly}
                  placeholder="Level"
                  textClassName={tokens.secondaryMetaClassName}
                />
              ) : (
                <span className={tokens.secondaryMetaClassName}>
                  {levelLabel}
                </span>
              ))}
            {subSkills.length > 0 && (
              <SectionBadgeList
                items={subSkills}
                variant={variant}
                className="w-full mt-1"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
