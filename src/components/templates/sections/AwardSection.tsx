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

export const AwardSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="awards" data-template-variant={variant}>
      {items.map((item, idx) => {
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = safeString(item.name || item.title);
        const issuerKey = item.issuer !== undefined ? 'issuer' : 'awarder';
        const issuerVal = safeString(
          item.issuer || item.awarder || item.organization || item.institution
        );
        const dateVal = formatItemDateRange(item);
        const itemUrl = safeString(
          item.url || item.verificationUrl || item.link || item.website
        );
        const urlKey =
          item.verificationUrl !== undefined && item.url === undefined
            ? 'verificationUrl'
            : item.link !== undefined && item.url === undefined
            ? 'link'
            : 'url';
        const descVal = safeString(item.description ?? item.summary);
        const highlights = extractHighlights(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="award"
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
                  placeholder="Award Title"
                  textClassName={tokens.compactTitleClassName}
                  style={headingStyle}
                />
                <SectionLink
                  url={itemUrl}
                  variant={variant}
                  readOnly={readOnly}
                  placeholder="Add verification link"
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(section.id, item.id, { [urlKey]: v })
                  }
                />
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

            {(issuerVal || isInteractive) && (
              <div className="mt-0.5">
                <InlineEdit
                  value={issuerVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(
                            section.id,
                            item.id,
                            buildSyncedFieldPatch(
                              item,
                              item.issuer !== undefined ? issuerKey : 'issuer',
                              v,
                              ['issuer', 'awarder']
                            )
                          )
                  }
                  readOnly={readOnly}
                  placeholder="Issuing Institution"
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
                placeholder="Context and recognition details..."
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
