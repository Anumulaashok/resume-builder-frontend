import { ThemeConfig } from './resume';

export interface ICoverLetterRecipient {
  name: string;
  company: string;
  address: string;
}

export interface ICoverLetter {
  _id?: string;
  id?: string;
  userId?: string;
  title: string;
  resumeId?: string | null;
  recipient: ICoverLetterRecipient;
  jobTitle: string;
  jobDescription?: string;
  date: string;
  greeting: string;
  body: string;
  closing: string;
  templateId?: string;
  themeConfig?: ThemeConfig;
  createdAt?: string;
  updatedAt?: string;
}

export const getTodayIsoDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createDefaultCoverLetter = (
  overrides: Partial<ICoverLetter> = {}
): ICoverLetter => ({
  title: 'Untitled Cover Letter',
  resumeId: null,
  jobTitle: '',
  jobDescription: '',
  date: getTodayIsoDate(),
  greeting: 'Dear Hiring Manager,',
  body: '',
  closing: 'Sincerely,',
  templateId: 'modern',
  ...overrides,
  recipient: {
    name: '',
    company: '',
    address: '',
    ...(overrides.recipient || {}),
  },
});
