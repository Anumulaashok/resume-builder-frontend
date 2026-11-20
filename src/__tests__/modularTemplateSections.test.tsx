import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../components/ResumePreview';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import {
  DateRange,
  SectionRenderer,
  SkillList,
  TemplateProvider,
} from '../components/templates/shared';
import {
  formatSkillLevel,
  parseSkillLevelInput,
  resolveSectionKind,
} from '../components/templates/templateHelpers';
import { IResume, ISection, SectionType } from '../types/resume';

function buildFullSixteenSectionResume(): IResume {
  const sections: ISection[] = [
    {
      id: 'sec-work',
      type: SectionType.WORK,
      title: 'Work Experience',
      content: [
        {
          id: 'work-1',
          name: 'Stellar Systems',
          position: 'Staff Platform Engineer',
          location: 'Seattle, WA',
          startDate: 'Jan 2022',
          current: true,
          description: 'Scaled multi-region event streaming infrastructure.',
        },
      ],
    },
    {
      id: 'sec-education',
      type: SectionType.EDUCATION,
      title: 'Education',
      content: [
        {
          id: 'edu-1',
          degree: 'M.S. in Distributed Computing',
          field: 'Carnegie Mellon University',
          location: 'Pittsburgh, PA',
          startDate: { month: 'Sep', year: '2017' },
          endDate: { month: 'May', year: '2019' },
          description: 'Graduate Research Fellow in Fault-Tolerant Systems.',
        },
      ],
    },
    {
      id: 'sec-projects',
      type: SectionType.PROJECTS,
      title: 'Projects',
      content: [
        {
          id: 'proj-1',
          name: 'HyperMesh Router',
          startDate: 'Mar 2023',
          endDate: 'Nov 2023',
          url: 'https://github.com/stellar/hypermesh',
          description: 'Zero-copy service mesh proxy written in Rust and TypeScript.',
          technologies: ['Rust', 'WebAssembly', 'gRPC'],
        },
      ],
    },
    {
      id: 'sec-skills',
      type: SectionType.SKILLS,
      title: 'Core Skills',
      content: [
        {
          id: 'skill-1',
          name: 'Frontend Architecture',
          level: 5,
          subSkills: ['React 19', 'TypeScript', 'Design Systems'],
        },
        {
          id: 'skill-2',
          name: 'Cloud Native',
          level: 'Expert' as any,
          subSkills: ['Kubernetes', 'Terraform'],
        },
      ],
    },
    {
      id: 'sec-tech-skills',
      type: SectionType.TECK_SKILLS,
      title: 'Technical Skills',
      content: [
        {
          id: 'ts-1',
          name: 'Data & Storage',
          level: 90,
          technologies: ['PostgreSQL', 'ClickHouse', 'Redis'],
        },
      ],
    },
    {
      id: 'sec-soft-skills',
      type: SectionType.SOFTSKILSS,
      title: 'Soft Skills',
      content: [
        {
          id: 'ss-1',
          name: 'Technical Mentorship',
          level: 5,
        },
        {
          id: 'ss-2',
          name: 'Executive Communication',
          level: 'Advanced' as any,
        },
      ],
    },
    {
      id: 'sec-languages',
      type: SectionType.LANGUAGES,
      title: 'Languages',
      content: [
        {
          id: 'lang-1',
          name: 'English',
          level: 'Native',
          proficiency: 100,
        },
        {
          id: 'lang-2',
          name: 'Spanish',
          level: 'Professional Working Proficiency',
          proficiency: 80,
        },
      ],
    },
    {
      id: 'sec-certificates',
      type: SectionType.CERTIFICATES,
      title: 'Certifications',
      content: [
        {
          id: 'cert-1',
          name: 'Certified Kubernetes Security Specialist',
          issuer: 'Cloud Native Computing Foundation',
          date: 'Jun 2024',
          url: 'https://cncf.io/verify/cks-9941',
        },
      ],
    },
    {
      id: 'sec-awards',
      type: SectionType.AWARDS,
      title: 'Awards',
      content: [
        {
          id: 'award-1',
          name: 'Distinguished Engineering Innovation Award',
          issuer: 'Stellar Systems',
          date: 'Dec 2023',
          url: 'https://stellar.dev/awards/2023',
          description: 'Recognized for cutting global tail latency by 52%.',
        } as any,
      ],
    },
    {
      id: 'sec-courses',
      type: SectionType.COURSES,
      title: 'Courses',
      content: [
        {
          id: 'course-1',
          name: 'Advanced Compilers & Program Analysis',
          institution: 'MIT OpenCourseWare',
          date: '2023',
          description: 'SSA optimizations, register allocation, and LLVM passes.',
        },
      ],
    },
    {
      id: 'sec-organizations',
      type: SectionType.ORGANIZATIONS,
      title: 'Organizations',
      content: [
        {
          id: 'org-1',
          name: 'Open Source Security Foundation',
          position: 'Working Group Lead',
          startDate: 'Feb 2022',
          current: true,
          description: 'Coordinating supply-chain verification standards.',
        },
      ],
    },
    {
      id: 'sec-publications',
      type: SectionType.PUBLICATIONS,
      title: 'Publications',
      content: [
        {
          id: 'pub-1',
          title: 'Deterministic Consensus at Edge Scale',
          publisher: 'USENIX ATC',
          date: 'Jul 2024',
          url: 'https://usenix.org/papers/consensus-edge',
          description: 'Presented low-overhead state replication across 40 PoPs.',
        },
      ],
    },
    {
      id: 'sec-references',
      type: SectionType.REFERENCES,
      title: 'References',
      content: [
        {
          id: 'ref-1',
          name: 'Dr. Maya Lin',
          position: 'VP of Infrastructure',
          company: 'Stellar Systems',
          contact: 'maya.lin@stellar.dev',
          url: 'https://linkedin.com/in/maya-lin',
          description: 'Consistently delivered mission-critical distributed architecture.',
        },
      ],
    },
    {
      id: 'sec-interests',
      type: SectionType.INTERESTS,
      title: 'Interests',
      content: [
        {
          id: 'int-1',
          name: 'Amateur Radio & SDR',
          description: 'Building low-noise HF transceivers and digital signal decoders.',
        },
      ],
    },
    {
      id: 'sec-achievements',
      type: SectionType.ACHIVEMENTS,
      title: 'Achievements',
      content: [
        {
          id: 'ach-1',
          name: 'Zero-Downtime Database Migration',
          issuer: 'Platform Reliability Guild',
          date: '2024',
          description: 'Migrated 18TB of production shards without customer impact.',
        } as any,
      ],
    },
    {
      id: 'sec-custom',
      type: SectionType.CUSTOM,
      title: 'Patents & Speaking',
      content: [
        {
          id: 'cust-1',
          title: 'Adaptive Rate Limiting Patent',
          subtitle: 'Lead Inventor',
          location: 'USPTO',
          startDate: '2024',
          endDate: '2024',
          url: 'https://patents.example.com/us-119001',
          description: 'Granted patent covering congestion-aware token buckets.',
          patentNumber: 'US-11,900,100',
        },
      ],
    },
  ];

  return {
    title: 'Comprehensive 16-Section Resume',
    content: {
      basics: {
        name: 'Devon Avery',
        label: 'Principal Systems Architect',
        email: 'devon@avery.dev',
        phone: '+1-555-0188',
        summary: 'Systems and UI platform architect.',
        location: {
          city: 'Seattle',
          countryCode: 'US',
        },
      },
      sections,
      sectionOrder: sections.map((s) => s.id),
    },
  };
}

describe('Shared Template Primitives: 16-Section Polish & Safeguards', () => {
  beforeEach(() => {
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('resolves all 16 SectionType enum values cleanly and formats string & numeric skill levels', () => {
    const allEnumValues = Object.values(SectionType);
    expect(allEnumValues).toHaveLength(16);

    allEnumValues.forEach((type) => {
      const kind = resolveSectionKind({
        id: `test-${type}`,
        type,
        title: type,
        content: [],
      });
      expect(kind).toBeTruthy();
    });

    expect(formatSkillLevel('Expert')).toBe('Expert');
    expect(formatSkillLevel(5)).toBe('Level 5/5');
    expect(formatSkillLevel(90)).toBe('90%');
    expect(formatSkillLevel(0)).toBe('');
    expect(formatSkillLevel(null)).toBe('');

    expect(parseSkillLevelInput('Level 4/5')).toBe(4);
    expect(parseSkillLevelInput('85%')).toBe(85);
    expect(parseSkillLevelInput('Principal')).toBe('Principal');
  });

  describe.each([
    ['ModernTemplate', ModernTemplate],
    ['ProfessionalTemplate', ProfessionalTemplate],
  ] as const)(
    '%s renders all 16 section types with structured metadata and secure links',
    (_templateName, TemplateComponent) => {
      it('displays complete structured metadata for all 16 section types in read-only mode', () => {
        const resume = buildFullSixteenSectionResume();
        const { container } = render(<TemplateComponent resume={resume} readOnly />);

        const renderedSections = container.querySelectorAll('section[data-section-id]');
        expect(renderedSections).toHaveLength(16);

        // 1. Work
        expect(screen.getByText('Staff Platform Engineer')).toBeInTheDocument();
        expect(screen.getAllByText('Stellar Systems').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('Jan 2022 - Present')).toBeInTheDocument();

        // 2. Education
        expect(screen.getByText('M.S. in Distributed Computing')).toBeInTheDocument();
        expect(screen.getByText('Carnegie Mellon University')).toBeInTheDocument();
        expect(screen.getByText('Sep 2017 - May 2019')).toBeInTheDocument();

        // 3. Projects: name, date range, description, technology badges, clickable link
        expect(screen.getByText('HyperMesh Router')).toBeInTheDocument();
        expect(screen.getByText('Mar 2023 - Nov 2023')).toBeInTheDocument();
        expect(
          screen.getByText('Zero-copy service mesh proxy written in Rust and TypeScript.')
        ).toBeInTheDocument();
        expect(screen.getByText('Rust')).toBeInTheDocument();
        expect(screen.getByText('WebAssembly')).toBeInTheDocument();
        expect(screen.getByText('gRPC')).toBeInTheDocument();
        const projectLink = screen.getByRole('link', {
          name: /github\.com\/stellar\/hypermesh/i,
        });
        expect(projectLink).toHaveAttribute('href', 'https://github.com/stellar/hypermesh');
        expect(projectLink).toHaveAttribute('target', '_blank');
        expect(projectLink).toHaveAttribute('rel', 'noopener noreferrer');

        // 4. Skills: categories, proficiency levels alongside subskill badges
        expect(screen.getByText('Frontend Architecture')).toBeInTheDocument();
        expect(screen.getAllByText('Level 5/5').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('React 19')).toBeInTheDocument();
        expect(screen.getByText('Design Systems')).toBeInTheDocument();
        expect(screen.getByText('Cloud Native')).toBeInTheDocument();
        expect(screen.getByText('Expert')).toBeInTheDocument();
        expect(screen.getByText('Kubernetes')).toBeInTheDocument();

        // 5. Technical Skills
        expect(screen.getByText('Data & Storage')).toBeInTheDocument();
        expect(screen.getByText('90%')).toBeInTheDocument();
        expect(screen.getByText('ClickHouse')).toBeInTheDocument();

        // 6. Soft Skills
        expect(screen.getByText('Technical Mentorship')).toBeInTheDocument();
        expect(screen.getByText('Executive Communication')).toBeInTheDocument();

        // 7. Languages (fluency + numeric proficiency percentage)
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Native')).toBeInTheDocument();
        expect(screen.getByText('(100%)')).toBeInTheDocument();
        expect(screen.getByText('Spanish')).toBeInTheDocument();
        expect(screen.getByText('(80%)')).toBeInTheDocument();

        // 8. Certificates
        expect(
          screen.getByText('Certified Kubernetes Security Specialist')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Cloud Native Computing Foundation')
        ).toBeInTheDocument();
        expect(screen.getByText('Jun 2024')).toBeInTheDocument();
        const certLink = screen.getByRole('link', { name: /cncf\.io\/verify\/cks-9941/i });
        expect(certLink).toHaveAttribute('href', 'https://cncf.io/verify/cks-9941');
        expect(certLink).toHaveAttribute('target', '_blank');
        expect(certLink).toHaveAttribute('rel', 'noopener noreferrer');

        // 9. Awards
        expect(
          screen.getByText('Distinguished Engineering Innovation Award')
        ).toBeInTheDocument();
        expect(screen.getByText('Dec 2023')).toBeInTheDocument();
        const awardLink = screen.getByRole('link', { name: /stellar\.dev\/awards\/2023/i });
        expect(awardLink).toHaveAttribute('href', 'https://stellar.dev/awards/2023');

        // 10. Courses
        expect(
          screen.getByText('Advanced Compilers & Program Analysis')
        ).toBeInTheDocument();
        expect(screen.getByText('MIT OpenCourseWare')).toBeInTheDocument();

        // 11. Organizations
        expect(screen.getByText('Open Source Security Foundation')).toBeInTheDocument();
        expect(screen.getByText('Working Group Lead')).toBeInTheDocument();
        expect(screen.getByText('Feb 2022 - Present')).toBeInTheDocument();

        // 12. Publications
        expect(
          screen.getByText('Deterministic Consensus at Edge Scale')
        ).toBeInTheDocument();
        expect(screen.getByText('USENIX ATC')).toBeInTheDocument();
        const pubLink = screen.getByRole('link', {
          name: /usenix\.org\/papers\/consensus-edge/i,
        });
        expect(pubLink).toHaveAttribute('href', 'https://usenix.org/papers/consensus-edge');

        // 13. References: name, position + company, contact, link, note
        expect(screen.getByText('Dr. Maya Lin')).toBeInTheDocument();
        expect(screen.getByText('VP of Infrastructure, Stellar Systems')).toBeInTheDocument();
        expect(screen.getByText('maya.lin@stellar.dev')).toBeInTheDocument();
        expect(
          screen.getByRole('link', { name: /linkedin\.com\/in\/maya-lin/i })
        ).toHaveAttribute('href', 'https://linkedin.com/in/maya-lin');
        expect(
          screen.getByText(
            'Consistently delivered mission-critical distributed architecture.'
          )
        ).toBeInTheDocument();

        // 14. Interests
        expect(screen.getByText('Amateur Radio & SDR')).toBeInTheDocument();

        // 15. Achievements (with issuer subtitle)
        expect(screen.getByText('Zero-Downtime Database Migration')).toBeInTheDocument();
        expect(screen.getByText('Platform Reliability Guild')).toBeInTheDocument();

        // 16. Custom (including extra user-defined custom metadata key)
        expect(screen.getByText('Adaptive Rate Limiting Patent')).toBeInTheDocument();
        expect(screen.getByText('Lead Inventor')).toBeInTheDocument();
        expect(screen.getByText('Patent Number:')).toBeInTheDocument();
        expect(screen.getByText('US-11,900,100')).toBeInTheDocument();

        // Read-only mode must render zero inputs/textareas and all section links must be secure
        expect(container.querySelectorAll('input, textarea')).toHaveLength(0);
        const sectionLinks = container.querySelectorAll('section a');
        expect(sectionLinks.length).toBeGreaterThanOrEqual(6);
        sectionLinks.forEach((anchor) => {
          expect(anchor).toHaveAttribute('target', '_blank');
          expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });

      it('handles empty, null, malformed object dates, or non-array content without crashing or rendering [object Object]', () => {
        const sparseSections: ISection[] = Object.values(SectionType).map(
          (type, index) => ({
            id: `sparse-${index}`,
            type,
            title: `Sparse ${type}`,
            content: [
              null as any,
              undefined as any,
              { id: `empty-${index}` } as any,
              {
                id: `weird-${index}`,
                startDate: {} as any,
                endDate: {} as any,
                location: {} as any,
                url: {} as any,
                level: 0,
                technologies: [null, '', 42] as any,
              } as any,
            ],
          })
        );

        const sparseResume: IResume = {
          title: 'Sparse Resume',
          content: {
            basics: {},
            sections: [
              ...sparseSections,
              {
                id: 'legacy-str-sec',
                type: SectionType.CUSTOM,
                title: 'Legacy Text Section',
                content: 'Plain text fallback content' as any,
              },
              {
                id: 'malformed-obj-sec',
                type: SectionType.CUSTOM,
                title: 'Malformed Object Content Section',
                content: { invalid: 'object' } as any,
              },
            ],
            sectionOrder: [
              ...sparseSections.map((s) => s.id),
              'legacy-str-sec',
              'malformed-obj-sec',
            ],
          },
        };

        expect(() => {
          render(<TemplateComponent resume={sparseResume} readOnly />);
        }).not.toThrow();

        expect(screen.getByText('Plain text fallback content')).toBeInTheDocument();
        expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
      });
    }
  );

  it('DateRange and SkillList enforce #39 Present fallback and #43 all-disabled null body return', () => {
    const { rerender, container } = render(
      <DateRange startDate="" endDate="" current={true} />
    );
    expect(screen.getByText('Present')).toBeInTheDocument();

    rerender(
      <DateRange
        item={{
          startDate: { month: 'Apr', year: '2023' },
          endDate: {},
          isCurrent: true,
        }}
      />
    );
    expect(screen.getByText('Apr 2023 - Present')).toBeInTheDocument();

    // SkillList returns null when all items have enabled === false
    const { container: skillContainer } = render(
      <SkillList
        items={[
          { id: 'sk-disabled-1', name: 'Hidden Skill', enabled: false },
          { id: 'sk-disabled-2', name: 'Another Hidden Skill', enabled: false },
        ]}
        readOnly
      />
    );
    expect(skillContainer.firstChild).toBeNull();

    // SectionRenderer omits all disabled items and renders null body for all-disabled section
    const allDisabledResume: IResume = {
      title: 'Disabled Items Test',
      content: {
        basics: { name: 'Alex' },
        sections: [
          {
            id: 'sec-disabled-body',
            type: SectionType.PROJECTS,
            title: 'Projects',
            content: [
              { id: 'p-dis-1', name: 'Hidden Project A', enabled: false },
              { id: 'p-dis-2', name: 'Hidden Project B', enabled: false },
            ],
          },
        ],
        sectionOrder: ['sec-disabled-body'],
      },
    };
    const { container: srContainer } = render(
      <TemplateProvider resume={allDisabledResume} readOnly>
        <SectionRenderer />
      </TemplateProvider>
    );
    expect(srContainer.querySelector('[data-section-kind]')).toBeNull();
    expect(screen.queryByText('Hidden Project A')).not.toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it('supports inline editing of project links, skill levels, and section items without resetting sibling fields, and preserves edits across template switches', () => {
    function InteractivePreviewHarness() {
      const [resume, setResume] = useState<IResume>(() => ({
        title: 'Interactive Edit Resume',
        templateId: 'modern',
        content: {
          basics: {
            name: 'Taylor Swiftly',
            label: 'Staff Engineer',
          },
          sections: [
            {
              id: 'sec-proj',
              type: SectionType.PROJECTS,
              title: 'Projects',
              content: [
                {
                  id: 'p-edit-1',
                  name: 'CloudRunner',
                  startDate: 'Jan 2024',
                  endDate: 'Jun 2024',
                  url: 'https://github.com/taylor/cloudrunner',
                  description: 'Serverless workflow engine.',
                  technologies: ['TypeScript', 'Go'],
                },
              ],
            },
            {
              id: 'sec-skills',
              type: SectionType.SKILLS,
              title: 'Skills',
              content: [
                {
                  id: 's-edit-1',
                  name: 'Distributed Systems',
                  level: 'Intermediate' as any,
                  subSkills: ['Raft', 'gRPC'],
                },
              ],
            },
            {
              id: 'sec-cert',
              type: SectionType.CERTIFICATES,
              title: 'Certificates',
              content: [
                {
                  id: 'c-edit-1',
                  name: 'AWS Solutions Architect',
                  issuer: 'Amazon Web Services',
                  date: 'May 2023',
                  url: 'https://aws.amazon.com/verify/123',
                },
              ],
            },
          ],
          sectionOrder: ['sec-proj', 'sec-skills', 'sec-cert'],
        },
      }));

      return <ResumePreview resume={resume} onChange={setResume} />;
    }

    render(<InteractivePreviewHarness />);

    // 1. Edit project link directly in ModernTemplate
    const projLink = screen.getByRole('link', {
      name: /github\.com\/taylor\/cloudrunner/i,
    });
    fireEvent.click(projLink);

    const linkInput = screen.getByDisplayValue('https://github.com/taylor/cloudrunner');
    fireEvent.change(linkInput, {
      target: { value: 'https://cloudrunner.io/demo' },
    });
    fireEvent.blur(linkInput);

    // Project link updated and sibling fields (name, dates, description, technologies) preserved
    const updatedProjLink = screen.getByRole('link', {
      name: /cloudrunner\.io\/demo/i,
    });
    expect(updatedProjLink).toHaveAttribute('href', 'https://cloudrunner.io/demo');
    expect(screen.getByText('CloudRunner')).toBeInTheDocument();
    expect(screen.getByText('Jan 2024 - Jun 2024')).toBeInTheDocument();
    expect(screen.getByText('Serverless workflow engine.')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Go')).toBeInTheDocument();

    // 2. Edit skill proficiency level directly in ModernTemplate without dropping subSkills
    fireEvent.click(screen.getByText('Intermediate'));
    const levelInput = screen.getByDisplayValue('Intermediate');
    fireEvent.change(levelInput, { target: { value: 'Principal' } });
    fireEvent.blur(levelInput);

    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Distributed Systems')).toBeInTheDocument();
    expect(screen.getByText('Raft')).toBeInTheDocument();
    expect(screen.getByText('gRPC')).toBeInTheDocument();

    // 3. Edit certificate issuer inline
    fireEvent.click(screen.getByText('Amazon Web Services'));
    const issuerInput = screen.getByDisplayValue('Amazon Web Services');
    fireEvent.change(issuerInput, { target: { value: 'AWS Training & Certification' } });
    fireEvent.blur(issuerInput);

    expect(screen.getByText('AWS Training & Certification')).toBeInTheDocument();

    // 4. Switch template from Modern -> Professional via TemplateGalleryModal and verify zero data loss
    fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
    const dialog = screen.getByRole('dialog', { name: /template gallery/i });
    fireEvent.click(within(dialog).getByTestId('template-card-professional'));

    const page = screen.getByTestId('resume-preview-page');
    expect(
      within(page).getByRole('link', { name: /cloudrunner\.io\/demo/i })
    ).toHaveAttribute('href', 'https://cloudrunner.io/demo');
    expect(within(page).getByText('Principal')).toBeInTheDocument();
    expect(within(page).getByText('Raft')).toBeInTheDocument();
    expect(within(page).getByText('AWS Training & Certification')).toBeInTheDocument();
    expect(within(page).getByText('May 2023')).toBeInTheDocument();
  });

  it('hides empty interactive placeholders and empty project link triggers when printing', () => {
    const resume: IResume = {
      title: 'Print Placeholder Test',
      content: {
        basics: { name: 'Print Tester' },
        sections: [
          {
            id: 'sec-proj-print',
            type: SectionType.PROJECTS,
            title: 'Projects',
            content: [
              {
                id: 'p1',
                name: 'First Project',
                description: '',
              },
              {
                id: 'p2',
                name: 'Second Project',
                description: 'Detailed outcome.',
              },
            ],
          },
        ],
        sectionOrder: ['sec-proj-print'],
      },
    };

    const { container } = render(
      <ResumePreview resume={resume} onChange={jest.fn()} />
    );

    const pageRoot = screen.getByTestId('resume-preview-page');
    expect(pageRoot).toHaveStyle({ '--theme-item-spacing': '0.875rem' });

    const projectItems = container.querySelectorAll('[data-section-kind="projects"]');
    expect(projectItems).toHaveLength(2);
    expect(projectItems[0].className).toContain('break-inside-avoid');
    expect(projectItems[0].className).toContain('var(--theme-item-spacing');
    expect(projectItems[1].className).not.toContain('var(--theme-item-spacing');

    const addLinkBtn = screen.getAllByText('Add project link')[0];
    expect(addLinkBtn.className).toContain('print:hidden');
    const emptyDescPlaceholder = screen.getByText('Project summary and outcomes...');
    expect(emptyDescPlaceholder.className).toContain('print:hidden');
  });

  it('renders ungrouped skill items as inline skill entries rather than empty group headings when mixed with grouped skills', () => {
    const mixedSkillsResume: IResume = {
      title: 'Mixed Skills Resume',
      content: {
        basics: { name: 'Casey Jordan' },
        sections: [
          {
            id: 'sec-mixed-skills',
            type: SectionType.SKILLS,
            title: 'Skills',
            content: [
              {
                id: 'grp-1',
                name: 'Frontend Architecture',
                subSkills: ['React', 'TypeScript'],
              },
              {
                id: 'flat-1',
                name: 'Go',
              },
              {
                id: 'flat-2',
                name: 'Express',
              },
            ],
          },
        ],
        sectionOrder: ['sec-mixed-skills'],
      },
    };

    const { container: modernContainer, unmount } = render(
      <ModernTemplate resume={mixedSkillsResume} readOnly />
    );
    // Only the grouped item has [data-skill-group]; flat items render inside [data-skill-ungrouped="true"]
    const modernGroups = modernContainer.querySelectorAll('[data-skill-group]');
    expect(modernGroups).toHaveLength(1);
    expect(modernGroups[0]).toHaveAttribute('data-skill-group', 'Frontend Architecture');
    const modernUngrouped = modernContainer.querySelector('[data-skill-ungrouped="true"]');
    expect(modernUngrouped).toBeInTheDocument();
    expect(within(modernUngrouped as HTMLElement).getByText('Go')).toBeInTheDocument();
    expect(within(modernUngrouped as HTMLElement).getByText('Express')).toBeInTheDocument();
    unmount();

    const { container: profContainer } = render(
      <ProfessionalTemplate resume={mixedSkillsResume} readOnly />
    );
    const profGroups = profContainer.querySelectorAll('[data-skill-group]');
    expect(profGroups).toHaveLength(1);
    expect(profGroups[0]).toHaveAttribute('data-skill-group', 'Frontend Architecture');
    const profUngrouped = profContainer.querySelector('[data-skill-ungrouped="true"]');
    expect(profUngrouped).toBeInTheDocument();
    expect(within(profUngrouped as HTMLElement).getByText('Go')).toBeInTheDocument();
    expect(within(profUngrouped as HTMLElement).getByText('Express')).toBeInTheDocument();
  });
});
