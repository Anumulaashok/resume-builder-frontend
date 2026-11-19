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

const RESERVED_CUSTOM_KEYS = new Set([
  'id',
  '_id',
  'enabled',
  'title',
  'name',
  'subtitle',
  'position',
  'role',
  'company',
  'organization',
  'institution',
  'issuer',
  'awarder',
  'publisher',
  'location',
  'startDate',
  'endDate',
  'date',
  'dateRange',
  'period',
  'current',
  'isCurrent',
  'url',
  'website',
  'link',
  'liveUrl',
  'description',
  'summary',
  'highlights',
  'keywords',
  'subSkills',
  'technologies',
  'items',
  'skills',
]);

function formatCustomFieldLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export const CustomSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="custom" data-template-variant={variant}>
      {items.map((item, idx) => {
        const primaryKey =
          item.title !== undefined
            ? 'title'
            : item.name !== undefined
            ? 'name'
            : 'title';
        const primaryVal = safeString(
          item.title ||
            item.name ||
            item.organization ||
            item.institution ||
            item.company
        );
        const subtitleKey =
          item.subtitle !== undefined
            ? 'subtitle'
            : item.position !== undefined
            ? 'position'
            : 'subtitle';
        const subtitleVal = safeString(
          item.subtitle ||
            item.position ||
            item.role ||
            item.issuer ||
            item.publisher
        );
        const dateRange = formatItemDateRange(item);
        const location = formatItemLocation(item.location);
        const itemUrl = safeString(
          item.url || item.website || item.link || item.liveUrl
        );
        const descVal = safeString(item.description ?? item.summary);
        const highlights = extractHighlights(item);
        const keywords = extractKeywords(item);

        const extraFields = Object.keys(item)
          .filter((key) => {
            if (RESERVED_CUSTOM_KEYS.has(key)) return false;
            const v = item[key];
            return (
              (typeof v === 'string' && v.trim().length > 0) ||
              (typeof v === 'number' && Number.isFinite(v))
            );
          })
          .map((key) => ({
            key,
            label: formatCustomFieldLabel(key),
            value: safeString(item[key]),
          }));

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="custom"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <InlineEdit
                  value={primaryVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(
                            section.id,
                            item.id,
                            buildSyncedFieldPatch(item, primaryKey, v, [
                              'title',
                              'name',
                            ])
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Item Title"
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
                value={dateRange}
                variant={variant}
                readOnly={readOnly}
                placeholder="Date"
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

            {(subtitleVal || location || isInteractive) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <InlineEdit
                  value={subtitleVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(section.id, item.id, {
                            [subtitleKey]: v,
                          })
                  }
                  readOnly={readOnly}
                  placeholder="Subtitle"
                  textClassName={
                    variant === 'professional'
                      ? tokens.secondaryMetaClassName
                      : tokens.subtitleClassName
                  }
                  style={variant === 'modern' ? tokens.subtitleStyle : undefined}
                />
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
                placeholder="Enter details..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            {extraFields.length > 0 && (
              <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {extraFields.map((extra) => (
                  <div key={extra.key} className="inline-flex items-baseline gap-1">
                    <dt className="font-semibold text-slate-700">
                      {extra.label}:
                    </dt>
                    <dd>
                      <InlineEdit
                        value={extra.value}
                        onChange={
                          !isInteractive
                            ? undefined
                            : (v) =>
                                onUpdateItem!(section.id, item.id, {
                                  [extra.key]: v,
                                })
                        }
                        readOnly={readOnly}
                        textClassName="text-xs text-slate-600"
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <SectionHighlights highlights={highlights} />
            <SectionBadgeList items={keywords} variant={variant} />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
