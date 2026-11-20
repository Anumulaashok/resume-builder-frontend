import React from 'react';
import { IResume, ISection } from '../../../types/resume';
import { InlineEdit } from '../../ui/InlineEdit';
import {
  buildSyncedFieldPatch,
  CanonicalSectionKind,
  extractCustomExtraFields,
  extractHighlights,
  extractKeywords,
  formatSkillLevel,
  getOrderedSections,
  parseSkillLevelInput,
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
        <div
          className="text-[0.96em] leading-relaxed"
          style={{ color: 'var(--theme-text-color, #374151)' }}
        >
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
          style={{ color: 'var(--theme-text-color, #374151)' }}
        >
          {enabledItems.map((item: any, idx: number) => {
            const langKey = item.name !== undefined ? 'name' : 'language';
            const langVal = item.name || item.language || '';
            const levelKey = item.level !== undefined ? 'level' : 'fluency';
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
                      : (v) => ctx.updateSectionItem(section.id, item.id, langKey, v)
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
                                  buildSyncedFieldPatch(
                                    item,
                                    levelKey,
                                    parseSkillLevelInput(v),
                                    ['level', 'fluency']
                                  )
                                )
                        }
                        readOnly={isReadOnly}
                        placeholder="Proficiency"
                        textClassName="text-xs opacity-75 [overflow-wrap:anywhere]"
                      />
                    )}
                    {showExtraProficiencyPct && (
                      <span className="text-xs opacity-65 tabular-nums">
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
              const nameVal = item.name || item.title || '';
              if (isReadOnly) {
                if (!nameVal) return null;
                return (
                  <span
                    key={item.id || `${nameVal}-${idx}`}
                    className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 border border-slate-200/90 print:bg-slate-50"
                    style={{
                      overflowWrap: 'anywhere',
                      color: 'var(--theme-text-color, #374151)',
                    }}
                  >
                    {nameVal}
                  </span>
                );
              }
              return (
                <div
                  key={item.id || idx}
                  className="inline-flex items-center max-w-full min-w-0 [overflow-wrap:anywhere] px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 border border-slate-200/90"
                  style={{
                    overflowWrap: 'anywhere',
                    color: 'var(--theme-text-color, #374151)',
                  }}
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
      const itemUrl = item.url || item.website || item.link || item.liveUrl || '';
      const isLast = idx === enabledItems.length - 1;
      const itemClassName = isLast
        ? 'break-inside-avoid'
        : 'break-inside-avoid mb-[var(--theme-item-spacing,0.875rem)]';
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
            className={itemClassName}
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
              <span className="opacity-50" aria-hidden="true">
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
                    ? 'text-[0.96em] italic opacity-90'
                    : institutionVal
                    ? 'text-[0.96em] opacity-85'
                    : 'text-[1em] font-medium'
                }
              />
            )}
            {gpaVal && <span className="text-xs opacity-75">· GPA: {gpaVal}</span>}
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
              <span className="opacity-50" aria-hidden="true">
                ·
              </span>
            )}
            <span
              className={
                tone === 'classic'
                  ? 'italic opacity-85'
                  : 'opacity-85 font-medium'
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
              titleField={titleKey}
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
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
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
            className={itemClassName}
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
            className={itemClassName}
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
            className={itemClassName}
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
            className={itemClassName}
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
        const descKey =
          item.reference !== undefined && item.description === undefined
            ? 'reference'
            : 'description';
        const descVal = item.description || item.reference || '';
        return (
          <div
            key={item.id || idx}
            data-section-kind="references"
            className={itemClassName}
            style={itemStyle}
          >
            <ItemHeader
              title={item.name || ''}
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
                      <span className="opacity-50" aria-hidden="true">
                        ·
                      </span>
                    )}
                    <span className="text-xs opacity-75">{contactVal}</span>
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
              field={descKey}
              readOnly={isReadOnly}
              showWhenEmptyInEdit={false}
            />
          </div>
        );
      }

      if (kind === 'achievements') {
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
        const issuerKey =
          item.organization !== undefined && item.issuer === undefined
            ? 'organization'
            : 'issuer';
        const issuerVal = item.issuer || item.organization || '';
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
              titleField={nameKey}
              subtitle={issuerVal}
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

      if (kind === 'interests') {
        const nameKey = item.name !== undefined ? 'name' : 'title';
        const nameVal = item.name || item.title || '';
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
          {extraCustomFields.length > 0 && (
            <div
              className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs opacity-85"
              style={{ color: 'var(--theme-text-color, #374151)' }}
            >
              {extraCustomFields.map((ef) => (
                <span key={ef.key}>
                  <span className="font-medium">{ef.label}:</span>{' '}
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
            style={{
              color: 'var(--theme-text-color, #374151)',
              ...(isLastSection
                ? {}
                : { marginBottom: 'var(--theme-section-spacing, 1.5rem)' }),
            }}
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
