import React, { useEffect, useRef, useState } from 'react';
import {
  EnvelopeIcon,
  GlobeAltIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { IResume } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import { extractExtraBasicsLinks, normalizeHref } from '../templateHelpers';
import { useTemplateContext } from './TemplateContext';

const defaultLinkClassName =
  'underline decoration-slate-400/80 underline-offset-2 hover:decoration-current transition-colors print:decoration-slate-400';

export interface InlineLinkEditProps {
  rawValue?: string;
  href?: string;
  label?: string;
  placeholder: string;
  ariaLabel: string;
  readOnly?: boolean;
  clearAfterCommit?: boolean;
  onChange?: (val: string) => void;
  linkClassName?: string;
  linkStyle?: React.CSSProperties;
  leadingIcon?: React.ReactNode;
  placeholderClassName?: string;
  placeholderStyle?: React.CSSProperties;
}

export const InlineLinkEdit: React.FC<InlineLinkEditProps> = ({
  rawValue = '',
  href = '',
  label = '',
  placeholder,
  ariaLabel,
  readOnly = false,
  clearAfterCommit = false,
  onChange,
  linkClassName = defaultLinkClassName,
  linkStyle,
  leadingIcon,
  placeholderClassName = 'text-neutral-400 italic hover:text-slate-600 transition-colors print:hidden',
  placeholderStyle,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(rawValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreBlurRef = useRef(false);

  useEffect(() => {
    setDraft(rawValue);
  }, [rawValue]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  if (readOnly || !onChange) {
    if (!href) return null;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        style={linkStyle}
      >
        {leadingIcon}
        {leadingIcon ? <span>{label}</span> : label}
      </a>
    );
  }

  const startEditing = () => {
    ignoreBlurRef.current = false;
    setDraft(clearAfterCommit ? '' : rawValue);
    setIsEditing(true);
  };

  const commit = () => {
    if (ignoreBlurRef.current) return;
    ignoreBlurRef.current = true;
    setIsEditing(false);
    const trimmed = draft.trim();
    if (trimmed && !normalizeHref(trimmed)) {
      setDraft(clearAfterCommit ? '' : rawValue);
      return;
    }
    if (clearAfterCommit) {
      if (trimmed) {
        onChange(trimmed);
      }
      setDraft('');
      return;
    }
    if (trimmed !== rawValue.trim()) {
      onChange(trimmed);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        aria-label={ariaLabel}
        value={draft}
        placeholder="https://..."
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            ignoreBlurRef.current = true;
            setDraft(clearAfterCommit ? '' : rawValue);
            setIsEditing(false);
          }
        }}
        className="bg-white border border-primary-500 rounded px-2 py-0.5 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[150px] print:hidden"
      />
    );
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            startEditing();
          }
        }}
        title="Click to edit link (Cmd/Ctrl+Click to open)"
        className={linkClassName}
        style={linkStyle}
      >
        {leadingIcon}
        {leadingIcon ? <span>{label}</span> : label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={ariaLabel}
      className={placeholderClassName}
      style={placeholderStyle}
    >
      {leadingIcon}
      {leadingIcon ? <span>{placeholder}</span> : placeholder}
    </button>
  );
};

export interface ContactRowProps {
  resume?: IResume;
  readOnly?: boolean;
  hideLinks?: boolean;
  onUpdateBasics?: (field: string, value: string) => void;
  variant?: 'inline-center' | 'inline-left' | 'stacked-right' | 'stacked-left';
  showIcons?: boolean;
  className?: string;
}

export const ContactRow: React.FC<ContactRowProps> = ({
  resume: propResume,
  readOnly: propReadOnly,
  hideLinks = false,
  onUpdateBasics,
  variant = 'inline-center',
  showIcons = true,
  className = '',
}) => {
  const ctx = useTemplateContext();
  const resume = propResume || ctx.resume;
  const isReadOnly = propReadOnly ?? ctx.readOnly;
  const updateBasics = onUpdateBasics || ctx.updateBasics;

  if (!resume) return null;
  const basics = resume.content?.basics || {};

  const isEmailHidden =
    isReadOnly &&
    Boolean(
      resume.sharing?.privacy?.hideEmail ||
        resume.sharing?.privacySettings?.hideEmail
    );
  const isPhoneHidden =
    isReadOnly &&
    Boolean(
      resume.sharing?.privacy?.hidePhone ||
        resume.sharing?.privacySettings?.hidePhone
    );
  const isAddressHidden =
    isReadOnly &&
    Boolean(
      resume.sharing?.privacy?.hideAddress ||
        resume.sharing?.privacySettings?.hideAddress
    );

  const formattedAddress = [
    !isAddressHidden ? basics.location?.address?.trim() : undefined,
    basics.location?.city?.trim(),
    basics.location?.region?.trim(),
    !isAddressHidden ? basics.location?.postalCode?.trim() : undefined,
    basics.location?.countryCode?.trim(),
  ]
    .filter(Boolean)
    .join(', ');

  const extraLinks = hideLinks
    ? []
    : extractExtraBasicsLinks(basics as Record<string, any>);

  const entries: Array<{
    key: string;
    icon: React.ReactNode;
    content: React.ReactNode;
    isEmptyPlaceholder?: boolean;
  }> = [];

  if (!isEmailHidden && (basics.email || !isReadOnly)) {
    entries.push({
      key: 'email',
      isEmptyPlaceholder: !basics.email || !basics.email.trim(),
      icon: (
        <EnvelopeIcon
          className="h-3.5 w-3.5 shrink-0 opacity-70"
          aria-hidden="true"
        />
      ),
      content:
        isReadOnly && basics.email ? (
          <a
            href={`mailto:${basics.email}`}
            className={defaultLinkClassName}
            style={{ color: 'var(--theme-primary, #334155)' }}
          >
            {basics.email}
          </a>
        ) : (
          <InlineEdit
            value={basics.email || ''}
            onChange={isReadOnly ? undefined : (v) => updateBasics('email', v)}
            placeholder="Email Address"
            readOnly={isReadOnly}
          />
        ),
    });
  }

  if (!isPhoneHidden && (basics.phone || !isReadOnly)) {
    entries.push({
      key: 'phone',
      isEmptyPlaceholder: !basics.phone || !basics.phone.trim(),
      icon: (
        <PhoneIcon
          className="h-3.5 w-3.5 shrink-0 opacity-70"
          aria-hidden="true"
        />
      ),
      content:
        isReadOnly && basics.phone ? (
          <a href={`tel:${basics.phone}`} className="hover:underline">
            {basics.phone}
          </a>
        ) : (
          <InlineEdit
            value={basics.phone || ''}
            onChange={isReadOnly ? undefined : (v) => updateBasics('phone', v)}
            placeholder="Phone Number"
            readOnly={isReadOnly}
          />
        ),
    });
  }

  if (formattedAddress || !isReadOnly) {
    entries.push({
      key: 'location',
      isEmptyPlaceholder: !formattedAddress,
      icon: (
        <MapPinIcon
          className="h-3.5 w-3.5 shrink-0 opacity-70"
          aria-hidden="true"
        />
      ),
      content: isReadOnly ? (
        <span>{formattedAddress}</span>
      ) : (
        <InlineEdit
          value={formattedAddress}
          onChange={(v) => updateBasics('location', v)}
          placeholder="Add Location"
          ariaLabel="Inline edit: Location"
          readOnly={isReadOnly}
        />
      ),
    });
  }

  if (!hideLinks) {
    extraLinks.forEach((link) => {
      const isWeb = link.key === 'website';
      const targetField = link.fieldKey || 'url';
      entries.push({
        key: link.key,
        icon: isWeb ? (
          <GlobeAltIcon
            className="h-3.5 w-3.5 shrink-0 opacity-70"
            aria-hidden="true"
          />
        ) : (
          <LinkIcon
            className="h-3.5 w-3.5 shrink-0 opacity-70"
            aria-hidden="true"
          />
        ),
        content: (
          <InlineLinkEdit
            rawValue={link.rawValue || link.href}
            href={link.href}
            label={link.label}
            placeholder="Add Link"
            ariaLabel={`Inline edit: ${link.key} URL`}
            readOnly={isReadOnly}
            onChange={
              isReadOnly ? undefined : (v) => updateBasics(targetField, v)
            }
            linkClassName={defaultLinkClassName}
            linkStyle={{
              color: 'var(--theme-accent, var(--theme-primary, #2563eb))',
            }}
          />
        ),
      });
    });

    if (!isReadOnly) {
      if (!extraLinks.some((l) => l.key === 'website')) {
        entries.push({
          key: 'website-placeholder',
          isEmptyPlaceholder: true,
          icon: (
            <GlobeAltIcon
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden="true"
            />
          ),
          content: (
            <InlineLinkEdit
              placeholder="Add Website"
              ariaLabel="Inline edit: Website URL"
              readOnly={false}
              onChange={(v) => updateBasics('url', v)}
            />
          ),
        });
      }

      if (!extraLinks.some((l) => l.key === 'linkedin')) {
        entries.push({
          key: 'linkedin-placeholder',
          isEmptyPlaceholder: true,
          icon: (
            <LinkIcon
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden="true"
            />
          ),
          content: (
            <InlineLinkEdit
              placeholder="Add LinkedIn"
              ariaLabel="Inline edit: LinkedIn URL"
              readOnly={false}
              onChange={(v) => updateBasics('linkedin', v)}
            />
          ),
        });
      }

      if (!extraLinks.some((l) => l.key === 'github')) {
        entries.push({
          key: 'github-placeholder',
          isEmptyPlaceholder: true,
          icon: (
            <LinkIcon
              className="h-3.5 w-3.5 shrink-0 opacity-70"
              aria-hidden="true"
            />
          ),
          content: (
            <InlineLinkEdit
              placeholder="Add GitHub"
              ariaLabel="Inline edit: GitHub URL"
              readOnly={false}
              onChange={(v) => updateBasics('github', v)}
            />
          ),
        });
      }

      entries.push({
        key: 'custom-link-placeholder',
        isEmptyPlaceholder: true,
        icon: (
          <PlusIcon
            className="h-3 w-3 shrink-0 opacity-70"
            aria-hidden="true"
          />
        ),
        content: (
          <InlineLinkEdit
            placeholder="Custom Link"
            ariaLabel="Inline edit: Add custom link"
            readOnly={false}
            clearAfterCommit
            onChange={(v) => updateBasics('profile:new', v)}
          />
        ),
      });
    }
  }

  if (!entries.length) return null;

  const hasAnyNonEmptyEntry = entries.some((entry) => !entry.isEmptyPlaceholder);

  if (variant === 'stacked-right' || variant === 'stacked-left') {
    const isRight = variant === 'stacked-right';
    return (
      <div
        className={`text-xs text-slate-600 space-y-1 shrink-0 ${
          isRight ? 'sm:text-right' : 'text-left'
        } ${!hasAnyNonEmptyEntry ? 'print:hidden' : ''} ${className}`}
      >
        {entries.map((entry) => (
          <div
            key={entry.key}
            className={`flex items-center gap-1.5 ${
              isRight ? 'sm:justify-end' : 'justify-start'
            } ${entry.isEmptyPlaceholder ? 'print:hidden' : ''}`}
          >
            {showIcons && !isRight && entry.icon}
            {entry.content}
            {showIcons && isRight && entry.icon}
          </div>
        ))}
      </div>
    );
  }

  const justifyClass = variant === 'inline-left' ? 'justify-start' : 'justify-center';

  return (
    <div
      className={`text-xs text-slate-600 flex flex-wrap ${justifyClass} items-center gap-x-2.5 gap-y-1 ${
        !hasAnyNonEmptyEntry ? 'print:hidden' : ''
      } ${className}`}
    >
      {entries.map((entry, idx) => {
        const hasPriorPrintVisibleEntry = entries
          .slice(0, idx)
          .some((prev) => !prev.isEmptyPlaceholder);
        const hideSeparatorInPrint =
          Boolean(entry.isEmptyPlaceholder) || !hasPriorPrintVisibleEntry;

        return (
          <React.Fragment key={entry.key}>
            {idx > 0 && (
              <span
                className={`text-slate-400 ${
                  hideSeparatorInPrint ? 'print:hidden' : ''
                }`}
                aria-hidden="true"
              >
                •
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1 ${
                entry.isEmptyPlaceholder ? 'print:hidden' : ''
              }`}
            >
              {showIcons && entry.icon}
              {entry.content}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
