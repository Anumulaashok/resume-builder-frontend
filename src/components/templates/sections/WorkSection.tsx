import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
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

export const WorkSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="work" data-template-variant={variant}>
      {items.map((item, idx) => {
        const positionKey =
          item.position !== undefined
            ? 'position'
            : item.role !== undefined
            ? 'role'
            : 'position';
        const positionVal = safeString(
          item.position || item.role || item.jobTitle || item.title
        );
        const companyKey = item.company !== undefined ? 'company' : 'name';
        const companyVal = safeString(
          item.company || item.name || item.organization || item.employer
        );
        const descKey =
          item.description !== undefined
            ? 'description'
            : item.summary !== undefined
            ? 'summary'
            : 'description';
        const descVal = safeString(item.description ?? item.summary);
        const dateRange = formatItemDateRange(item);
        const location = formatItemLocation(item.location);
        const highlights = extractHighlights(item);
        const keywords = extractKeywords(item);
        const itemUrl = safeString(
          item.url || item.website || item.link || item.liveUrl
        );
        const urlKey =
          item.website !== undefined && item.url === undefined
            ? 'website'
            : item.link !== undefined && item.url === undefined
            ? 'link'
            : 'url';

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="work"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <InlineEdit
                value={positionVal}
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) =>
                        onUpdateItem!(
                          section.id,
                          item.id,
                          buildSyncedFieldPatch(item, positionKey, v, [
                            'position',
                            'role',
                          ])
                        )
                }
                readOnly={readOnly}
                placeholder="Position"
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

            {(companyVal || location || itemUrl || isInteractive) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <InlineEdit
                    value={companyVal}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(
                              section.id,
                              item.id,
                              buildSyncedFieldPatch(item, companyKey, v, [
                                'name',
                                'company',
                              ])
                            )
                    }
                    readOnly={readOnly}
                    placeholder="Company"
                    textClassName={tokens.subtitleClassName}
                    style={tokens.subtitleStyle}
                  />
                  {(itemUrl || item.url !== undefined) && (
                    <SectionLink
                      url={itemUrl}
                      variant={variant}
                      readOnly={readOnly}
                      placeholder="Add company link"
                      className="text-xs"
                      onChange={
                        !isInteractive
                          ? undefined
                          : (v) =>
                              onUpdateItem!(section.id, item.id, { [urlKey]: v })
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
                        onUpdateItem!(
                          section.id,
                          item.id,
                          buildSyncedFieldPatch(item, descKey, v, [
                            'description',
                            'summary',
                          ])
                        )
                }
                readOnly={readOnly}
                multiline
                placeholder="Describe key responsibilities and achievements..."
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
