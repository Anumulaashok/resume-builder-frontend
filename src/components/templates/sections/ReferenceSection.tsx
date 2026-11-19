import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import { buildSyncedFieldPatch, safeString } from '../templateHelpers';
import {
  getEnabledItems,
  SectionItemWrapper,
  SectionLink,
} from './SectionPrimitives';
import {
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

function isWebUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('@') || trimmed.includes(' ')) return false;
  return /^(https?:\/\/|www\.)/i.test(trimmed);
}

export const ReferenceSection: React.FC<SectionComponentProps> = ({
  section,
  variant,
  readOnly = false,
  onUpdateItem,
}) => {
  const items = getEnabledItems(section);
  if (!items.length) return null;

  const tokens = VARIANT_TOKENS[variant];
  const headingStyle = getHeadingStyle(variant);
  const isInteractive = !readOnly && Boolean(onUpdateItem);

  return (
    <div data-section-kind="references" data-template-variant={variant}>
      {items.map((item, idx) => {
        const nameVal = safeString(item.name || item.title);
        const positionVal = safeString(item.position || item.role);
        const companyVal = safeString(item.company || item.organization);
        const contactKey = item.contact !== undefined ? 'contact' : 'email';
        const contactVal = safeString(
          item.contact || item.email || item.phone
        );
        const itemUrl = safeString(item.url);
        const descKey =
          item.description !== undefined ? 'description' : 'reference';
        const descVal = safeString(item.description ?? item.reference);

        return (
          <SectionItemWrapper
            key={item.id || idx}
            isLast={idx === items.length - 1}
            variant={variant}
            dataSectionItem="reference"
          >
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <InlineEdit
                  value={nameVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) => onUpdateItem!(section.id, item.id, { name: v })
                  }
                  readOnly={readOnly}
                  placeholder="Reference Name"
                  textClassName={tokens.compactTitleClassName}
                  style={headingStyle}
                />
                {itemUrl && (
                  <SectionLink
                    url={itemUrl}
                    variant={variant}
                    readOnly={readOnly}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) => onUpdateItem!(section.id, item.id, { url: v })
                    }
                  />
                )}
              </div>

              {(contactVal || isInteractive) &&
                (isWebUrl(contactVal) ? (
                  <SectionLink
                    url={contactVal}
                    variant={variant}
                    readOnly={readOnly}
                    placeholder="Contact Info"
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(
                              section.id,
                              item.id,
                              buildSyncedFieldPatch(item, contactKey, v, [
                                'contact',
                                'email',
                              ])
                            )
                    }
                  />
                ) : (
                  <InlineEdit
                    value={contactVal}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(
                              section.id,
                              item.id,
                              buildSyncedFieldPatch(
                                item,
                                item.contact !== undefined
                                  ? contactKey
                                  : 'contact',
                                v,
                                ['contact', 'email']
                              )
                            )
                    }
                    readOnly={readOnly}
                    placeholder="Contact Info"
                    textClassName="text-xs text-slate-500"
                  />
                ))}
            </div>

            {(positionVal || companyVal || isInteractive) && (
              <div className="flex flex-wrap items-baseline gap-x-1.5 mt-0.5 text-[13px]">
                {(positionVal || isInteractive) && (
                  <InlineEdit
                    value={positionVal}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(section.id, item.id, { position: v })
                    }
                    readOnly={readOnly}
                    placeholder="Position"
                    textClassName={
                      variant === 'professional'
                        ? 'italic text-slate-700'
                        : 'font-medium text-slate-700'
                    }
                  />
                )}
                {positionVal && companyVal && (
                  <span className="text-slate-400" aria-hidden="true">
                    ·
                  </span>
                )}
                {(companyVal || isInteractive) && (
                  <InlineEdit
                    value={companyVal}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(section.id, item.id, { company: v })
                    }
                    readOnly={readOnly}
                    placeholder="Company"
                    textClassName={
                      variant === 'professional'
                        ? 'font-semibold text-slate-700'
                        : 'font-medium'
                    }
                    style={
                      variant === 'modern' ? tokens.subtitleStyle : undefined
                    }
                  />
                )}
              </div>
            )}

            {(descVal || isInteractive) && (
              <div
                className={tokens.quoteBlockClassName}
                style={
                  variant === 'modern'
                    ? { borderColor: 'var(--theme-primary, #cbd5e1)' }
                    : undefined
                }
              >
                <InlineEdit
                  value={descVal}
                  onChange={
                    !isInteractive
                      ? undefined
                      : (v) =>
                          onUpdateItem!(
                            section.id,
                            item.id,
                            buildSyncedFieldPatch(
                              item,
                              item.description !== undefined
                                ? descKey
                                : 'description',
                              v,
                              ['description', 'reference']
                            )
                          )
                  }
                  readOnly={readOnly}
                  multiline
                  placeholder="Reference endorsement or relationship..."
                  textClassName="text-[13px] leading-relaxed whitespace-pre-wrap break-words block"
                />
              </div>
            )}
          </SectionItemWrapper>
        );
      })}
    </div>
  );
};
