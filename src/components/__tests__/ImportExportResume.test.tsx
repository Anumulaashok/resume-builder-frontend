import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import HomePage from '../HomePage';
import ResumeEditor from '../ResumeEditor';
import { Resume, resumeService } from '../../services/resume.service';
import { SectionType } from '../../types/resume';
import {
  JSON_RESUME_SCHEMA_V1,
  importJsonResume,
  parseJsonResumeString,
} from '../../utils/importers';

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

jest.mock('../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn(),
    createResume: jest.fn(),
    updateResume: jest.fn(),
    deleteResume: jest.fn(),
    generateFromPrompt: jest.fn(),
    exportResumePdf: jest.fn(),
    exportResumeDocx: jest.fn(),
    exportResumeTxt: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => {
  const fn: any = jest.fn();
  fn.success = jest.fn();
  fn.error = jest.fn();
  return {
    __esModule: true,
    default: fn,
  };
});

const mockedService = resumeService as jest.Mocked<typeof resumeService>;

const buildExistingResume = (): Resume => ({
  id: 'res-existing-1',
  title: 'Existing Engineer Resume',
  templateId: 'modern',
  summary: 'Experienced full-stack engineer.',
  content: {
    basics: {
      name: 'Samira Khan',
      label: 'Senior Full-Stack Engineer',
      email: 'samira@example.com',
      phone: '555-0102',
      url: 'https://samirakhan.dev',
      summary: 'Experienced full-stack engineer.',
      location: {
        address: '',
        postalCode: '',
        city: 'Chicago',
        countryCode: 'US',
        region: 'IL',
      },
    },
    sections: [
      {
        id: 'sec-work-1',
        type: SectionType.WORK,
        title: 'Professional Experience',
        enabled: true,
        content: [
          {
            id: 'w-1',
            enabled: true,
            name: 'Northstar Labs',
            company: 'Northstar Labs',
            position: 'Senior Full-Stack Engineer',
            startDate: 'Feb 2021',
            endDate: '',
            current: true,
            location: 'Chicago, IL',
            description: 'Led core web platform.',
            highlights: ['Shipped real-time collaboration'],
          },
        ],
      },
    ],
    sectionOrder: ['sec-work-1'],
  },
});

describe('Resume Import Modal & Editor Export JSON integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Import button in empty state and opens modal with JSON Upload and Paste Text options (closes on Escape)', async () => {
    mockedService.getResumes.mockResolvedValueOnce([]);

    render(<HomePage user={{ name: 'Test User', email: 'test@example.com' }} />);

    const emptyState = await screen.findByTestId('resume-empty-state');
    const importBtn = within(emptyState).getByTestId('import-resume-btn');
    expect(importBtn).toHaveTextContent(/^Import$/);

    fireEvent.click(importBtn);

    const dialog = screen.getByRole('dialog', { name: /import resume/i });
    expect(dialog).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /upload json resume/i })
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /paste text/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /import resume/i })
      ).not.toBeInTheDocument();
    });
  });

  it('imports a JSON Resume v1 file via the Import modal, calls createResume with mapped sections, and opens the editor', async () => {
    mockedService.getResumes.mockResolvedValueOnce([buildExistingResume()]);

    mockedService.createResume.mockImplementation(async (payload) => ({
      ...payload,
      id: 'res-imported-json',
    }));

    render(<HomePage user={{ name: 'Fallback User', email: 'fallback@example.com' }} />);

    // Wait for populated list header Import button
    const importBtn = await screen.findByTestId('import-resume-btn');
    fireEvent.click(importBtn);

    const jsonResumePayload = {
      $schema: JSON_RESUME_SCHEMA_V1,
      basics: {
        name: 'Lucas Meyer',
        label: 'Staff Security Engineer',
        email: 'lucas.meyer@example.com',
        phone: '+1 (212) 555-0177',
        url: 'https://lucasmeyer.sec',
        summary: 'Application & cloud security lead.',
        location: { city: 'New York', region: 'NY', countryCode: 'US' },
      },
      work: [
        {
          name: 'Aegis Security',
          position: 'Staff Security Engineer',
          startDate: '2020-05',
          highlights: ['Zero-trust service mesh rollout'],
        },
      ],
      education: [
        {
          institution: 'NYU',
          studyType: 'M.S.',
          area: 'Cybersecurity',
          startDate: '2016-09',
          endDate: '2018-05',
        },
      ],
      skills: [{ name: 'Cloud Security', keywords: ['AWS IAM', 'OPA', 'Sigstore'] }],
      volunteer: [
        {
          organization: 'OWASP NYC',
          position: 'Chapter Speaker',
          startDate: '2021-01',
        },
      ],
    };

    const file = new File(
      [JSON.stringify(jsonResumePayload)],
      'lucas-resume.json',
      { type: 'application/json' }
    );

    const fileInput = screen.getByTestId('json-resume-file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    const previewCard = await screen.findByTestId('json-import-preview');
    expect(previewCard).toHaveTextContent('Lucas Meyer — Staff Security Engineer');
    expect(previewCard).toHaveTextContent('Sections: 4');

    const confirmBtn = screen.getByTestId('confirm-json-import-btn');
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockedService.createResume).toHaveBeenCalledTimes(1);
    });

    const submitted = mockedService.createResume.mock.calls[0][0];
    expect(submitted.content.basics.name).toBe('Lucas Meyer');
    expect(submitted.content.basics.email).toBe('lucas.meyer@example.com');
    expect(submitted.content.sections.map((s) => s.type)).toEqual([
      SectionType.WORK,
      SectionType.EDUCATION,
      SectionType.SKILLS,
      SectionType.ORGANIZATIONS,
    ]);
    expect(submitted.content.sections.every((s) => s.enabled === true)).toBe(true);
    expect(submitted.content.sectionOrder).toEqual(
      submitted.content.sections.map((s) => s.id)
    );

    // Editor opens automatically with imported resume loaded
    expect(await screen.findByDisplayValue('Lucas Meyer')).toBeInTheDocument();
  });

  it('displays an error alert and prevents import when uploading invalid or unrecognized JSON', async () => {
    mockedService.getResumes.mockResolvedValueOnce([]);
    render(<HomePage />);

    const emptyState = await screen.findByTestId('resume-empty-state');
    fireEvent.click(within(emptyState).getByTestId('import-resume-btn'));

    const badFile = new File(['{"unrelated": 123}'], 'unrelated.json', {
      type: 'application/json',
    });
    fireEvent.change(screen.getByTestId('json-resume-file-input'), {
      target: { files: [badFile] },
    });

    const alert = await screen.findByTestId('import-resume-error');
    expect(alert).toHaveTextContent(/does not contain recognized json resume v1 fields/i);
    expect(screen.getByTestId('confirm-json-import-btn')).toBeDisabled();
    expect(mockedService.createResume).not.toHaveBeenCalled();
  });

  it('parses pasted resume text, shows an editable review step, persists user edits, and creates the resume', async () => {
    mockedService.getResumes.mockResolvedValueOnce([buildExistingResume()]);
    mockedService.createResume.mockImplementation(async (payload) => ({
      ...payload,
      id: 'res-imported-text',
    }));

    render(<HomePage user={{ name: 'Default Name', email: 'default@example.com' }} />);

    fireEvent.click(await screen.findByTestId('import-resume-btn'));

    // Switch to Paste Text tab
    fireEvent.click(screen.getByRole('tab', { name: /paste text/i }));

    const pastedResume = `
Nadia Alvarez
Principal Data Engineer
nadia.alvarez@example.com | (415) 555-0133

Experience
Data Platform Lead at Horizon Analytics
Jan 2020 - Present
• Built petabyte-scale lakehouse ingestion on Spark and Iceberg

Education
Cornell University | B.S. in Computer Science | Sep 2012 - May 2016

Skills
Python, SQL, Apache Spark, dbt
    `.trim();

    fireEvent.change(screen.getByTestId('paste-resume-textarea'), {
      target: { value: pastedResume },
    });

    fireEvent.click(screen.getByTestId('parse-text-review-btn'));

    // Editable review step is displayed with parsed sections
    const reviewStep = await screen.findByTestId('paste-review-step');
    expect(reviewStep).toBeInTheDocument();
    expect(
      screen.getByTestId(`review-section-${SectionType.WORK}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`review-section-${SectionType.EDUCATION}`)
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`review-section-${SectionType.SKILLS}`)
    ).toBeInTheDocument();

    // Edit name and work role in the review step before creating
    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
    expect(nameInput.value).toBe('Nadia Alvarez');
    fireEvent.change(nameInput, {
      target: { value: 'Nadia M. Alvarez' },
    });

    const roleInput = screen.getByLabelText(
      'Role for Horizon Analytics'
    ) as HTMLInputElement;
    expect(roleInput.value).toBe('Data Platform Lead');
    fireEvent.change(roleInput, {
      target: { value: 'VP of Data Platform' },
    });

    fireEvent.click(screen.getByTestId('create-from-review-btn'));

    await waitFor(() => {
      expect(mockedService.createResume).toHaveBeenCalledTimes(1);
    });

    const createdPayload = mockedService.createResume.mock.calls[0][0];
    expect(createdPayload.content.basics.name).toBe('Nadia M. Alvarez');
    expect(createdPayload.content.basics.email).toBe('nadia.alvarez@example.com');

    const createdWork = createdPayload.content.sections.find(
      (s) => s.type === SectionType.WORK
    );
    expect(createdWork?.content[0]).toMatchObject({
      name: 'Horizon Analytics',
      position: 'VP of Data Platform',
      startDate: 'Jan 2020',
      current: true,
      highlights: ['Built petabyte-scale lakehouse ingestion on Spark and Iceberg'],
    });
  });

  it('exports the current resume as JSON Resume from the editor overflow menu and round-trips cleanly', async () => {
    const sampleResume = buildExistingResume();

    let capturedBlobText = '';
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = jest.fn((blob: Blob) => {
      // Read blob content synchronously via mock capture
      capturedBlobText = '';
      if (blob && typeof (blob as any).text === 'function') {
        void (blob as any).text().then((t: string) => {
          capturedBlobText = t;
        });
      }
      return 'blob:mock-json-resume';
    }) as any;
    URL.revokeObjectURL = jest.fn();

    const anchorClickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        if (this.href.startsWith('data:application/json')) {
          const encoded = this.href.split(',')[1] || '';
          capturedBlobText = decodeURIComponent(encoded);
        }
      });

    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    fireEvent.click(screen.getByTestId('toolbar-overflow-btn'));
    const exportJsonItem = screen.getByRole('menuitem', {
      name: /^export json$/i,
    });
    expect(exportJsonItem).toBeInTheDocument();

    fireEvent.click(exportJsonItem);

    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    // Inspect the Blob passed to URL.createObjectURL
    const passedBlob = (URL.createObjectURL as jest.Mock).mock.calls[0][0] as Blob;
    expect(passedBlob.type).toContain('application/json');

    // Also verify overflow menu closed after clicking Export JSON
    expect(
      screen.queryByRole('menuitem', { name: /^export json$/i })
    ).not.toBeInTheDocument();

    // Read blob bytes using FileReader (supported in jsdom) and verify round-trip
    const jsonString =
      capturedBlobText ||
      (await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(passedBlob);
      }));

    const parsedSchema = parseJsonResumeString(jsonString);
    expect(parsedSchema.$schema).toBe(JSON_RESUME_SCHEMA_V1);
    expect(parsedSchema.basics?.name).toBe('Samira Khan');
    expect(parsedSchema.work?.[0].name).toBe('Northstar Labs');

    const roundTripped = importJsonResume(parsedSchema);
    expect(roundTripped.content.basics.name).toBe('Samira Khan');
    expect(roundTripped.content.sections[0].type).toBe(SectionType.WORK);
    expect(roundTripped.content.sections[0].content[0].highlights).toEqual([
      'Shipped real-time collaboration',
    ]);

    anchorClickSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});
