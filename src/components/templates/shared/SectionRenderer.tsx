import React from 'react';
import { IResume, ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  CanonicalSectionKind,
  extractHighlights,
  extractKeywords,
  getOrderedSections,
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
          readOnly={isReadOnly}
        />
      );
    }

    if (!Array.isArray(section.content)) {
      return (
        <div className="text-[0.96em] leading-relaxed text-slate-700">
          {section.content as any}
        </div>
      );
    }

    const enabledItems = section.content.filter(
      (item: any) => item && item.enabled !== false
    );
    if (!enabledItems.length) return null;

    if (kind === 'languages') {
      return (
        <div
          data-section-kind="languages"
          className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5"
        >
          {enabledItems.map((item: any, idx: number) => {
            const langKey = item.name !== undefined ? 'name' : 'language';
            const langVal = item.name || item.language || '';
            const levelKey = item.level !== undefined ? 'level' : 'fluency';
            const levelVal =
              typeof item.level === 'string'
                ? item.level
                : typeof item.fluency === 'string'
                ? item.fluency
                : '';

            return (
              <div
                key={item.id || idx}
                className="break-inside-avoid flex items-baseline justify-between gap-2 text-[0.96em]"
              >
                <InlineEdit
                  value={langVal}
                  onChange={
                    isReadOnly
                      ? undefined
                      : (v) => ctx.updateSectionItem(section.id, item.id, langKey, v)
                  }
                  readOnly={isReadOnly}
                  placeholder="Language"
                  textClassName="font-semibold"
                  style={{ color: 'var(--theme-heading-color, #111827)' }}
                />
                {(levelVal || !isReadOnly) && (
                  <InlineEdit
                    value={levelVal}
                    onChange={
                      isReadOnly
                        ? undefined
                        : (v) => ctx.updateSectionItem(section.id, item.id, levelKey, v)
                    }
                    readOnly={isReadOnly}
                    placeholder="Proficiency"
                    textClassName="text-xs text-slate-500"
                  />
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
          <div data-section-kind="interests" className="flex flex-wrap gap-1.5">
            {enabledItems.map((item: any, idx: number) => {
              const nameVal = item.name || item.title || '';
              if (isReadOnly) {
                if (!nameVal) return null;
                return (
                  <span
                    key={item.id || `${nameVal}-${idx}`}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90 print:bg-slate-50"
                  >
                    {nameVal}
                  </span>
                );
              }
              return (
                <div
                  key={item.id || idx}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/90"
                >
                  <InlineEdit
                    value={nameVal}
                    onChange={(v) =>
                      ctx.updateSectionItem(section.id, item.id, 'name', v)
                    }
                    readOnly={isReadOnly}
                    placeholder="Interest"
                    textClassName="text-xs font-medium"
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
      const itemUrl = item.url || item.website || item.link || item.liveUrl || '';
      const isLast = idx === enabledItems.length - 1;
      const itemStyle: React.CSSProperties | undefined = isLast
        ? undefined
        : { marginBottom: 'var(--theme-item-spacing, 0.875rem)' };

      if (kind === 'work') {
        const positionKey =
          item.position !== undefined
            ? 'position'
            : item.role !== undefined
            ? 'role'
            : 'position';
        const positionVal =
          item.position || item.role || item.jobTitle || item.title || '';
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
          <div
            key={item.id || idx}
            data-section-kind="work"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={positionVal}
              titlePlaceholder="Position"
              sectionId={section.id}
              itemId={item.id}
              titleField={positionKey}
              subtitle={companyVal}
              subtitlePlaceholder="Company"
              subtitleField={companyKey}
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
              field={descKey}
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

        const extraEducationMeta = (
          <>
            {institutionVal && fieldVal && (
              <span className="text-slate-400" aria-hidden="true">
                ·
              </span>
            )}
            {(fieldVal || (!institutionVal && !isReadOnly)) && (
              <InlineEdit
                value={fieldVal}
                onChange={
                  isReadOnly
                    ? undefined
                    : (v) => ctx.updateSectionItem(section.id, item.id, 'field', v)
                }
                readOnly={isReadOnly}
                placeholder="Institution / Field of Study"
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
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={degreeVal}
              titlePlaceholder="Degree"
              sectionId={section.id}
              itemId={item.id}
              titleField="degree"
              subtitle={institutionVal}
              subtitleField={institutionKey}
              extraSubtitle={
                institutionVal && !fieldVal && !gpaVal && isReadOnly
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
        const titleKey = item.name !== undefined ? 'name' : 'title';
        const titleVal = item.name || item.title || '';
        const roleVal = item.position || item.role || '';
        const companyVal = item.company || item.organization || item.entity || '';
        const descVal = item.description ?? item.summary ?? '';

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
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={titleVal}
              titlePlaceholder="Project Name"
              sectionId={section.id}
              itemId={item.id}
              titleField={titleKey}
              subtitle={roleVal}
              extraSubtitle={projectExtraMeta}
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
              placeholder="Project summary and outcomes..."
              showWhenEmptyInEdit
            />
            <Bullets items={highlights} />
            <KeywordList keywords={keywords} variant={effectiveKeywordVariant} />
          </div>
        );
      }

      if (kind === 'certificates') {
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="certificates"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Certificate Name"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              subtitle={item.issuer || ''}
              subtitlePlaceholder="Issuing Organization"
              subtitleField="issuer"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || ''}
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
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
        const issuerKey = item.issuer !== undefined ? 'issuer' : 'awarder';
        const issuerVal = item.issuer || item.awarder || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="awards"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Award Title"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              subtitle={issuerVal}
              subtitlePlaceholder="Awarded By"
              subtitleField={issuerKey}
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || ''}
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
        const nameKey =
          item.name !== undefined ? 'name' : item.course !== undefined ? 'course' : 'name';
        const nameVal = item.name || item.course || item.title || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="courses"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Course Name"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              subtitle={item.institution || ''}
              subtitlePlaceholder="Institution"
              subtitleField="institution"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || ''}
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
        const nameKey = item.name !== undefined ? 'name' : 'organization';
        const nameVal = item.name || item.organization || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="organizations"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Organization"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              subtitle={item.position || item.role || ''}
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
              value={item.description || ''}
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
        const titleKey = item.title !== undefined ? 'title' : 'name';
        const titleVal = item.title || item.name || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="publications"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={titleVal}
              titlePlaceholder="Publication Title"
              sectionId={section.id}
              itemId={item.id}
              titleField={titleKey}
              subtitle={item.publisher || ''}
              subtitlePlaceholder="Publisher"
              subtitleField="publisher"
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || item.summary || ''}
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
        const roleAndCompany = [item.position, item.company].filter(Boolean).join(', ');
        const contactVal = item.contact || item.email || item.phone || '';
        const descVal = item.description || item.reference || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="references"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={item.name || ''}
              titlePlaceholder="Reference Name"
              sectionId={section.id}
              itemId={item.id}
              titleField="name"
              subtitle={roleAndCompany}
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
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="achievements"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Achievement"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              url={itemUrl}
              urlPlacement="title"
              item={item}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || ''}
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
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="interests"
            className="break-inside-avoid"
            style={itemStyle}
          >
            <ItemHeader
              title={nameVal}
              titlePlaceholder="Interest"
              sectionId={section.id}
              itemId={item.id}
              titleField={nameKey}
              readOnly={isReadOnly}
              tone={tone}
            />
            <Description
              value={item.description || ''}
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
      const primaryKey =
        item.title !== undefined
          ? 'title'
          : item.name !== undefined
          ? 'name'
          : 'title';
      const primaryVal =
        item.title ||
        item.name ||
        item.organization ||
        item.institution ||
        item.company ||
        (isReadOnly ? '' : 'Untitled Item');
      const secondaryVal =
        item.subtitle ||
        item.position ||
        item.issuer ||
        item.publisher ||
        '';
      const descVal = item.description || item.summary || '';

      return (
        <div
          key={item.id || idx}
          data-section-kind="custom"
          className="break-inside-avoid"
          style={itemStyle}
        >
          <ItemHeader
            title={primaryVal}
            titlePlaceholder="Item Title"
            sectionId={section.id}
            itemId={item.id}
            titleField={primaryKey}
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
