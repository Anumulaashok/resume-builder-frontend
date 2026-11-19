import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractKeywords,
  formatItemDateRange,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
  SectionBadgeList,
  SectionDateField,
  SectionItemWrapper,
  SectionLink,
} from './SectionPrimitives';
import {
  getDescriptionStyle,
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const CourseSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="courses" data-template-variant={variant}>
      {items.map((item, idx) => {
        const nameKey = item.name !== undefined ? 'name' : 'course';
        const nameVal = safeString(item.name || item.course || item.title);
        const institutionVal = safeString(
          item.institution || item.provider || item.organization || item.school
        );
        const dateVal = formatItemDateRange(item);
        const itemUrl = safeString(item.url || item.link || item.website);
        const descVal = safeString(item.description ?? item.summary);
        const topics = extractKeywords(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="course"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <InlineEdit
                  value={nameVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(
                            section.id,
                            item.id,
                            buildSyncedFieldPatch(item, nameKey, v, [
                              'name',
                              'course',
                            ])
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Course Name"
                  textClassName={tokens.compactTitleClassName}
                  style={headingStyle}
                />
                {(itemUrl || item.url !== undefined) && (
                  <SectionLink
                    url={itemUrl}
                    variant={variant}
                    readOnly={readOnly}
                    placeholder="Add course link"
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(section.id, item.id, { url: v })
                    }
                  />
                )}
              </div>

              <SectionDateField
                value={dateVal}
                variant={variant}
                readOnly={readOnly}
                placeholder="Completion Date"
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) => onUpdateItem!(section.id, item.id, { date: v })
                }
              />
            </div>

            {(institutionVal || isInteractive) && (
              <div className="mt-0.5">
                <InlineEdit
                  value={institutionVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(section.id, item.id, {
                            institution: v,
                          })
                  }
                  readOnly={readOnly}
                  placeholder="Institution / Platform"
                  textClassName={
                    variant === 'professional'
                      ? tokens.secondaryMetaClassName
                      : tokens.subtitleClassName
                  }
                  style={variant === 'modern' ? tokens.subtitleStyle : undefined}
                />
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
                placeholder="Key topics covered..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            <SectionBadgeList items={topics} variant={variant} />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
