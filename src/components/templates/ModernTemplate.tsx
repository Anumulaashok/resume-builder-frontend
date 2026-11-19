import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import { SectionRenderer } from './sections';
import {
  extractExtraBasicsLinks,
  getOrderedSections,
} from './templateHelpers';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

const linkClassName =
  'underline decoration-slate-400/80 underline-offset-2 hover:decoration-current transition-colors print:decoration-slate-400';

export const ModernTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => {
  const basics = resume?.content?.basics || {};

  const updateBasics = (field: string, value: string) => {
    if (!onChange || readOnly) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        basics: {
          ...resume.content.basics,
          [field]: value,
        },
      },
    });
  };

  const updateSectionItemPatch = (
    sectionId: string,
    itemId: string,
    patch: Record<string, any>
  ) => {
    if (!onChange || readOnly) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        sections: (resume.content.sections || []).map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                content: Array.isArray(sec.content)
                  ? sec.content.map((item) =>
                      item && item.id === itemId ? { ...item, ...patch } : item
                    )
                  : sec.content,
              }
            : sec
        ),
      },
    });
  };

  const isEmailHidden =
    readOnly &&
    Boolean(
      resume?.sharing?.privacy?.hideEmail ||
        resume?.sharing?.privacySettings?.hideEmail
    );
  const isPhoneHidden =
    readOnly &&
    Boolean(
      resume?.sharing?.privacy?.hidePhone ||
        resume?.sharing?.privacySettings?.hidePhone
    );
  const isAddressHidden =
    readOnly &&
    Boolean(
      resume?.sharing?.privacy?.hideAddress ||
        resume?.sharing?.privacySettings?.hideAddress
    );

  const contactItems: React.ReactNode[] = [];
  if (!isEmailHidden && (basics.email || !readOnly)) {
    contactItems.push(
      readOnly && basics.email ? (
        <a
          key="email"
          href={`mailto:${basics.email}`}
          className={linkClassName}
          style={{ color: 'var(--theme-primary, #334155)' }}
        >
          {basics.email}
        </a>
      ) : (
        <InlineEdit
          key="email"
          value={basics.email || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('email', v)}
          placeholder="Email Address"
          readOnly={readOnly}
        />
      )
    );
  }

  if (!isPhoneHidden && (basics.phone || !readOnly)) {
    contactItems.push(
      readOnly && basics.phone ? (
        <a
          key="phone"
          href={`tel:${basics.phone}`}
          className="hover:underline"
        >
          {basics.phone}
        </a>
      ) : (
        <InlineEdit
          key="phone"
          value={basics.phone || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('phone', v)}
          placeholder="Phone Number"
          readOnly={readOnly}
        />
      )
    );
  }

  const formattedAddress =
    [
      !isAddressHidden ? basics.location?.address : undefined,
      basics.location?.city,
      (basics.location as any)?.region,
      basics.location?.countryCode,
    ]
      .filter(Boolean)
      .join(', ') || (!isAddressHidden ? basics.location?.address : undefined);

  if (formattedAddress) {
    contactItems.push(<span key="address">{formattedAddress}</span>);
  }

  const extraLinks = extractExtraBasicsLinks(basics as Record<string, any>);
  extraLinks.forEach((link) => {
    contactItems.push(
      <a
        key={link.key}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        style={{ color: 'var(--theme-primary, #2563eb)' }}
      >
        {link.label}
      </a>
    );
  });

  const summaryValue = basics.summary ?? resume?.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume?.summary !== undefined;

  const orderedSections = getOrderedSections(
    resume?.content?.sections || [],
    resume?.content?.sectionOrder || []
  );

  return (
    <div
      data-testid="modern-template"
      className="bg-white p-[1.75cm] print:p-[1.25cm] text-[13.5px] leading-relaxed"
      style={{
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #374151)',
      }}
    >
      {/* Header */}
      <header
        className="text-center pb-5 border-b-2"
        style={{
          borderColor: 'var(--theme-primary, #111827)',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <InlineEdit
          value={basics.name || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
          readOnly={readOnly}
          textClassName="text-3xl font-bold tracking-tight leading-tight"
          style={{
            fontFamily: 'var(--theme-heading-font)',
            color: 'var(--theme-heading-color, #111827)',
          }}
          placeholder="Your Name"
        />
        <InlineEdit
          value={basics.label || ''}
          onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
          readOnly={readOnly}
          textClassName="text-base mt-1 font-medium block"
          style={{ color: 'var(--theme-primary, #4b5563)' }}
          placeholder="Professional Title"
        />
        {contactItems.length > 0 && (
          <div className="text-xs text-slate-600 mt-2.5 flex flex-wrap justify-center items-center gap-x-2.5 gap-y-1">
            {contactItems.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && (
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                )}
                {item}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      {/* Summary */}
      {showSummary && (
        <section
          style={{
            marginBottom:
              orderedSections.length > 0
                ? 'var(--theme-section-spacing, 1.5rem)'
                : undefined,
          }}
        >
          <h2
            className="text-xs font-bold uppercase tracking-[0.14em] pb-1.5 mb-2.5 border-b border-slate-200 break-after-avoid"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-primary, #111827)',
            }}
          >
            Professional Summary
          </h2>
          <InlineEdit
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            multiline
            textClassName="text-[13px] leading-relaxed whitespace-pre-wrap break-words block"
            style={{ color: 'var(--theme-text-color, #374151)' }}
            placeholder="A brief summary of your professional background..."
            readOnly={readOnly}
          />
        </section>
      )}

      {/* Sections */}
      {orderedSections.map((section, idx) => {
        const isLastSection = idx === orderedSections.length - 1;
        return (
          <section
            key={section.id}
            style={
              isLastSection
                ? undefined
                : { marginBottom: 'var(--theme-section-spacing, 1.5rem)' }
            }
          >
            <h2
              className="text-xs font-bold uppercase tracking-[0.14em] pb-1.5 mb-3 border-b border-slate-200 break-after-avoid"
              style={{
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-primary, #111827)',
              }}
            >
              {section.title}
            </h2>
            <SectionRenderer
              section={section}
              variant="modern"
              readOnly={readOnly}
              onUpdateItem={
                readOnly || !onChange ? undefined : updateSectionItemPatch
              }
            />
          </section>
        );
      })}
    </div>
  );
};
