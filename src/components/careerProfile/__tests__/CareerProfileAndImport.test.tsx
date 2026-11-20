import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ImportResumeModal from '../../ImportResumeModal';
import HomePage from '../../HomePage';
import ResumeEditor from '../../ResumeEditor';
import { CareerProfileWorkspace } from '../CareerProfileWorkspace';
import { ImportProjectsModal } from '../../portfolio/ImportProjectsModal';
import { resumeService } from '../../../services/resume.service';
import { careerProfileService } from '../../../services/careerProfile.service';
import { ICareerProfile } from '../../../types/careerProfile';
import { SectionType } from '../../../types/resume';

function buildEmptyScannedPdfBytes(): Uint8Array {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n',
    '4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, 'utf8'));
}

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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
    dismiss: jest.fn(),
  }),
}));

const sampleProfile: ICareerProfile = {
  _id: 'cp-101',
  basics: {
    name: 'Priya Nair',
    label: 'Staff Full-Stack Engineer',
    email: 'priya@example.com',
    phone: '+1 415-555-0144',
    summary: 'Staff engineer scaling cloud-native product platforms.',
    location: { city: 'San Francisco', region: 'CA' },
    profiles: [{ network: 'GitHub', username: 'priyanair', url: 'https://github.com/priyanair' }],
  },
  experiences: [
    {
      id: 'exp-1',
      company: 'Vanguard Cloud',
      position: 'Staff Full-Stack Engineer',
      startDate: 'Jan 2022',
      endDate: 'Present',
      current: true,
      description: '',
      highlights: ['Cut checkout API p99 latency by 41% across 30M daily requests'],
      technologies: ['TypeScript', 'Go'],
    },
    {
      id: 'exp-2',
      company: 'PixelWave',
      position: 'Frontend Engineer',
      startDate: '2019',
      endDate: '2021',
      current: false,
      description: '',
      highlights: ['Shipped accessible component library adopted by 14 teams'],
      technologies: ['React'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'QueryLens',
      description: 'Distributed SQL query profiler and flamegraph visualizer.',
      highlights: [
        'Diagnosed slow queries 4x faster across 60+ microservices',
        'Open-sourced with 1,800+ GitHub stars',
      ],
      technologies: ['Rust', 'TypeScript', 'React'],
      url: 'https://querylens.dev',
      githubUrl: 'https://github.com/priyanair/querylens',
    },
  ],
  skills: [
    { id: 'sk-1', name: 'TypeScript', keywords: [] },
    { id: 'sk-2', name: 'Go', keywords: [] },
    { id: 'sk-3', name: 'PostgreSQL', keywords: [] },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'Georgia Tech',
      degree: 'B.S.',
      field: 'Computer Science',
      highlights: [],
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      name: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
  ],
};

describe('File Import Review, Career Profile Workspace, Resume Seeding & Portfolio Highlights', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the interactive review step for TXT/PDF/DOCX uploads without saving anything until explicit approval', async () => {
    const createResumeSpy = jest
      .spyOn(resumeService, 'createResume')
      .mockResolvedValue({ id: 'res-created-1' } as any);
    const mergeProfileSpy = jest
      .spyOn(careerProfileService, 'mergeProfile')
      .mockResolvedValue(sampleProfile);

    const onImported = jest.fn();
    render(
      <ImportResumeModal
        isOpen={true}
        onClose={jest.fn()}
        onImported={onImported}
        user={{ name: 'Priya Nair', email: 'priya@example.com' }}
      />
    );

    const txtResume = [
      'Priya Nair',
      'Staff Full-Stack Engineer',
      'priya@example.com | San Francisco, CA',
      '',
      'Experience',
      'Vanguard Cloud',
      'Staff Full-Stack Engineer',
      'Jan 2022 - Present',
      '• Cut checkout API p99 latency by 41% across 30M daily requests',
      '',
      'Projects',
      'QueryLens',
      '• Diagnosed slow queries 4x faster across 60+ microservices',
      '',
      'Skills',
      'TypeScript, Go, PostgreSQL',
    ].join('\n');

    const fileInput = screen.getByTestId('json-resume-file-input');
    const txtFile = new File([txtResume], 'priya-resume.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    // Transitions into interactive review step
    await waitFor(() => {
      expect(screen.getByTestId('paste-review-step')).toBeInTheDocument();
    });

    // Guardrail: NOTHING persisted to backend before explicit user approval
    expect(createResumeSpy).not.toHaveBeenCalled();
    expect(mergeProfileSpy).not.toHaveBeenCalled();

    // Detected sections rendered for user inspection/editing
    expect(screen.getByTestId(`review-section-${SectionType.WORK}`)).toBeInTheDocument();
    expect(screen.getByTestId(`review-section-${SectionType.PROJECTS}`)).toBeInTheDocument();
    expect(screen.getByTestId(`review-section-${SectionType.SKILLS}`)).toBeInTheDocument();

    // Explicit approval persists resume and merges approved facts into CareerProfile
    fireEvent.click(screen.getByTestId('create-from-review-btn'));

    await waitFor(() => {
      expect(createResumeSpy).toHaveBeenCalledTimes(1);
    });
    expect(mergeProfileSpy).toHaveBeenCalledTimes(1);
    const createdPayload: any = createResumeSpy.mock.calls[0][0];
    const projSection = createdPayload.content.sections.find(
      (s: any) => s.type === SectionType.PROJECTS
    );
    expect(projSection.content[0].highlights).toContain(
      'Diagnosed slow queries 4x faster across 60+ microservices'
    );
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('displays clear guidance to upload DOCX or paste text when a scanned PDF has an empty text layer', async () => {
    render(
      <ImportResumeModal
        isOpen={true}
        onClose={jest.fn()}
        onImported={jest.fn()}
      />
    );

    const fileInput = screen.getByTestId('json-resume-file-input');
    const scannedPdf = new File([buildEmptyScannedPdfBytes()], 'scanned.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(fileInput, { target: { files: [scannedPdf] } });

    const alert = await screen.findByTestId('import-resume-error', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/scanned image/i);
    expect(alert).toHaveTextContent(/\.docx/i);
    expect(alert).toHaveTextContent(/paste/i);

    // Quick fallback button switches directly to Paste Text tab
    fireEvent.click(screen.getByTestId('scanned-pdf-paste-fallback-btn'));
    expect(screen.getByTestId('paste-resume-textarea')).toBeInTheDocument();
  });

  it('approving staged facts in CareerProfileWorkspace merges profile and unlocks immediate tailored resume creation', async () => {
    jest.spyOn(careerProfileService, 'getProfile').mockResolvedValueOnce(null);
    jest
      .spyOn(careerProfileService, 'mergeProfile')
      .mockResolvedValueOnce(sampleProfile);

    const onStartTailoredResume = jest.fn();

    render(
      <CareerProfileWorkspace
        user={{ name: 'Priya Nair', email: 'priya@example.com' }}
        onStartTailoredResume={onStartTailoredResume}
        onStartBlankResume={jest.fn()}
      />
    );

    // Initially shows empty state before approval
    await waitFor(() => {
      expect(screen.getByTestId('career-profile-empty-state')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('empty-state-import-profile-btn'));

    const fileInput = screen.getByTestId('json-resume-file-input');
    const txtFile = new File(
      ['Priya Nair\npriya@example.com\n\nSkills\nTypeScript, Go'],
      'resume.txt',
      { type: 'text/plain' }
    );
    fireEvent.change(fileInput, { target: { files: [txtFile] } });

    await waitFor(() => {
      expect(screen.getByTestId('paste-review-step')).toBeInTheDocument();
    });

    // Approve & Save to Profile
    fireEvent.click(screen.getByTestId('approve-profile-import-btn'));

    await waitFor(() => {
      expect(careerProfileService.mergeProfile).toHaveBeenCalledTimes(1);
    });

    // Profile workspace now displays approved sections and unlocks "Create Tailored Resume"
    await waitFor(() => {
      expect(
        screen.getByTestId('profile-create-tailored-resume-btn')
      ).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('Priya Nair')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('profile-create-tailored-resume-btn'));
    expect(screen.getByTestId('create-from-profile-modal')).toBeInTheDocument();

    // Deselect second role so the new resume is tailored to backend/platform
    const pixelWaveCheckbox = screen.getByLabelText(/Include role Frontend Engineer/i);
    fireEvent.click(pixelWaveCheckbox);

    fireEvent.click(screen.getByTestId('confirm-seed-from-profile-btn'));

    expect(onStartTailoredResume).toHaveBeenCalledTimes(1);
    const seededDraft = onStartTailoredResume.mock.calls[0][0];
    expect(seededDraft._id).toBeUndefined();
    expect(seededDraft.content.basics.name).toBe('Priya Nair');
    const workSection = seededDraft.content.sections.find(
      (s: any) => s.type === SectionType.WORK
    );
    expect(workSection.content).toHaveLength(1);
    expect(workSection.content[0].company).toBe('Vanguard Cloud');
  });

  it('clicking New Resume on HomePage opens profile section selector when a CareerProfile exists instead of blank fields', async () => {
    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([
      {
        id: 'existing-res-1',
        title: 'Existing Resume',
        userId: 'u1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        content: { basics: { name: 'Priya Nair', email: 'priya@example.com' }, sections: [], sectionOrder: [] },
      },
    ] as any);
    jest
      .spyOn(careerProfileService, 'getProfile')
      .mockResolvedValueOnce(sampleProfile);

    render(<HomePage user={{ name: 'Priya Nair', email: 'priya@example.com' }} />);

    await waitFor(() => {
      expect(screen.getByText('Existing Resume')).toBeInTheDocument();
    });

    // Click New Resume
    fireEvent.click(screen.getByRole('button', { name: /New Resume/i }));

    // Opens Create Tailored Resume from Career Profile modal
    await waitFor(() => {
      expect(screen.getByTestId('create-from-profile-modal')).toBeInTheDocument();
    });

    expect(screen.getByTestId('profile-seed-section-experience')).toBeInTheDocument();
    expect(screen.getByTestId('profile-seed-section-projects')).toBeInTheDocument();
    expect(screen.getByTestId('profile-seed-section-skills')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-seed-from-profile-btn'));

    // Opens ResumeEditor pre-seeded with Priya Nair's approved facts instead of empty "Your Name"
    await waitFor(() => {
      expect(screen.getByDisplayValue('Priya Nair')).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue('priya@example.com')).toBeInTheDocument();
  });

  it('prioritizes CareerProfile projects with structured bullet highlights in ImportProjectsModal and falls back to resumes when empty', async () => {
    const getProfileSpy = jest
      .spyOn(careerProfileService, 'getProfile')
      .mockResolvedValueOnce(sampleProfile);
    const getResumesSpy = jest
      .spyOn(resumeService, 'getResumes')
      .mockResolvedValue([]);

    const onImport = jest.fn();
    const { unmount } = render(
      <ImportProjectsModal isOpen={true} onClose={jest.fn()} onImport={onImport} />
    );

    await waitFor(() => {
      expect(screen.getByText('QueryLens')).toBeInTheDocument();
    });

    expect(getProfileSpy).toHaveBeenCalledTimes(1);
    expect(getResumesSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Career Profile')).toBeInTheDocument();
    expect(screen.getByTestId('import-project-highlights')).toHaveTextContent(
      'Diagnosed slow queries 4x faster across 60+ microservices'
    );

    fireEvent.click(screen.getByRole('button', { name: /Import Selected/i }));
    expect(onImport).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'QueryLens',
        description: 'Distributed SQL query profiler and flamegraph visualizer.',
        highlights: [
          'Diagnosed slow queries 4x faster across 60+ microservices',
          'Open-sourced with 1,800+ GitHub stars',
        ],
        tags: ['Rust', 'TypeScript', 'React'],
        demoUrl: 'https://querylens.dev',
        githubUrl: 'https://github.com/priyanair/querylens',
      }),
    ]);

    unmount();

    // Fallback when CareerProfile has empty projects
    getProfileSpy.mockResolvedValueOnce({
      ...sampleProfile,
      projects: [],
    });
    getResumesSpy.mockResolvedValueOnce([
      {
        id: 'res-fallback',
        title: 'Fallback CV',
        content: {
          basics: { name: 'Priya', email: 'priya@example.com' },
          sections: [
            {
              id: 'projects',
              type: 'projects',
              title: 'Projects',
              content: [
                {
                  id: 'fp-1',
                  name: 'Resume Fallback Project',
                  description: 'Imported from existing resume.',
                  highlights: ['Handled 10k concurrent WebSocket clients'],
                  technologies: ['Node.js'],
                },
              ],
            },
          ],
          sectionOrder: ['projects'],
        },
      } as any,
    ]);

    const onFallbackImport = jest.fn();
    render(
      <ImportProjectsModal
        isOpen={true}
        onClose={jest.fn()}
        onImport={onFallbackImport}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Resume Fallback Project')).toBeInTheDocument();
    });
    expect(screen.getByText('Fallback CV')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import Selected/i }));
    expect(onFallbackImport).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Resume Fallback Project',
        highlights: ['Handled 10k concurrent WebSocket clients'],
      }),
    ]);
  });

  it('keeps edits in a tailored resume isolated from CareerProfile on Save unless Sync to Profile is explicitly clicked', async () => {
    const updateResumeSpy = jest
      .spyOn(resumeService, 'updateResume')
      .mockResolvedValue({ _id: 'tailored-1', title: 'Tailored Staff Resume' } as any);
    const mergeProfileSpy = jest
      .spyOn(careerProfileService, 'mergeProfile')
      .mockResolvedValue(sampleProfile);

    render(
      <ResumeEditor
        initialResume={{
          _id: 'tailored-1',
          title: 'Tailored Staff Resume',
          summary: 'Tailored summary for FinTech role.',
          templateId: 'classic',
          content: {
            basics: {
              name: 'Priya Nair',
              label: 'Staff Full-Stack Engineer',
              email: 'priya@example.com',
              summary: 'Tailored summary for FinTech role.',
            },
            sections: [],
            sectionOrder: [],
          },
        }}
        onBack={jest.fn()}
      />
    );

    const titleInput = screen.getByLabelText(/Professional Title/i);
    fireEvent.change(titleInput, {
      target: { value: 'Principal FinTech Architect' },
    });

    // Normal Save writes ONLY to the tailored resume, leaving CareerProfile untouched
    fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));
    await waitFor(() => {
      expect(updateResumeSpy).toHaveBeenCalledTimes(1);
    });
    expect(mergeProfileSpy).not.toHaveBeenCalled();

    // Explicit "Sync to Profile" pushes changes to CareerProfile
    fireEvent.click(screen.getByTestId('toolbar-overflow-btn'));
    fireEvent.click(screen.getByTestId('sync-to-profile-menu-btn'));

    await waitFor(() => {
      expect(mergeProfileSpy).toHaveBeenCalledTimes(1);
    });
    expect(mergeProfileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          basics: expect.objectContaining({
            label: 'Principal FinTech Architect',
          }),
        }),
      })
    );
  });
});
