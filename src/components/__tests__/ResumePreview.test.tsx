import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../ResumePreview';
import ResumeEditor from '../ResumeEditor';
import { ModernTemplate } from '../templates/ModernTemplate';
import { ProfessionalTemplate } from '../templates/ProfessionalTemplate';
import { IResume, SectionType } from '../../types/resume';

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
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
  },
}));

const buildVisibilityResume = (templateId: 'modern' | 'professional' = 'modern'): IResume => ({
  _id: 'resume-vis-1',
  title: 'Template Item Filtering Resume',
  templateId,
  content: {
    basics: {
      name: 'Taylor Rivera',
      label: 'Staff Software Engineer',
      email: 'taylor@example.com',
      phone: '555-0188',
      summary: 'Experienced full-stack engineer.',
    },
    sections: [
      {
        id: 'sec-work',
        type: SectionType.WORK,
        title: 'Work Experience',
        content: [
          {
            id: 'work-enabled-true',
            name: 'Enabled Corp',
            position: 'Principal Architect',
            startDate: '2022',
            current: true,
            description: 'Leading core platform architecture.',
            enabled: true,
          },
          {
            id: 'work-enabled-undefined',
            name: 'Default Undefined Corp',
            position: 'Senior Engineer',
            startDate: '2019',
            endDate: '2022',
            description: 'Built distributed microservices.',
          },
          {
            id: 'work-enabled-false',
            name: 'Disabled Hidden Corp',
            position: 'Hidden Intern Role',
            startDate: '2017',
            endDate: '2019',
            description: 'Should not appear on preview canvas.',
            enabled: false,
          },
        ],
      },
      {
        id: 'sec-edu',
        type: SectionType.EDUCATION,
        title: 'Education',
        content: [
          {
            id: 'edu-enabled-true',
            degree: 'M.S. Computer Science',
            field: 'Distributed Systems',
            enabled: true,
          },
          {
            id: 'edu-enabled-false',
            degree: 'Hidden Certificate Program',
            field: 'Obsolete Studies',
            enabled: false,
          },
        ],
      },
      {
        id: 'sec-projects',
        type: SectionType.PROJECTS,
        title: 'Projects',
        content: [
          {
            id: 'proj-undefined',
            name: 'Default Visible Project',
            description: 'Open-source observability toolkit.',
          },
          {
            id: 'proj-disabled',
            name: 'Suppressed Draft Project',
            description: 'Hidden project description.',
            enabled: false,
          },
        ],
      },
      {
        id: 'sec-skills',
        type: SectionType.SKILLS,
        title: 'Skills',
        content: [
          {
            id: 'skill-true',
            name: 'TypeScript',
            enabled: true,
          },
          {
            id: 'skill-undefined',
            name: 'React',
          },
          {
            id: 'skill-false',
            name: 'DeprecatedFlashSkill',
            enabled: false,
          },
        ],
      },
      {
        id: 'sec-all-disabled',
        type: SectionType.AWARDS,
        title: 'Awards',
        content: [
          {
            id: 'award-disabled-1',
            name: 'Suppressed Award Entry',
            issuer: 'Hidden Org',
            enabled: false,
          },
        ],
      },
    ],
    sectionOrder: [
      'sec-work',
      'sec-edu',
      'sec-projects',
      'sec-skills',
      'sec-all-disabled',
    ],
  },
});

describe('ResumePreview and Template Item Filtering', () => {
  describe.each([
    ['modern', 'Modern', ModernTemplate],
    ['professional', 'Professional', ProfessionalTemplate],
  ] as const)(
    '%s template (%s)',
    (templateId, _templateLabel, TemplateComponent) => {
      it('renders items when enabled is true or undefined and suppresses items when enabled is false', () => {
        const resume = buildVisibilityResume(templateId);
        render(<ResumePreview resume={resume} readOnly />);

        const page = screen.getByTestId('resume-preview-page');

        // Section headings remain intact
        expect(within(page).getByText('Work Experience')).toBeInTheDocument();
        expect(within(page).getByText('Education')).toBeInTheDocument();
        expect(within(page).getByText('Projects')).toBeInTheDocument();
        expect(within(page).getByText('Skills')).toBeInTheDocument();
        expect(within(page).getByText('Awards')).toBeInTheDocument();

        // Items with enabled: true render
        expect(within(page).getByText('Principal Architect')).toBeInTheDocument();
        expect(within(page).getByText('Enabled Corp')).toBeInTheDocument();
        expect(within(page).getByText('M.S. Computer Science')).toBeInTheDocument();
        expect(within(page).getByText('TypeScript')).toBeInTheDocument();

        // Items with enabled: undefined render by default
        expect(within(page).getByText('Senior Engineer')).toBeInTheDocument();
        expect(within(page).getByText('Default Undefined Corp')).toBeInTheDocument();
        expect(within(page).getByText('Default Visible Project')).toBeInTheDocument();
        expect(within(page).getByText('React')).toBeInTheDocument();

        // Items with enabled: false are suppressed
        expect(within(page).queryByText('Hidden Intern Role')).not.toBeInTheDocument();
        expect(within(page).queryByText('Disabled Hidden Corp')).not.toBeInTheDocument();
        expect(
          within(page).queryByText('Should not appear on preview canvas.')
        ).not.toBeInTheDocument();
        expect(
          within(page).queryByText('Hidden Certificate Program')
        ).not.toBeInTheDocument();
        expect(
          within(page).queryByText('Suppressed Draft Project')
        ).not.toBeInTheDocument();
        expect(within(page).queryByText('DeprecatedFlashSkill')).not.toBeInTheDocument();
        expect(
          within(page).queryByText('Suppressed Award Entry')
        ).not.toBeInTheDocument();
      });

      it('suppresses disabled items in interactive (non-readOnly) mode while preserving inline editing on enabled items', async () => {
        const onChange = jest.fn();
        const resume = buildVisibilityResume(templateId);
        render(<TemplateComponent resume={resume} onChange={onChange} readOnly={false} />);

        expect(screen.getByText('Principal Architect')).toBeInTheDocument();
        expect(screen.getByText('Senior Engineer')).toBeInTheDocument();
        expect(screen.queryByText('Hidden Intern Role')).not.toBeInTheDocument();
        expect(screen.queryByText('Suppressed Award Entry')).not.toBeInTheDocument();

        // Verify inline editing on an enabled item updates the right item without dropping disabled items
        fireEvent.click(screen.getByText('Senior Engineer'));
        const input = await screen.findByDisplayValue('Senior Engineer');
        fireEvent.change(input, { target: { value: 'Lead Platform Engineer' } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledTimes(1);
        const updatedResume: IResume = onChange.mock.calls[0][0];
        const workSection = updatedResume.content.sections.find(
          (s) => s.id === 'sec-work'
        )!;
        expect(workSection.content).toHaveLength(3);
        expect(
          workSection.content.find((i) => i.id === 'work-enabled-undefined')
        ).toEqual(
          expect.objectContaining({
            position: 'Lead Platform Engineer',
          })
        );
        expect(
          workSection.content.find((i) => i.id === 'work-enabled-false')
        ).toEqual(
          expect.objectContaining({
            enabled: false,
          })
        );
      });
    }
  );

  it('preserves item filtering rules when switching templates in ResumePreview', () => {
    const resume = buildVisibilityResume('modern');
    render(<ResumePreview resume={resume} />);

    const page = screen.getByTestId('resume-preview-page');
    expect(within(page).getByText('Professional Summary')).toBeInTheDocument();
    expect(within(page).getByText('Principal Architect')).toBeInTheDocument();
    expect(within(page).getByText('Senior Engineer')).toBeInTheDocument();
    expect(within(page).queryByText('Hidden Intern Role')).not.toBeInTheDocument();

    // Switch to Professional template
    fireEvent.click(screen.getByText('Templates'));
    fireEvent.click(screen.getByText('Professional'));

    expect(within(page).getByText('Profile')).toBeInTheDocument();
    expect(within(page).getByText('Principal Architect')).toBeInTheDocument();
    expect(within(page).getByText('Senior Engineer')).toBeInTheDocument();
    expect(within(page).queryByText('Hidden Intern Role')).not.toBeInTheDocument();
  });

  it('hides an item when toggled off (enabled: false) and re-renders it when toggled back on (enabled: true) in ResumeEditor', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    try {
      const initialResume: IResume = {
        _id: 'resume-toggle-e2e',
        title: 'Toggle Test Resume',
        content: {
          basics: {
            name: 'Casey Jordan',
            label: 'Frontend Engineer',
            email: 'casey@example.com',
          },
          sections: [
            {
              id: 'sec-work',
              type: SectionType.WORK,
              title: 'Experience',
              content: [
                {
                  id: 'work-toggle-1',
                  name: 'Toggleable Labs',
                  position: 'Staff UI Engineer',
                  startDate: '2023',
                  current: true,
                  description: 'Interactive preview toggle verification.',
                },
              ],
            },
          ],
          sectionOrder: ['sec-work'],
        },
      };

      render(<ResumeEditor initialResume={initialResume} onBack={jest.fn()} />);

      const previewPage = screen.getByTestId('resume-preview-page');

      // Initially enabled is undefined -> item renders on preview canvas
      expect(within(previewPage).getByText('Staff UI Engineer')).toBeInTheDocument();
      expect(within(previewPage).getByText('Toggleable Labs')).toBeInTheDocument();

      // Click Hide in editor -> item.enabled becomes false -> item disappears from preview
      fireEvent.click(
        screen.getByRole('button', { name: 'Hide Toggleable Labs' })
      );
      expect(
        within(previewPage).queryByText('Staff UI Engineer')
      ).not.toBeInTheDocument();
      expect(
        within(previewPage).queryByText('Toggleable Labs')
      ).not.toBeInTheDocument();

      // Click Show in editor -> item.enabled becomes true -> item re-renders on preview
      fireEvent.click(
        screen.getByRole('button', { name: 'Show Toggleable Labs' })
      );
      expect(within(previewPage).getByText('Staff UI Engineer')).toBeInTheDocument();
      expect(within(previewPage).getByText('Toggleable Labs')).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
