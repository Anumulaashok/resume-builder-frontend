// Education section item
export interface EducationItem extends SectionItem {
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  gpa?: string;
}

// Work experience section item
export interface WorkExperienceItem extends SectionItem {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  achievements?: string[];
  isCurrent?: boolean;
}

// Skill section item
export interface SkillItem extends SectionItem {
  level?: number; // 1-5 or 1-10 scale
  subSkills?: string[];
  category?: string;
}

// Language section item
export interface LanguageItem extends SectionItem {
  language: string;
  proficiency?: "Elementary" | "Limited Working" | "Professional Working" | "Full Professional" | "Native / Bilingual";
  level?: number; // 1-5 scale
}

// Certificate section item
export interface CertificateItem extends SectionItem {
  name: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialID?: string;
  credentialURL?: string;
}

// Interest section item
export interface InterestItem extends SectionItem {
  description?: string;
}

// Project section item
export interface ProjectItem extends SectionItem {
  description?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  technologies?: string[];
  achievements?: string[];
}

// Course section item
export interface CourseItem extends SectionItem {
  institution?: string;
  date?: string;
  description?: string;
  certificateURL?: string;
}

// Award section item
export interface AwardItem extends SectionItem {
  date?: string;
  issuer?: string;
  description?: string;
}

// Organization section item
export interface OrganizationItem extends SectionItem {
  role?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

// Publication section item
export interface PublicationItem extends SectionItem {
  publisher?: string;
  date?: string;
  authors?: string[];
  url?: string;
  description?: string;
}

// Reference section item
export interface ReferenceItem extends SectionItem {
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  reference?: string;
}

// Achievement section item
export interface AchievementItem extends SectionItem {
  date?: string;
  description?: string;
}

export type SectionContentType = {
  work: WorkExperienceItem[];
  education: EducationItem[];
  skills: SkillItem[];
  languages: LanguageItem[];
  softSkills: SkillItem[];
  technicalSkills: SkillItem[];
  certificates: CertificateItem[];
  interests: InterestItem[];
  projects: ProjectItem[];
  courses: CourseItem[];
  awards: AwardItem[];
  organizations: OrganizationItem[];
  publications: PublicationItem[];
  references: ReferenceItem[];
  achievements: AchievementItem[];
  [key: string]: SectionItem[]; // For custom sections
}

export interface SectionItem {
  id: string;
  name?: string;
  enabled?: boolean; // Whether the skill is enabled/visible in the resume
  institution?: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  company?: string;
  position?: string;
  achievements?: string[];
  isCurrent?: boolean;
  level?: number;
  subSkills?: string[];
  language?: string;
  proficiency?: string;
  issuer?: string;
  issueDate?: string;
  expirationDate?: string;
  credentialID?: string;
  credentialURL?: string;
  url?: string;
  technologies?: string[];
  certificateURL?: string;
  title?: string;
  date?: string;
  role?: string;
  publisher?: string;
  authors?: string[];
  phone?: string;
  email?: string;
  reference?: string;
}

export interface ResumeSection {
  id: string;
  type: string;
  title: string;
  content: SectionItem[];
  enabled?: boolean;
  isCustom?: boolean;
}

export interface Resume {
  _id?: string;
  title: string;
  content: {
    basics: {
      name: string;
      label: string;
      email: string;
      phone: string;
      summary: string;
      location: {
        address: string;
        city: string;
        countryCode: string;
        postalCode: string;
      };
    };
    sections: ResumeSection[];
    sectionOrder: string[];
  };
}
