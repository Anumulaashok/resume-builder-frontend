import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview, { A4_WIDTH_PX } from '../components/ResumePreview';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import { IResume, SectionType } from '../types/resume';

type ResizeCallback = (entries: Array<{ target: Element; contentRect: { width: number; height: number } }>) => void;

describe('ResumePreview fit-to-width scaling, zoom, and non-overlapping toolbar', () => {
  let observers: Array<{ callback: ResizeCallback; elements: Set<Element> }> = [];
  const originalResizeObserver = (window as any).ResizeObserver;

  beforeEach(() => {
    observers = [];
    (window as any).ResizeObserver = class MockResizeObserver {
      callback: ResizeCallback;
      elements: Set<Element> = new Set();

      constructor(cb: ResizeCallback) {
        this.callback = cb;
        observers.push(this);
      }

      observe(el: Element) {
        this.elements.add(el);
      }

      unobserve(el: Element) {
        this.elements.delete(el);
      }

      disconnect() {
        this.elements.clear();
      }
    };
  });

  afterEach(() => {
    (window as any).ResizeObserver = originalResizeObserver;
  });

  const triggerViewportResize = (viewportEl: HTMLElement, width: number, height = 800) => {
    act(() => {
      observers.forEach((obs) => {
        if (obs.elements.has(viewportEl)) {
          obs.callback([
            {
              target: viewportEl,
              contentRect: { width, height },
            },
          ]);
        }
      });
    });
  };

  const sampleResume: IResume = {
    title: 'Preview Test Resume',
    content: {
      basics: {
        name: 'Jordan Lee',
        label: 'Senior Frontend Engineer',
        email: 'jordan@example.com',
        phone: '+1-555-0142',
        summary: 'Product-minded frontend engineer.',
        location: {
          city: 'Seattle',
          countryCode: 'US',
        },
      },
      sections: [],
      sectionOrder: [],
    },
  };

  it('scales the A4 page to fit narrow pane widths via ResizeObserver and supports manual zoom + Fit reset', () => {
    render(<ResumePreview resume={sampleResume} readOnly />);

    const viewport = screen.getByTestId('resume-preview-viewport');
    const page = screen.getByTestId('resume-preview-page');
    const scaler = screen.getByTestId('resume-preview-scaler');
    const zoomPctBtn = screen.getByTestId('zoom-percentage-btn');

    // Simulate narrow 500px preview pane (< 794px A4 width)
    triggerViewportResize(viewport, 500);

    const expectedFitScale = Number(((500 - 2) / A4_WIDTH_PX).toFixed(4)); // 0.6272
    expect(zoomPctBtn).toHaveTextContent(`${Math.round(expectedFitScale * 100)}%`);
    expect(page.style.transform).toBe(`scale(${expectedFitScale})`);
    expect(parseInt(scaler.style.width, 10)).toBeLessThanOrEqual(500);

    // Manual zoom in (+)
    fireEvent.click(screen.getByLabelText('Zoom in'));
    const zoomedInScale = Number((expectedFitScale + 0.1).toFixed(2));
    expect(zoomPctBtn).toHaveTextContent(`${Math.round(zoomedInScale * 100)}%`);

    // Manual zoom out (-)
    fireEvent.click(screen.getByLabelText('Zoom out'));
    const zoomedOutScale = Number((zoomedInScale - 0.1).toFixed(2));
    expect(zoomPctBtn).toHaveTextContent(`${Math.round(zoomedOutScale * 100)}%`);

    // Clicking Fit returns to automatic fit-to-width scale
    fireEvent.click(screen.getByTestId('zoom-fit-btn'));
    expect(zoomPctBtn).toHaveTextContent(`${Math.round(expectedFitScale * 100)}%`);

    // Widening pane beyond A4 width caps automatic fit scale at 100%
    triggerViewportResize(viewport, 1100);
    expect(zoomPctBtn).toHaveTextContent('100%');
    expect(page.style.transform).toBe('scale(1)');
  });

  it('places the toolbar outside the scaled page container and preserves print overrides', () => {
    render(<ResumePreview resume={sampleResume} />);

    const toolbar = screen.getByTestId('resume-preview-toolbar');
    const page = screen.getByTestId('resume-preview-page');

    // Toolbar must not be nested inside the scaled A4 page
    expect(page.contains(toolbar)).toBe(false);
    expect(toolbar.className).toContain('print:hidden');
    expect(page.className).toContain('print:!transform-none');

    // Template switcher toggles between Modern and Professional
    fireEvent.click(screen.getByText('Templates'));
    fireEvent.click(screen.getByText('Professional'));
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });
});

describe.each([
  ['ModernTemplate', ModernTemplate],
  ['ProfessionalTemplate', ProfessionalTemplate],
] as const)('%s complete work, education, projects, skills, and link rendering', (_name, TemplateComponent) => {
  it('renders position, company, location, and date range for work, education, and projects with enum SectionType', () => {
    const resume: IResume = {
      title: 'Full Resume',
      content: {
        basics: {
          name: 'Elena Rostova',
          label: 'Principal Frontend Architect',
          email: 'elena@example.com',
          phone: '555-0199',
          summary: '10+ years building resilient web platforms.',
          location: {
            city: 'Austin',
            countryCode: 'US',
          },
          ...({ website: 'https://elena.dev' } as any),
        },
        sections: [
          {
            id: 'sec-work',
            type: SectionType.WORK,
            title: 'Experience',
            content: [
              {
                id: 'w1',
                company: 'CloudScale Inc.',
                position: 'Senior Frontend Engineer',
                location: 'San Francisco, CA',
                startDate: { month: 'Jun', year: '2021' } as any,
                endDate: {} as any,
                current: true,
                description: 'Architected design system across 12 micro-frontends.',
              } as any,
            ],
          },
          {
            id: 'sec-edu',
            type: SectionType.EDUCATION,
            title: 'Education',
            content: [
              {
                id: 'e1',
                degree: 'B.S. in Computer Science',
                institution: 'UT Austin',
                field: 'Systems & HCI',
                location: 'Austin, TX',
                startDate: { month: 'Sep', year: '2013' },
                endDate: { month: 'May', year: '2017' },
                description: 'Graduated Magna Cum Laude',
              } as any,
            ],
          },
          {
            id: 'sec-proj',
            type: SectionType.PROJECTS,
            title: 'Projects',
            content: [
              {
                id: 'p1',
                name: 'OpenCanvas UI',
                position: 'Creator & Maintainer',
                company: 'Open Source',
                location: 'Remote',
                startDate: '2022',
                endDate: '2024',
                url: 'https://github.com/elena/opencanvas',
                description: 'Accessible headless canvas primitives.',
                technologies: ['React', 'Canvas API'],
              } as any,
            ],
          },
          {
            id: 'sec-skills',
            type: SectionType.SKILLS,
            title: 'Skills',
            content: [
              {
                id: 's1',
                name: 'Frontend',
                keywords: ['TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
              } as any,
              {
                id: 's2',
                name: 'Testing & Infra',
                subSkills: ['Playwright', 'Jest', 'Docker'],
              },
            ],
          },
        ],
        sectionOrder: ['sec-work', 'sec-edu', 'sec-proj', 'sec-skills'],
      },
    };

    render(<TemplateComponent resume={resume} readOnly />);

    // Work item: position, company, location, date range, description
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('CloudScale Inc.')).toBeInTheDocument();
    expect(screen.getByText('San Francisco, CA')).toBeInTheDocument();
    expect(screen.getByText('Jun 2021 - Present')).toBeInTheDocument();
    expect(screen.getByText('Architected design system across 12 micro-frontends.')).toBeInTheDocument();

    // Education item: degree, institution, field, location, date range
    expect(screen.getByText('B.S. in Computer Science')).toBeInTheDocument();
    expect(screen.getByText('UT Austin')).toBeInTheDocument();
    expect(screen.getByText('Systems & HCI')).toBeInTheDocument();
    expect(screen.getByText('Austin, TX')).toBeInTheDocument();
    expect(screen.getByText('Sep 2013 - May 2017')).toBeInTheDocument();

    // Project item: name, position, company, location, date range, styled link, technologies
    expect(screen.getByText('OpenCanvas UI')).toBeInTheDocument();
    expect(screen.getByText('Creator & Maintainer')).toBeInTheDocument();
    expect(screen.getByText('Open Source')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('2022 - 2024')).toBeInTheDocument();
    const projLink = screen.getByRole('link', { name: /github\.com\/elena\/opencanvas/i });
    expect(projLink).toHaveAttribute('href', 'https://github.com/elena/opencanvas');
    expect(screen.getByText('Canvas API')).toBeInTheDocument();

    // Skills groups + keywords array
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
    expect(screen.getByText('Tailwind CSS')).toBeInTheDocument();
    expect(screen.getByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Testing & Infra')).toBeInTheDocument();
    expect(screen.getByText('Playwright')).toBeInTheDocument();

    // Contact links styled in readOnly mode
    const emailLink = screen.getByRole('link', { name: 'elena@example.com' });
    expect(emailLink).toHaveAttribute('href', 'mailto:elena@example.com');
    const siteLink = screen.getByRole('link', { name: 'elena.dev' });
    expect(siteLink).toHaveAttribute('href', 'https://elena.dev');
  });

  it('handles lowercase/JSON-Resume section types (work, education, projects, skills) seamlessly in read-only mode', () => {
    const backendSeededResume: IResume = {
      title: 'Seeded Resume',
      content: {
        basics: {
          name: 'Sam Patel',
          label: 'Frontend Tech Lead',
          email: 'sam@example.com',
        },
        sections: [
          {
            id: 'work',
            type: 'work' as SectionType,
            title: 'Work Experience',
            content: [
              {
                id: 'w-seed-1',
                company: 'Nimbus Labs',
                position: 'Senior Frontend Engineer',
                location: 'New York, NY',
                startDate: '2020-04',
                endDate: '2024-08',
                description: 'Led core customer dashboard team.',
              } as any,
            ],
          },
          {
            id: 'skills',
            type: 'skills' as SectionType,
            title: 'Skills',
            content: [
              {
                id: 'sk-seed-1',
                name: 'Frontend',
                keywords: ['React', 'Redux', 'Vite'],
              } as any,
            ],
          },
        ],
        sectionOrder: ['work', 'skills'],
      },
    };

    render(<TemplateComponent resume={backendSeededResume} readOnly />);

    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    expect(screen.getByText('Nimbus Labs')).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText('2020-04 - 2024-08')).toBeInTheDocument();
    expect(screen.getByText('Frontend')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Redux')).toBeInTheDocument();
    expect(screen.getByText('Vite')).toBeInTheDocument();
  });
});
