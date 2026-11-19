import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  formatItemDateRange,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
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

export const PublicationSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="publications" data-template-variant={variant}>
      {items.map((item, idx) => {
        const titleKey = item.title !== undefined ? 'title' : 'name';
        const titleVal = safeString(item.title || item.name);
        const publisherVal = safeString(
          item.publisher || item.journal || item.venue
        );
        const dateVal = formatItemDateRange(item);
        const itemUrl = safeString(item.url || item.link || item.website);
        const descVal = safeString(item.description ?? item.summary);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="publication"
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
                              'title',
                              'name',
                            ])
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Publication Title"
                  textClassName={tokens.compactTitleClassName}
                  style={headingStyle}
                />
                <SectionLink
                  url={itemUrl}
                  variant={variant}
                  readOnly={readOnly}
                  placeholder="Add publication link"
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) => onUpdateItem!(section.id, item.id, { url: v })
                  }
                />
              </div>

              <SectionDateField
                value={dateVal}
                variant={variant}
                readOnly={readOnly}
                placeholder="Publication Date"
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) => onUpdateItem!(section.id, item.id, { date: v })
                }
              />
            </div>

            {(publisherVal || isInteractive) && (
              <div className="mt-0.5">
                <InlineEdit
                  value={publisherVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(section.id, item.id, { publisher: v })
                  }
                  readOnly={readOnly}
                  placeholder="Publisher / Journal"
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
                placeholder="Brief abstract or summary..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
