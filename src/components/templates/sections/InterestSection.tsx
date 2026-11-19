import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  extractKeywords,
  safeString,
} from '../templateHelpers';
import {
  getEnabledItems,
  SectionBadgeList,
  SectionItemWrapper,
} from './SectionPrimitives';
import {
  getDescriptionStyle,
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const InterestSection: React.FC<SectionComponentProps> = ({
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

  const hasDetailedItems = items.some(
    (item) =>
      Boolean(safeString(item.description || item.summary).trim()) ||
      extractKeywords(item).length > 0
  );

  if (!hasDetailedItems && !isInteractive) {
    return (
      <div
        data-section-kind="interests"
        data-template-variant={variant}
        className="flex flex-wrap gap-1.5"
      >
        {items.map((item, idx) => {
          const nameVal = safeString(item.name || item.title);
          if (!nameVal) return null;
          return (
            <span
              key={item.id || `${nameVal}-${idx}`}
              data-section-item="interest"
              className={tokens.badgeClassName}
            >
              {nameVal}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div data-section-kind="interests" data-template-variant={variant}>
      {items.map((item, idx) => {
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = safeString(item.name || item.title);
        const descVal = safeString(item.description ?? item.summary);
        const keywords = extractKeywords(item);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="interest"
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
                        buildSyncedFieldPatch(item, nameKey, v, [
                          'name',
                          'title',
                        ])
                      )
              }
              readOnly={readOnly}
              placeholder="Interest"
              textClassName={tokens.compactTitleClassName}
              style={headingStyle}
            />

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
                placeholder="Interest details..."
                textClassName={tokens.descriptionClassName}
                style={descStyle}
              />
            )}

            <SectionBadgeList items={keywords} variant={variant} />
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
