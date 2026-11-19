import React from 'react';
import { InlineEdit } from '../../ui/InlineEdit';
import { buildSyncedFieldPatch, safeString } from '../templateHelpers';
import { getEnabledItems } from './SectionPrimitives';
import {
  getHeadingStyle,
  SectionComponentProps,
  VARIANT_TOKENS,
} from './types';

export const LanguageSection: React.FC<SectionComponentProps> = ({
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
    <div
      data-section-kind="languages"
      data-template-variant={variant}
      className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5"
    >
      {items.map((item, idx) => {
        const nameKey = item.name !== undefined ? 'name' : 'language';
        const nameVal = safeString(item.name || item.language || item.title);
        const levelKey = item.level !== undefined ? 'level' : 'fluency';
        const levelVal = safeString(item.fluency || item.level);
        const rawProf =
          typeof item.proficiency === 'number' &&
          Number.isFinite(item.proficiency) &&
          item.proficiency > 0
            ? Math.min(
                100,
                item.proficiency <= 5
                  ? Math.round((item.proficiency / 5) * 100)
                  : Math.round(item.proficiency)
              )
            : null;

        if (!isInteractive && !nameVal && !levelVal && rawProf === null) {
          return null;
        }

        return (
          <div
            key={item.id || idx}
            data-section-item="language"
            className={`break-inside-avoid ${
              variant === 'modern'
                ? tokens.cardSurfaceClassName
                : 'flex flex-col border-b border-slate-200/70 pb-1.5'
            }`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
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
                            'language',
                          ])
                        )
                }
                readOnly={readOnly}
                placeholder="Language"
                textClassName={tokens.compactTitleClassName}
                style={headingStyle}
              />

              <div className="flex items-baseline gap-1.5">
                {(levelVal || isInteractive) && (
                  <InlineEdit
                    value={levelVal}
                    onChange={
                      !isInteractive
                        ? undefined
                        : (v) =>
                            onUpdateItem!(
                              section.id,
                              item.id,
                              buildSyncedFieldPatch(item, levelKey, v, [
                                'level',
                                'fluency',
                              ])
                            )
                    }
                    readOnly={readOnly}
                    placeholder="Fluency"
                    textClassName={tokens.secondaryMetaClassName}
                  />
                )}
                {rawProf !== null && (
                  <span className="text-[11px] font-medium text-slate-500 tabular-nums">
                    ({rawProf}%)
                  </span>
                )}
              </div>
            </div>

            {rawProf !== null && variant === 'modern' && (
              <div
                className="mt-1.5 h-1.5 w-full rounded-full bg-slate-200/80 overflow-hidden"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${rawProf}%`,
                    backgroundColor: 'var(--theme-primary, #334155)',
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
