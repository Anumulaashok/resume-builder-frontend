import { ResumeProfile } from './resume';

export interface CareerProfileLocation {
  address?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
  region?: string;
}

export interface CareerProfileBasics {
  name: string;
  label?: string;
  email?: string;
  phone?: string;
  url?: string;
  summary?: string;
  location?: CareerProfileLocation;
  profiles?: ResumeProfile[];
}

export interface CareerProfileExperience {
  id: string;
  company: string;
  name?: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  description?: string;
  highlights: string[];
  technologies: string[];
  metrics?: string[];
}

export interface CareerProfileProject {
  id: string;
  name: string;
  description?: string;
  highlights: string[];
  technologies: string[];
  metrics?: string[];
  url?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
}

export interface CareerProfileSkill {
  id: string;
  name: string;
  category?: string;
  level?: string;
  keywords: string[];
  subSkills?: Array<{ id: string; name: string }>;
}

export interface CareerProfileEducation {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: any;
  endDate?: any;
  current?: boolean;
  location?: string;
  score?: string;
  description?: string;
  highlights: string[];
}

export interface CareerProfileCertification {
  id: string;
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
  description?: string;
}

export interface ICareerProfile {
  _id?: string;
  userId?: string;
  basics: CareerProfileBasics;
  experiences: CareerProfileExperience[];
  projects: CareerProfileProject[];
  skills: CareerProfileSkill[];
  education: CareerProfileEducation[];
  certifications: CareerProfileCertification[];
  lastApprovedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileResumeSelection {
  title?: string;
  includeSummary?: boolean;
  includeExperience?: boolean;
  selectedExperienceIds?: string[];
  includeProjects?: boolean;
  selectedProjectIds?: string[];
  includeSkills?: boolean;
  selectedSkillIds?: string[];
  includeEducation?: boolean;
  selectedEducationIds?: string[];
  includeCertifications?: boolean;
  selectedCertificationIds?: string[];
}
