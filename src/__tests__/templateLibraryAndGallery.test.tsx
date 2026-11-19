import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../components/ResumePreview';
import { TemplateGalleryModal } from '../components/templates/TemplateGalleryModal';
import {
  getTemplate,
  mergeTemplateTheme,
  templateRegistry,
} from '../components/templates/registry';
import { sampleResume } from '../components/templates/sampleResume';
import { resolveSectionKind } from '../components/templates/templateHelpers';
import {
  DateRange,
  HeadingStyleVariant,
  SectionHeading,
  SectionRenderer,
  SkillList,
  SkillStyleVariant,
  TemplateProvider,
} from '../components/templates/shared';
import { IResume, SectionType, ThemeConfig } from '../types/resume';

describe('Template Library, Shared Primitives, Design Controls, and Gallery', () => {
  describe('1. Template Registry & Theme Merge', () => {
    it('registers Modern and Professional along with original showcase templates', () => {
      const ids = templateRegistry.map((t) => t.id);
      expect(ids).toContain('modern');
      expect(ids).toContain('professional');

      templateRegistry.forEach((entry) => {
        expect(entry.id).toBeTruthy();
        expect(entry.name).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(['simple', 'professional', 'modern', 'creative', 'tech']).toContain(
          entry.category
        );
        expect(['single', 'two-column', 'sidebar-left', 'sidebar-right']).toContain(
          entry.layout
        );
        expect(typeof entry.atsFriendly).toBe('boolean');
        expect(entry.component).toBeDefined();
      });
    });

    it('looks up templates case-insensitively and falls back to modern for unknown or missing IDs', () => {
      expect(getTemplate('professional').id).toBe('professional');
      expect(getTemplate('PROFESSIONAL').id).toBe('professional');
      expect(getTemplate('  modern  ').id).toBe('modern');
      expect(getTemplate('non-existent-id').id).toBe('modern');
      expect(getTemplate('').id).toBe('modern');
      expect(getTemplate(undefined).id).toBe('modern');
      expect(getTemplate(null).id).toBe('modern');
    });

    it('merges next template defaultTheme without overwriting user-customised values', () => {
      const modernDefaults = getTemplate('modern').defaultTheme;
      const proDefaults = getTemplate('professional').defaultTheme;

      const userTheme = {
        ...modernDefaults,
        accentColor: '#ef4444',
        pageMargins: 'wide' as const,
      };

      const merged = mergeTemplateTheme(userTheme, modernDefaults, proDefaults);

      // User customisations are preserved
      expect(merged.accentColor).toBe('#ef4444');
      expect(merged.pageMargins).toBe('wide');

      // Untouched defaults adopt the newly selected template's defaults
      expect(merged.fontPairingId).toBe('classic-serif');
      expect(merged.skillStyle).toBe('comma');
    });
  });

  describe('2. Sample Data & SectionRenderer Across All 14 Section Kinds', () => {
    const expectedKinds = [
      'work',
      'education',
      'projects',
      'skills',
      'languages',
      'certificates',
      'awards',
      'courses',
      'organizations',
      'publications',
      'references',
      'interests',
      'achievements',
      'custom',
    ] as const;

    it('sampleResume includes realistic content for every canonical section kind', () => {
      const presentKinds = new Set(
        sampleResume.content.sections.map((s) => resolveSectionKind(s))
      );
      expectedKinds.forEach((kind) => {
        expect(presentKinds.has(kind)).toBe(true);
      });
    });

    it('SectionRenderer renders every section kind in sectionOrder and hides disabled sections and items', () => {
      const testResume: IResume = {
        ...sampleResume,
        content: {
          ...sampleResume.content,
          sections: [
            ...sampleResume.content.sections.map((sec) =>
              sec.id === 'sample-work'
                ? {
                    ...sec,
                    content: [
                      ...sec.content,
                      {
                        id: 'work-disabled',
                        name: 'Disabled Secret Corp',
                        position: 'Hidden Role',
                        startDate: '2020',
                        enabled: false,
                      },
                    ],
                  }
                : sec
            ),
            {
              id: 'disabled-awards-extra',
              type: SectionType.AWARDS,
              title: 'Disabled Extra Section',
              enabled: false,
              content: [{ id: 'aw-hidden', name: 'Never Shown Trophy' }],
            },
          ],
          sectionOrder: [
            ...sampleResume.content.sectionOrder,
            'disabled-awards-extra',
          ],
        },
      };

      const { container } = render(
        <TemplateProvider resume={testResume} readOnly>
          <SectionRenderer />
        </TemplateProvider>
      );

      // Every canonical section kind rendered
      expect(screen.getByText('Staff Frontend Architect')).toBeInTheDocument(); // work
      expect(screen.getByText('M.S. in Computer Science')).toBeInTheDocument(); // education
      expect(screen.getByText('Lattice UI Primitives')).toBeInTheDocument(); // projects
      expect(screen.getByText('Frontend Architecture')).toBeInTheDocument(); // skills
      expect(screen.getByText('Mandarin')).toBeInTheDocument(); // languages
      expect(screen.getByText('W3C Web Accessibility Specialist')).toBeInTheDocument(); // certificates
      expect(screen.getByText('Distinguished Engineering Impact Award')).toBeInTheDocument(); // awards
      expect(screen.getByText('Distributed Systems Engineering')).toBeInTheDocument(); // courses
      expect(screen.getByText('OpenJS Accessibility Working Group')).toBeInTheDocument(); // organizations
      expect(
        screen.getByText('Composable Accessibility Trees for Rich Canvas Editors')
      ).toBeInTheDocument(); // publications
      expect(screen.getByText('Devon Brooks')).toBeInTheDocument(); // references
      expect(screen.getByText('Trail Running')).toBeInTheDocument(); // interests
      expect(screen.getByText('Keynote Speaker at JSConf West')).toBeInTheDocument(); // achievements
      expect(screen.getByText('CodePath Career Fellow Mentor')).toBeInTheDocument(); // custom

      // Disabled items and sections omitted
      expect(screen.queryByText('Disabled Secret Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('Hidden Role')).not.toBeInTheDocument();
      expect(screen.queryByText('Disabled Extra Section')).not.toBeInTheDocument();
      expect(screen.queryByText('Never Shown Trophy')).not.toBeInTheDocument();

      // Order follows sectionOrder
      const renderedSectionIds = Array.from(
        container.querySelectorAll('section[data-section-id]')
      ).map((el) => el.getAttribute('data-section-id'));
      expect(renderedSectionIds).toEqual(sampleResume.content.sectionOrder);
    });

    it('wires inline click-to-edit through TemplateProvider for both basics and section items', async () => {
      const handleChange = jest.fn();
      const ModernComp = getTemplate('modern').component;

      render(<ModernComp resume={sampleResume} onChange={handleChange} readOnly={false} />);

      // Edit basics name inline
      fireEvent.click(screen.getByText('Maya Lin'));
      const nameInput = await screen.findByDisplayValue('Maya Lin');
      fireEvent.change(nameInput, { target: { value: 'Maya Lin-Chen' } });
      fireEvent.blur(nameInput);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            basics: expect.objectContaining({ name: 'Maya Lin-Chen' }),
          }),
        })
      );

      // Edit work item position inline
      fireEvent.click(screen.getByText('Staff Frontend Architect'));
      const posInput = await screen.findByDisplayValue('Staff Frontend Architect');
      fireEvent.change(posInput, { target: { value: 'Principal Architect' } });
      fireEvent.blur(posInput);

      const lastUpdatedResume = handleChange.mock.calls[handleChange.mock.calls.length - 1][0] as IResume;
      const workSec = lastUpdatedResume.content.sections.find((s) => s.id === 'sample-work')!;
      expect((workSec.content[0] as any).position).toBe('Principal Architect');
    });

    it('renders all 5 SectionHeading variants, all 5 SkillList variants, and all 3 DateRange formats', () => {
      const headingVariants: HeadingStyleVariant[] = [
        'underline',
        'bar',
        'caps',
        'pill',
        'side-label',
      ];
      headingVariants.forEach((variant) => {
        const { unmount } = render(<SectionHeading title={`Heading ${variant}`} variant={variant} />);
        expect(screen.getByText(`Heading ${variant}`).closest('[data-heading-variant]')).toHaveAttribute(
          'data-heading-variant',
          variant
        );
        unmount();
      });

      const skillVariants: SkillStyleVariant[] = ['chips', 'comma', 'bars', 'dots', 'columns'];
      const skillsSection = sampleResume.content.sections.find((s) => s.id === 'sample-skills')!;
      skillVariants.forEach((variant) => {
        const { container, unmount } = render(
          <SkillList section={skillsSection} variant={variant} readOnly />
        );
        expect(container.querySelector(`[data-skill-variant="${variant}"]`)).toBeInTheDocument();
        unmount();
      });

      const { rerender } = render(
        <DateRange startDate="2022-03" endDate="2024-11" dateFormat="MMM YYYY" />
      );
      expect(screen.getByText('Mar 2022 - Nov 2024')).toBeInTheDocument();

      rerender(<DateRange startDate="2022-03" endDate="2024-11" dateFormat="MM/YYYY" />);
      expect(screen.getByText('03/2022 - 11/2024')).toBeInTheDocument();

      rerender(<DateRange startDate="2022-03" endDate="2024-11" dateFormat="YYYY" />);
      expect(screen.getByText('2022 - 2024')).toBeInTheDocument();
    });
  });

  describe('3. Template Gallery Modal: Filtering, Selection, Sample Fallback & Accessibility', () => {
    it('opens modal gallery, falls back to sampleResume when empty, filters by category, traps focus/Escape, and preserves user theme edits on select', () => {
      const emptyResume: IResume = {
        title: 'Blank Draft',
        themeConfig: {
          accentColor: '#10b981',
        },
        content: {
          basics: {},
          sections: [],
          sectionOrder: [],
        },
      };
      const onChange = jest.fn();

      render(<ResumePreview resume={emptyResume} onChange={onChange} />);

      // Open gallery
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });
      expect(dialog).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Showing sample resume data/i)
      ).toBeInTheDocument();

      // Current template ('modern') highlighted + ATS badges + layout icons present
      expect(within(dialog).getByTestId('active-template-badge-modern')).toBeInTheDocument();
      expect(within(dialog).getByTestId('ats-badge-modern')).toBeInTheDocument();
      expect(within(dialog).getAllByTestId('layout-icon-single').length).toBeGreaterThan(0);

      // Filter by 'tech' category
      fireEvent.click(within(dialog).getByTestId('gallery-category-tech'));
      expect(within(dialog).getByTestId('template-card-tech-split')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('template-card-professional')).not.toBeInTheDocument();

      // Filter by 'professional' category
      fireEvent.click(within(dialog).getByTestId('gallery-category-professional'));
      expect(within(dialog).getByTestId('template-card-professional')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('template-card-tech-split')).not.toBeInTheDocument();

      // Escape closes modal
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Reopen and select Professional
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const reopenedDialog = screen.getByRole('dialog');
      fireEvent.click(within(reopenedDialog).getByTestId('template-card-professional'));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'professional',
          themeConfig: expect.objectContaining({
            accentColor: '#10b981', // preserved user customisation!
            fontPairingId: 'classic-serif', // merged from Professional defaultTheme!
            skillStyle: 'comma',
          }),
        })
      );
    });

    it('renders each gallery card with its own merged template theme instead of the active template saved defaults, while preserving explicitly customised keys', () => {
      const creativeSidebarDefaults = getTemplate('creative-sidebar').defaultTheme;
      const classicDefaults = getTemplate('classic').defaultTheme;

      const studioSidebarResume: IResume = {
        ...sampleResume,
        templateId: 'creative-sidebar',
        themeConfig: { ...creativeSidebarDefaults },
      };

      const { unmount } = render(
        <TemplateGalleryModal
          isOpen
          activeTemplateId="creative-sidebar"
          resume={studioSidebarResume}
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      );

      // Classic card page root uses Classic's own defaults, not Studio Sidebar's pill/bars/purple
      const classicPageRoot = screen.getByTestId('template-thumbnail-canvas-classic');
      expect(classicPageRoot).toHaveStyle({
        '--theme-heading-style': 'underline',
        '--theme-skill-style': 'comma',
        '--theme-primary': classicDefaults.primaryColor,
      });
      expect(
        classicPageRoot.querySelector('[data-heading-variant="underline"]')
      ).toBeInTheDocument();
      expect(
        classicPageRoot.querySelector('[data-skill-variant="comma"]')
      ).toBeInTheDocument();

      // Active Studio Sidebar card keeps its own pill/bars defaults
      const studioPageRoot = screen.getByTestId(
        'template-thumbnail-canvas-creative-sidebar'
      );
      expect(studioPageRoot).toHaveStyle({
        '--theme-heading-style': 'pill',
        '--theme-skill-style': 'bars',
        '--theme-primary': creativeSidebarDefaults.primaryColor,
      });

      unmount();

      // Explicitly customised key (e.g. primaryColor) is preserved on every card,
      // even when its value matches the active template's default or is a custom colour
      const customPrimaryResume: IResume = {
        ...sampleResume,
        templateId: 'creative-sidebar',
        themeConfig: {
          ...creativeSidebarDefaults,
          primaryColor: '#dc2626',
        },
      };
      const customisedKeys = new Set<keyof ThemeConfig>(['primaryColor']);

      render(
        <TemplateGalleryModal
          isOpen
          activeTemplateId="creative-sidebar"
          resume={customPrimaryResume}
          customisedKeys={customisedKeys}
          onSelect={jest.fn()}
          onClose={jest.fn()}
        />
      );

      templateRegistry.forEach((entry) => {
        const cardRoot = screen.getByTestId(`template-thumbnail-canvas-${entry.id}`);
        expect(cardRoot).toHaveStyle({
          '--theme-primary': '#dc2626',
        });
      });

      // Non-customised keys on Classic still reflect Classic's own defaults
      expect(screen.getByTestId('template-thumbnail-canvas-classic')).toHaveStyle({
        '--theme-heading-style': 'underline',
        '--theme-skill-style': 'comma',
      });
    });

    it('forwards customisedKeys from ResumePreview so explicitly chosen active-default colours stay preserved across all gallery cards', () => {
      const creativeSidebarDefaults = getTemplate('creative-sidebar').defaultTheme;

      const StatefulPreviewHarness: React.FC = () => {
        const [currentResume, setCurrentResume] = React.useState<IResume>({
          ...sampleResume,
          templateId: 'creative-sidebar',
          themeConfig: { ...creativeSidebarDefaults },
        });
        return <ResumePreview resume={currentResume} onChange={setCurrentResume} />;
      };

      render(<StatefulPreviewHarness />);

      // Explicitly select Purple Violet (#7c3aed — same hex as Studio Sidebar's default!)
      fireEvent.click(screen.getByTestId('theme-customization-btn'));
      fireEvent.click(screen.getByTestId('color-option-violet'));

      // Open Template Gallery
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      // Every card preserves the explicitly chosen #7c3aed primaryColor,
      // while Classic still uses its own underline headings and comma skills
      templateRegistry.forEach((entry) => {
        const cardRoot = within(dialog).getByTestId(
          `template-thumbnail-canvas-${entry.id}`
        );
        expect(cardRoot).toHaveStyle({
          '--theme-primary': '#7c3aed',
        });
      });

      const classicRoot = within(dialog).getByTestId(
        'template-thumbnail-canvas-classic'
      );
      expect(classicRoot).toHaveStyle({
        '--theme-heading-style': 'underline',
        '--theme-skill-style': 'comma',
      });
    });
  });

  describe('4. Theme CSS Variables & Grouped Design Controls', () => {
    it('applies all design control CSS variables to the page root and supports grouped ThemeCustomizationPanel controls + reset', () => {
      const themedResume: IResume = {
        ...sampleResume,
        templateId: 'tech-split',
        themeConfig: {
          primaryColor: '#0f766e',
          accentColor: '#f59e0b',
          fontPairingId: 'technical-mono',
          fontScale: 1.1,
          lineHeight: 1.65,
          sectionSpacing: 'spacious',
          pageMargins: 'narrow',
          headingStyle: 'pill',
          skillStyle: 'bars',
          sidebarWidth: 36,
          dateFormat: 'MM/YYYY',
        },
      };
      const onChange = jest.fn();

      render(<ResumePreview resume={themedResume} onChange={onChange} />);

      const pageRoot = screen.getByTestId('resume-preview-page');
      expect(pageRoot).toHaveStyle({
        '--theme-primary': '#0f766e',
        '--theme-accent': '#f59e0b',
        '--theme-font-scale': '1.1',
        '--theme-line-height': '1.65',
        '--theme-section-spacing': '2.25rem',
        '--theme-page-margin': '1.25cm',
        '--theme-sidebar-width': '36%',
        '--theme-heading-style': 'pill',
        '--theme-skill-style': 'bars',
        '--theme-date-format': 'MM/YYYY',
      });

      // Open ThemeCustomizationPanel and verify all 4 groups + Reset to template defaults
      fireEvent.click(screen.getByTestId('theme-customization-btn'));
      expect(screen.getByTestId('theme-group-colours')).toBeInTheDocument();
      expect(screen.getByTestId('theme-group-typography')).toBeInTheDocument();
      expect(screen.getByTestId('theme-group-spacing')).toBeInTheDocument();
      expect(screen.getByTestId('theme-group-layout')).toBeInTheDocument();

      // Update page margin & heading style
      fireEvent.click(screen.getByTestId('margin-option-wide'));
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          themeConfig: expect.objectContaining({ pageMargins: 'wide' }),
        })
      );

      fireEvent.click(screen.getByTestId('heading-style-bar'));
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          themeConfig: expect.objectContaining({ headingStyle: 'bar' }),
        })
      );

      // Reset to template defaults restores tech-split defaultTheme
      const resetBtn = screen.getByRole('button', {
        name: /reset to template defaults/i,
      });
      fireEvent.click(resetBtn);
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          themeConfig: expect.objectContaining({
            fontPairingId: 'technical-mono',
            primaryColor: '#0f766e',
            headingStyle: 'bar',
            skillStyle: 'chips',
            sidebarWidth: 32,
          }),
        })
      );
    });
  });
});
