export interface JobMatchKeyword {
  keyword: string;
  occurrences: number;
}

export interface VerifiedProfileSkill extends JobMatchKeyword {
  source_fact_ids: string[];
}

export interface TransferableProfileSkill {
  keyword: string;
  occurrences: number;
  domain: string;
  relatedProfileSkills: string[];
  source_fact_ids: string[];
  guidance: string;
}

export interface UnconfirmedJobSkill extends JobMatchKeyword {
  hasTransferableContext?: boolean;
  relatedProfileSkills?: string[];
}

export interface JobMatchResult {
  score: number;
  label: 'Excellent match' | 'Good match' | 'Fair match' | 'Low match';
  breakdown: { skills: number; experience: number; title: number };
  matchedKeywords: JobMatchKeyword[];
  missingKeywords: JobMatchKeyword[];
  suggestions: string[];
  totals: { matched: number; required: number };
  hasCareerProfile?: boolean;
  profileVerifiedSkills?: VerifiedProfileSkill[];
  transferableSkills?: TransferableProfileSkill[];
  unconfirmedSkills?: UnconfirmedJobSkill[];
}
