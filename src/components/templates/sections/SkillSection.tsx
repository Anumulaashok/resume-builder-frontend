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

export const SkillSection: React.FC<SectionComponentProps> = ({
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
  const hasGroupedSubSkills = items.some(
    (item) => extractKeywords(item).length > 0
  );

  if (!hasGroupedSubSkills) {
    return (
      <div
        data-section-kind="skills"
        data-template-variant={variant}
        className="flex flex-wrap gap-2"
      >
        {items.map((item, idx) => {
          const nameKey = item.name !== undefined ? 'name' : 'title';
          const label = safeString(item.name || item.title || item.category);
          const levelLabel = formatSkillLevel(item.level);

          if (!isInteractive) {
            if (!label && !levelLabel) return null;
            return (
              <span
                key={item.id || `${label}-${idx}`}
                data-section-item="skill"
                className={tokens.badgeClassName}
              >
                {label && <span>{label}</span>}
                {levelLabel && (
                  <span
                    className={
                      variant === 'professional'
                        ? 'ml-1.5 italic text-[11px] text-slate-500'
                        : 'ml-1.5 text-[11px] text-slate-500 font-normal'
                    }
                  >
                    ({levelLabel})
                  </span>
                )}
              </span>
            );
          }

          return (
            <div
              key={item.id || idx}
              data-section-item="skill"
              className={`${tokens.badgeClassName} gap-1.5`}
            >
              <InlineEdit
                value={label}
                onChange={(v) =>
                  onUpdateItem!(
                    section.id,
                    item.id,
                    buildSyncedFieldPatch(item, nameKey, v, ['name', 'title'])
                  )
                }
                readOnly={readOnly}
                placeholder="Skill"
                textClassName="text-xs font-medium"
              />
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
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-section-kind="skills"
      data-template-variant={variant}
      className={variant === 'professional' ? 'space-y-2.5' : 'space-y-3'}
    >
      {items.map((item, idx) => {
        const nameKey =
          item.name !== undefined
            ? 'name'
            : item.category !== undefined
            ? 'category'
            : 'name';
        const groupName = safeString(item.name || item.category || item.title);
        const subSkills = extractKeywords(item);
        const levelLabel = formatSkillLevel(item.level);

        return (
          <div
            key={item.id || `${groupName}-${idx}`}
            data-section-item="skill"
            className="break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
          >
            <div
              className={
                variant === 'modern'
                  ? 'sm:w-44 shrink-0 flex flex-wrap items-center gap-1.5'
                  : 'shrink-0 flex flex-wrap items-baseline gap-1.5'
              }
            >
              <InlineEdit
                value={groupName}
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(
                          section.id,
                          item.id,
                          buildSyncedFieldPatch(item, nameKey, v, [
                            'name',
                            'category',
                            'title',
                          ])
                        )
                }
                readOnly={readOnly}
                placeholder="Skill Category"
                textClassName={
                  variant === 'professional'
                    ? 'text-[13px] font-bold'
                    : 'text-[13px] font-semibold'
                }
                style={headingStyle}
              />

              {(levelLabel || isInteractive) &&
                (isInteractive ? (
                  <div className={tokens.levelBadgeClassName}>
                    <InlineEdit
                      value={levelLabel}
                      onChange={(v) =>
                        onUpdateItem!(section.id, item.id, {
                          level: parseSkillLevelInput(v),
                        })
                      }
                      readOnly={readOnly}
                      placeholder="Level"
                      textClassName="text-[11px]"
                    />
                  </div>
                ) : (
                  <span className={tokens.levelBadgeClassName}>
                    {levelLabel}
                  </span>
                ))}

              {variant === 'professional' &&
                subSkills.length > 0 &&
                groupName && (
                  <span className="font-bold text-slate-700" aria-hidden="true">
                    :
                  </span>
                )}
            </div>

            {subSkills.length > 0 && (
              <SectionBadgeList
                items={subSkills}
                variant={variant}
                className="flex-1 mt-0"
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
