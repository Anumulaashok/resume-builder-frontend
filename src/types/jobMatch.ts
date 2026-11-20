export interface JobMatchKeyword {
  keyword: string;
  occurrences: number;
}

export interface RelatedExperienceItem {
  keyword: string;
  occurrences: number;
  relatedSkills: string[];
  guidance: string;
}

export interface JobMatchResult {
  score: number;
  label: 'Excellent match' | 'Good match' | 'Fair match' | 'Low match';
  breakdown: { skills: number; experience: number; title: number };
  matchedKeywords: JobMatchKeyword[];
  missingKeywords: JobMatchKeyword[];
  relatedExperience?: RelatedExperienceItem[];
  suggestions: string[];
  totals: { matched: number; required: number };
}

export interface ActiveJobContext {
  applicationId?: string;
  resumeId?: string;
  baseResumeId?: string;
  company?: string;
  jobTitle?: string;
  jobDescription?: string;
  atsScore?: number | null;
  matchResult?: JobMatchResult | null;
}
