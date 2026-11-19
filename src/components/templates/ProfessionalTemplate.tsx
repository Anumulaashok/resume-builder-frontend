import React from 'react';
import { IResume } from '../../types/resume';
import { formatResumeDate } from '../../utils/date';
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

export function formatDate(date?: unknown): string {
  return formatResumeDate(date);
}

export const ProfessionalTemplate: React.FC<TemplateProps> = ({
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

  const formattedAddress =
    [
      !isAddressHidden ? basics.location?.address : undefined,
      basics.location?.city,
      (basics.location as any)?.region,
      basics.location?.countryCode,
    ]
      .filter(Boolean)
      .join(', ') || (!isAddressHidden ? basics.location?.address : undefined);

  const extraLinks = extractExtraBasicsLinks(basics as Record<string, any>);
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
      data-testid="professional-template"
      className="bg-white p-[1.75cm] print:p-[1.25cm] text-[13.5px] leading-relaxed"
      style={{
        fontFamily: 'var(--theme-body-font, Georgia, serif)',
        color: 'var(--theme-text-color, #334155)',
      }}
    >
      {/* Header */}
      <header
        className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 border-b-2 pb-4"
        style={{
          borderColor: 'var(--theme-primary, #1e293b)',
          marginBottom: 'var(--theme-section-spacing, 1.5rem)',
        }}
      >
        <div className="min-w-0">
          <InlineEdit
            value={basics.name || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
            readOnly={readOnly}
            textClassName="text-3xl font-bold tracking-tight leading-tight"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-heading-color, #1e293b)',
            }}
            placeholder="Your Name"
          />
          <InlineEdit
            value={basics.label || ''}
            onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
            readOnly={readOnly}
            textClassName="text-base mt-1 block font-medium"
            style={{ color: 'var(--theme-primary, #475569)' }}
            placeholder="Professional Title"
          />
        </div>
        <div className="text-xs text-slate-600 sm:text-right space-y-0.5 shrink-0">
          {!isEmailHidden &&
            (basics.email || !readOnly) &&
            (readOnly && basics.email ? (
              <div>
                <a
                  href={`mailto:${basics.email}`}
                  className={linkClassName}
                  style={{ color: 'var(--theme-primary, #1e293b)' }}
                >
                  {basics.email}
                </a>
              </div>
            ) : (
              <InlineEdit
                value={basics.email || ''}
                onChange={readOnly ? undefined : (v) => updateBasics('email', v)}
                placeholder="Email Address"
                textClassName="block"
                readOnly={readOnly}
              />
            ))}
          {!isPhoneHidden &&
            (basics.phone || !readOnly) &&
            (readOnly && basics.phone ? (
              <div>
                <a href={`tel:${basics.phone}`} className="hover:underline">
                  {basics.phone}
                </a>
              </div>
            ) : (
              <InlineEdit
                value={basics.phone || ''}
                onChange={readOnly ? undefined : (v) => updateBasics('phone', v)}
                placeholder="Phone Number"
                textClassName="block"
                readOnly={readOnly}
              />
            ))}
          {formattedAddress && (
            <div className="text-slate-600">{formattedAddress}</div>
          )}
          {extraLinks.map((link) => (
            <div key={link.key}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClassName}
                style={{ color: 'var(--theme-primary, #1e293b)' }}
              >
                {link.label}
              </a>
            </div>
          ))}
        </div>
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
            className="text-xs font-bold uppercase tracking-[0.18em] border-b pb-1.5 mb-2.5 break-after-avoid"
            style={{
              fontFamily: 'var(--theme-heading-font)',
              color: 'var(--theme-primary, #1e293b)',
              borderBottomColor: 'var(--theme-primary, #cbd5e1)',
            }}
          >
            Profile
          </h2>
          <InlineEdit
            value={summaryValue}
            onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
            multiline
            textClassName="text-[13px] leading-relaxed whitespace-pre-wrap break-words block"
            style={{ color: 'var(--theme-text-color, #334155)' }}
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
              className="text-xs font-bold uppercase tracking-[0.18em] border-b pb-1.5 mb-3 break-after-avoid"
              style={{
                fontFamily: 'var(--theme-heading-font)',
                color: 'var(--theme-primary, #1e293b)',
                borderBottomColor: 'var(--theme-primary, #cbd5e1)',
              }}
            >
              {section.title}
            </h2>
            <SectionRenderer
              section={section}
              variant="professional"
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
