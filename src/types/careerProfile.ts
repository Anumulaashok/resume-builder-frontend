export type SkillCategoryKey =
  | 'languages'
  | 'backend'
  | 'frontend'
  | 'databases'
  | 'cloud'
  | 'devops'
  | 'aiMl'
  | 'messaging'
  | 'tools'
  | 'other';

export const SKILL_CATEGORY_META: ReadonlyArray<{
  key: SkillCategoryKey;
  label: string;
  placeholder: string;
}> = [
  { key: 'languages', label: 'Languages', placeholder: 'e.g. TypeScript, Python, Go' },
  { key: 'backend', label: 'Backend', placeholder: 'e.g. Node.js, GraphQL, Spring Boot' },
  { key: 'frontend', label: 'Frontend', placeholder: 'e.g. React, Next.js, Tailwind CSS' },
  { key: 'databases', label: 'Databases', placeholder: 'e.g. PostgreSQL, Redis, MongoDB' },
  { key: 'cloud', label: 'Cloud', placeholder: 'e.g. AWS, GCP, Azure' },
  { key: 'devops', label: 'DevOps', placeholder: 'e.g. Docker, Kubernetes, GitHub Actions' },
  { key: 'aiMl', label: 'AI / ML', placeholder: 'e.g. PyTorch, LLMs, Spark' },
  { key: 'messaging', label: 'Messaging', placeholder: 'e.g. Kafka, RabbitMQ, SQS' },
  { key: 'tools', label: 'Tools & Testing', placeholder: 'e.g. Git, Playwright, Jest' },
  { key: 'other', label: 'Other', placeholder: 'e.g. System Design, Agile, Accessibility' },
];

export type AchievementCategory =
  | 'award'
  | 'publication'
  | 'open-source'
  | 'hackathon'
  | 'leadership'
  | 'other';

export interface ICareerLink {
  id: string;
  label: string;
  url: string;
}

export interface ICareerPersonalInfo {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  website: string;
  otherLinks: ICareerLink[];
}

export interface ICareerSummary {
  id: string;
  currentTitle: string;
  yearsOfExperience: string;
  areasOfExpertise: string[];
  industryExperience: string[];
  text: string;
}

export interface ICareerExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  employmentType: string;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  metrics: string[];
}

export interface ICareerProject {
  id: string;
  name: string;
  description: string;
  problem: string;
  solution: string;
  technologies: string[];
  impact: string;
  metrics: string[];
  url: string;
  links: string[];
}

export interface ICareerSkillItem {
  id: string;
  name: string;
  level?: string;
}

export type ICareerGroupedSkills = Record<SkillCategoryKey, ICareerSkillItem[]>;

export interface ICareerEducation {
  id: string;
  degree: string;
  field: string;
  institution: string;
  startYear: string;
  endYear: string;
  gpa: string;
  location: string;
}

export interface ICareerCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

export interface ICareerAchievement {
  id: string;
  title: string;
  category: AchievementCategory;
  issuer: string;
  date: string;
  description: string;
}

export interface ICareerProfile {
  _id?: string;
  personalInfo: ICareerPersonalInfo;
  summary: ICareerSummary;
  experience: ICareerExperience[];
  projects: ICareerProject[];
  skills: ICareerGroupedSkills;
  education: ICareerEducation[];
  certifications: ICareerCertification[];
  achievements: ICareerAchievement[];
  completeness?: number;
  exists?: boolean;
  updatedAt?: string;
}

export interface ExtractedResumeStagingResponse {
  stagedProfile: ICareerProfile;
  metadata: {
    filename: string;
    format: 'pdf' | 'docx' | 'txt';
    sizeBytes: number;
    extractedCharacters: number;
    detectedCounts: {
      experience: number;
      projects: number;
      skills: number;
      education: number;
      certifications: number;
      achievements: number;
    };
  };
}

export type BulletRewriteAction = 'rewrite' | 'shorten' | 'improve' | 'ats';

export interface BulletRewriteRequest {
  bullet: string;
  action: BulletRewriteAction;
  sectionType?: string;
  itemId?: string;
  company?: string;
  role?: string;
  projectName?: string;
  technologies?: string[];
  metricCategory?: string;
  userMetric?: string;
  targetRole?: string;
  jobDescription?: string;
}

export interface BulletRewriteResponse {
  rewrittenBullet: string;
  originalBullet: string;
  action: BulletRewriteAction;
  needsMetrics: boolean;
  metricPrompts: string[];
  provenance: {
    source_fact_ids: string[];
    userEnteredMetric?: string;
    groundedInCareerProfile: boolean;
  };
}

export const createEmptyFrontendCareerProfile = (defaults?: {
  name?: string;
  email?: string;
}): ICareerProfile => ({
  personalInfo: {
    id: 'info_primary',
    fullName: defaults?.name || '',
    email: defaults?.email || '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    website: '',
    otherLinks: [],
  },
  summary: {
    id: 'sum_primary',
    currentTitle: '',
    yearsOfExperience: '',
    areasOfExpertise: [],
    industryExperience: [],
    text: '',
  },
  experience: [],
  projects: [],
  skills: {
    languages: [],
    backend: [],
    frontend: [],
    databases: [],
    cloud: [],
    devops: [],
    aiMl: [],
    messaging: [],
    tools: [],
    other: [],
  },
  education: [],
  certifications: [],
  achievements: [],
  completeness: 0,
  exists: false,
});
