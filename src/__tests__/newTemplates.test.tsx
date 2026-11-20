import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../components/ResumePreview';
import { DeveloperTemplate } from '../components/templates/DeveloperTemplate';
import { StartupTemplate } from '../components/templates/StartupTemplate';
import { AcademicTemplate } from '../components/templates/AcademicTemplate';
import {
  getTemplate,
  templateRegistry,
} from '../components/templates/registry';
import { sampleResume } from '../components/templates/sampleResume';
import { IResume, SectionType } from '../types/resume';

const NEW_TEMPLATES = [
  {
    id: 'developer',
    name: 'Developer',
    category: 'tech',
    atsFriendly: false,
    component: DeveloperTemplate,
  },
  {
    id: 'startup',
    name: 'Startup',
    category: 'tech',
    atsFriendly: false,
    component: StartupTemplate,
  },
  {
    id: 'academic',
    name: 'Academic CV',
    category: 'professional',
    atsFriendly: true,
    component: AcademicTemplate,
  },
] as const;

describe('Developer, Startup, and Academic CV Templates', () => {
  describe('Registry Integrity', () => {
    it('registers developer, startup, and academic without duplicating or altering existing template IDs', () => {
      const ids = templateRegistry.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);

      // Existing 6 templates preserved
      expect(ids).toEqual(
        expect.arrayContaining([
          'modern',
          'professional',
          'minimal',
          'tech-split',
          'creative-sidebar',
          'two-column',
          'developer',
          'startup',
          'academic',
        ])
      );
      expect(new Set(templateRegistry.map((t) => t.id)).size).toBe(templateRegistry.length);

      NEW_TEMPLATES.forEach(({ id, name, category, atsFriendly, component }) => {
        const entry = getTemplate(id);
        expect(entry.id).toBe(id);
        expect(entry.name).toBe(name);
        expect(entry.category).toBe(category);
        expect(entry.atsFriendly).toBe(atsFriendly);
        expect(entry.component).toBe(component);
        expect(entry.description.length).toBeGreaterThan(15);
      });
    });
  });

  describe.each(NEW_TEMPLATES)(
    '$name ($id) core rendering, filtering, sparse state, and inline editing',
    ({ id, component: TemplateComponent }) => {
      it('renders sampleResume without crashing and displays all enabled section content', () => {
        render(<TemplateComponent resume={sampleResume} readOnly />);

        expect(screen.getByText('Maya Lin')).toBeInTheDocument();
        expect(
          screen.getByText('Staff Frontend & Platform Architect')
        ).toBeInTheDocument();
        expect(screen.getByText('Staff Frontend Architect')).toBeInTheDocument();
        expect(screen.getByText('Lattice UI Primitives')).toBeInTheDocument();
        expect(screen.getByText('M.S. in Computer Science')).toBeInTheDocument();
        expect(screen.getByText('Frontend Architecture')).toBeInTheDocument();
        expect(
          screen.getByText('Distinguished Engineering Impact Award')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Composable Accessibility Trees for Rich Canvas Editors'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByText('Distributed Systems Engineering')
        ).toBeInTheDocument();
        expect(screen.getByText('Devon Brooks')).toBeInTheDocument();
      });

      it('hides items and sections where enabled === false while keeping enabled === true and undefined items', () => {
        const resumeWithDisabled: IResume = {
          ...sampleResume,
          templateId: id,
          content: {
            ...sampleResume.content,
            sections: [
              ...sampleResume.content.sections.map((sec) => {
                if (sec.id === 'sample-work') {
                  return {
                    ...sec,
                    content: [
                      ...sec.content,
                      {
                        id: 'work-disabled',
                        name: 'Hidden Stealth Corp',
                        position: 'Secret Disabled Role',
                        startDate: '2021',
                        enabled: false,
                      },
                    ],
                  };
                }
                if (sec.id === 'sample-projects') {
                  return {
                    ...sec,
                    content: [
                      ...sec.content,
                      {
                        id: 'proj-disabled',
                        name: 'Unreleased Disabled Project',
                        technologies: ['HiddenStackToken'],
                        enabled: false,
                      },
                    ],
                  };
                }
                if (sec.id === 'sample-publications') {
                  return {
                    ...sec,
                    content: [
                      {
                        id: 'pub-disabled',
                        title: 'Withdrawn Draft Paper',
                        publisher: 'Hidden Venue',
                        enabled: false,
                      },
                      ...sec.content,
                    ],
                  };
                }
                if (sec.id === 'sample-references') {
                  return {
                    ...sec,
                    content: [
                      ...sec.content,
                      {
                        id: 'ref-disabled',
                        name: 'Hidden Referee',
                        company: 'Secret Reference Org',
                        enabled: false,
                      },
                    ],
                  };
                }
                if (sec.id === 'sample-skills') {
                  return {
                    ...sec,
                    content: [
                      ...sec.content,
                      {
                        id: 'skill-disabled',
                        name: 'Hidden Legacy Skill',
                        subSkills: ['ObsoleteFramework'],
                        enabled: false,
                      },
                    ],
                  };
                }
                return sec;
              }),
              {
                id: 'sec-completely-disabled',
                type: SectionType.COURSES,
                title: 'Hidden Disabled Courses Section',
                enabled: false,
                content: [
                  {
                    id: 'course-hidden',
                    name: 'Never Rendered Course',
                  },
                ],
              },
            ],
            sectionOrder: [
              ...sampleResume.content.sectionOrder,
              'sec-completely-disabled',
            ],
          },
        };

        render(<TemplateComponent resume={resumeWithDisabled} readOnly />);

        // Enabled items remain visible
        expect(screen.getByText('Staff Frontend Architect')).toBeInTheDocument();
        expect(screen.getByText('Lattice UI Primitives')).toBeInTheDocument();
        expect(
          screen.getByText(
            'Composable Accessibility Trees for Rich Canvas Editors'
          )
        ).toBeInTheDocument();
        expect(screen.getByText('Devon Brooks')).toBeInTheDocument();

        // Disabled items & sections are hidden
        expect(screen.queryByText('Hidden Stealth Corp')).not.toBeInTheDocument();
        expect(
          screen.queryByText('Secret Disabled Role')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Unreleased Disabled Project')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('HiddenStackToken')).not.toBeInTheDocument();
        expect(
          screen.queryByText('Withdrawn Draft Paper')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('Hidden Referee')).not.toBeInTheDocument();
        expect(
          screen.queryByText('Hidden Legacy Skill')
        ).not.toBeInTheDocument();
        expect(screen.queryByText('ObsoleteFramework')).not.toBeInTheDocument();
        expect(
          screen.queryByText('Hidden Disabled Courses Section')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Never Rendered Course')
        ).not.toBeInTheDocument();
      });

      it('renders cleanly with a sparse resume (name + one job) and when all other sections are disabled', () => {
        const sparseResume: IResume = {
          title: 'Sparse Resume',
          templateId: id,
          content: {
            basics: {
              name: 'Ada Lovelace',
            },
            sections: [
              {
                id: 'only-work',
                type: SectionType.WORK,
                title: 'Experience',
                enabled: true,
                content: [
                  {
                    id: 'job-1',
                    name: 'Analytical Engine Lab',
                    position: 'Principal Mathematician',
                    startDate: '1842',
                    current: true,
                  },
                ],
              },
              {
                id: 'disabled-skills',
                type: SectionType.SKILLS,
                title: 'Skills',
                enabled: false,
                content: [{ id: 'sk-1', name: 'Calculus' }],
              },
            ],
            sectionOrder: ['only-work', 'disabled-skills'],
          },
        };

        render(<TemplateComponent resume={sparseResume} readOnly />);

        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Principal Mathematician')).toBeInTheDocument();
        expect(screen.getByText('Analytical Engine Lab')).toBeInTheDocument();
        expect(screen.getByText('1842 - Present')).toBeInTheDocument();
        expect(screen.queryByText('Calculus')).not.toBeInTheDocument();
        expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
      });

      it('wires inline click-to-edit through TemplateProvider for basics and section items', async () => {
        const handleChange = jest.fn();
        render(
          <TemplateComponent
            resume={sampleResume}
            onChange={handleChange}
            readOnly={false}
          />
        );

        fireEvent.click(screen.getByText('Maya Lin'));
        const nameInput = await screen.findByDisplayValue('Maya Lin');
        fireEvent.change(nameInput, { target: { value: 'Dr. Maya Lin' } });
        fireEvent.blur(nameInput);

        expect(handleChange).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              basics: expect.objectContaining({ name: 'Dr. Maya Lin' }),
            }),
          })
        );

        fireEvent.click(screen.getByText('Lattice UI Primitives'));
        const projInput = await screen.findByDisplayValue(
          'Lattice UI Primitives'
        );
        fireEvent.change(projInput, {
          target: { value: 'Lattice Design System' },
        });
        fireEvent.blur(projInput);

        const latestResume = handleChange.mock.calls[
          handleChange.mock.calls.length - 1
        ][0] as IResume;
        const projSection = latestResume.content.sections.find(
          (s) => s.id === 'sample-projects'
        )!;
        expect((projSection.content[0] as any).name).toBe(
          'Lattice Design System'
        );
      });
    }
  );

  describe('Template-Specific Design Features', () => {
    it('DeveloperTemplate highlights GitHub/portfolio links in header, groups skill chips by category, and emphasises projects', () => {
      const { container } = render(
        <DeveloperTemplate resume={sampleResume} readOnly />
      );

      const prominentLinks = screen.getByTestId('developer-prominent-links');
      const labelPrefix = screen.getByTestId('developer-label-prefix');
      expect(labelPrefix).toHaveAttribute('data-prefix', '//');
      expect(labelPrefix.className).toContain('before:content-[attr(data-prefix)]');
      expect(labelPrefix).toHaveTextContent('');
      expect(container.textContent).not.toContain('//');
      expect(
        within(prominentLinks).getByRole('link', { name: 'github.com/mayalin' })
      ).toHaveAttribute('href', 'https://github.com/mayalin');
      expect(
        within(prominentLinks).getByRole('link', { name: 'mayalin.dev' })
      ).toHaveAttribute('href', 'https://mayalin.dev');

      // Links are not duplicated outside prominent header bar
      expect(
        screen.getAllByRole('link', { name: 'github.com/mayalin' })
      ).toHaveLength(1);
      expect(
        screen.getAllByRole('link', { name: 'mayalin.dev' })
      ).toHaveLength(1);

      // Skills grouped by category as chips
      expect(
        container.querySelector('[data-skill-variant="chips"]')
      ).toBeInTheDocument();
      expect(screen.getByText('Frontend Architecture')).toBeInTheDocument();
      expect(screen.getByText('Platform & Quality')).toBeInTheDocument();

      // Projects emphasised with title, stack chips, and repository link
      const projectCard = screen.getByTestId('developer-project-card');
      expect(
        within(projectCard).getByText('Lattice UI Primitives')
      ).toBeInTheDocument();
      expect(
        within(projectCard).getByRole('link', {
          name: 'github.com/mayalin/lattice-ui',
        })
      ).toHaveAttribute('href', 'https://github.com/mayalin/lattice-ui');
      const stackChips = within(projectCard).getByTestId(
        'developer-project-stack'
      );
      expect(within(stackChips).getByText('TypeScript')).toBeInTheDocument();
      expect(within(stackChips).getByText('ARIA')).toBeInTheDocument();
    });

    it('StartupTemplate renders two-tone header, pill section headings, highlighted summary callout, and emphasised bullet metrics', () => {
      const { container } = render(
        <StartupTemplate resume={sampleResume} readOnly />
      );

      expect(screen.getByTestId('startup-two-tone-header')).toBeInTheDocument();
      expect(screen.getByTestId('startup-summary-callout')).toBeInTheDocument();
      expect(screen.getByTestId('startup-sidebar')).toBeInTheDocument();

      // Accent section pills
      const pillHeadings = container.querySelectorAll(
        '[data-heading-variant="pill"]'
      );
      expect(pillHeadings.length).toBeGreaterThan(0);

      // Metrics extracted and emphasised via CSS ::before attributes without duplicate DOM text
      const metricBars = screen.getAllByTestId('startup-impact-metrics');
      expect(metricBars.length).toBeGreaterThan(0);
      metricBars.forEach((el) => {
        expect(el).toHaveTextContent('');
      });
      const metricPills = metricBars.flatMap((el) =>
        Array.from(el.querySelectorAll('[data-metric]'))
      );
      const metricAttrValues = metricPills.map((pill) =>
        pill.getAttribute('data-metric')
      );
      expect(metricAttrValues).toEqual(
        expect.arrayContaining(['↗ 41%', '↗ 100k+', '↗ 60fps'])
      );
      metricPills.forEach((pill) => {
        expect(pill.className).toContain('before:content-[attr(data-metric)]');
      });
    });

    it('AcademicTemplate places Education first, numbers enabled publications in citation format, and supports inline editing on publications', async () => {
      const multiPubResume: IResume = {
        ...sampleResume,
        content: {
          ...sampleResume.content,
          sections: sampleResume.content.sections.map((sec) =>
            sec.id === 'sample-publications'
              ? {
                  ...sec,
                  content: [
                    ...sec.content,
                    {
                      id: 'pub-disabled-mid',
                      title: 'Suppressed Preprint',
                      publisher: 'arXiv',
                      date: '2024',
                      enabled: false,
                    },
                    {
                      id: 'pub-2',
                      title: 'Deterministic Layout Engines for Print Media',
                      publisher: 'IEEE Transactions on Visualization',
                      date: 'Jan 2025',
                      url: 'https://ieeexplore.ieee.org',
                    },
                  ],
                }
              : sec
          ),
        },
      };

      const onChange = jest.fn();
      const { container } = render(
        <AcademicTemplate
          resume={multiPubResume}
          onChange={onChange}
          readOnly={false}
        />
      );

      // Education comes first and References comes last regardless of sampleResume.sectionOrder
      const renderedSectionIds = Array.from(
        container.querySelectorAll('section[data-section-id]')
      ).map((el) => el.getAttribute('data-section-id'));
      expect(renderedSectionIds[0]).toBe('sample-education');
      expect(renderedSectionIds[renderedSectionIds.length - 1]).toBe(
        'sample-references'
      );

      // Publications numbered sequentially [1], [2] skipping disabled items
      expect(screen.getByTestId('publication-number-1')).toHaveTextContent('[1]');
      expect(screen.getByTestId('publication-number-2')).toHaveTextContent('[2]');
      expect(
        screen.queryByTestId('publication-number-3')
      ).not.toBeInTheDocument();
      expect(screen.queryByText('Suppressed Preprint')).not.toBeInTheDocument();
      expect(
        screen.getByText('Deterministic Layout Engines for Print Media')
      ).toBeInTheDocument();

      // Inline edit on publication title
      fireEvent.click(
        screen.getByText('Deterministic Layout Engines for Print Media')
      );
      const pubInput = await screen.findByDisplayValue(
        'Deterministic Layout Engines for Print Media'
      );
      fireEvent.change(pubInput, {
        target: { value: 'Deterministic Paginated Layout Engines' },
      });
      fireEvent.blur(pubInput);

      expect(onChange).toHaveBeenCalled();
      const updated = onChange.mock.calls[onChange.mock.calls.length - 1][0] as IResume;
      const pubSec = updated.content.sections.find(
        (s) => s.id === 'sample-publications'
      )!;
      expect(
        pubSec.content.find((p) => p.id === 'pub-2')
      ).toEqual(
        expect.objectContaining({
          title: 'Deterministic Paginated Layout Engines',
        })
      );
    });
  });

  describe('TemplateGalleryModal Category Filtering & Selection', () => {
    it('displays Developer and Startup under Tech and Academic CV under Professional with accurate ATS badges', () => {
      const onChange = jest.fn();
      render(<ResumePreview resume={sampleResume} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      // All (9)
      expect(within(dialog).getByTestId('gallery-category-all')).toHaveTextContent(
        `All (${templateRegistry.length})`
      );

      // Tech category -> tech-split, developer, startup (all non-ATS with caution badges)
      fireEvent.click(within(dialog).getByTestId('gallery-category-tech'));
      expect(
        within(dialog).getByTestId('template-card-developer')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-developer')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-developer')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('template-card-startup')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-startup')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-startup')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-academic')
      ).not.toBeInTheDocument();

      // ATS-friendly filter chip -> shows only ATS-friendly single-column templates
      fireEvent.click(within(dialog).getByTestId('gallery-filter-ats'));
      expect(
        within(dialog).getByTestId('template-card-academic')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-developer')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-tech-split')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-two-column')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-banded')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-timeline')
      ).not.toBeInTheDocument();

      // Professional category -> professional, academic (ATS)
      fireEvent.click(
        within(dialog).getByTestId('gallery-category-professional')
      );
      expect(
        within(dialog).getByTestId('template-card-academic')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-badge-academic')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-developer')
      ).not.toBeInTheDocument();

      // Select Academic CV
      fireEvent.click(within(dialog).getByTestId('template-card-academic'));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'academic',
          themeConfig: expect.objectContaining({
            fontPairingId: 'classic-serif',
            skillStyle: 'comma',
          }),
        })
      );
    });
  });
});
