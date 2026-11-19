export interface JobMatchKeyword {
  keyword: string;
  occurrences: number;
}

export interface JobMatchResult {
  score: number;
  label: 'Excellent match' | 'Good match' | 'Fair match' | 'Low match';
  breakdown: { skills: number; experience: number; title: number };
  matchedKeywords: JobMatchKeyword[];
  missingKeywords: JobMatchKeyword[];
  suggestions: string[];
  totals: { matched: number; required: number };
}
