export interface ThemeConfig {
  fontPairingId?: string;
  headingFont?: string;
  bodyFont?: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  headingColor?: string;
  fontScale?: number;
  lineHeight?: number;
  sectionSpacing?: 'compact' | 'normal' | 'spacious' | string;
  fontSize?: 'sm' | 'base' | 'lg' | string;
  pageMargins?: 'narrow' | 'normal' | 'wide';
  headingStyle?: 'underline' | 'bar' | 'caps' | 'pill' | 'side-label';
  skillStyle?: 'chips' | 'comma' | 'bars' | 'dots' | 'columns';
  sidebarWidth?: number | string;
  dateFormat?: 'MMM YYYY' | 'MM/YYYY' | 'YYYY';
}

export interface IPrivacySettings {
  hideEmail: boolean;
  hidePhone: boolean;
  hideAddress: boolean;
}

export interface ISharing {
  isPublic: boolean;
  shareToken?: string | null;
  privacy: IPrivacySettings;
  privacySettings?: IPrivacySettings;
}

export interface ResumeProfile {
  network?: string;
  username?: string;
  url?: string;
}

export interface IResume {
  _id?: string;
  id?: string;
  title?: string;
  summary?: string;
  templateId?: string;
  themeConfig?: ThemeConfig;
  sharing?: ISharing;
  content: {
    basics: {
      name?: string;
      label?: string;
      email?: string;
      phone?: string;
      url?: string;
      website?: string;
      image?: string;
      summary?: string;
      location?: {
        address?: string;
        city?: string;
        region?: string;
        countryCode?: string;
        postalCode?: string;
      };
      profiles?: ResumeProfile[];
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
  company?: string;
  position: string;
  url?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
  highlights?: string[];
}

export interface EducationItem extends BaseSection {
  institution?: string;
  degree: string;
  field: string;
  url?: string;
  startDate?: dateFields;
  endDate?: dateFields;
  current?: boolean;
  location?: string;
  score?: string;
  courses?: string[];
  description?: string;
  highlights?: string[];
}

export interface SkillItem extends BaseSection {
  name: string;
  level?: number | string;
  subSkills?: string[];
}

export interface LanguageItem extends BaseSection {
  name: string;
  language?: string;
  level?: string;
  fluency?: string;
  proficiency?: number;
}

export interface CertificateItem extends BaseSection {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface InterestItem extends BaseSection {
  name: string;
  description?: string;
  keywords?: string[];
}

export interface ProjectItem extends BaseSection {
  name: string;
  description?: string;
  highlights?: string[];
  startDate?: string;
  endDate?: string;
  current?: boolean;
  url?: string;
  technologies?: string[];
  position?: string;
  company?: string;
  type?: string;
}

export interface CourseItem extends BaseSection {
  name: string;
  course?: string;
  institution?: string;
  date?: string;
  description?: string;
}

export interface AwardItem extends BaseSection {
  name: string;
  title?: string;
  issuer?: string;
  awarder?: string;
  date?: string;
  description?: string;
}

export interface OrganizationItem extends BaseSection {
  name: string;
  organization?: string;
  position?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  description?: string;
  highlights?: string[];
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
  reference?: string;
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
