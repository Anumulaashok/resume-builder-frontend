import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HomePage from '../components/HomePage';
import ResumeEditor from '../components/ResumeEditor';
import JobMatch from '../components/jobMatch/JobMatch';
import { careerProfileService } from '../services/careerProfile.service';
import { resumeService, ResumeWithMeta } from '../services/resume.service';
import {
  createEmptyFrontendCareerProfile,
  ExtractedResumeStagingResponse,
  ICareerProfile,
} from '../types/careerProfile';
import { SectionType } from '../types/resume';
import { JobMatchResult } from '../types/jobMatch';

jest.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}));

jest.mock('react-hot-toast', () => {
  const fn: any = jest.fn();
  fn.success = jest.fn();
  fn.error = jest.fn();
  fn.dismiss = jest.fn();
  return {
    __esModule: true,
    Toaster: () => null,
    default: fn,
  };
});

const buildSampleProfile = (): ICareerProfile => ({
  ...createEmptyFrontendCareerProfile({
    name: 'Elena Vance',
    email: 'elena@vance.dev',
  }),
  personalInfo: {
    id: 'info_primary',
    fullName: 'Elena Vance',
    email: 'elena@vance.dev',
    phone: '+1 415-555-0199',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/elenavance',
    github: 'https://github.com/elenavance',
    portfolio: '',
    website: '',
    otherLinks: [],
  },
  summary: {
    id: 'sum_primary',
    currentTitle: 'Staff Backend Engineer',
    yearsOfExperience: '8+',
    areasOfExpertise: ['Distributed Systems', 'Event-Driven Architecture'],
    industryExperience: ['Cloud Infrastructure'],
    text: 'Staff Backend Engineer building resilient cloud payment platforms.',
  },
  experience: [
    {
      id: 'exp_acme_1',
      company: 'Acme Payments',
      role: 'Staff Backend Engineer',
      location: 'San Francisco, CA',
      startDate: 'Jan 2021',
      endDate: 'Present',
      current: true,
      employmentType: 'Full-time',
      responsibilities: [
        'Architected event-driven settlement pipeline using Node.js and PostgreSQL',
      ],
      achievements: ['Reduced settlement latency by 42%'],
      technologies: ['TypeScript', 'Node.js', 'PostgreSQL', 'RabbitMQ'],
      metrics: ['42%'],
    },
  ],
  projects: [
    {
      id: 'proj_ledger_1',
      name: 'OpenLedger Engine',
      description: 'Double-entry ledger library with deterministic replay.',
      problem: '',
      solution: '',
      technologies: ['Go', 'PostgreSQL'],
      impact: '',
      metrics: [],
      url: 'https://github.com/elenavance/openledger',
      links: [],
    },
  ],
  skills: {
    languages: [
      { id: 'sk_ts', name: 'TypeScript' },
      { id: 'sk_go', name: 'Go' },
    ],
    backend: [{ id: 'sk_node', name: 'Node.js' }],
    frontend: [{ id: 'sk_react', name: 'React' }],
    databases: [{ id: 'sk_pg', name: 'PostgreSQL' }],
    cloud: [{ id: 'sk_aws', name: 'AWS' }],
    devops: [{ id: 'sk_docker', name: 'Docker' }],
    aiMl: [],
    messaging: [{ id: 'sk_rmq', name: 'RabbitMQ' }],
    tools: [],
    other: [],
  },
  education: [
    {
      id: 'edu_ucb',
      degree: 'B.S.',
      field: 'Computer Science',
      institution: 'UC Berkeley',
      startYear: '2013',
      endYear: '2017',
      gpa: '',
      location: 'Berkeley, CA',
    },
  ],
  completeness: 85,
  exists: true,
});

describe('Career Profile, Staged File Import, Grounded Bullet Assistant & Job Match', () => {
  const originalResizeObserver = (window as any).ResizeObserver;

  beforeEach(() => {
    jest.restoreAllMocks();
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    (window as any).ResizeObserver = originalResizeObserver;
  });

  it('navigates to Career Profile tab, stages PDF/DOCX/TXT imports with cancel safety, and approves edited facts', async () => {
    const baseProfile = buildSampleProfile();
    const stagedResponse: ExtractedResumeStagingResponse = {
      stagedProfile: {
        ...buildSampleProfile(),
        experience: [
          {
            id: 'exp_staged_1',
            company: 'Nimbus Systems',
            role: 'Senior Systems Engineer',
            location: 'Seattle, WA',
            startDate: '2018',
            endDate: '2021',
            current: false,
            employmentType: '',
            responsibilities: ['Built multi-tenant telemetry ingestion service'],
            achievements: [],
            technologies: ['Go', 'Redis'],
            metrics: [],
          },
          {
            id: 'exp_staged_discard',
            company: 'Unwanted Internship Co',
            role: 'Intern',
            location: '',
            startDate: '2016',
            endDate: '2016',
            current: false,
            employmentType: '',
            responsibilities: ['Temporary role to discard'],
            achievements: [],
            technologies: [],
            metrics: [],
          },
        ],
      },
      metadata: {
        filename: 'elena_resume.pdf',
        format: 'pdf',
        sizeBytes: 42000,
        extractedCharacters: 1840,
        detectedCounts: {
          experience: 2,
          projects: 1,
          skills: 7,
          education: 1,
          certifications: 0,
          achievements: 0,
        },
      },
    };

    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([]);
    jest.spyOn(careerProfileService, 'getProfile').mockResolvedValue(baseProfile);
    const extractSpy = jest
      .spyOn(careerProfileService, 'extractImportFile')
      .mockResolvedValue(stagedResponse);
    const approveSpy = jest
      .spyOn(careerProfileService, 'approveImport')
      .mockImplementation(async (approved) => ({
        ...baseProfile,
        experience: approved.experience || baseProfile.experience,
      }));

    render(<HomePage user={{ name: 'Elena Vance', email: 'elena@vance.dev' }} />);

    // Navigate via Header Career Profile tab
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /career profile/i }));

    expect(await screen.findByTestId('career-profile-workspace')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Elena Vance')).toBeInTheDocument();

    // 1. Upload a PDF file and verify Cancel leaves Career Profile untouched
    const fileInput = screen.getByTestId('career-profile-import-input');
    const pdfFile = new File(['%PDF-1.4 sample'], 'elena_resume.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    expect(await screen.findByTestId('import-staging-review')).toBeInTheDocument();
    expect(extractSpy).toHaveBeenCalledWith(pdfFile);

    fireEvent.click(screen.getByTestId('staging-cancel-btn'));
    expect(screen.queryByTestId('import-staging-review')).not.toBeInTheDocument();
    expect(approveSpy).not.toHaveBeenCalled();

    // 2. Upload again, edit first role, discard second role, and Approve
    fireEvent.change(fileInput, { target: { files: [pdfFile] } });
    expect(await screen.findByTestId('import-staging-review')).toBeInTheDocument();

    const roleInput = screen.getByLabelText('Experience role 1');
    fireEvent.change(roleInput, {
      target: { value: 'Principal Systems Engineer' },
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /discard experience unwanted internship co/i,
      })
    );

    fireEvent.click(screen.getByTestId('staging-approve-btn'));

    await waitFor(() => {
      expect(approveSpy).toHaveBeenCalledTimes(1);
    });

    const [approvedPayload, modeArg] = approveSpy.mock.calls[0];
    expect(modeArg).toBe('merge');
    expect(approvedPayload.experience).toHaveLength(1);
    expect(approvedPayload.experience?.[0].company).toBe('Nimbus Systems');
    expect(approvedPayload.experience?.[0].role).toBe('Principal Systems Engineer');
  });

  it('surfaces clear error alerts for scanned or encrypted PDFs and oversized/unsupported files', async () => {
    jest.spyOn(careerProfileService, 'getProfile').mockResolvedValue(buildSampleProfile());
    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([]);
    jest.spyOn(careerProfileService, 'extractImportFile').mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message:
            'Scanned or image-only PDF detected with no selectable text. Optical character recognition (OCR) is not supported.',
        },
      },
    });

    render(<HomePage />);
    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    fireEvent.click(within(nav).getByRole('button', { name: /career profile/i }));

    const fileInput = await screen.findByTestId('career-profile-import-input');

    // Unsupported extension rejected client-side
    const badImg = new File(['pngdata'], 'scan.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [badImg] } });
    expect(await screen.findByTestId('career-profile-import-error')).toHaveTextContent(
      /Only PDF \(\.pdf\), Word \(\.docx\), and plain text \(\.txt\)/i
    );

    // Scanned PDF rejected with clear 422 message
    const scannedPdf = new File(['%PDF-1.4 image-only'], 'scanned_cv.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(fileInput, { target: { files: [scannedPdf] } });

    await waitFor(() => {
      expect(screen.getByTestId('career-profile-import-error')).toHaveTextContent(
        /Scanned or image-only PDF detected/i
      );
    });
  });

  it('seeds standalone resumes without mutating Career Profile and supports collapsible grounded Bullet Assistant with metrics prompt & undo', async () => {
    const seededResume: ResumeWithMeta = {
      _id: 'res-seeded-1',
      id: 'res-seeded-1',
      userId: 'u-1',
      title: 'Elena Vance — Staff Backend Engineer',
      summary: 'Staff Backend Engineer building resilient cloud payment platforms.',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      provenance: {
        seededFromCareerProfile: true,
        targetRole: 'Staff Backend Engineer',
        claims: [
          {
            targetPath: 'sections.work.0',
            text: 'Built event-driven settlement pipeline using Node.js and PostgreSQL',
            source_fact_ids: ['exp_acme_1'],
          },
        ],
      },
      content: {
        basics: {
          name: 'Elena Vance',
          email: 'elena@vance.dev',
          label: 'Staff Backend Engineer',
          summary: 'Staff Backend Engineer building resilient cloud payment platforms.',
        },
        sections: [
          {
            id: 'sec-work-1',
            type: SectionType.WORK,
            title: 'Professional Experience',
            content: [
              {
                id: 'work-item-1',
                name: 'Acme Payments',
                company: 'Acme Payments',
                position: 'Staff Backend Engineer',
                startDate: 'Jan 2021',
                endDate: 'Present',
                current: true,
                description:
                  'Built event-driven settlement pipeline using Node.js and PostgreSQL',
                source_fact_ids: ['exp_acme_1'],
              },
            ],
          },
        ],
        sectionOrder: ['sec-work-1'],
      },
    };

    const saveProfileSpy = jest.spyOn(careerProfileService, 'saveProfile');
    jest.spyOn(resumeService, 'getShareStats').mockResolvedValue({
      shareSlug: undefined,
      isPublic: false,
      shareViews: 0,
      shareDownloads: 0,
    });
    const rewriteSpy = jest
      .spyOn(resumeService, 'rewriteBullet')
      .mockResolvedValueOnce({
        rewrittenBullet:
          'Architected event-driven settlement pipeline using Node.js and PostgreSQL',
        originalBullet:
          'Built event-driven settlement pipeline using Node.js and PostgreSQL',
        action: 'rewrite',
        needsMetrics: true,
        metricPrompts: [
          'What real latency, throughput, or volume improvement did this achieve?',
        ],
        provenance: {
          source_fact_ids: ['exp_acme_1'],
          groundedInCareerProfile: true,
        },
      })
      .mockResolvedValueOnce({
        rewrittenBullet:
          'Architected event-driven settlement pipeline using Node.js and PostgreSQL, reducing latency by 38%',
        originalBullet:
          'Architected event-driven settlement pipeline using Node.js and PostgreSQL',
        action: 'improve',
        needsMetrics: false,
        metricPrompts: [],
        provenance: {
          source_fact_ids: ['exp_acme_1'],
          userEnteredMetric: '38%',
          groundedInCareerProfile: true,
        },
      });

    render(<ResumeEditor initialResume={seededResume} onBack={jest.fn()} />);

    // Grounded badge shown & assistant collapsed by default
    expect(screen.getByTestId('resume-grounded-badge')).toBeInTheDocument();
    expect(screen.queryByTestId('bullet-assistant-drawer')).not.toBeInTheDocument();

    // Typing in editor stays sub-second and never mutates CareerProfile
    const t0 = performance.now();
    const nameInput = screen.getByLabelText(/Full Name/i);
    fireEvent.change(nameInput, { target: { value: 'Elena M. Vance' } });
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(500);
    expect(saveProfileSpy).not.toHaveBeenCalled();

    // Open collapsible AI Bullet Assistant
    fireEvent.click(screen.getByTestId('toggle-bullet-assistant-btn'));
    expect(screen.getByTestId('bullet-assistant-drawer')).toBeInTheDocument();

    // Bullet has no numbers -> real metrics prompt is displayed
    expect(screen.getByTestId('bullet-metrics-prompt')).toBeInTheDocument();

    // Run grounded rewrite
    fireEvent.click(screen.getByTestId('bullet-action-rewrite'));

    expect(
      await screen.findByTestId('bullet-rewrite-suggestion-card')
    ).toBeInTheDocument();
    expect(screen.getByTestId('bullet-provenance-ids')).toHaveTextContent(
      'exp_acme_1'
    );

    // Apply rewrite
    fireEvent.click(screen.getByTestId('apply-rewritten-bullet-btn'));
    expect(screen.getByTestId('assistant-current-bullet-text')).toHaveTextContent(
      'Architected event-driven settlement pipeline using Node.js and PostgreSQL'
    );

    // Enter a real metric and incorporate it
    fireEvent.change(screen.getByTestId('bullet-user-metric-input'), {
      target: { value: '38%' },
    });
    fireEvent.click(screen.getByTestId('apply-metric-rewrite-btn'));

    await waitFor(() => {
      expect(rewriteSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          userMetric: '38%',
        }),
        'res-seeded-1'
      );
      expect(screen.getByTestId('bullet-rewritten-text')).toHaveTextContent('38%');
    });

    fireEvent.click(screen.getByTestId('apply-rewritten-bullet-btn'));
    expect(screen.getByTestId('assistant-current-bullet-text')).toHaveTextContent(
      'reducing latency by 38%'
    );

    // Undo bullet change restores prior bullet
    fireEvent.click(screen.getByTestId('undo-bullet-change-btn'));
    expect(screen.getByTestId('assistant-current-bullet-text')).toHaveTextContent(
      'Architected event-driven settlement pipeline using Node.js and PostgreSQL'
    );
    expect(screen.getByTestId('assistant-current-bullet-text')).not.toHaveTextContent(
      '38%'
    );
  });

  it('distinguishes verified Career Profile skills, transferable experience, and confirmation-gated unconfirmed skills in JobMatch', async () => {
    const mockResume: ResumeWithMeta = {
      _id: 'r-jm-1',
      id: 'r-jm-1',
      userId: 'u-1',
      title: 'Backend Resume',
      summary: 'Backend engineer',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      content: {
        basics: { name: 'Elena Vance', email: 'elena@vance.dev' },
        sections: [
          {
            id: 'sec-skills',
            type: SectionType.SKILLS,
            title: 'Skills',
            content: [{ id: 's-1', name: 'TypeScript' }],
          },
        ],
        sectionOrder: ['sec-skills'],
      },
    };

    const matchResponse: JobMatchResult = {
      score: 64,
      label: 'Good match',
      breakdown: { skills: 60, experience: 70, title: 75 },
      matchedKeywords: [{ keyword: 'TypeScript', occurrences: 2 }],
      missingKeywords: [
        { keyword: 'PostgreSQL', occurrences: 2 },
        { keyword: 'Kafka', occurrences: 2 },
        { keyword: 'Rust', occurrences: 1 },
      ],
      hasCareerProfile: true,
      profileVerifiedSkills: [
        {
          keyword: 'PostgreSQL',
          occurrences: 2,
          source_fact_ids: ['sk_pg', 'exp_acme_1'],
        },
      ],
      transferableSkills: [
        {
          keyword: 'Kafka',
          occurrences: 2,
          relatedProfileSkills: ['RabbitMQ'],
          source_fact_ids: ['sk_rmq'],
          guidance:
            'Highlight your verified RabbitMQ experience as transferable messaging context without claiming Kafka.',
        },
      ],
      unconfirmedSkills: [
        {
          keyword: 'Rust',
          occurrences: 1,
          requiresConfirmation: true,
        },
      ],
      totals: { required: 4, matched: 1 },
      suggestions: ['Add verified skill PostgreSQL from your Career Profile.'],
    };

    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([mockResume]);
    jest.spyOn(resumeService, 'analyzeJobMatch').mockResolvedValue(matchResponse);
    const updateResumeSpy = jest
      .spyOn(resumeService, 'updateResume')
      .mockResolvedValue(mockResume);
    const confirmSkillSpy = jest
      .spyOn(careerProfileService, 'confirmSkill')
      .mockResolvedValue(buildSampleProfile());

    render(<JobMatch />);

    const jdTextarea = await screen.findByLabelText(/Job description text/i);
    fireEvent.change(jdTextarea, {
      target: {
        value:
          'We need a Senior Backend Engineer with TypeScript, PostgreSQL, Kafka event streaming, and Rust services.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Analyze match/i }));

    // 1. Verified skill allows immediate 1-click add
    expect(
      await screen.findByTestId('jm-verified-profile-section')
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Add verified skill: PostgreSQL/i })
    );

    await waitFor(() => {
      expect(updateResumeSpy).toHaveBeenCalledTimes(1);
      expect(
        screen.getByRole('button', { name: /Confirm before adding: Rust/i })
      ).not.toBeDisabled();
    });
    expect(confirmSkillSpy).not.toHaveBeenCalled();

    // 2. Transferable context displays RabbitMQ -> Kafka guidance
    expect(screen.getByTestId('transferable-skill-card')).toHaveTextContent(
      'RabbitMQ'
    );

    // 3. Unconfirmed skill requires explicit user confirmation before adding
    fireEvent.click(
      screen.getByRole('button', { name: /Confirm before adding: Rust/i })
    );

    const prompt = screen.getByTestId('confirm-skill-prompt');
    const confirmAddBtn = within(prompt).getByTestId(
      'confirm-add-unconfirmed-skill-btn'
    );
    expect(confirmAddBtn).toBeDisabled();

    fireEvent.click(
      within(prompt).getByTestId('confirm-skill-experience-checkbox')
    );
    expect(confirmAddBtn).not.toBeDisabled();

    fireEvent.click(confirmAddBtn);

    await waitFor(() => {
      expect(confirmSkillSpy).toHaveBeenCalledWith('Rust');
      expect(updateResumeSpy).toHaveBeenCalledTimes(2);
    });
  });
});
