import React, { useEffect, useRef, useState } from 'react';
import { dateFields } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
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
  urlField?: string;
  urlPlaceholder?: string;
  onUrlChange?: (val: string) => void;
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
  urlField,
  urlPlaceholder,
  onUrlChange,
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
  const safeUrl = typeof url === 'string' ? url.trim() : '';

  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [tempUrl, setTempUrl] = useState(safeUrl);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempUrl(safeUrl);
  }, [safeUrl]);

  useEffect(() => {
    if (isEditingUrl && urlInputRef.current) {
      urlInputRef.current.focus();
    }
  }, [isEditingUrl]);

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

  const resolvedUrlField =
    urlField ||
    (item?.url !== undefined
      ? 'url'
      : item?.website !== undefined
      ? 'website'
      : item?.link !== undefined
      ? 'link'
      : item?.liveUrl !== undefined
      ? 'liveUrl'
      : 'url');

  const canEditUrl = Boolean(!isReadOnly && (onUrlChange || (sectionId && itemId)));

  const commitUrlEdit = () => {
    setIsEditingUrl(false);
    const nextUrl = tempUrl.trim();
    if (nextUrl === safeUrl) return;
    if (onUrlChange) {
      onUrlChange(nextUrl);
      return;
    }
    if (sectionId && itemId) {
      const patch = buildSyncedFieldPatch(item, resolvedUrlField, nextUrl, [
        'url',
        'website',
        'link',
        'liveUrl',
      ]);
      ctx.updateSectionItemPatch(sectionId, itemId, patch);
    }
  };

  const renderLink = () => {
    if (canEditUrl && isEditingUrl) {
      return (
        <input
          ref={urlInputRef}
          type="text"
          value={tempUrl}
          onChange={(e) => setTempUrl(e.target.value)}
          onBlur={commitUrlEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitUrlEdit();
            } else if (e.key === 'Escape') {
              setTempUrl(safeUrl);
              setIsEditingUrl(false);
            }
          }}
          placeholder="https://..."
          aria-label="Edit URL"
          className="bg-white border border-primary-500 rounded px-2 py-0.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
        />
      );
    }

    if (!safeUrl) {
      if (canEditUrl && urlPlaceholder) {
        return (
          <button
            type="button"
            onClick={() => setIsEditingUrl(true)}
            className="text-xs text-neutral-400 italic hover:opacity-80 transition-colors print:hidden"
          >
            {urlPlaceholder}
          </button>
        );
      }
      return null;
    }

    return (
      <a
        href={normalizeHref(safeUrl)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={
          canEditUrl
            ? (e) => {
                if (!e.metaKey && !e.ctrlKey) {
                  e.preventDefault();
                  setIsEditingUrl(true);
                }
              }
            : undefined
        }
        className={`text-xs font-medium ${linkClassName}`}
        style={{
          color: 'var(--theme-accent, var(--theme-primary, #2563eb))',
        }}
      >
        {formatLinkLabel(safeUrl)}
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
      (urlPlacement === 'subtitle' && safeUrl) ||
      formattedLocation
  );
  const showSecondaryRow = Boolean(
    showSubtitleNode ||
      extraSubtitle ||
      (urlPlacement === 'subtitle' && (safeUrl || (canEditUrl && urlPlaceholder))) ||
      formattedLocation
  );

  return (
    <div style={{ color: 'var(--theme-text-color, #374151)' }}>
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
          } opacity-75 tabular-nums shrink-0`}
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
                      ? 'text-[1em] font-semibold'
                      : 'text-[1em] font-medium'
                  }
                  style={{ color: 'var(--theme-primary, #334155)' }}
                />
              ) : (
                <span
                  className={
                    tone === 'classic' ? 'font-semibold' : 'font-medium'
                  }
                  style={{ color: 'var(--theme-primary, #334155)' }}
                >
                  {subtitle}
                </span>
              ))}

            {extraSubtitle}
            {urlPlacement === 'subtitle' && renderLink()}
          </div>

          {formattedLocation && (
            <span
              className={`text-xs opacity-75 ${
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
