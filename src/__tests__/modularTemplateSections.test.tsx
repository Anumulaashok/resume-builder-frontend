import React, { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../components/ResumePreview';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import {
  SECTION_COMPONENT_REGISTRY,
  WorkSection,
  EducationSection,
  ProjectSection,
  SkillSection,
  TechnicalSkillSection,
  SoftSkillSection,
  LanguageSection,
  CertificateSection,
  AwardSection,
  CourseSection,
  OrganizationSection,
  PublicationSection,
  ReferenceSection,
  InterestSection,
  AchievementSection,
  CustomSection,
} from '../components/templates/sections';
import { resolveSectionKind } from '../components/templates/templateHelpers';
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
          name: ' Zero-Downtime Database Migration',
          date: '2024',
          description: 'Migrated 18TB of production shards without customer impact.',
        },
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

describe('Modular Template Section Component Library', () => {
  beforeEach(() => {
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('maps every one of the 16 SectionType enum values to its own dedicated modular section component', () => {
    const allEnumValues = Object.values(SectionType);
    expect(allEnumValues).toHaveLength(16);

    const resolvedKinds = allEnumValues.map((type) =>
      resolveSectionKind({
        id: `test-${type}`,
        type,
        title: type,
        content: [],
      })
    );

    // Every one of the 16 SectionType enum values maps to a distinct canonical kind
    expect(new Set(resolvedKinds).size).toBe(16);

    expect(SECTION_COMPONENT_REGISTRY.work).toBe(WorkSection);
    expect(SECTION_COMPONENT_REGISTRY.education).toBe(EducationSection);
    expect(SECTION_COMPONENT_REGISTRY.projects).toBe(ProjectSection);
    expect(SECTION_COMPONENT_REGISTRY.skills).toBe(SkillSection);
    expect(SECTION_COMPONENT_REGISTRY.technical_skills).toBe(TechnicalSkillSection);
    expect(SECTION_COMPONENT_REGISTRY.soft_skills).toBe(SoftSkillSection);
    expect(SECTION_COMPONENT_REGISTRY.languages).toBe(LanguageSection);
    expect(SECTION_COMPONENT_REGISTRY.certificates).toBe(CertificateSection);
    expect(SECTION_COMPONENT_REGISTRY.awards).toBe(AwardSection);
    expect(SECTION_COMPONENT_REGISTRY.courses).toBe(CourseSection);
    expect(SECTION_COMPONENT_REGISTRY.organizations).toBe(OrganizationSection);
    expect(SECTION_COMPONENT_REGISTRY.publications).toBe(PublicationSection);
    expect(SECTION_COMPONENT_REGISTRY.references).toBe(ReferenceSection);
    expect(SECTION_COMPONENT_REGISTRY.interests).toBe(InterestSection);
    expect(SECTION_COMPONENT_REGISTRY.achievements).toBe(AchievementSection);
    expect(SECTION_COMPONENT_REGISTRY.custom).toBe(CustomSection);
  });

  describe.each([
    ['ModernTemplate', ModernTemplate, 'modern'],
    ['ProfessionalTemplate', ProfessionalTemplate, 'professional'],
  ] as const)(
    '%s renders all 16 section types with structured fields and secure links',
    (_templateName, TemplateComponent, expectedVariant) => {
      it('displays complete structured metadata for all 16 section types in read-only mode', () => {
        const resume = buildFullSixteenSectionResume();
        const { container } = render(<TemplateComponent resume={resume} readOnly />);

        // Verify all 16 dedicated section containers mounted with template variant
        const sectionNodes = container.querySelectorAll('[data-section-kind]');
        expect(sectionNodes).toHaveLength(16);
        sectionNodes.forEach((node) => {
          expect(node).toHaveAttribute('data-template-variant', expectedVariant);
        });

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

        // 4. Skills: categories, proficiency levels (even when subSkills exist!), and subskill badges
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

        // 7. Languages
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('Native')).toBeInTheDocument();
        expect(screen.getByText('(100%)')).toBeInTheDocument();
        expect(screen.getByText('Spanish')).toBeInTheDocument();
        expect(screen.getByText('(80%)')).toBeInTheDocument();

        // 8. Certificates: title, issuer, date, verification link
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

        // 9. Awards: title, issuer, date, verification link, description
        expect(
          screen.getByText('Distinguished Engineering Innovation Award')
        ).toBeInTheDocument();
        expect(screen.getByText('Dec 2023')).toBeInTheDocument();
        const awardLink = screen.getByRole('link', { name: /stellar\.dev\/awards\/2023/i });
        expect(awardLink).toHaveAttribute('href', 'https://stellar.dev/awards/2023');
        expect(awardLink).toHaveAttribute('target', '_blank');
        expect(awardLink).toHaveAttribute('rel', 'noopener noreferrer');

        // 10. Courses: name, institution, date, description
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
        expect(pubLink).toHaveAttribute('target', '_blank');
        expect(pubLink).toHaveAttribute('rel', 'noopener noreferrer');

        // 13. References: name, position, company, contact, note
        expect(screen.getByText('Dr. Maya Lin')).toBeInTheDocument();
        expect(screen.getByText('VP of Infrastructure')).toBeInTheDocument();
        expect(screen.getByText('maya.lin@stellar.dev')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Consistently delivered mission-critical distributed architecture.'
          )
        ).toBeInTheDocument();

        // 14. Interests
        expect(screen.getByText('Amateur Radio & SDR')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Building low-noise HF transceivers and digital signal decoders.'
          )
        ).toBeInTheDocument();

        // 15. Achievements
        expect(
          screen.getByText(/Zero-Downtime Database Migration/)
        ).toBeInTheDocument();
        expect(
          screen.getByText('Migrated 18TB of production shards without customer impact.')
        ).toBeInTheDocument();

        // 16. Custom (including extra custom metadata key)
        expect(screen.getByText('Adaptive Rate Limiting Patent')).toBeInTheDocument();
        expect(screen.getByText('Lead Inventor')).toBeInTheDocument();
        expect(screen.getByText('Patent Number:')).toBeInTheDocument();
        expect(screen.getByText('US-11,900,100')).toBeInTheDocument();

        // Read-only mode must render zero inputs/textareas and all section links must be secure
        expect(container.querySelectorAll('input, textarea')).toHaveLength(0);
        const sectionLinks = container.querySelectorAll('section a');
        expect(sectionLinks.length).toBeGreaterThanOrEqual(5);
        sectionLinks.forEach((anchor) => {
          expect(anchor).toHaveAttribute('target', '_blank');
          expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });

      it('handles empty, null, or malformed optional fields across all 16 section types without crashing', () => {
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
            ],
            sectionOrder: [
              ...sparseSections.map((s) => s.id),
              'legacy-str-sec',
            ],
          },
        };

        expect(() => {
          render(<TemplateComponent resume={sparseResume} readOnly />);
        }).not.toThrow();

        expect(screen.getByText('Plain text fallback content')).toBeInTheDocument();
      });
    }
  );

  it('applies distinct template styling between ModernTemplate and ProfessionalTemplate', () => {
    const resume = buildFullSixteenSectionResume();

    const { container: modernContainer, unmount } = render(
      <ModernTemplate resume={resume} readOnly />
    );
    const modernBadge = within(modernContainer).getByText('Rust');
    expect(modernBadge.className).toContain('rounded-md');
    expect(modernContainer.querySelectorAll('[data-testid="section-badges-modern"]').length).toBeGreaterThan(0);
    unmount();

    const { container: profContainer } = render(
      <ProfessionalTemplate resume={resume} readOnly />
    );
    const profBadge = within(profContainer).getByText('Rust');
    expect(profBadge.className).toContain('rounded-sm');
    expect(profContainer.querySelectorAll('[data-testid="section-badges-professional"]').length).toBeGreaterThan(0);
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

    // 2. Edit skill proficiency level directly in ModernTemplate
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

    // 4. Switch template from Modern -> Professional and verify zero data loss
    fireEvent.click(screen.getByText('Templates'));
    fireEvent.click(screen.getByText('Professional'));

    expect(screen.getByTestId('professional-template')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /cloudrunner\.io\/demo/i })
    ).toHaveAttribute('href', 'https://cloudrunner.io/demo');
    expect(screen.getByText('Principal')).toBeInTheDocument();
    expect(screen.getByText('Raft')).toBeInTheDocument();
    expect(screen.getByText('AWS Training & Certification')).toBeInTheDocument();
    expect(screen.getByText('May 2023')).toBeInTheDocument();
  });

  it('respects CSS theme variables for spacing/typography and hides empty interactive placeholders when printing', () => {
    const resume: IResume = {
      title: 'Theme & Print Test',
      themeConfig: {
        primaryColor: '#059669',
        headingColor: '#064e3b',
        sectionSpacing: 'spacious',
      },
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

    const projectItems = container.querySelectorAll('[data-section-item="project"]');
    expect(projectItems).toHaveLength(2);
    expect(projectItems[0].className).toContain('break-inside-avoid');
    expect(projectItems[0].className).toContain('var(--theme-item-spacing');
    // Last item does not add trailing margin
    expect(projectItems[1].className).not.toContain('var(--theme-item-spacing');

    // Empty interactive placeholders include print:hidden so print output stays clean
    const addLinkBtn = screen.getAllByText('Add project link')[0];
    expect(addLinkBtn.className).toContain('print:hidden');
    const emptyDescPlaceholder = screen.getByText('Project summary and outcomes...');
    expect(emptyDescPlaceholder.className).toContain('print:hidden');
  });
});
