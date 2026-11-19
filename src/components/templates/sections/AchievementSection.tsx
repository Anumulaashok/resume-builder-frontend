import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractHighlights,
  formatItemDateRange,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
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

export const AchievementSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="achievements" data-template-variant={variant}>
      {items.map((item, idx) => {
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = safeString(item.name || item.title);
        const dateVal = formatItemDateRange(item);
        const issuerVal = safeString(item.issuer || item.organization);
        const itemUrl = safeString(item.url || item.link || item.website);
        const descVal = safeString(item.description ?? item.summary);
        const highlights = extractHighlights(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="achievement"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <InlineEdit
                  value={titleVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(
                            section.id,
                            item.id,
                            buildSyncedFieldPatch(item, titleKey, v, [
                              'name',
                              'title',
                            ])
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Achievement Title"
                  textClassName={tokens.compactTitleClassName}
                  style={headingStyle}
                />
                {(itemUrl || item.url !== undefined) && (
                  <SectionLink
                    url={itemUrl}
                    variant={variant}
                    readOnly={readOnly}
                    placeholder="Add link"
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
                placeholder="Date"
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) => onUpdateItem!(section.id, item.id, { date: v })
                }
              />
            </div>

            {issuerVal && (
              <div className="mt-0.5">
                <span className={tokens.secondaryMetaClassName}>
                  {issuerVal}
                </span>
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
                placeholder="Details of your accomplishment..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            <SectionHighlights highlights={highlights} />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
