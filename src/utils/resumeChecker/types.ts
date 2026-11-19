import type { ThemeConfig } from '../../types/resume';
import type { TemplateLayout } from '../../constants/templateMetadata';

export type IssueSeverity = 'critical' | 'warning' | 'tip';

export type ResumeGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type CategoryId =
  | 'contact'
  | 'summary'
  | 'experience'
  | 'skills'
  | 'language'
  | 'ats';

export interface ResumeCheckIssue {
  id: string;
  severity: IssueSeverity;
  message: string;
  sectionId?: string;
  itemId?: string;
  fix?: string;
}

export interface ResumeCheckCategory {
  id: CategoryId;
  label: string;
  weight: number;
  score: number;
  issues: ResumeCheckIssue[];
}

export interface ResumeCheckResult {
  score: number;
  grade: ResumeGrade;
  categories: ResumeCheckCategory[];
}

export interface ResumeCheckThemeInput extends Partial<ThemeConfig> {
  atsMode?: boolean;
  pageCount?: number;
  templateId?: string;
  templateLayout?: TemplateLayout;
  atsFriendly?: boolean;
  hasTables?: boolean;
  hasIcons?: boolean;
  now?: Date;
}
