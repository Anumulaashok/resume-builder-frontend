import * as fs from 'fs';
import * as path from 'path';
import { IResume, SectionType } from '../../../types/resume';
import {
  CATEGORY_WEIGHTS,
  checkResume,
  computeCategoryScore,
  scoreToGrade,
  STRONG_ACTION_VERBS,
} from '../index';

const FIXED_NOW = new Date('2026-06-15T12:00:00Z');

function buildExemplaryResume(overrides?: Partial<IResume>): IResume {
  return {
    _id: 'res-exemplary',
    title: 'Senior Software Engineer Resume',
    templateId: 'modern',
    themeConfig: {
      primaryColor: '#1e3a8a',
      fontFamily: 'Inter, sans-serif',
      fontSize: 'medium',
      spacing: 'normal',
      accentStyle: 'underline',
      bulletStyle: 'disc',
      skillStyle: 'chips',
    },
    content: {
      basics: {
        name: 'Elena Rostova',
        label: 'Staff Distributed Systems Engineer',
        email: 'elena.rostova@example.com',
        phone: '+1 (415) 555-0192',
        url: 'https://github.com/elenarostova',
        location: {
          city: 'San Francisco',
          region: 'CA',
          countryCode: 'US',
        },
        summary:
          'Staff Distributed Systems Engineer with 9+ years of experience designing high-throughput cloud infrastructure, event-driven payment pipelines, and resilient storage engines. Demonstrated success leading cross-functional platform teams of 12 engineers, reducing multi-region tail latency by 48%, and saving $1.4M annually in compute overhead across mission-critical production workloads.',
        profiles: [
          {
            network: 'LinkedIn',
            username: 'elenarostova',
            url: 'https://linkedin.com/in/elenarostova',
          },
        ],
      },
      sections: [
        {
          id: 'sec-work',
          type: SectionType.WORK,
          title: 'Work Experience',
          enabled: true,
          content: [
            {
              id: 'work-1',
              company: 'CloudScale Systems',
              position: 'Staff Software Engineer',
              startDate: 'Jan 2023',
              current: true,
              highlights: [
                'Architected a multi-region Kafka ingestion pipeline processing 180K events per second with 99.99% availability across three cloud zones.',
                'Spearheaded zero-downtime migration of 45 microservices to TypeScript and Go, cutting p99 API latency by 42% within two quarters.',
                'Mentored 8 senior and mid-level engineers through architecture reviews, raising deployment frequency from weekly to 15 releases per day.',
              ],
            },
            {
              id: 'work-2',
              company: 'FinLedger Corp',
              position: 'Senior Backend Engineer',
              startDate: 'Mar 2020',
              endDate: 'Dec 2022',
              current: false,
              highlights: [
                'Engineered an idempotent settlement engine handling $320M in monthly volume while eliminating reconciliation discrepancies across partner banks.',
                'Optimized PostgreSQL query plans and partitioning strategies for 4TB ledger tables, reducing reporting runtime by 67%.',
                'Automated chaos testing harnesses inside GitHub Actions pipelines, uncovering 14 critical failover regressions prior to customer launch.',
              ],
            },
          ],
        },
        {
          id: 'sec-skills',
          type: SectionType.SKILLS,
          title: 'Technical Skills',
          enabled: true,
          content: [
            {
              id: 'skill-group-1',
              name: 'Languages',
              subSkills: ['TypeScript', 'Go', 'Python', 'SQL'],
            },
            {
              id: 'skill-group-2',
              name: 'Infrastructure & Data',
              subSkills: [
                'Kubernetes',
                'PostgreSQL',
                'Apache Kafka',
                'Redis',
                'Terraform',
                'AWS',
              ],
            },
          ],
        },
      ],
      sectionOrder: ['sec-work', 'sec-skills'],
    },
    ...overrides,
  };
}

function getCategory(result: ReturnType<typeof checkResume>, id: string) {
  const found = result.categories.find((c) => c.id === id);
  if (!found) {
    throw new Error(`Category ${id} not found`);
  }
  return found;
}

describe('resumeChecker — pure TS architecture & dictionary guarantees', () => {
  it('contains zero React imports anywhere in src/utils/resumeChecker/', () => {
    const checkerDir = path.resolve(__dirname, '..');
    const files = fs
      .readdirSync(checkerDir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

    expect(files.length).toBeGreaterThanOrEqual(5);
    files.forEach((fileName) => {
      const source = fs.readFileSync(path.join(checkerDir, fileName), 'utf8');
      expect(source).not.toMatch(/from\s+['"]react['"]/);
      expect(source).not.toMatch(/require\(['"]react['"]\)/);
    });
  });

  it('ships ~150+ strong action verbs', () => {
    expect(STRONG_ACTION_VERBS.length).toBeGreaterThanOrEqual(150);
    expect(STRONG_ACTION_VERBS).toEqual(
      expect.arrayContaining([
        'architect',
        'spearhead',
        'engineer',
        'optimize',
        'orchestrate',
        'deliver',
      ])
    );
  });

  it('scores an exemplary ATS-ready resume at 100 (Grade A) with zero issues', () => {
    const result = checkResume(buildExemplaryResume(), { now: FIXED_NOW });
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.categories).toHaveLength(6);
    result.categories.forEach((cat) => {
      expect(cat.score).toBe(100);
      expect(cat.issues).toEqual([]);
    });
  });
});

describe('resumeChecker — Contact category rules', () => {
  it('flags missing name, missing email, missing phone, missing location, and missing profile/website link', () => {
    const resume = buildExemplaryResume();
    resume.content.basics = {};

    const result = checkResume(resume, { now: FIXED_NOW });
    const contact = getCategory(result, 'contact');
    const ids = contact.issues.map((i) => i.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'contact-missing-name',
        'contact-missing-email',
        'contact-missing-phone',
        'contact-missing-location',
        'contact-missing-link',
      ])
    );
    expect(
      contact.issues.find((i) => i.id === 'contact-missing-name')?.severity
    ).toBe('critical');
    expect(
      contact.issues.find((i) => i.id === 'contact-missing-email')?.severity
    ).toBe('critical');
    expect(contact.issues.every((i) => i.sectionId === 'basics')).toBe(true);
  });

  it('flags invalid email format and incomplete phone number (< 7 digits)', () => {
    const resume = buildExemplaryResume();
    resume.content.basics.email = 'elena-at-example';
    resume.content.basics.phone = '12345';

    const contact = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'contact'
    );
    const ids = contact.issues.map((i) => i.id);

    expect(ids).toContain('contact-invalid-email');
    expect(ids).toContain('contact-invalid-phone');
    expect(
      contact.issues.find((i) => i.id === 'contact-invalid-email')?.severity
    ).toBe('critical');
  });

  it('accepts string location and profile link from profiles[] when basics.url is absent', () => {
    const resume = buildExemplaryResume();
    delete resume.content.basics.url;
    (resume.content.basics as any).location = 'Austin, TX';

    const contact = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'contact'
    );
    expect(contact.issues).toEqual([]);
    expect(contact.score).toBe(100);
  });
});

describe('resumeChecker — Summary category rules', () => {
  it('scores 0 with critical issue when summary is missing', () => {
    const resume = buildExemplaryResume();
    resume.content.basics.summary = '   ';

    const summaryCat = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'summary'
    );
    expect(summaryCat.score).toBe(0);
    expect(summaryCat.issues.map((i) => i.id)).toContain('summary-missing');
  });

  it('flags summary shorter than 30 words and longer than 120 words', () => {
    const shortResume = buildExemplaryResume();
    shortResume.content.basics.summary =
      'Experienced backend software engineer building scalable distributed cloud systems and APIs.';

    const shortCat = getCategory(
      checkResume(shortResume, { now: FIXED_NOW }),
      'summary'
    );
    expect(shortCat.issues.map((i) => i.id)).toContain('summary-too-short');

    const longResume = buildExemplaryResume();
    longResume.content.basics.summary = Array(126)
      .fill('scalable')
      .join(' ');

    const longCat = getCategory(
      checkResume(longResume, { now: FIXED_NOW }),
      'summary'
    );
    expect(longCat.issues.map((i) => i.id)).toContain('summary-too-long');
  });

  it('flags first-person pronoun overuse ("I", "me", "my")', () => {
    const multiFirstPerson = buildExemplaryResume();
    multiFirstPerson.content.basics.summary =
      'I am a Staff Distributed Systems Engineer and I have 9 years of experience building cloud infrastructure for my teams across global financial platforms while mentoring engineers to deliver reliable software systems at scale.';

    const warningCat = getCategory(
      checkResume(multiFirstPerson, { now: FIXED_NOW }),
      'summary'
    );
    const issue = warningCat.issues.find(
      (i) => i.id === 'summary-first-person'
    );
    expect(issue).toBeDefined();
    expect(issue?.severity).toBe('warning');

    const singleFirstPerson = buildExemplaryResume();
    singleFirstPerson.content.basics.summary =
      'Staff Distributed Systems Engineer with 9 years of experience building cloud infrastructure across my global engineering organizations, reducing p99 API latency by 45% and saving $1.2M annually across multi-region clusters.';

    const tipCat = getCategory(
      checkResume(singleFirstPerson, { now: FIXED_NOW }),
      'summary'
    );
    expect(
      tipCat.issues.find((i) => i.id === 'summary-first-person-tip')?.severity
    ).toBe('tip');
  });
});

describe('resumeChecker — Experience category rules', () => {
  it('scores 0 when work experience is missing or all entries are disabled', () => {
    const resume = buildExemplaryResume();
    resume.content.sections[0].content = [
      {
        id: 'disabled-work',
        company: 'Hidden Corp',
        position: 'Engineer',
        startDate: 'Jan 2022',
        current: true,
        enabled: false,
        highlights: ['Built hidden service for internal tooling across 4 teams.'],
      },
    ];

    const exp = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'experience'
    );
    expect(exp.score).toBe(0);
    expect(exp.issues.map((i) => i.id)).toContain('experience-missing');
  });

  it('flags missing role, company, start date, and end date (when not current)', () => {
    const resume = buildExemplaryResume();
    resume.content.sections[0].content = [
      {
        id: 'incomplete-role',
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        highlights: [
          'Architected event-driven billing services processing $12M in annual transactions cleanly.',
          'Reduced cloud database spend by 35% through read-replica autoscaling policies.',
        ],
      },
    ];

    const exp = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'experience'
    );
    const ids = exp.issues.map((i) => i.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'experience-missing-role-incomplete-role',
        'experience-missing-company-incomplete-role',
        'experience-missing-start-date-incomplete-role',
        'experience-missing-end-date-incomplete-role',
      ])
    );
  });

  it('checks bullet count (2-6), strong action verbs, weak openers, bullet word length (8-35), duplicates, and >=40% metrics', () => {
    const resume = buildExemplaryResume();
    const longBullet =
      'Built ' +
      Array(37)
        .fill('distributed')
        .join(' ') +
      ' microservices.';
    const duplicatedBullet =
      'Delivered resilient customer onboarding workflows across web and mobile applications.';

    resume.content.sections[0].content = [
      {
        id: 'role-a',
        company: 'Alpha Corp',
        position: 'Software Engineer',
        startDate: 'Jan 2024',
        current: true,
        highlights: ['Worked on backend APIs.'], // 1 bullet (<2), weak opener ("Worked on"), short (<8 words), no metric
      },
      {
        id: 'role-b',
        company: 'Beta Corp',
        position: 'Backend Developer',
        startDate: 'Jan 2021',
        endDate: 'Dec 2023',
        highlights: [
          'Responsible for maintaining legacy deployment scripts across staging environments.', // weak opener
          'The team maintained internal dashboards for customer support specialists.', // non-action verb ("the")
          longBullet, // >35 words
          duplicatedBullet,
          duplicatedBullet, // duplicate bullet
          'Helped coordinate weekly release trains across frontend and platform squads.',
          'Implemented configuration validation tooling for internal developer environments.', // 7th bullet (>6)
        ],
      },
    ];

    const exp = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'experience'
    );
    const ids = exp.issues.map((i) => i.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'experience-too-few-bullets-role-a',
        'experience-weak-opener-role-a',
        'experience-bullet-short-role-a',
        'experience-too-many-bullets-role-b',
        'experience-weak-opener-role-b',
        'experience-action-verb-role-b',
        'experience-bullet-long-role-b',
        'experience-duplicate-bullet-role-b',
        'experience-low-metrics',
      ])
    );
  });

  it('flags non-reverse-chronological order, overlapping dates, future dates, and >6 month gaps as tip', () => {
    const resume = buildExemplaryResume();
    resume.content.sections[0].content = [
      {
        id: 'older-listed-first',
        company: 'Earlier Co',
        position: 'Software Engineer',
        startDate: 'Jan 2019',
        endDate: 'Mar 2021',
        highlights: [
          'Engineered automated CI pipelines cutting build times by 40% across 12 repositories.',
          'Reduced container image sizes by 55% using multi-stage Docker builds.',
        ],
      },
      {
        id: 'newer-with-gap',
        company: 'Middle Co',
        position: 'Senior Engineer',
        startDate: 'Jan 2022', // 10-month gap after Mar 2021 (> 6 months -> tip)
        endDate: 'Aug 2024',
        highlights: [
          'Architected GraphQL federation gateway serving 25M daily requests with 99.98% uptime.',
          'Lowered infrastructure costs by $180K annually via spot instance orchestration.',
        ],
      },
      {
        id: 'overlapping-and-future',
        company: 'Overlap Future Co',
        position: 'Staff Engineer',
        startDate: 'Mar 2024', // overlaps with Jan 2022 - Aug 2024
        endDate: 'Dec 2028', // future date relative to FIXED_NOW (Jun 2026)
        highlights: [
          'Spearheaded platform reliability initiatives reducing SEV-1 incidents by 60% year over year.',
          'Mentored 10 engineers on distributed tracing and SLO governance.',
        ],
      },
    ];

    const exp = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'experience'
    );
    const ids = exp.issues.map((i) => i.id);

    expect(ids).toContain('experience-chronology-order-sec-work');
    expect(ids).toContain('experience-gap-newer-with-gap');
    expect(ids).toContain('experience-overlapping-dates-overlapping-and-future');
    expect(ids).toContain('experience-future-date-overlapping-and-future');

    const gapIssue = exp.issues.find(
      (i) => i.id === 'experience-gap-newer-with-gap'
    );
    expect(gapIssue?.severity).toBe('tip');
  });
});

describe('resumeChecker — Skills category rules', () => {
  it('flags <5 skills, >30 skills, case-insensitive duplicates, and all skills in one giant group', () => {
    const fewSkillsResume = buildExemplaryResume();
    fewSkillsResume.content.sections[1].content = [
      { id: 'sk-1', name: 'TypeScript' },
      { id: 'sk-2', name: 'typescript' }, // case-insensitive duplicate
      { id: 'sk-3', name: 'React' },
    ];

    const fewSkillsCat = getCategory(
      checkResume(fewSkillsResume, { now: FIXED_NOW }),
      'skills'
    );
    expect(fewSkillsCat.issues.map((i) => i.id)).toEqual(
      expect.arrayContaining(['skills-too-few', 'skills-duplicates'])
    );

    // Single giant group (>30 skills inside a single SkillItem)
    const giantGroupResume = buildExemplaryResume();
    giantGroupResume.content.sections[1].content = [
      {
        id: 'sk-giant',
        name: 'All Skills',
        subSkills: Array.from({ length: 32 }, (_, idx) => `SkillItem${idx + 1}`),
      },
    ];

    const giantCat = getCategory(
      checkResume(giantGroupResume, { now: FIXED_NOW }),
      'skills'
    );
    expect(giantCat.issues.map((i) => i.id)).toEqual(
      expect.arrayContaining(['skills-too-many', 'skills-single-group'])
    );
  });
});

describe('resumeChecker — Language category rules', () => {
  it('flags repeated verbs (>3 times), buzzwords, and tech name spelling while ignoring URLs', () => {
    const resume = buildExemplaryResume();
    resume.content.basics.url = 'https://github.com/elenarostova';
    resume.content.basics.summary =
      'Hard worker and go-getter with strong synergy who built cloud platforms in javascript and nodejs across enterprise teams, reducing latency by 45% and saving $900K annually in infrastructure spend.';
    resume.content.sections[0].content[0].highlights = [
      'Built distributed ingestion pipelines processing 120K messages per second on AWS.',
      'Built automated observability dashboards reducing mean time to recovery by 50%.',
      'Built multi-tenant authorization services in github enterprise workflows for 30 teams.',
    ];

    const lang = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'language'
    );
    const ids = lang.issues.map((i) => i.id);

    expect(ids).toContain('language-repeated-verb-build');
    expect(ids).toContain('language-buzzwords');
    expect(ids).toContain('language-tech-spelling');

    const spellingIssue = lang.issues.find(
      (i) => i.id === 'language-tech-spelling'
    );
    expect(spellingIssue?.message).toContain('javascript → JavaScript');
    expect(spellingIssue?.message).toContain('nodejs → Node.js');
    expect(spellingIssue?.message).toContain('github → GitHub');
  });

  it('does not false-flag github.com or linkedin.com URLs when prose uses canonical casing', () => {
    const resume = buildExemplaryResume();
    resume.content.basics.url = 'https://github.com/elenarostova/nodejs-demo';
    const lang = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'language'
    );
    expect(lang.issues).toEqual([]);
  });
});

describe('resumeChecker — ATS formatting category rules', () => {
  it('warns on multi-column templates unless atsMode is enabled', () => {
    const resume = buildExemplaryResume({ templateId: 'creative-sidebar' });

    const withoutAtsMode = getCategory(
      checkResume(resume, { now: FIXED_NOW }),
      'ats'
    );
    expect(withoutAtsMode.issues.map((i) => i.id)).toContain(
      'ats-multi-column-template'
    );
    expect(
      withoutAtsMode.issues.find((i) => i.id === 'ats-multi-column-template')
        ?.severity
    ).toBe('warning');

    const withAtsMode = getCategory(
      checkResume(resume, { now: FIXED_NOW, atsMode: true }),
      'ats'
    );
    expect(withAtsMode.issues.map((i) => i.id)).not.toContain(
      'ats-multi-column-template'
    );
  });

  it('surfaces photo as a tip for US/UK locations and omits it for DE', () => {
    const usResume = buildExemplaryResume();
    usResume.content.basics.image = 'https://example.com/headshot.jpg';
    usResume.content.basics.location = { city: 'London', countryCode: 'UK' };

    const ukAts = getCategory(
      checkResume(usResume, { now: FIXED_NOW }),
      'ats'
    );
    const photoTip = ukAts.issues.find((i) => i.id === 'ats-photo-present');
    expect(photoTip).toBeDefined();
    expect(photoTip?.severity).toBe('tip');

    const deResume = buildExemplaryResume();
    deResume.content.basics.image = 'https://example.com/headshot.jpg';
    deResume.content.basics.location = { city: 'Berlin', countryCode: 'DE' };

    const deAts = getCategory(
      checkResume(deResume, { now: FIXED_NOW }),
      'ats'
    );
    expect(deAts.issues.map((i) => i.id)).not.toContain('ats-photo-present');
  });

  it('warns on page count > 2 and emoji/special characters in headings, while surfacing tables and icons ONLY as tips', () => {
    const resume = buildExemplaryResume({ templateId: 'developer' }); // usesTables: true
    resume.content.sections[0].title = '🚀 Work Experience ★';

    const ats = getCategory(
      checkResume(resume, {
        now: FIXED_NOW,
        pageCount: 3,
        skillStyle: 'bars', // triggers icons/visual meters tip
      }),
      'ats'
    );

    const pageIssue = ats.issues.find((i) => i.id === 'ats-page-count');
    const headingIssue = ats.issues.find(
      (i) => i.id === 'ats-heading-special-chars-sec-work'
    );
    const tableIssue = ats.issues.find((i) => i.id === 'ats-tables-tip');
    const iconIssue = ats.issues.find((i) => i.id === 'ats-icons-tip');

    expect(pageIssue?.severity).toBe('warning');
    expect(headingIssue?.severity).toBe('warning');
    expect(tableIssue?.severity).toBe('tip');
    expect(iconIssue?.severity).toBe('tip');
  });
});

describe('resumeChecker — Weighted score & grade calculation', () => {
  it('weights category scores accurately and maps grades A-F', () => {
    const weightsSum = Object.values(CATEGORY_WEIGHTS).reduce(
      (sum, w) => sum + w,
      0
    );
    expect(weightsSum).toBeCloseTo(1.0, 5);

    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(70)).toBe('C');
    expect(scoreToGrade(55)).toBe('D');
    expect(scoreToGrade(49)).toBe('F');

    expect(
      computeCategoryScore([
        { id: 'w1', severity: 'warning', message: 'warn' },
        { id: 't1', severity: 'tip', message: 'tip' },
      ])
    ).toBe(84); // 100 - 12 - 4

    // Missing summary (weight 0.15) on an otherwise 100-score resume => 85 (Grade B)
    const missingSummaryResume = buildExemplaryResume();
    missingSummaryResume.content.basics.summary = '';
    const result = checkResume(missingSummaryResume, { now: FIXED_NOW });
    expect(result.score).toBe(85);
    expect(result.grade).toBe('B');
  });
});
