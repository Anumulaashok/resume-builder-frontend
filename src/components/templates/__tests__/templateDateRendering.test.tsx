import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  ModernTemplate,
  formatDate as formatModernDate,
} from '../ModernTemplate';
import {
  ProfessionalTemplate,
  formatDate as formatProfessionalDate,
} from '../ProfessionalTemplate';
import { dateFields, IResume, SectionType } from '../../../types/resume';

describe.each([
  ['ModernTemplate.formatDate', formatModernDate],
  ['ProfessionalTemplate.formatDate', formatProfessionalDate],
] as const)('%s helper', (_name, formatFn) => {
  it('returns empty string for empty, nullish, whitespace, or empty object inputs', () => {
    expect(formatFn()).toBe('');
    expect(formatFn(undefined)).toBe('');
    expect(formatFn(null)).toBe('');
    expect(formatFn('')).toBe('');
    expect(formatFn('   ')).toBe('');
    expect(formatFn({})).toBe('');
  });

  it('formats string, number, Date, and { month, year } object inputs into safe text', () => {
    expect(formatFn('Jan 2021')).toBe('Jan 2021');
    expect(formatFn('  2022-08  ')).toBe('2022-08');
    expect(formatFn(2023)).toBe('2023');
    expect(formatFn(new Date('2023-05-15T00:00:00.000Z'))).toBe('2023-05-15');
    expect(formatFn({ month: 'Mar', year: '2020' })).toBe('Mar 2020');
    expect(formatFn({ month: 'Oct' })).toBe('Oct');
    expect(formatFn({ year: 2024 })).toBe('2024');
  });

  it('never returns "[object Object]" for malformed nested objects', () => {
    expect(formatFn({ month: {}, year: null })).toBe('');
    expect(formatFn({ startDate: {}, endDate: {} })).toBe('');
    expect(formatFn([])).toBe('');
  });
});

const buildResumeWithSections = (sections: IResume['content']['sections']): IResume => ({
  title: 'Template Date Test Resume',
  content: {
    basics: {
      name: 'Taylor Morgan',
      label: 'Software Engineer',
      email: 'taylor@example.com',
      phone: '555-0123',
      summary: 'Experienced engineer.',
    },
    sections,
    sectionOrder: sections.map((s) => s.id),
  },
});

describe.each([
  ['ModernTemplate', ModernTemplate],
  ['ProfessionalTemplate', ProfessionalTemplate],
] as const)('%s safe date rendering', (_templateName, TemplateComponent) => {
  it('renders newly initialized work items with empty string dates without crashing', () => {
    const resume = buildResumeWithSections([
      {
        id: 'work-sec',
        type: SectionType.WORK,
        title: 'Work Experience',
        content: [
          {
            id: 'work-empty-str',
            name: 'New Startup',
            position: 'Founding Engineer',
            startDate: '',
            endDate: '',
            current: false,
            description: 'Building v1 product.',
          },
        ],
      },
    ]);

    render(<TemplateComponent resume={resume} onChange={jest.fn()} />);

    expect(screen.getByText('Founding Engineer')).toBeInTheDocument();
    expect(screen.getByText('New Startup')).toBeInTheDocument();
    expect(screen.queryByText(/Present/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders legacy work items with empty object dates ({}) without crashing', () => {
    const resume = buildResumeWithSections([
      {
        id: 'work-sec',
        type: SectionType.WORK,
        title: 'Work Experience',
        content: [
          {
            id: 'work-empty-obj',
            name: 'Legacy Corp',
            position: 'Systems Engineer',
            startDate: ({} as unknown) as string,
            endDate: ({} as unknown) as string,
            current: false,
          },
        ],
      },
    ]);

    render(<TemplateComponent resume={resume} readOnly />);

    expect(screen.getByText('Systems Engineer')).toBeInTheDocument();
    expect(screen.getByText('Legacy Corp')).toBeInTheDocument();
    expect(screen.queryByText(/Present/)).not.toBeInTheDocument();
  });

  it('renders string dates and { month, year } object dates cleanly', () => {
    const resume = buildResumeWithSections([
      {
        id: 'work-sec',
        type: SectionType.WORK,
        title: 'Work Experience',
        content: [
          {
            id: 'work-str',
            name: 'String Date Co',
            position: 'Senior Developer',
            startDate: 'Jan 2020',
            endDate: 'Dec 2022',
            current: false,
          },
          {
            id: 'work-obj',
            name: 'Object Date Co',
            position: 'Developer',
            startDate: ({ month: 'Feb', year: '2018' } as unknown) as string,
            endDate: ({ month: 'Dec', year: '2019' } as unknown) as string,
            current: false,
          },
        ],
      },
      {
        id: 'edu-sec',
        type: SectionType.EDUCATION,
        title: 'Education',
        content: [
          {
            id: 'edu-1',
            degree: 'B.S. Computer Science',
            field: 'State University',
            startDate: { month: 'Sep', year: '2014' } as dateFields,
            endDate: { month: 'May', year: '2018' } as dateFields,
            current: false,
          },
        ],
      },
    ]);

    render(<TemplateComponent resume={resume} readOnly />);

    expect(screen.getByText('Jan 2020 - Dec 2022')).toBeInTheDocument();
    expect(screen.getByText('Feb 2018 - Dec 2019')).toBeInTheDocument();
    expect(screen.getByText('Sep 2014 - May 2018')).toBeInTheDocument();
  });

  it('renders Present only when current is true or endDate equals Present, omitting Present for empty endDate when current is false', () => {
    const resume = buildResumeWithSections([
      {
        id: 'work-sec',
        type: SectionType.WORK,
        title: 'Work Experience',
        content: [
          {
            id: 'work-omitted-end',
            name: 'Omitted End Co',
            position: 'Lead Engineer',
            startDate: 'Mar 2023',
          },
          {
            id: 'work-whitespace-end',
            name: 'Whitespace End Co',
            position: 'Platform Engineer',
            startDate: 'Jun 2022',
            endDate: '   ',
            current: false,
          },
          {
            id: 'work-explicit-present',
            name: 'Explicit Present Co',
            position: 'Principal Engineer',
            startDate: 'Jan 2024',
            endDate: 'Present',
            current: false,
          },
          {
            id: 'work-current-only',
            name: 'Current Only Co',
            position: 'Advisor',
            startDate: '',
            endDate: '',
            current: true,
          },
        ],
      },
    ]);

    render(<TemplateComponent resume={resume} readOnly />);

    expect(screen.getByText('Mar 2023')).toBeInTheDocument();
    expect(screen.queryByText('Mar 2023 - Present')).not.toBeInTheDocument();
    expect(screen.getByText('Jun 2022')).toBeInTheDocument();
    expect(screen.queryByText('Jun 2022 - Present')).not.toBeInTheDocument();
    expect(screen.getByText('Jan 2024 - Present')).toBeInTheDocument();
    expect(screen.getByText('Present')).toBeInTheDocument();
  });
});
