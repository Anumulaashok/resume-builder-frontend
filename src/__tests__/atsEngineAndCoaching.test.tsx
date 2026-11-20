import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  analyzeBulletDiagnostics,
  analyzeJobMatch,
  evaluateAts,
  FULL_SKILL_TAXONOMY,
  getTaxonomySkillCount,
  matchTaxonomySkills,
} from '../ats';
import ResumeEditor from '../components/ResumeEditor';
import ResumePreview, { A4_HEIGHT_PX } from '../components/ResumePreview';
import SectionEditors from '../components/sections';
import { IResume, SectionType } from '../types/resume';
import { resumeService } from '../services/resume.service';

jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../services/resume.service', () => ({
  resumeService: {
    createResume: jest.fn(),
    updateResume: jest.fn(),
    getResumes: jest.fn().mockResolvedValue([]),
    analyzeJobMatch: jest.fn(),
    exportResumeTxt: jest.fn(),
    getShareSettings: jest.fn(),
    getResumeHistory: jest.fn().mockResolvedValue([]),
  },
}));

const SHARED_ISOMORPHIC_FIXTURE = {
  prdReferenceSkillsText:
    'Engineered distributed workflows with Temporal, Node.js, NestJS, Java, and Python backed by PostgreSQL, MongoDB, ClickHouse, RabbitMQ, and Redis. Built AI Agents and RAG pipelines with LangChain, shipped React, Next.js, and Flutter apps, and deployed on GCP and GKE with Kubernetes.',
  expectedPrdSkills: [
    'Temporal',
    'Node.js',
    'NestJS',
    'Java',
    'Python',
    'PostgreSQL',
    'MongoDB',
    'ClickHouse',
    'RabbitMQ',
    'Redis',
    'LangChain',
    'AI Agents',
    'RAG',
    'React',
    'Next.js',
    'Flutter',
    'GCP',
    'GKE',
    'Kubernetes',
  ],
  tieredJd: `Senior Backend & Platform Engineer
Required Qualifications:
- Production experience with Node.js, PostgreSQL, and Docker
- Strong distributed systems design

Preferred Qualifications:
- Experience with ClickHouse and NestJS
- Familiarity with Temporal`,
};

describe('Frontend Isomorphic ATS Engine & Taxonomy Parity', () => {
  it('matches 300+ canonical skills including all 19 PRD Section 34 skills and runs in < 16ms', () => {
    expect(getTaxonomySkillCount()).toBeGreaterThanOrEqual(300);
    expect(new Set(FULL_SKILL_TAXONOMY.map((s) => s.canonical)).size).toBe(
      FULL_SKILL_TAXONOMY.length
    );

    const t0 = performance.now();
    const matches = matchTaxonomySkills(SHARED_ISOMORPHIC_FIXTURE.prdReferenceSkillsText);
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeLessThan(16);

    SHARED_ISOMORPHIC_FIXTURE.expectedPrdSkills.forEach((skill) => {
      expect(matches.has(skill)).toBe(true);
    });
  });

  it('counts Node.js once via longest-span matching, enforces case-aware Go/Express rules, and prevents substring false positives', () => {
    const nodeMatch = matchTaxonomySkills('Built APIs with Node.js');
    expect(nodeMatch.get('Node.js')?.occurrences).toBe(1);

    const goExpress = matchTaxonomySkills('Built Go microservices and Express REST APIs');
    expect(goExpress.has('Go')).toBe(true);
    expect(goExpress.has('Express')).toBe(true);

    const falsePositives = matchTaxonomySkills(
      'You will go the extra mile and express gratitude as a proactive JavaScript developer at Google.'
    );
    expect(falsePositives.has('JavaScript')).toBe(true);
    expect(falsePositives.has('Java')).toBe(false);
    expect(falsePositives.has('React')).toBe(false);
    expect(falsePositives.has('Go')).toBe(false);
    expect(falsePositives.has('Express')).toBe(false);
  });

  it('excludes enabled: false sections, items, and subSkills and handles zero-taxonomy postings with 0% on empty resumes', () => {
    const resumeData = {
      title: 'Platform Engineer',
      content: {
        basics: { name: 'Dana', email: 'dana@example.com', label: 'Platform Engineer' },
        sections: [
          {
            id: 'skills',
            type: 'SkillItem',
            title: 'Skills',
            enabled: true,
            content: [
              { name: 'Python', enabled: true },
              { name: 'Kubernetes', enabled: false },
              {
                name: 'Data',
                enabled: true,
                subSkills: [
                  { name: 'PostgreSQL', enabled: true },
                  { name: 'ClickHouse', enabled: false },
                ],
              },
            ],
          },
          {
            id: 'work-disabled',
            type: 'WorkItem',
            title: 'Work Experience',
            enabled: false,
            content: [{ company: 'Hidden', description: 'Built Temporal and Redis services.' }],
          },
        ],
      },
    };

    const res = analyzeJobMatch(
      resumeData,
      'Hiring Platform Engineer with Python, PostgreSQL, Kubernetes, ClickHouse, Temporal, and Redis.'
    );
    expect(res.matchedKeywords.map((k) => k.keyword)).toEqual(
      expect.arrayContaining(['Python', 'PostgreSQL'])
    );
    expect(res.matchedKeywords.map((k) => k.keyword)).not.toContain('Kubernetes');
    expect(res.matchedKeywords.map((k) => k.keyword)).not.toContain('ClickHouse');
    expect(res.matchedKeywords.map((k) => k.keyword)).not.toContain('Temporal');

    // Zero-taxonomy JD on empty resume must score 0% (never 100%)
    const zeroTaxJd =
      'Hospitality Operations Manager overseeing banquet logistics, guest satisfaction programs, and vendor procurement contracts.';
    const emptyScore = analyzeJobMatch({}, zeroTaxJd);
    expect(emptyScore.score).toBe(0);
    expect(emptyScore.subScores.skills).toBe(0);
    expect(emptyScore.fallbackKeywords.missing.length).toBeGreaterThan(0);
  });
});

describe('Inline Bullet Guidance, Live Editor Scorecard & Preview Warnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders live inline bullet guidance in sections.tsx flagging weak verbs, long bullets, repeated terms, and missing metrics without fabricating numbers', () => {
    const handleSave = jest.fn();
    render(
      <SectionEditors
        content={{
          type: SectionType.WORK,
          item: {
            id: 'w-1',
            name: 'Acme',
            position: 'Engineer',
            description: 'Worked on frontend dashboard widgets for internal support agents.',
          },
        }}
        onClose={jest.fn()}
        onSave={handleSave}
      />
    );

    const guidance = screen.getByTestId('inline-bullet-guidance');
    expect(guidance).toBeInTheDocument();
    expect(screen.getByTestId('bullet-issue-weak-verb')).toHaveTextContent(/weak phrasing/i);
    expect(screen.getByTestId('bullet-issue-missing-metric')).toHaveTextContent(
      /never invent numbers/i
    );

    // One-click weak verb replacement updates textarea synchronously
    const builtBtn = within(guidance).getByRole('button', { name: 'Built' });
    fireEvent.click(builtBtn);

    const textarea = screen.getByLabelText(/description & key achievements/i) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/^Built frontend dashboard widgets/i);
    expect(screen.queryByTestId('bullet-issue-weak-verb')).not.toBeInTheDocument();
  });

  it('updates live 5-pillar ATS scorecard in ResumeEditor synchronously without network calls and offers one-click standard heading fixes', () => {
    const initialResume: IResume = {
      _id: 'res-live-1',
      title: 'Backend Resume',
      summary: '',
      templateId: 'modern',
      content: {
        basics: {
          name: 'Alex Rivera',
          label: 'Backend Engineer',
          email: 'alex@example.com',
          phone: '555-0100',
          summary: '',
          location: { address: '', postalCode: '', city: 'Austin', countryCode: 'US', region: 'TX' },
          profiles: [],
        },
        sections: [
          {
            id: 'custom-skills',
            type: SectionType.CUSTOM,
            title: 'My Coding Superpowers',
            isCustom: true,
            content: [{ id: 'c1', title: 'Node.js & PostgreSQL', description: '' }],
          },
          {
            id: 'work-sec',
            type: SectionType.WORK,
            title: 'Work Experience',
            content: [
              {
                id: 'w1',
                name: 'CloudCorp',
                position: 'Backend Engineer',
                startDate: 'Jan 2022',
                endDate: '03/2024',
                description: 'Engineered PostgreSQL query optimizer reducing P99 latency by 42%.',
              },
            ],
          },
        ],
        sectionOrder: ['custom-skills', 'work-sec'],
      },
    };

    render(<ResumeEditor initialResume={initialResume} onBack={jest.fn()} />);

    const scorecard = screen.getByTestId('live-ats-scorecard');
    expect(scorecard).toBeInTheDocument();
    expect(screen.getByTestId('toolbar-ats-score-badge')).toHaveTextContent(/ATS \d+%/);

    // All 5 sub-score progressbars present
    expect(screen.getByRole('progressbar', { name: 'ATS Keywords' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'ATS Structure' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'ATS Experience' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'ATS Formatting' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'ATS Skills' })).toBeInTheDocument();

    const structureBefore = Number(
      screen.getByRole('progressbar', { name: 'ATS Structure' }).getAttribute('aria-valuenow')
    );

    // Non-standard heading flagged with one-click rename
    expect(screen.getByTestId('live-heading-issues')).toHaveTextContent(/My Coding Superpowers/);
    fireEvent.click(screen.getByTestId('fix-heading-custom-skills'));

    expect(screen.queryByTestId('live-heading-issues')).not.toBeInTheDocument();
    const structureAfter = Number(
      screen.getByRole('progressbar', { name: 'ATS Structure' }).getAttribute('aria-valuenow')
    );
    expect(structureAfter).toBeGreaterThan(structureBefore);

    // Zero job-match network calls triggered by live editing
    expect(resumeService.analyzeJobMatch).not.toHaveBeenCalled();
  });

  it('warns in ResumePreview when template is non-ATS-friendly, skillStyle uses bars/dots, word count misses 475-600, or page overflows A4', () => {
    const previewResume: IResume = {
      _id: 'res-prev-1',
      title: 'Designer Resume',
      summary: 'Product engineer building web apps.',
      templateId: 'creative-sidebar', // atsFriendly: false, default skillStyle: 'bars'
      themeConfig: { skillStyle: 'bars' },
      content: {
        basics: {
          name: 'Samira Patel',
          label: 'Frontend Engineer',
          email: 'samira@example.com',
          phone: '',
          summary: 'Product engineer building web apps.',
          location: { address: '', postalCode: '', city: '', countryCode: '', region: '' },
          profiles: [],
        },
        sections: [
          {
            id: 'skills',
            type: SectionType.SKILLS,
            title: 'Skills',
            content: [{ id: 's1', name: 'React', level: 'Expert' }],
          },
        ],
        sectionOrder: ['skills'],
      },
    };

    const originalScrollHeight = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollHeight'
    );
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      value: A4_HEIGHT_PX + 240,
    });

    try {
      render(<ResumePreview resume={previewResume} />);

      const banner = screen.getByTestId('resume-preview-ats-warnings');
      expect(banner).toBeInTheDocument();
      expect(screen.getByTestId('preview-warning-page_overflow')).toBeInTheDocument();
      expect(screen.getByTestId('preview-warning-word_count_low')).toBeInTheDocument();
      expect(screen.getByTestId('preview-warning-non_ats_template')).toBeInTheDocument();
      expect(screen.getByTestId('preview-warning-skill_style_bars_dots')).toBeInTheDocument();
    } finally {
      if (originalScrollHeight) {
        Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
      } else {
        delete (HTMLElement.prototype as any).scrollHeight;
      }
    }
  });
});
