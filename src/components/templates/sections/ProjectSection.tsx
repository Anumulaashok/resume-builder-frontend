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

export const ProjectSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="projects" data-template-variant={variant}>
      {items.map((item, idx) => {
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = safeString(item.name || item.title);
        const roleVal = safeString(item.position || item.role);
        const companyVal = safeString(
          item.company || item.organization || item.entity
        );
        const descVal = safeString(item.description ?? item.summary);
        const dateRange = formatItemDateRange(item);
        const location = formatItemLocation(item.location);
        const highlights = extractHighlights(item);
        const technologies = extractKeywords(item);
        const itemUrl = safeString(
          item.url || item.website || item.link || item.liveUrl
        );
        const urlKey =
          item.website !== undefined && item.url === undefined
            ? 'website'
            : item.link !== undefined && item.url === undefined
            ? 'link'
            : item.liveUrl !== undefined && item.url === undefined
            ? 'liveUrl'
            : 'url';

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="project"
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
                  placeholder="Project Name"
                  textClassName={tokens.titleClassName}
                  style={headingStyle}
                />
                <SectionLink
                  url={itemUrl}
                  variant={variant}
                  readOnly={readOnly}
                  placeholder="Add project link"
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(section.id, item.id, { [urlKey]: v })
                  }
                />
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

            {(roleVal || companyVal || location) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
                  {roleVal && (
                    <span
                      className={
                        variant === 'professional'
                          ? 'font-semibold text-slate-700'
                          : 'font-medium'
                      }
                      style={
                        variant === 'modern'
                          ? { color: 'var(--theme-primary, #334155)' }
                          : undefined
                      }
                    >
                      {roleVal}
                    </span>
                  )}
                  {roleVal && companyVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {companyVal && (
                    <span
                      className={
                        variant === 'professional'
                          ? 'italic text-slate-600'
                          : 'text-slate-600 font-medium'
                      }
                    >
                      {companyVal}
                    </span>
                  )}
                </div>
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
                        onUpdateItem!(
                          section.id,
                          item.id,
                          buildSyncedFieldPatch(item, 'description', v, [
                            'description',
                            'summary',
                          ])
                        )
                }
                readOnly={readOnly}
                multiline
                placeholder="Project summary and outcomes..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            <SectionHighlights highlights={highlights} />
            <SectionBadgeList
              items={technologies}
              variant={variant}
              technical
            />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
