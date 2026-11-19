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

export const ProfessionalTemplate: React.FC<TemplateProps> = ({
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

  const renderCommaKeywords = (keywords: string[]) => {
    if (!keywords.length) return null;
    return (
      <div className="mt-1 text-xs text-slate-600 leading-relaxed">
        {keywords.map((kw, idx) => (
          <React.Fragment key={`${kw}-${idx}`}>
            {idx > 0 && <span className="text-slate-400">, </span>}
            <span>{kw}</span>
          </React.Fragment>
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-slate-700">
          {enabledItems.map((item: any, idx: number) => {
            const label = item.name || item.title || '';
            if (readOnly || !onChange) {
              if (!label) return null;
              return (
                <React.Fragment key={item.id || `${label}-${idx}`}>
                  {idx > 0 && (
                    <span className="text-slate-400" aria-hidden="true">
                      •
                    </span>
                  )}
                  <span>{label}</span>
                </React.Fragment>
              );
            }
            return (
              <React.Fragment key={item.id || idx}>
                {idx > 0 && (
                  <span className="text-slate-400" aria-hidden="true">
                    •
                  </span>
                )}
                <InlineEdit
                  value={label}
                  onChange={(v) => updateSectionItem(section.id, item.id, 'name', v)}
                  readOnly={readOnly}
                  placeholder="Skill"
                  textClassName="text-[13px]"
                />
              </React.Fragment>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {enabledItems.map((item: any, idx: number) => {
          const groupName = item.name || item.category || item.title || '';
          const keywords = extractKeywords(item);
          const levelLabel =
            typeof item.level === 'string' && item.level.trim() ? item.level.trim() : '';

          return (
            <div
              key={item.id || `${groupName}-${idx}`}
              className="break-inside-avoid flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2 text-[13px] leading-relaxed"
            >
              <div className="flex items-baseline shrink-0">
                <InlineEdit
                  value={groupName}
                  onChange={
                    readOnly
                      ? undefined
                      : (v) => updateSectionItem(section.id, item.id, 'name', v)
                  }
                  readOnly={readOnly}
                  placeholder="Skill Group"
                  textClassName="text-[13px] font-bold"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #1e293b)',
                  }}
                />
                {keywords.length > 0 && groupName && (
                  <span className="font-bold text-slate-700 mr-1">:</span>
                )}
                {levelLabel && !keywords.length && (
                  <span className="text-xs italic text-slate-500 ml-1.5">
                    ({levelLabel})
                  </span>
                )}
              </div>
              {keywords.length > 0 && (
                <div className="text-[13px] text-slate-700 flex-1">
                  {keywords.map((kw, kwIdx) => (
                    <React.Fragment key={`${kw}-${kwIdx}`}>
                      {kwIdx > 0 && <span className="text-slate-400">, </span>}
                      <span>{kw}</span>
                    </React.Fragment>
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
        : { marginBottom: 'var(--theme-item-spacing, 1rem)' };

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
                textClassName="text-[15px] font-bold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #1e293b)',
                }}
              />
              {dateRange && (
                <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
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
                    textClassName="text-[13.5px] font-semibold text-slate-700"
                  />
                  {itemUrl && (
                    <a
                      href={normalizeHref(itemUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs ${linkClassName}`}
                      style={{ color: 'var(--theme-primary, #1e293b)' }}
                    >
                      {formatLinkLabel(itemUrl)}
                    </a>
                  )}
                </div>
                {location && (
                  <span className="text-xs italic text-slate-500">{location}</span>
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
            {renderCommaKeywords(keywords)}
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
                textClassName="text-[15px] font-bold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #1e293b)',
                }}
              />
              {dateRange && (
                <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
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
                      textClassName="text-[13.5px] font-semibold text-slate-700"
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
                      textClassName="text-[13px] text-slate-700 italic"
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
                      style={{ color: 'var(--theme-primary, #1e293b)' }}
                    >
                      {formatLinkLabel(itemUrl)}
                    </a>
                  )}
                </div>
                {location && (
                  <span className="text-xs italic text-slate-500">{location}</span>
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
                  textClassName="text-[15px] font-bold leading-snug"
                  style={{
                    fontFamily: 'var(--theme-heading-font)',
                    color: 'var(--theme-heading-color, #1e293b)',
                  }}
                />
                {itemUrl && (
                  <a
                    href={normalizeHref(itemUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs font-medium ${linkClassName}`}
                    style={{ color: 'var(--theme-primary, #1e293b)' }}
                  >
                    {formatLinkLabel(itemUrl)}
                  </a>
                )}
              </div>
              {dateRange && (
                <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
                  {dateRange}
                </span>
              )}
            </div>

            {(roleVal || companyVal || location) && (
              <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
                  {roleVal && (
                    <span className="font-semibold text-slate-700">{roleVal}</span>
                  )}
                  {roleVal && companyVal && (
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                  )}
                  {companyVal && (
                    <span className="italic text-slate-600">{companyVal}</span>
                  )}
                </div>
                {location && (
                  <span className="text-xs italic text-slate-500">{location}</span>
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
            {renderCommaKeywords(keywords)}
          </div>
        );
      }

      // Generic / Other section items
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
                textClassName="text-[14px] font-bold leading-snug"
                style={{
                  fontFamily: 'var(--theme-heading-font)',
                  color: 'var(--theme-heading-color, #1e293b)',
                }}
              />
              {itemUrl && (
                <a
                  href={normalizeHref(itemUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs ${linkClassName}`}
                  style={{ color: 'var(--theme-primary, #1e293b)' }}
                >
                  {formatLinkLabel(itemUrl)}
                </a>
              )}
            </div>
            {dateRange && (
              <span className="text-xs font-semibold text-slate-500 tabular-nums shrink-0">
                {dateRange}
              </span>
            )}
          </div>

          {(secondaryVal || location) && (
            <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 mt-0.5">
              {secondaryVal ? (
                <span className="text-[13px] italic text-slate-600">
                  {secondaryVal}
                </span>
              ) : (
                <span />
              )}
              {location && (
                <span className="text-xs italic text-slate-500">{location}</span>
              )}
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
          {renderCommaKeywords(keywords)}
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
            {renderSectionContent(section)}
          </section>
        );
      })}
    </div>
  );
};
