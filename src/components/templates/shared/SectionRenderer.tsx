import React from 'react';
import { IResume, ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractCustomExtraFields,
  extractHighlights,
  extractKeywords,
  formatSkillLevel,
  getOrderedSections,
  parseSkillLevelInput,
  readCanonicalField,
  resolveSectionKind,
} from '../templateHelpers';
import { Bullets } from './Bullets';
import { Description } from './Description';
import { ItemHeader } from './ItemHeader';
import { SectionHeading } from './SectionHeading';
import { KeywordList, SkillList } from './SkillList';
import {
  HeadingStyleVariant,
  SkillStyleVariant,
  useTemplateContext,
} from './TemplateContext';

export interface SectionRendererProps {
  resume?: IResume;
  sections?: ISection[];
  sectionOrder?: string[];
  filter?: (section: ISection, kind: CanonicalSectionKind) => boolean;
  tone?: 'modern' | 'classic';
  headingVariant?: HeadingStyleVariant;
  accentHeadingBorder?: boolean;
  skillVariant?: SkillStyleVariant;
  keywordVariant?: 'chips' | 'comma';
  narrow?: boolean;
  readOnly?: boolean;
}

export const SectionRenderer: React.FC<SectionRendererProps> = ({
  resume: propResume,
  sections: propSections,
  sectionOrder: propSectionOrder,
  filter,
  tone = 'modern',
  headingVariant,
  accentHeadingBorder = false,
  skillVariant,
  keywordVariant,
  narrow,
  readOnly: propReadOnly,
}) => {
  const ctx = useTemplateContext();
  const resume = propResume || ctx.resume;
  const isReadOnly = propReadOnly ?? ctx.readOnly;

  const rawSections = propSections ?? resume?.content?.sections ?? [];
  const rawOrder = propSectionOrder ?? resume?.content?.sectionOrder ?? [];

  const ordered = getOrderedSections(rawSections, rawOrder).filter((sec) => {
    if (!filter) return true;
    return filter(sec, resolveSectionKind(sec));
  });

  if (!ordered.length) return null;

  const effectiveSkillVariant = skillVariant || ctx.skillStyle;
  const effectiveKeywordVariant: 'chips' | 'comma' =
    keywordVariant || (effectiveSkillVariant === 'comma' ? 'comma' : 'chips');

  const renderSectionBody = (section: ISection, kind: CanonicalSectionKind) => {
    if (kind === 'skills') {
      return (
        <SkillList
          section={section}
          variant={effectiveSkillVariant}
          narrow={narrow}
          readOnly={isReadOnly}
        />
      );
    }

    if (!Array.isArray(section.content)) {
      const rawContent: unknown = section.content;
      if (typeof rawContent !== 'string' || !rawContent.trim()) {
        return null;
      }
      return (
        <div className="text-[0.96em] leading-relaxed text-slate-700">
          {rawContent}
        </div>
      );
    }

    const enabledItems = section.content.filter(
      (item: any) => item && typeof item === 'object' && item.enabled !== false
    );
    if (!enabledItems.length) return null;

    if (kind === 'languages') {
      return (
        <div
          data-section-kind="languages"
          className={`grid min-w-0 ${
            narrow
              ? 'grid-cols-1 gap-y-1.5'
              : 'grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5'
          }`}
        >
          {enabledItems.map((item: any, idx: number) => {
            const langVal = readCanonicalField(item, 'name', 'language');
            const rawLevel = item.level !== undefined ? item.level : item.fluency;
            const levelVal = formatSkillLevel(rawLevel);
            const showExtraProficiencyPct =
              typeof rawLevel === 'string' &&
              rawLevel.trim().length > 0 &&
              typeof item.proficiency === 'number' &&
              Number.isFinite(item.proficiency) &&
              item.proficiency > 0;

            return (
              <div
                key={item.id || idx}
                className="break-inside-avoid flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 min-w-0 text-[0.96em] [overflow-wrap:anywhere]"
              >
                <InlineEdit
                  value={langVal}
                  onChange={
                    isReadOnly
                      ? undefined
                      : (v) => ctx.updateSectionItem(section.id, item.id, 'name', v)
                  }
                  readOnly={isReadOnly}
                  placeholder="Language"
                  textClassName="font-semibold [overflow-wrap:anywhere]"
                  style={{ color: 'var(--theme-heading-color, #111827)' }}
                />
                {(levelVal || !isReadOnly || showExtraProficiencyPct) && (
                  <div className="flex flex-wrap items-baseline gap-1 min-w-0 [overflow-wrap:anywhere]">
                    {(levelVal || !isReadOnly) && (
                      <InlineEdit
                        value={levelVal}
                        onChange={
                          isReadOnly
                            ? undefined
                            : (v) =>
                                ctx.updateSectionItemPatch(
                                  section.id,
                                  item.id,
                                  { level: parseSkillLevelInput(v) }
                                )
                        }
                        readOnly={isReadOnly}
                        placeholder="Proficiency"
                        textClassName="text-xs text-slate-500 [overflow-wrap:anywhere]"
                      />
                    )}
                    {showExtraProficiencyPct && (
                      <span className="text-xs text-slate-400 tabular-nums">
                        ({Math.round(item.proficiency)}%)
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    if (kind === 'interests') {
      const hasDetails = enabledItems.some(
        (item: any) =>
          (item.description && String(item.description).trim()) ||
          extractKeywords(item).length > 0
      );

      if (!hasDetails) {
        return (
          <div data-section-kind="interests" className="flex flex-wrap gap-1.5 min-w-0 max-w-full">
            {enabledItems.map((item: any, idx: number) => {
              const nameVal = readCanonicalField(item, 'name', 'title');
              if (isReadOnly) {
                if (!nameVal) return null;
                return (
                  <span
                    key={item.id || `${nameVal}-${idx}`}
                    className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50"
                    style={{ overflowWrap: 'anywhere' }}
                  >
                    {nameVal}
                  </span>
                );
              }
              return (
                <div
                  key={item.id || idx}
                  className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90"
                  style={{ overflowWrap: 'anywhere' }}
                >
                  <InlineEdit
                    value={nameVal}
                    onChange={(v) =>
                      ctx.updateSectionItem(section.id, item.id, 'name', v)
                    }
                    readOnly={isReadOnly}
                    placeholder="Interest"
                    className="min-w-0 max-w-full"
                    textClassName="text-xs font-medium [overflow-wrap:anywhere]"
                  />
                </div>
              );
            })}
          </div>
        );
      }
    }

    return enabledItems.map((item: any, idx: number) => {
      const highlights = extractHighlights(item);
      const keywords = extractKeywords(item);
      const itemUrl = readCanonicalField(
        item,
        'url',
        'website',
        'link',
        'liveUrl'
      );
      const isLast = idx === enabledItems.length - 1;
      const itemClassName = isLast
        ? 'break-inside-avoid'
        : 'break-inside-avoid mb-[var(--theme-item-spacing,0.875rem)]';
      const itemStyle: React.CSSProperties | undefined = isLast
        ? undefined
        : { marginBottom: 'var(--theme-item-spacing, 0.875rem)' };

      if (kind === 'work') {
        const positionVal = readCanonicalField(
          item,
          'position',
          'role',
          'jobTitle',
          'title'
        );
        const companyVal = readCanonicalField(
          item,
          'company',
          'name',
          'organization',
          'employer'
        );
        const descVal = readCanonicalField(item, 'description', 'summary');

        return (
          <div
            key={item.id || idx}
            data-section-kind="work"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={positionVal}
              titlePlaceholder="Position"
              sectionId={section.id}
              itemId={item.id}
              titleField="position"
              subtitle={companyVal}
              subtitlePlaceholder="Company"
              subtitleField="company"
              showSubtitleWhenEmptyInEdit
              url={itemUrl}
              urlPlacement="subtitle"
              item={item}
              location={item.location}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={descVal}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              placeholder="Describe key responsibilities and achievements..."
              showWhenEmptyInEdit
            />
            <Bullets items={highlights} />
            <KeywordList keywords={keywords} variant={effectiveKeywordVariant} />
          </div>
        );
      }

      if (kind === 'education') {
        const degreeVal =
          item.degree !== undefined
            ? String(item.degree)
            : [item.studyType, item.area].filter(Boolean).join(' in ') || '';
        const institutionVal = readCanonicalField(
          item,
          'institution',
          'school',
          'name'
        );
        const fieldVal =
          item.field !== undefined
            ? String(item.field)
            : item.degree && item.area
            ? String(item.area)
            : '';
        const gpaVal = readCanonicalField(item, 'gpa', 'score');
        const descVal = readCanonicalField(item, 'description', 'summary');
        const showInstitutionSlot = Boolean(institutionVal || !isReadOnly);
        const showFieldSlot = Boolean(fieldVal || !isReadOnly);

        const extraEducationMeta = (
          <>
            {showInstitutionSlot && showFieldSlot && (
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
            )}
            {showFieldSlot && (
              <InlineEdit
                value={fieldVal}
                onChange={
                  isReadOnly
                    ? undefined
                    : (v) => ctx.updateSectionItem(section.id, item.id, 'field', v)
                }
                readOnly={isReadOnly}
                placeholder="Field of Study"
                textClassName={
                  tone === 'classic'
                    ? 'text-[0.96em] text-slate-700 italic'
                    : institutionVal
                    ? 'text-[0.96em] text-slate-600'
                    : 'text-[1em] font-medium text-slate-700'
                }
              />
            )}
            {gpaVal && <span className="text-xs text-slate-500">· GPA: {gpaVal}</span>}
          </>
        );

        return (
          <div
            key={item.id || idx}
            data-section-kind="education"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={degreeVal}
              titlePlaceholder="Degree"
              sectionId={section.id}
              itemId={item.id}
              titleField="degree"
              subtitle={institutionVal}
              subtitlePlaceholder="Institution"
              subtitleField="institution"
              showSubtitleWhenEmptyInEdit
              extraSubtitle={
                !fieldVal && !gpaVal && isReadOnly
                  ? undefined
                  : extraEducationMeta
              }
              url={itemUrl}
              urlPlacement="subtitle"
              item={item}
              location={item.location}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={descVal}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              placeholder="Honors, coursework, or thesis..."
              showWhenEmptyInEdit
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'projects') {
        const titleVal = readCanonicalField(item, 'name', 'title');
        const roleVal = readCanonicalField(item, 'position', 'role');
        const companyVal = readCanonicalField(
          item,
          'company',
          'organization',
          'entity'
        );
        const descVal = readCanonicalField(item, 'description', 'summary');

        const projectExtraMeta = companyVal ? (
          <>
            {roleVal && (
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
            )}
            <span
              className={
                tone === 'classic'
                  ? 'italic text-slate-600'
                  : 'text-slate-600 font-medium'
              }
            >
              {companyVal}
            </span>
          </>
        ) : undefined;

        return (
          <div
            key={item.id || idx}
            data-section-kind="projects"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={titleVal}
              titlePlaceholder="Project Name"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={roleVal}
              extraSubtitle={projectExtraMeta}
              url={itemUrl}
              urlPlaceholder="Add project link"
              urlPlacement="title"
              item={item}
              location={item.location}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={descVal}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              placeholder="Project summary and outcomes..."
              showWhenEmptyInEdit
            />
            <Bullets items={highlights} />
            <KeywordList keywords={keywords} variant={effectiveKeywordVariant} />
          </div>
        );
      }

      if (kind === 'certificates') {
        const nameVal = readCanonicalField(item, 'name', 'title');
        return (
          <div
            key={item.id || idx}
            data-section-kind="certificates"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Certificate Name"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={readCanonicalField(item, 'issuer')}
              subtitlePlaceholder="Issuing Organization"
              subtitleField="issuer"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'awards') {
        const nameVal = readCanonicalField(item, 'name', 'title');
        const issuerVal = readCanonicalField(item, 'issuer', 'awarder');
        return (
          <div
            key={item.id || idx}
            data-section-kind="awards"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Award Title"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={issuerVal}
              subtitlePlaceholder="Awarded By"
              subtitleField="issuer"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'courses') {
        const nameVal = readCanonicalField(item, 'name', 'course', 'title');
        return (
          <div
            key={item.id || idx}
            data-section-kind="courses"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Course Name"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={readCanonicalField(item, 'institution')}
              subtitlePlaceholder="Institution"
              subtitleField="institution"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'organizations') {
        const nameVal = readCanonicalField(item, 'name', 'organization');
        return (
          <div
            key={item.id || idx}
            data-section-kind="organizations"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Organization"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={readCanonicalField(item, 'position', 'role')}
              subtitlePlaceholder="Role"
              subtitleField="position"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              location={item.location}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'publications') {
        const titleVal = readCanonicalField(item, 'title', 'name');
        return (
          <div
            key={item.id || idx}
            data-section-kind="publications"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={titleVal}
              titlePlaceholder="Publication Title"
              sectionId={section.id}
              itemId={item.id}
              titleField="title"
              subtitle={readCanonicalField(item, 'publisher')}
              subtitlePlaceholder="Publisher"
              subtitleField="publisher"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'references') {
        const positionVal = readCanonicalField(item, 'position', 'role');
        const roleAndCompany = [positionVal, item.company].filter(Boolean).join(', ');
        const contactVal = readCanonicalField(item, 'contact', 'email', 'phone');
        const descVal = readCanonicalField(
          item,
          'description',
          'reference',
          'summary'
        );
        return (
          <div
            key={item.id || idx}
            data-section-kind="references"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={readCanonicalField(item, 'name')}
              titlePlaceholder="Reference Name"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={roleAndCompany}
              url={itemUrl}
              urlPlacement="title"
              item={item}
              extraSubtitle={
                contactVal ? (
                  <>
                    {roleAndCompany && (
                      <span className="text-slate-400" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <span className="text-xs text-slate-500">{contactVal}</span>
                  </>
                ) : undefined
              }
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={descVal}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
          </div>
        );
      }

      if (kind === 'achievements') {
        const nameVal = readCanonicalField(item, 'name', 'title');
        const issuerVal = readCanonicalField(
          item,
          'issuer',
          'organization',
          'awarder'
        );
        return (
          <div
            key={item.id || idx}
            data-section-kind="achievements"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Achievement"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={issuerVal}
              subtitleField="issuer"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <Bullets items={highlights} />
          </div>
        );
      }

      if (kind === 'interests') {
        const nameVal = readCanonicalField(item, 'name', 'title');
        return (
          <div
            key={item.id || idx}
            data-section-kind="interests"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Interest"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={readCanonicalField(item, 'description', 'summary')}
              sectionId={section.id}
              itemId={item.id}
              field="description"
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
            <KeywordList keywords={keywords} variant={effectiveKeywordVariant} />
          </div>
        );
      }

      // 'custom' section items
      const primaryVal = readCanonicalField(
        item,
        'title',
        'name',
        'organization',
        'institution',
        'company'
      );
      const secondaryVal = readCanonicalField(
        item,
        'subtitle',
        'position',
        'issuer',
        'publisher'
      );
      const descVal = readCanonicalField(item, 'description', 'summary');

      const extraCustomFields = extractCustomExtraFields(item);

      return (
        <div
          key={item.id || idx}
          data-section-kind="custom"
          className={itemClassName}
          style={itemStyle}
        >
          <ItemHeader
            title={primaryVal}
            titlePlaceholder="Item Title"
            sectionId={section.id}
            itemId={item.id}
            titleField="title"
            subtitle={secondaryVal}
            subtitleField="subtitle"
            url={itemUrl}
            urlPlacement="title"
            item={item}
            location={item.location}
            readOnly={isReadOnly}
            tone={tone}
          />
          <Description
            value={descVal}
            sectionId={section.id}
            itemId={item.id}
            field="description"
            readOnly={isReadOnly}
            showWhenEmptyInEdit={false}
          />
          <Bullets items={highlights} />
          <KeywordList keywords={keywords} variant={effectiveKeywordVariant} />
          {extraCustomFields.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600">
              {extraCustomFields.map((ef) => (
                <span key={ef.key}>
                  <span className="font-medium text-slate-700">{ef.label}:</span>{' '}
                  <span>{ef.value}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {ordered.map((section, idx) => {
        const isLastSection = idx === ordered.length - 1;
        const kind = resolveSectionKind(section);
        return (
          <section
            key={section.id}
            data-section-id={section.id}
            style={
              isLastSection
                ? undefined
                : { marginBottom: 'var(--theme-section-spacing, 1.5rem)' }
            }
          >
            <SectionHeading
              title={section.title}
              variant={headingVariant}
              accentBorder={accentHeadingBorder}
            />
            {renderSectionBody(section, kind)}
          </section>
        );
      })}
    </>
  );
};
