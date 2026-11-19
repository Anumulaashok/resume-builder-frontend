import React from 'react';
import { IResume } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractExtraBasicsLinks,
} from './templateHelpers';
import {
  ContactRow,
  Description,
  ProfilePhoto,
  SectionHeading,
  SectionRenderer,
  shouldRenderProfilePhoto,
  TemplateProvider,
  useTemplateContext,
} from './shared';

interface TemplateProps {
  resume: IResume;
  onChange?: (resume: IResume) => void;
  readOnly?: boolean;
}

const SIDEBAR_KINDS = new Set<CanonicalSectionKind>([
  'skills',
  'languages',
  'certificates',
]);

function getMonogramInitials(rawName?: string): string {
  if (!rawName || !rawName.trim()) return 'CV';
  const words = rawName
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/^[^A-Za-z0-9]+/, ''))
    .filter(Boolean);

  if (words.length === 0) return 'CV';
  if (words.length === 1) return words[0][0].toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function hasVisibleContactEntries(resume: IResume, readOnly: boolean): boolean {
  if (!readOnly) return true;
  const basics = resume.content?.basics || {};

  const hideEmail = Boolean(
    resume.sharing?.privacy?.hideEmail ||
      resume.sharing?.privacySettings?.hideEmail
  );
  const hidePhone = Boolean(
    resume.sharing?.privacy?.hidePhone ||
      resume.sharing?.privacySettings?.hidePhone
  );
  const hideAddress = Boolean(
    resume.sharing?.privacy?.hideAddress ||
      resume.sharing?.privacySettings?.hideAddress
  );

  if (!hideEmail && basics.email && basics.email.trim()) return true;
  if (!hidePhone && basics.phone && basics.phone.trim()) return true;

  const hasLocation = Boolean(
    (!hideAddress && basics.location?.address?.trim()) ||
      basics.location?.city?.trim() ||
      (basics.location as Record<string, any> | undefined)?.region?.trim?.() ||
      basics.location?.countryCode?.trim()
  );
  if (hasLocation) return true;

  return extractExtraBasicsLinks(basics as Record<string, any>).length > 0;
}

const AccentSidebarContent: React.FC = () => {
  const { resume, readOnly, updateBasics, atsMode } = useTemplateContext();
  if (!resume) return null;

  const basics = resume.content?.basics || {};
  const summaryValue = basics.summary ?? resume.summary ?? '';
  const hasSummaryText = Boolean(summaryValue && summaryValue.trim());
  const showSummary = readOnly
    ? hasSummaryText
    : basics.summary !== undefined || resume.summary !== undefined;
  const showHeader = readOnly
    ? Boolean(basics.name?.trim() || basics.label?.trim())
    : true;
  const showContact = hasVisibleContactEntries(resume, readOnly);
  const initials = getMonogramInitials(basics.name);
  const showPhoto = shouldRenderProfilePhoto(
    resume,
    resume.themeConfig?.photo,
    atsMode
  );

  if (atsMode) {
    return (
      <div
        data-testid="accent-sidebar-template"
        className="bg-white"
        style={{
          padding: 'var(--theme-page-margin, 1.25cm)',
          fontFamily: 'var(--theme-body-font, inherit)',
          color: 'var(--theme-text-color, #111827)',
          fontSize: 'var(--theme-base-font-size, 13.5px)',
          lineHeight: 'var(--theme-line-height, 1.5)',
        }}
      >
        {(showHeader || showContact) && (
          <header
            className="pb-4 border-b border-slate-300"
            style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
          >
            {showHeader && (
              <>
                <InlineEdit
                  value={basics.name || ''}
                  onChange={readOnly ? undefined : (v) => updateBasics('name', v)}
                  readOnly={readOnly}
                  textClassName="text-3xl font-bold tracking-tight leading-tight"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #000000)',
                  }}
                  placeholder="Your Name"
                />
                <InlineEdit
                  value={basics.label || ''}
                  onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
                  readOnly={readOnly}
                  textClassName="text-base font-medium mt-1 block"
                  style={{ color: 'var(--theme-heading-color, #000000)' }}
                  placeholder="Professional Title"
                />
              </>
            )}
            {showContact && (
              <ContactRow variant="inline-left" className="mt-2.5" />
            )}
          </header>
        )}

        {showSummary && (
          <section
            className={!hasSummaryText ? 'print:hidden' : undefined}
            style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
          >
            <SectionHeading title="Summary" />
            <Description
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              readOnly={readOnly}
              placeholder="Summarize your impact, expertise, and career focus..."
              textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
            />
          </section>
        )}

        <SectionRenderer tone="modern" />
      </div>
    );
  }

  return (
    <div
      data-testid="accent-sidebar-template"
      className="relative bg-white grid grid-cols-1 sm:grid-cols-[var(--theme-sidebar-width,33%)_minmax(0,1fr)] print:grid-cols-[var(--theme-sidebar-width,33%)_minmax(0,1fr)] print:!min-h-0"
      style={{
        minHeight: 'var(--theme-page-height, 1123px)',
        fontFamily: 'var(--theme-body-font, inherit)',
        color: 'var(--theme-text-color, #334155)',
        fontSize: 'var(--theme-base-font-size, 13.5px)',
        lineHeight: 'var(--theme-line-height, 1.5)',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Repeats full-height solid accent sidebar background across every printed page */}
      <div
        aria-hidden="true"
        data-testid="accent-sidebar-print-bg"
        className="hidden print:block print:fixed print:inset-y-0 print:left-0 print:z-0 pointer-events-none"
        style={{
          width: 'var(--theme-sidebar-width, 33%)',
          backgroundColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />

      <aside
        data-testid="accent-sidebar-aside"
        className="relative z-10 min-w-0 max-w-full [overflow-wrap:anywhere] text-white [&_[class*='text-slate-']]:!text-white/85 [&_[class*='decoration-slate-']]:!decoration-white/50 [&_[class*='bg-slate-100']]:!bg-white/15 [&_[class*='print:bg-slate-50']]:print:!bg-white/15 [&_[class*='bg-slate-200']]:!bg-white/25 [&_[class*='border-slate-']]:!border-white/25 [&_[class*='hover:bg-neutral-100']:hover]:!bg-white/15 [&_input]:!text-slate-900 [&_textarea]:!text-slate-900 [&_[data-section-kind='languages']]:!grid-cols-1 [&_[data-skill-variant]]:!grid-cols-1 [&_[data-skill-variant='chips']>div]:!flex-col [&_[data-skill-variant='chips']>div>div:first-child]:!w-auto [&_[data-skill-variant='comma']>div]:!flex-col"
        style={{
          backgroundColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
          padding: 'var(--theme-page-margin, 1.25cm)',
          overflowWrap: 'anywhere',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        <div
          style={
            {
              '--theme-primary': '#ffffff',
              '--theme-heading-color': '#ffffff',
              '--theme-text-color': 'rgba(255, 255, 255, 0.92)',
              '--theme-accent': 'rgba(255, 255, 255, 0.9)',
            } as React.CSSProperties
          }
        >
          {showPhoto ? (
            <div style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}>
              <ProfilePhoto className="!border-2 !border-white/50" />
            </div>
          ) : (
            <div
              aria-hidden="true"
              data-testid="accent-sidebar-monogram"
              className="w-14 h-14 rounded-2xl border-2 border-white/40 bg-white/15 flex items-center justify-center text-xl font-bold tracking-wider text-white shadow-xs select-none"
              style={{
                fontFamily: 'var(--theme-heading-font)',
                marginBottom: 'var(--theme-section-spacing, 1.5rem)',
              }}
            >
              {initials}
            </div>
          )}

          {showContact && (
            <section
              style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
            >
              <SectionHeading title="Contact" accentBorder />
              <ContactRow
                variant="stacked-left"
                className="!text-white/90 space-y-1.5 [&_a]:break-all"
              />
            </section>
          )}

          <SectionRenderer
            filter={(_sec, kind) => SIDEBAR_KINDS.has(kind)}
            tone="modern"
            accentHeadingBorder
            narrow
          />
        </div>
      </aside>

      <main
        className="relative z-10 min-w-0 bg-white print:bg-transparent print:[&_[data-section-id]]:pt-2"
        style={{ padding: 'var(--theme-page-margin, 1.25cm)' }}
      >
        {showHeader && (
          <header
            className="pb-4 border-b-2"
            style={{
              borderColor: 'var(--theme-accent, var(--theme-primary, #2563eb))',
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
                color: 'var(--theme-heading-color, #0f172a)',
              }}
              placeholder="Your Name"
            />
            <InlineEdit
              value={basics.label || ''}
              onChange={readOnly ? undefined : (v) => updateBasics('label', v)}
              readOnly={readOnly}
              textClassName="text-base font-medium mt-1 block"
              style={{
                color: 'var(--theme-accent, var(--theme-primary, #2563eb))',
              }}
              placeholder="Professional Title"
            />
          </header>
        )}

        {showSummary && (
          <section
            style={{ marginBottom: 'var(--theme-section-spacing, 1.5rem)' }}
          >
            <SectionHeading title="Summary" accentBorder />
            <Description
              value={summaryValue}
              onChange={readOnly ? undefined : (v) => updateBasics('summary', v)}
              readOnly={readOnly}
              placeholder="Summarize your impact, expertise, and career focus..."
              textClassName="text-[0.96em] whitespace-pre-wrap break-words block"
            />
          </section>
        )}

        <SectionRenderer
          filter={(_sec, kind) => !SIDEBAR_KINDS.has(kind)}
          tone="modern"
          accentHeadingBorder
        />
      </main>
    </div>
  );
};

export const AccentSidebarTemplate: React.FC<TemplateProps> = ({
  resume,
  onChange,
  readOnly = false,
}) => (
  <TemplateProvider
    resume={resume}
    onChange={onChange}
    readOnly={readOnly}
    defaultHeadingStyle="underline"
    defaultSkillStyle="chips"
  >
    <AccentSidebarContent />
  </TemplateProvider>
);
