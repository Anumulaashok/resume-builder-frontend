import { SectionType } from "../../types/resume";
import EducationForm from "../Education-form";
import AchievementsForm from "./AchievementsForm";
import AwardsForm from "./AwardsForm";
import CertificatesForm from "./CertificatesForm";
import CoursesForm from "./CoursesForm";
import CustomSectionForm from "./CustomSectionForm";
import InterestsForm from "./InterestsForm";
import LanguagesForm from "./LanguagesForm";
import OrganizationsForm from "./OrganizationsForm";
import ProjectsForm from "./ProjectsForm";
import PublicationsForm from "./PublicationsForm";
import ReferencesForm from "./ReferencesForm";
import SkillsForm from "./SkillsForm";
import SoftSkillsForm from "./SoftSkillsForm";
import TechnicalSkillsForm from "./TechnicalSkillsForm";
import WorkForm from "./WorkForm";
import { SectionFormRegistryEntry } from "./types";

export const SECTION_FORM_REGISTRY: Record<
  SectionType,
  SectionFormRegistryEntry
> = {
  [SectionType.WORK]: {
    title: "Professional Experience",
    component: WorkForm,
  },
  [SectionType.EDUCATION]: {
    title: "Education",
    component: EducationForm,
  },
  [SectionType.SKILLS]: {
    title: "Skills",
    component: SkillsForm,
  },
  [SectionType.LANGUAGES]: {
    title: "Languages",
    component: LanguagesForm,
  },
  [SectionType.CERTIFICATES]: {
    title: "Certificates",
    component: CertificatesForm,
  },
  [SectionType.INTERESTS]: {
    title: "Interests",
    component: InterestsForm,
  },
  [SectionType.PROJECTS]: {
    title: "Projects",
    component: ProjectsForm,
  },
  [SectionType.COURSES]: {
    title: "Courses",
    component: CoursesForm,
  },
  [SectionType.AWARDS]: {
    title: "Awards",
    component: AwardsForm,
  },
  [SectionType.ORGANIZATIONS]: {
    title: "Organizations",
    component: OrganizationsForm,
  },
  [SectionType.PUBLICATIONS]: {
    title: "Publications",
    component: PublicationsForm,
  },
  [SectionType.REFERENCES]: {
    title: "References",
    component: ReferencesForm,
  },
  [SectionType.SOFTSKILSS]: {
    title: "Soft Skills",
    component: SoftSkillsForm,
  },
  [SectionType.ACHIVEMENTS]: {
    title: "Achievements",
    component: AchievementsForm,
  },
  [SectionType.TECK_SKILLS]: {
    title: "Technical Skills",
    component: TechnicalSkillsForm,
  },
  [SectionType.CUSTOM]: {
    title: "Custom Item",
    component: CustomSectionForm,
  },
};

export function getSectionFormEntry(
  type: SectionType
): SectionFormRegistryEntry | undefined {
  return SECTION_FORM_REGISTRY[type];
}
