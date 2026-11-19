import React from 'react';
import { IResume, ISection } from '../../types/resume';
import { InlineEdit } from '../ui/InlineEdit';
import {
  extractExtraBasicsLinks,
  extractHighlights,
  extractKeywords,
  formatItemDateRange,
  formatItemLocation,
  formatLinkLabel,
  getOrderedSections,
  normalizeHref,
  resolveSectionKind,
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
  const basics = resume.content?.basics || {};

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

  const updateSectionItem = (
    sectionId: string,
    itemId: string,
    field: string,
    value: string
  ) => {
    if (!onChange || readOnly) return;
    onChange({
      ...resume,
      content: {
        ...resume.content,
        sections: resume.content.sections.map((sec) =>
          sec.id === sectionId
            ? {
                ...sec,
                content: Array.isArray(sec.content)
                  ? sec.content.map((item) =>
                      item.id === itemId ? { ...item, [field]: value } : item
                    )
                  : sec.content,
              }
            : sec
        ),
      },
    });
  };

  const renderHighlights = (highlights: string[]) => {
    if (!highlights.length) return null;
    return (
      <ul className="mt-1.5 list-disc pl-4 space-y-0.5 text-[13px] leading-relaxed text-slate-600">
        {highlights.map((bullet, idx) => (
          <li key={idx}>{bullet}</li>
        ))}
      </ul>
    );
  };

  const renderKeywordChips = (keywords: string[]) => {
    if (!keywords.length) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {keywords.map((kw, idx) => (
          <span
            key={`${kw}-${idx}`}
            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
          >
            {kw}
          </span>
        ))}
      </div>
    );
  };

  const renderSkillsSection = (section: ISection) => {
    const enabledItems = (Array.isArray(section.content) ? section.content : []).filter(
      (item: any) => item && item.enabled !== false
    );
    if (!enabledItems.length) return null;

    const hasGroupedKeywords = enabledItems.some(
      (item: any) => extractKeywords(item).length > 0
    );

    if (!hasGroupedKeywords) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {enabledItems.map((item: any) => {
            const label = item.name || item.title || '';
            if (readOnly || !onChange) {
              if (!label) return null;
              return (
                <span
                  key={item.id || label}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
                >
                  {label}
                </span>
              );
            }
            return (
              <div
                key={item.id}
                className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90"
              >
                <InlineEdit
                  value={label}
                  onChange={(v) => updateSectionItem(section.id, item.id, 'name', v)}
                  readOnly={readOnly}
                  placeholder="Skill"
                  textClassName="text-xs font-medium"
                />
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2.5">
        {enabledItems.map((item: any, idx: number) => {
          const groupName = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          const levelLabel =
            typeof item.level === 'string' && item.level.trim() ? item.level.trim() : '';

          return (
            <div
              key={item.id || `${groupName}-${idx}`}
              className="break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3"
            >
              <div className="sm:w-40 shrink-0 flex items-baseline gap-1.5">
                <InlineEdit
                  value={groupName}
                  onChange={
                    readOnly
                      ? undefined
                      : (v) => updateSectionItem(section.id, item.id, 'name', v)
                  }
                  readOnly={readOnly}
                  placeholder="Skill Group"
                  textClassName="text-[13px] font-semibold"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #111827)',
                  }}
                />
                {levelLabel && !keywords.length && (
                  <span className="text-xs text-slate-500">({levelLabel})</span>
                )}
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {keywords.map((kw, kwIdx) => (
                    <span
                      key={`${kw}-${kwIdx}`}
                      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50 print:border-slate-300"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSectionContent = (section: ISection) => {
    const kind = resolveSectionKind(section);

    if (kind === 'skills') {
      return renderSkillsSection(section);
    }

    if (!Array.isArray(section.content)) {
      return (
        <div className="text-[13px] leading-relaxed text-slate-700">
          {section.content as any}
        </div>
      );
    }

    const enabledItems = section.content.filter(
      (item: any) => item && item.enabled !== false
    );

    return enabledItems.map((item: any, idx: number) => {
      const dateRange = formatItemDateRange(item);
      const location = formatItemLocation(item.location);
      const highlights = extractHighlights(item);
      const keywords = extractKeywords(item);
      const itemUrl = item.url || item.website || item.link || item.liveUrl || '';
      const isLast = idx === enabledItems.length - 1;
      const itemStyle: React.CSSProperties = isLast
        ? undefined!
        : { marginBottom: 'var(--theme-item-spacing, 0.875rem)' };

      if (kind === 'work') {
        const positionKey =
          item.position !== undefined
            ? 'position'
            : item.role !== undefined
            ? 'role'
            : 'position';
        const positionVal = item.position || item.role || item.jobTitle || item.title || '';
        const companyKey = item.company !== undefined ? 'company' : 'name';
        const companyVal =
          item.company || item.name || item.organization || item.employer || '';
        const descKey =
          item.description !== undefined
            ? 'description'
            : item.summary !== undefined
            ? 'summary'
            : 'description';
        const descVal = item.description ?? item.summary ?? '';

        return (
          <div key={item.id || idx} className="break-inside-avoid" style={itemStyle}>
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <InlineEdit
                value={positionVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, positionKey, v)
                }
                readOnly={readOnly}
                placeholder="Position"
                textClassName="text-[15px] font-semibold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #111827)',
                }}
              />
              {dateRange && (
                <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                  {dateRange}
                </span>
              )}
            </div>

            {(companyVal || location || itemUrl || !readOnly) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <InlineEdit
                    value={companyVal}
                    onChange={
                      readOnly
                        ? undefined
                        : (v) => updateSectionItem(section.id, item.id, companyKey, v)
                    }
                    readOnly={readOnly}
                    placeholder="Company"
                    textClassName="text-[13.5px] font-medium"
                    style={{ color: 'var(--theme-primary, #334155)' }}
                  />
                  {itemUrl && (
                    <a
                      href={normalizeHref(itemUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs ${linkClassName}`}
                      style={{ color: 'var(--theme-primary, #2563eb)' }}
                    >
                      {formatLinkLabel(itemUrl)}
                    </a>
                  )}
                </div>
                {location && (
                  <span className="text-xs text-slate-500">{location}</span>
                )}
              </div>
            )}

            {(descVal || !readOnly) && (
              <InlineEdit
                value={descVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, descKey, v)
                }
                readOnly={readOnly}
                multiline
                placeholder="Describe key responsibilities and achievements..."
                textClassName="text-[13px] leading-relaxed text-slate-600 mt-1.5 block whitespace-pre-wrap break-words"
              />
            )}
            {renderHighlights(highlights)}
            {renderKeywordChips(keywords)}
          </div>
        );
      }

      if (kind === 'education') {
        const degreeVal =
          item.degree ||
          [item.studyType, item.area].filter(Boolean).join(' in ') ||
          '';
        const institutionKey =
          item.institution !== undefined
            ? 'institution'
            : item.school !== undefined
            ? 'school'
            : item.name !== undefined
            ? 'name'
            : null;
        const institutionVal = item.institution || item.school || item.name || '';
        const fieldVal =
          item.field || (item.degree && item.area ? item.area : '') || '';
        const gpaVal = item.gpa || item.score || '';
        const descVal = item.description ?? item.summary ?? '';

        return (
          <div key={item.id || idx} className="break-inside-avoid" style={itemStyle}>
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <InlineEdit
                value={degreeVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, 'degree', v)
                }
                readOnly={readOnly}
                placeholder="Degree"
                textClassName="text-[15px] font-semibold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #111827)',
                }}
              />
              {dateRange && (
                <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                  {dateRange}
                </span>
              )}
            </div>

            {(institutionVal || fieldVal || location || gpaVal || itemUrl || !readOnly) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13.5px]">
                  {institutionVal && (
                    <InlineEdit
                      value={institutionVal}
                      onChange={
                        readOnly || !institutionKey
                          ? undefined
                          : (v) =>
                              updateSectionItem(section.id, item.id, institutionKey, v)
                      }
                      readOnly={readOnly || !institutionKey}
                      textClassName="text-[13.5px] font-medium"
                      style={{ color: 'var(--theme-primary, #334155)' }}
                    />
                  )}
                  {institutionVal && fieldVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {(fieldVal || (!institutionVal && !readOnly)) && (
                    <InlineEdit
                      value={fieldVal}
                      onChange={
                        readOnly
                          ? undefined
                          : (v) => updateSectionItem(section.id, item.id, 'field', v)
                      }
                      readOnly={readOnly}
                      placeholder="Institution / Field of Study"
                      textClassName={
                        institutionVal
                          ? 'text-[13px] text-slate-600'
                          : 'text-[13.5px] font-medium text-slate-700'
                      }
                    />
                  )}
                  {gpaVal && (
                    <span className="text-xs text-slate-500">· GPA: {gpaVal}</span>
                  )}
                  {itemUrl && (
                    <a
                      href={normalizeHref(itemUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs ${linkClassName}`}
                      style={{ color: 'var(--theme-primary, #2563eb)' }}
                    >
                      {formatLinkLabel(itemUrl)}
                    </a>
                  )}
                </div>
                {location && (
                  <span className="text-xs text-slate-500">{location}</span>
                )}
              </div>
            )}

            {(descVal || !readOnly) && (
              <InlineEdit
                value={descVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, 'description', v)
                }
                readOnly={readOnly}
                multiline
                placeholder="Honors, coursework, or thesis..."
                textClassName="text-[13px] leading-relaxed text-slate-600 mt-1.5 block whitespace-pre-wrap break-words"
              />
            )}
            {renderHighlights(highlights)}
          </div>
        );
      }

      if (kind === 'projects') {
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = item.name || item.title || '';
        const roleVal = item.position || item.role || '';
        const companyVal = item.company || item.organization || item.entity || '';
        const descVal = item.description ?? item.summary ?? '';

        return (
          <div key={item.id || idx} className="break-inside-avoid" style={itemStyle}>
            <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <InlineEdit
                  value={titleVal}
                  onChange={
                    readOnly
                      ? undefined
                      : (v) => updateSectionItem(section.id, item.id, titleKey, v)
                  }
                  readOnly={readOnly}
                  placeholder="Project Name"
                  textClassName="text-[15px] font-semibold leading-snug"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #111827)',
                  }}
                />
                {itemUrl && (
                  <a
                    href={normalizeHref(itemUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs font-medium ${linkClassName}`}
                    style={{ color: 'var(--theme-primary, #2563eb)' }}
                  >
                    {formatLinkLabel(itemUrl)}
                  </a>
                )}
              </div>
              {dateRange && (
                <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                  {dateRange}
                </span>
              )}
            </div>

            {(roleVal || companyVal || location) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
                  {roleVal && (
                    <span
                      className="font-medium"
                      style={{ color: 'var(--theme-primary, #334155)' }}
                    >
                      {roleVal}
                    </span>
                  )}
                  {roleVal && companyVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {companyVal && (
                    <span className="text-slate-600 font-medium">{companyVal}</span>
                  )}
                </div>
                {location && (
                  <span className="text-xs text-slate-500">{location}</span>
                )}
              </div>
            )}

            {(descVal || !readOnly) && (
              <InlineEdit
                value={descVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, 'description', v)
                }
                readOnly={readOnly}
                multiline
                placeholder="Project summary and outcomes..."
                textClassName="text-[13px] leading-relaxed text-slate-600 mt-1.5 block whitespace-pre-wrap break-words"
              />
            )}
            {renderHighlights(highlights)}
            {renderKeywordChips(keywords)}
          </div>
        );
      }

      // Generic / Other section items (Certificates, Awards, Courses, Organizations, Publications, Languages, Custom, etc.)
      const primaryKey =
        item.title !== undefined
          ? 'title'
          : item.name !== undefined
          ? 'name'
          : item.course !== undefined
          ? 'course'
          : item.language !== undefined
          ? 'language'
          : item.organization !== undefined
          ? 'organization'
          : item.institution !== undefined
          ? 'institution'
          : item.company !== undefined
          ? 'company'
          : item.degree !== undefined
          ? 'degree'
          : 'name';

      const primaryVal =
        item.title ||
        item.name ||
        item.course ||
        item.language ||
        item.organization ||
        item.institution ||
        item.company ||
        item.degree ||
        (readOnly ? '' : 'Untitled Item');

      const secondaryVal =
        item.position ||
        item.subtitle ||
        item.issuer ||
        item.awarder ||
        item.publisher ||
        (item.title && item.company ? item.company : '') ||
        (item.course && item.institution ? item.institution : '') ||
        item.fluency ||
        (typeof item.level === 'string' ? item.level : '');

      const descVal = item.description || item.summary || item.reference || '';

      return (
        <div key={item.id || idx} className="break-inside-avoid" style={itemStyle}>
          <div className="flex flex-wrap justify-between items-baseline gap-x-4 gap-y-0.5">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <InlineEdit
                value={primaryVal}
                onChange={
                  readOnly
                    ? undefined
                    : (v) => updateSectionItem(section.id, item.id, primaryKey, v)
                }
                readOnly={readOnly}
                textClassName="text-[14px] font-semibold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #111827)',
                }}
              />
              {itemUrl && (
                <a
                  href={normalizeHref(itemUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs ${linkClassName}`}
                  style={{ color: 'var(--theme-primary, #2563eb)' }}
                >
                  {formatLinkLabel(itemUrl)}
                </a>
              )}
            </div>
            {dateRange && (
              <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                {dateRange}
              </span>
            )}
          </div>

          {(secondaryVal || location) && (
            <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
              {secondaryVal ? (
                <span className="text-[13px] font-medium text-slate-600">
                  {secondaryVal}
                </span>
              ) : (
                <span />
              )}
              {location && <span className="text-xs text-slate-500">{location}</span>}
            </div>
          )}

          {descVal && (
            <InlineEdit
              value={descVal}
              onChange={
                readOnly
                  ? undefined
                  : (v) => updateSectionItem(section.id, item.id, 'description', v)
              }
              readOnly={readOnly}
              multiline
              textClassName="text-[13px] leading-relaxed text-slate-600 mt-1 block whitespace-pre-wrap break-words"
            />
          )}
          {renderHighlights(highlights)}
          {renderKeywordChips(keywords)}
        </div>
      );
    });
  };

  const isEmailHidden =
    readOnly &&
    Boolean(
      resume.sharing?.privacy?.hideEmail ||
        resume.sharing?.privacySettings?.hideEmail
    );
  const isPhoneHidden =
    readOnly &&
    Boolean(
      resume.sharing?.privacy?.hidePhone ||
        resume.sharing?.privacySettings?.hidePhone
    );
  const isAddressHidden =
    readOnly &&
    Boolean(
      resume.sharing?.privacy?.hideAddress ||
        resume.sharing?.privacySettings?.hideAddress
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

  const summaryValue = basics.summary ?? resume.summary ?? '';
  const showSummary = readOnly
    ? Boolean(summaryValue && summaryValue.trim())
    : basics.summary !== undefined || resume.summary !== undefined;

  const orderedSections = getOrderedSections(
    resume.content?.sections || [],
    resume.content?.sectionOrder || []
  );

  return (
    <div
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
            {renderSectionContent(section)}
          </section>
        );
      })}
    </div>
  );
};
