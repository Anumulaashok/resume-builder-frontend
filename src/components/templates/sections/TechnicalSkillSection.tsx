import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractKeywords,
  formatSkillLevel,
  parseSkillLevelInput,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
  SectionBadgeList,
  SectionItemWrapper,
} from './SectionPrimitives';
import {
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const TechnicalSkillSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="technical_skills" data-template-variant={variant}>
      {items.map((item, idx) => {
        const nameVal = safeString(item.name || item.category || item.title);
        const levelLabel = formatSkillLevel(item.level);
        const technologies = extractKeywords(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="technical-skill"
            className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
          >
            <div
              className={
                variant === 'modern'
                  ? 'sm:w-48 shrink-0 flex flex-wrap items-center gap-1.5'
                  : 'shrink-0 flex flex-wrap items-baseline gap-1.5'
              }
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
                            'category',
                            'title',
                          ])
                        )
                }
                readOnly={readOnly}
                placeholder="Technical Domain"
                textClassName={
                  variant === 'professional'
                    ? 'text-[13.5px] font-bold'
                    : 'text-[13.5px] font-semibold'
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
                technologies.length > 0 &&
                nameVal && (
                  <span className="font-bold text-slate-700" aria-hidden="true">
                    :
                  </span>
                )}
            </div>

            {technologies.length > 0 && (
              <SectionBadgeList
                items={technologies}
                variant={variant}
                technical
                className="flex-1 mt-0"
              />
            )}
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
