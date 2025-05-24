export interface IResume {
  _id?: string;
  title?: string;
  content: {
    basics: {
      name?: string;
      label?: string;
      email?: string;
      phone?: string;
      summary?: string;
      location: {
        address?: string;
        city?: string;
        countryCode?: string;
        postalCode?: string;
      };
    };
    sections: ISection[];
    sectionOrder: string[];
  };
}


// Section type interfaces
export interface BaseSection {
  id: string;
  enabled?: boolean;
}

export interface dateFields {
  month: string;
  year: string;
}

export interface WorkItem extends BaseSection {
  name: string;
  position: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
}

export interface EducationItem extends BaseSection {
  degree: string;
  field: string;
  startDate?: dateFields;
  endDate?: dateFields;
  current?: boolean;
  location?: string;
  description?: string;
}

export interface SkillItem extends BaseSection {
  name: string;
  level?: number;
  subSkills?: string[];
}

export interface LanguageItem extends BaseSection {
  name: string;
  level?: string;
  proficiency?: number;
}

export interface CertificateItem extends BaseSection {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
}

export interface InterestItem extends BaseSection {
  name: string;
  description?: string;
}

export interface ProjectItem extends BaseSection {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  technologies?: string[];
}

export interface CourseItem extends BaseSection {
  name: string;
  institution?: string;
  date?: string;
  description?: string;
}

export interface AwardItem extends BaseSection {
  name: string;
  issuer?: string;
  date?: string;
  description?: string;
}

export interface OrganizationItem extends BaseSection {
  name: string;
  position?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
}

export interface PublicationItem extends BaseSection {
  title: string;
  publisher?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface ReferenceItem extends BaseSection {
  name: string;
  company?: string;
  position?: string;
  contact?: string;
  description?: string;
}

export interface SoftSkillItem extends BaseSection {
  name: string;
  level?: number;
}

export interface AchievementItem extends BaseSection {
  name: string;
  date?: string;
  description?: string;
}

export interface TechnicalSkillItem extends BaseSection {
  name: string;
  level?: number;
  technologies?: string[];
}

export interface CustomItem extends BaseSection {
  [key: string]: any;
}

export enum SectionType {
  WORK = 'WorkItem',
  EDUCATION = 'EducationItem',
  SKILLS = 'SkillItem',
  LANGUAGES = 'LanguageItem',
  CERTIFICATES = 'CertificateItem',
  INTERESTS = 'InterestItem',
  PROJECTS = 'ProjectItem',
  COURSES = 'CourseItem',
  AWARDS = 'AwardItem',
  ORGANIZATIONS = 'OrganizationItem',
  PUBLICATIONS = 'PublicationItem',
  REFERENCES = 'ReferenceItem',
  SOFTSKILSS = 'SoftSkillItem',
  ACHIVEMENTS = 'AchievementItem',
  TECK_SKILLS = 'TechnicalSkillItem',
  CUSTOM = 'CustomItem',
}

export interface SectionOption {
  id: string;
  type: SectionType;
  title: string;
  description: string;
  icon?: React.ReactNode;
}


export interface ISection {
  id: string;
  type: SectionType;
  title: string;
  content: Array<
    | WorkItem
    | EducationItem
    | SkillItem
    | LanguageItem
    | CertificateItem
    | InterestItem
    | ProjectItem
    | CourseItem
    | AwardItem
    | OrganizationItem
    | PublicationItem
    | ReferenceItem
    | SoftSkillItem
    | AchievementItem
    | TechnicalSkillItem
    | CustomItem
  >;
  enabled?: boolean;
  isCustom?: boolean;
}
