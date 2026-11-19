import React from 'react';
import { dateFields } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  formatItemLocation,
  formatLinkLabel,
  normalizeHref,
} from '../templateHelpers';
import { DateRange } from './DateRange';
import { useTemplateContext } from './TemplateContext';

const linkClassName =
  'underline decoration-slate-400/80 underline-offset-2 hover:decoration-current transition-colors print:decoration-slate-400';

export interface ItemHeaderProps {
  title?: string;
  titlePlaceholder?: string;
  sectionId?: string;
  itemId?: string;
  titleField?: string;
  onTitleChange?: (val: string) => void;
  subtitle?: string;
  subtitlePlaceholder?: string;
  subtitleField?: string | null;
  onSubtitleChange?: (val: string) => void;
  showSubtitleWhenEmptyInEdit?: boolean;
  extraSubtitle?: React.ReactNode;
  url?: string;
  urlPlacement?: 'title' | 'subtitle';
  item?: Record<string, any>;
  startDate?: string | Partial<dateFields>;
  endDate?: string | Partial<dateFields>;
  date?: string | Partial<dateFields>;
  current?: boolean;
  location?: unknown;
  readOnly?: boolean;
  tone?: 'modern' | 'classic';
}

export const ItemHeader: React.FC<ItemHeaderProps> = ({
  title = '',
  titlePlaceholder = 'Title',
  sectionId,
  itemId,
  titleField,
  onTitleChange,
  subtitle = '',
  subtitlePlaceholder = 'Organization',
  subtitleField,
  onSubtitleChange,
  showSubtitleWhenEmptyInEdit = false,
  extraSubtitle,
  url,
  urlPlacement = 'subtitle',
  item,
  startDate,
  endDate,
  date,
  current,
  location,
  readOnly,
  tone = 'modern',
}) => {
  const ctx = useTemplateContext();
  const isReadOnly = readOnly ?? ctx.readOnly;
  const formattedLocation = formatItemLocation(location);

  const handleTitleEdit =
    onTitleChange ||
    (!isReadOnly && sectionId && itemId && titleField
      ? (val: string) => ctx.updateSectionItem(sectionId, itemId, titleField, val)
      : undefined);

  const handleSubtitleEdit =
    onSubtitleChange ||
    (!isReadOnly && sectionId && itemId && subtitleField
      ? (val: string) => ctx.updateSectionItem(sectionId, itemId, subtitleField, val)
      : undefined);

  const renderLink = () => {
    if (!url || !url.trim()) return null;
    return (
      <a
        href={normalizeHref(url)}
        target="_blank"
        rel="noopener noreferrer"
        className={`text-xs font-medium ${linkClassName}`}
        style={{
          color: 'var(--theme-accent, var(--theme-primary, #2563eb))',
        }}
      >
        {formatLinkLabel(url)}
      </a>
    );
  };

  const canEditSubtitle = Boolean(!isReadOnly && handleSubtitleEdit);
  const showSubtitleNode = Boolean(
    subtitle || (canEditSubtitle && showSubtitleWhenEmptyInEdit)
  );
  const hasPrintSecondaryContent = Boolean(
    (subtitle && subtitle.trim()) ||
      extraSubtitle ||
      (urlPlacement === 'subtitle' && url && url.trim()) ||
      formattedLocation
  );
  const showSecondaryRow = Boolean(
    showSubtitleNode ||
      extraSubtitle ||
      (urlPlacement === 'subtitle' && url) ||
      formattedLocation
  );

  return (
    <div>
      <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2 min-w-0">
          {handleTitleEdit && !isReadOnly ? (
            <InlineEdit
              value={title}
              onChange={handleTitleEdit}
              readOnly={isReadOnly}
              placeholder={titlePlaceholder}
              textClassName={`text-[1.1em] ${
                tone === 'classic' ? 'font-bold' : 'font-semibold'
              } leading-snug`}
              style={{
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-heading-color, #111827)',
              }}
            />
          ) : title ? (
            <span
              className={`text-[1.1em] ${
                tone === 'classic' ? 'font-bold' : 'font-semibold'
              } leading-snug`}
              style={{
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-heading-color, #111827)',
              }}
            >
              {title}
            </span>
          ) : null}
          {urlPlacement === 'title' && renderLink()}
        </div>

        <DateRange
          item={item}
          startDate={startDate}
          endDate={endDate}
          date={date}
          current={current}
          className={`text-xs ${
            tone === 'classic' ? 'font-semibold' : 'font-medium'
          } text-slate-500 tabular-nums shrink-0`}
        />
      </div>

      {showSecondaryRow && (
        <div
          className={`flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5 ${
            !hasPrintSecondaryContent ? 'print:hidden' : ''
          }`}
        >
          <div className="flex flex-wrap items-baseline gap-x-1.5 text-[0.98em]">
            {showSubtitleNode &&
              (canEditSubtitle ? (
                <InlineEdit
                  value={subtitle}
                  onChange={handleSubtitleEdit}
                  readOnly={isReadOnly}
                  placeholder={subtitlePlaceholder}
                  textClassName={
                    tone === 'classic'
                      ? 'text-[1em] font-semibold text-slate-700'
                      : 'text-[1em] font-medium'
                  }
                  style={
                    tone === 'classic'
                      ? undefined
                      : { color: 'var(--theme-primary, #334155)' }
                  }
                />
              ) : (
                <span
                  className={
                    tone === 'classic'
                      ? 'font-semibold text-slate-700'
                      : 'font-medium'
                  }
                  style={
                    tone === 'classic'
                      ? undefined
                      : { color: 'var(--theme-primary, #334155)' }
                  }
                >
                  {subtitle}
                </span>
              ))}

            {extraSubtitle}
            {urlPlacement === 'subtitle' && renderLink()}
          </div>

          {formattedLocation && (
            <span
              className={`text-xs text-slate-500 ${
                tone === 'classic' ? 'italic' : ''
              }`}
            >
              {formattedLocation}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
