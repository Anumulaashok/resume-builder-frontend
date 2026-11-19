import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractHighlights,
  formatItemDateRange,
  formatItemLocation,
  parseDateRangePatch,
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

export const OrganizationSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="organizations" data-template-variant={variant}>
      {items.map((item, idx) => {
        const nameKey = item.name !== undefined ? 'name' : 'organization';
        const nameVal = safeString(
          item.name || item.organization || item.title
        );
        const positionKey = item.position !== undefined ? 'position' : 'role';
        const positionVal = safeString(item.position || item.role);
        const dateRange = formatItemDateRange(item);
        const location = formatItemLocation(item.location);
        const itemUrl = safeString(item.url || item.website || item.link);
        const descVal = safeString(item.description ?? item.summary);
        const highlights = extractHighlights(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="organization"
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
                              'organization',
                            ])
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Organization Name"
                  textClassName={tokens.titleClassName}
                  style={headingStyle}
                />
                {(itemUrl || item.url !== undefined) && (
                  <SectionLink
                    url={itemUrl}
                    variant={variant}
                    readOnly={readOnly}
                    placeholder="Add organization link"
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

            {(positionVal || location || isInteractive) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
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
                  placeholder="Role / Position"
                  textClassName={
                    variant === 'professional'
                      ? tokens.secondaryMetaClassName
                      : tokens.subtitleClassName
                  }
                  style={variant === 'modern' ? tokens.subtitleStyle : undefined}
                />
                {location && (
                  <span className={tokens.locationClassName}>{location}</span>
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
                placeholder="Contributions and initiatives..."
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
