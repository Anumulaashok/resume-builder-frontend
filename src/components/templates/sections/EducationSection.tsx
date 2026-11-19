import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  extractHighlights,
  extractKeywords,
  formatItemDateRange,
  formatItemLocation,
  parseDateRangePatch,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
  SectionBadgeList,
  SectionDateField,
  SectionHighlights,
  SectionItemWrapper,
  SectionLink,
} from './SectionPrimitives';
import {
  getDescriptionStyle,
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const EducationSection: React.FC<SectionComponentProps> = ({
  section,
  variant,
  readOnly = false,
  onUpdateItem,
}) => {
  const items = getEnabledItems(section);
  if (!items.length) return null;

  const tokens = VARIANT_TOKENS[variant];
  const headingStyle = getHeadingStyle(variant);
  const descStyle = getDescriptionStyle();
  const isInteractive = !readOnly && Boolean(onUpdateItem);

  return (
    <div data-section-kind="education" data-template-variant={variant}>
      {items.map((item, idx) => {
        const degreeVal = safeString(
          item.degree ||
            [safeString(item.studyType), safeString(item.area)]
              .filter(Boolean)
              .join(' in ')
        );
        const institutionKey =
          item.institution !== undefined
            ? 'institution'
            : item.school !== undefined
            ? 'school'
            : item.name !== undefined
            ? 'name'
            : null;
        const institutionVal = safeString(
          item.institution || item.school || item.name
        );
        const fieldVal = safeString(
          item.field || (item.degree && item.area ? item.area : '')
        );
        const gpaVal = safeString(item.gpa || item.score);
        const descVal = safeString(item.description ?? item.summary);
        const dateRange = formatItemDateRange(item);
        const location = formatItemLocation(item.location);
        const highlights = extractHighlights(item);
        const keywords = extractKeywords(item);
        const itemUrl = safeString(item.url || item.website || item.link);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="education"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <InlineEdit
                value={degreeVal}
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(section.id, item.id, { degree: v })
                }
                readOnly={readOnly}
                placeholder="Degree"
                textClassName={tokens.titleClassName}
                style={headingStyle}
              />
              <SectionDateField
                value={dateRange}
                variant={variant}
                readOnly={readOnly}
                placeholder="Start - End"
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(
                          section.id,
                          item.id,
                          parseDateRangePatch(v, item)
                        )
                }
              />
            </div>

            {(institutionVal ||
              fieldVal ||
              location ||
              gpaVal ||
              itemUrl ||
              isInteractive) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13.5px]">
                  {institutionVal && (
                    <InlineEdit
                      value={institutionVal}
                      onChange={
                        !isInteractive || !institutionKey
                          ? undefined
                          : (v) =>
                              onUpdateItem!(section.id, item.id, {
                                [institutionKey]: v,
                              })
                      }
                      readOnly={readOnly || !institutionKey}
                      textClassName={tokens.subtitleClassName}
                      style={tokens.subtitleStyle}
                    />
                  )}
                  {institutionVal && fieldVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {(fieldVal || (!institutionVal && isInteractive)) && (
                    <InlineEdit
                      value={fieldVal}
                      onChange={
                        !isInteractive
                          ? undefined
                          : (v) =>
                              onUpdateItem!(section.id, item.id, { field: v })
                      }
                      readOnly={readOnly}
                      placeholder="Institution / Field of Study"
                      textClassName={
                        variant === 'professional'
                          ? 'text-[13px] text-slate-700 italic'
                          : institutionVal
                          ? 'text-[13px] text-slate-600'
                          : 'text-[13.5px] font-medium text-slate-700'
                      }
                    />
                  )}
                  {gpaVal && (
                    <span className="text-xs text-slate-500">
                      · GPA: {gpaVal}
                    </span>
                  )}
                  {(itemUrl || item.url !== undefined) && (
                    <SectionLink
                      url={itemUrl}
                      variant={variant}
                      readOnly={readOnly}
                      placeholder="Add institution link"
                      className="text-xs"
                      onChange={
                        !isInteractive
                          ? undefined
                          : (v) =>
                              onUpdateItem!(section.id, item.id, { url: v })
                      }
                    />
                  )}
                </div>
                {(location || isInteractive) && (
                  <InlineEdit
                    value={location}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(section.id, item.id, { location: v })
                    }
                    readOnly={readOnly}
                    placeholder="Location"
                    textClassName={tokens.locationClassName}
                  />
                )}
              </div>
            )}

            {(descVal || isInteractive) && (
              <InlineEdit
                value={descVal}
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(section.id, item.id, { description: v })
                }
                readOnly={readOnly}
                multiline
                placeholder="Honors, coursework, or thesis..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            <SectionHighlights highlights={highlights} />
            <SectionBadgeList items={keywords} variant={variant} />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
