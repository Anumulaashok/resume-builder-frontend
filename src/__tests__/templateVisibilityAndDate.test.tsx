import React from 'react';
import { render, screen } from '@testing-library/react';
import { formatResumeDate } from '../utils/date';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import { dateFields, IResume, SectionType } from '../types/resume';

describe('formatResumeDate', () => {
  it('returns empty string for undefined', () => {
    expect(formatResumeDate(undefined)).toBe('');
  });

  it('returns empty string for empty object {}', () => {
    expect(formatResumeDate({})).toBe('');
  });

  it('returns string value as-is', () => {
    expect(formatResumeDate('2021-06')).toBe('2021-06');
    expect(formatResumeDate('Jan 2020')).toBe('Jan 2020');
  });

  it('formats { month, year } object', () => {
    expect(formatResumeDate({ month: 'Sep', year: '2021' })).toBe('Sep 2021');
  });

  it('formats { year } only object', () => {
    expect(formatResumeDate({ year: '2021' })).toBe('2021');
  });

  it('formats { month } only object', () => {
    expect(formatResumeDate({ month: 'Sep' })).toBe('Sep');
  });
});

const buildBaseResume = (overrides?: Partial<IResume['content']>): IResume => ({
  title: 'Test Resume',
  content: {
    basics: {
      name: 'Alex Morgan',
      label: 'Software Engineer',
      email: 'alex@example.com',
      phone: '555-0100',
      summary: 'Summary text',
    },
    sections: [],
    sectionOrder: [],
    ...overrides,
  },
});

describe.each([
  ['ModernTemplate', ModernTemplate],
  ['ProfessionalTemplate', ProfessionalTemplate],
] as const)('%s visibility and date rendering', (_templateName, TemplateComponent) => {
  it('renders without crashing when item startDate and endDate are {} and omits date span', () => {
    const resume = buildBaseResume({
      sections: [
        {
          id: 'sec-work',
          type: SectionType.WORK,
          title: 'Work Experience',
          content: [
            {
              id: 'work-1',
              name: 'Beta Corp',
              position: 'Frontend Developer',
              startDate: ({} as unknown) as string,
              endDate: ({} as unknown) as string,
              current: false,
              description: 'Shipped UI features',
            },
          ],
        },
        {
          id: 'sec-edu',
          type: SectionType.EDUCATION,
          title: 'Education',
          content: [
            {
              id: 'edu-1',
              degree: 'B.S.',
              field: 'Computer Science',
              startDate: {} as dateFields,
              endDate: {} as dateFields,
              current: false,
            },
          ],
        },
      ],
      sectionOrder: ['sec-work', 'sec-edu'],
    });

    render(<TemplateComponent resume={resume} readOnly />);

    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Beta Corp')).toBeInTheDocument();
    expect(screen.getByText('B.S.')).toBeInTheDocument();
    expect(screen.queryByText(/Present/)).not.toBeInTheDocument();
  });

  it('formats date objects, string dates, and shows Present when current is true or endDate is empty', () => {
    const resume = buildBaseResume({
      sections: [
        {
          id: 'sec-work',
          type: SectionType.WORK,
          title: 'Work Experience',
          content: [
            {
              id: 'work-current',
              name: 'Current Co',
              position: 'Staff Engineer',
              startDate: '2022-03',
              endDate: '2023-01',
              current: true,
            },
            {
              id: 'work-past',
              name: 'Past Co',
              position: 'Junior Engineer',
              startDate: '2019-01',
              endDate: '2022-02',
              current: false,
            },
          ],
        },
        {
          id: 'sec-edu',
          type: SectionType.EDUCATION,
          title: 'Education',
          content: [
            {
              id: 'edu-ongoing',
              degree: 'M.S.',
              field: 'AI',
              startDate: { month: 'Sep', year: '2023' },
              endDate: {} as dateFields,
              current: false,
            },
          ],
        },
      ],
      sectionOrder: ['sec-work', 'sec-edu'],
    });

    render(<TemplateComponent resume={resume} readOnly />);

    expect(screen.getByText('2022-03 - Present')).toBeInTheDocument();
    expect(screen.getByText('2019-01 - 2022-02')).toBeInTheDocument();
    expect(screen.getByText('Sep 2023 - Present')).toBeInTheDocument();
  });

  it('keeps sections and items visible when enabled is true or undefined, and hides them when enabled is false', () => {
    const resume = buildBaseResume({
      sections: [
        {
          id: 'sec-enabled-true',
          type: SectionType.WORK,
          title: 'Enabled Work Section',
          enabled: true,
          content: [
            {
              id: 'item-enabled-true',
              name: 'Visible Enabled Co',
              position: 'Enabled Role',
              startDate: '2021',
              enabled: true,
            },
            {
              id: 'item-enabled-undefined',
              name: 'Visible Legacy Co',
              position: 'Legacy Role',
              startDate: '2020',
            },
            {
              id: 'item-enabled-false',
              name: 'Hidden Disabled Co',
              position: 'Disabled Role',
              startDate: '2019',
              enabled: false,
            },
          ],
        },
        {
          id: 'sec-enabled-undefined',
          type: SectionType.SKILLS,
          title: 'Legacy Skills Section',
          content: [
            {
              id: 'skill-1',
              name: 'TypeScript',
            },
          ],
        },
        {
          id: 'sec-enabled-false',
          type: SectionType.AWARDS,
          title: 'Disabled Awards Section',
          enabled: false,
          content: [
            {
              id: 'award-1',
              name: 'Hidden Award',
            },
          ],
        },
      ],
      sectionOrder: ['sec-enabled-true', 'sec-enabled-undefined', 'sec-enabled-false'],
    });

    render(<TemplateComponent resume={resume} readOnly />);

    // Sections with enabled: true and enabled: undefined are visible
    expect(screen.getByText('Enabled Work Section')).toBeInTheDocument();
    expect(screen.getByText('Legacy Skills Section')).toBeInTheDocument();
    // Section with enabled: false is hidden
    expect(screen.queryByText('Disabled Awards Section')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden Award')).not.toBeInTheDocument();

    // Items with enabled: true and enabled: undefined are visible
    expect(screen.getByText('Enabled Role')).toBeInTheDocument();
    expect(screen.getByText('Visible Enabled Co')).toBeInTheDocument();
    expect(screen.getByText('Legacy Role')).toBeInTheDocument();
    expect(screen.getByText('Visible Legacy Co')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();

    // Item with enabled: false is hidden
    expect(screen.queryByText('Disabled Role')).not.toBeInTheDocument();
    expect(screen.queryByText('Hidden Disabled Co')).not.toBeInTheDocument();
  });
});
