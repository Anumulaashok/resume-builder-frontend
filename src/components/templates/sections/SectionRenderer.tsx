import React from 'react';
import { CanonicalSectionKind, resolveSectionKind, safeString } from '../templateHelpers';
import { AchievementSection } from './AchievementSection';
import { AwardSection } from './AwardSection';
import { CertificateSection } from './CertificateSection';
import { CourseSection } from './CourseSection';
import { CustomSection } from './CustomSection';
import { EducationSection } from './EducationSection';
import { InterestSection } from './InterestSection';
import { LanguageSection } from './LanguageSection';
import { OrganizationSection } from './OrganizationSection';
import { ProjectSection } from './ProjectSection';
import { PublicationSection } from './PublicationSection';
import { ReferenceSection } from './ReferenceSection';
import { SkillSection } from './SkillSection';
import { SoftSkillSection } from './SoftSkillSection';
import { TechnicalSkillSection } from './TechnicalSkillSection';
import { SectionComponentProps } from './types';
import { WorkSection } from './WorkSection';

export const SECTION_COMPONENT_REGISTRY: Record<
  CanonicalSectionKind,
  React.FC<SectionComponentProps>
> = {
  work: WorkSection,
  education: EducationSection,
  skills: SkillSection,
  technical_skills: TechnicalSkillSection,
  soft_skills: SoftSkillSection,
  languages: LanguageSection,
  certificates: CertificateSection,
  interests: InterestSection,
  projects: ProjectSection,
  courses: CourseSection,
  awards: AwardSection,
  organizations: OrganizationSection,
  publications: PublicationSection,
  references: ReferenceSection,
  achievements: AchievementSection,
  custom: CustomSection,
};

export const SectionRenderer: React.FC<SectionComponentProps> = ({
  section,
  variant,
  readOnly = false,
  onUpdateItem,
}) => {
  if (!section) return null;

  if (!Array.isArray(section.content)) {
    const fallbackText = safeString(section.content);
    if (!fallbackText) return null;
    return (
      <div className="text-[13px] leading-relaxed text-slate-700 whitespace-pre-wrap break-words">
        {fallbackText}
      </div>
    );
  }

  const kind = resolveSectionKind(section);
  const SectionComponent = SECTION_COMPONENT_REGISTRY[kind] || CustomSection;

  return (
    <SectionComponent
      section={section}
      variant={variant}
      readOnly={readOnly}
      onUpdateItem={onUpdateItem}
    />
  );
};
