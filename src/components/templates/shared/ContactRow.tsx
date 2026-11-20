import React from 'react';
import {
  EnvelopeIcon,
  GlobeAltIcon,
  LinkIcon,
  MapPinIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { IResume } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  extractExtraBasicsLinks,
  normalizeComparableUrl,
} from '../templateHelpers';
import { useTemplateContext } from './TemplateContext';

const linkClassName =
  'underline decoration-slate-400/80 underline-offset-2 hover:decoration-current transition-colors print:decoration-slate-400';

export interface ContactRowProps {
  resume?: IResume;
  readOnly?: boolean;
  onUpdateBasics?: (field: string, value: string) => void;
  variant?: 'inline-center' | 'inline-left' | 'stacked-right' | 'stacked-left';
  showIcons?: boolean;
  className?: string;
}

export const ContactRow: React.FC<ContactRowProps> = ({
  resume: propResume,
  readOnly: propReadOnly,
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

  const formattedAddress =
    [
      !isAddressHidden ? basics.location?.address : undefined,
      basics.location?.city,
      basics.location?.region,
      basics.location?.countryCode,
    ]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(', ') ||
    (!isAddressHidden && typeof basics.location?.address === 'string'
      ? basics.location.address.trim()
      : undefined);

  const extraLinks = extractExtraBasicsLinks(basics as Record<string, any>);

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
      icon: <EnvelopeIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />,
      content:
        isReadOnly && basics.email ? (
          <a
            href={`mailto:${basics.email}`}
            className={linkClassName}
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
      icon: <PhoneIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />,
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

  if (formattedAddress) {
    entries.push({
      key: 'location',
      icon: <MapPinIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />,
      content: <span>{formattedAddress}</span>,
    });
  }

  const seenRenderedUrls = new Set<string>();
  extraLinks.forEach((link) => {
    const comparable = normalizeComparableUrl(link.href);
    if (!comparable || seenRenderedUrls.has(comparable)) return;
    seenRenderedUrls.add(comparable);

    const isWeb = link.key === 'website';
    entries.push({
      key: link.key,
      icon: isWeb ? (
        <GlobeAltIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
      ) : (
        <LinkIcon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden="true" />
      ),
      content: (
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          style={{ color: 'var(--theme-accent, var(--theme-primary, #2563eb))' }}
        >
          {link.label}
        </a>
      ),
    });
  });

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
