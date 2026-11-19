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

export const CertificateSection: React.FC<SectionComponentProps> = ({
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
    <div data-section-kind="certificates" data-template-variant={variant}>
      {items.map((item, idx) => {
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = safeString(item.name || item.title);
        const issuerKey = item.issuer !== undefined ? 'issuer' : 'authority';
        const issuerVal = safeString(
          item.issuer || item.authority || item.organization || item.institution
        );
        const dateVal = formatItemDateRange(item);
        const itemUrl = safeString(
          item.url || item.credentialUrl || item.link || item.website
        );
        const urlKey =
          item.credentialUrl !== undefined && item.url === undefined
            ? 'credentialUrl'
            : item.link !== undefined && item.url === undefined
            ? 'link'
            : 'url';
        const credentialId = safeString(item.credentialId);
        const descVal = safeString(item.description ?? item.summary);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="certificate"
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
                  placeholder="Certificate Title"
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
                placeholder="Issue Date"
                onChange={
                  !isInteractive
                    ? undefined
                    : (v) => onUpdateItem!(section.id, item.id, { date: v })
                }
              />
            </div>

            {(issuerVal || credentialId || isInteractive) && (
              <div className="flex flex-wrap items-baseline gap-x-2 mt-0.5">
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
                              ['issuer', 'authority']
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
                {credentialId && (
                  <span className="text-xs text-slate-500">
                    · Credential ID: {credentialId}
                  </span>
                )}
              </div>
            )}

            {descVal && (
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
