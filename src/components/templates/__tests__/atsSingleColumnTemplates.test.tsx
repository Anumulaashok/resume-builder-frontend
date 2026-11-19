import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassicTemplate } from '../ClassicTemplate';
import { ExecutiveTemplate } from '../ExecutiveTemplate';
import { CompactTemplate } from '../CompactTemplate';
import { TemplateGalleryModal } from '../TemplateGalleryModal';
import { getTemplate, templateRegistry } from '../registry';
import { sampleResume } from '../sampleResume';
import { IResume, SectionType } from '../../../types/resume';
import ResumePreview from '../../ResumePreview';

const NEW_TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    category: 'professional',
    defaultHeadingVariant: 'underline',
    defaultSkillVariant: 'comma',
    component: ClassicTemplate,
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'professional',
    defaultHeadingVariant: 'caps',
    defaultSkillVariant: 'columns',
    component: ExecutiveTemplate,
  },
  {
    id: 'compact',
    name: 'Compact',
    category: 'simple',
    defaultHeadingVariant: 'underline',
    defaultSkillVariant: 'comma',
    component: CompactTemplate,
  },
] as const;

describe('ATS Single-Column Templates (Classic, Executive, Compact) & Gallery Thumbnail Scaling', () => {
  describe('Registry entries & existing template preservation', () => {
    it('registers classic, executive, and compact with unique IDs while keeping all existing template IDs intact', () => {
      const ids = templateRegistry.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);

      // Existing 6 templates untouched
      expect(ids).toEqual(
        expect.arrayContaining([
          'modern',
          'professional',
          'minimal',
          'tech-split',
          'creative-sidebar',
          'two-column',
        ])
      );
      expect(getTemplate('minimal').name).toBe('Clean Slate');
      expect(getTemplate('tech-split').name).toBe('Systems Split');
      expect(getTemplate('creative-sidebar').name).toBe('Studio Sidebar');
      expect(getTemplate('two-column').name).toBe('Editorial Grid');

      // New 3 ATS single-column templates
      NEW_TEMPLATES.forEach(({ id, name, category, component }) => {
        const entry = getTemplate(id);
        expect(entry.id).toBe(id);
        expect(entry.name).toBe(name);
        expect(entry.category).toBe(category);
        expect(entry.layout).toBe('single');
        expect(entry.atsFriendly).toBe(true);
        expect(entry.component).toBe(component);
      });
    });
  });

  describe.each(NEW_TEMPLATES)(
    '$name template ($id)',
    ({ id, defaultHeadingVariant, defaultSkillVariant, component: TemplateComponent }) => {
      it('renders sampleResume across all 14 section kinds in linear DOM order without crashing', () => {
        const entry = getTemplate(id);
        const themedSample: IResume = {
          ...sampleResume,
          templateId: id,
          themeConfig: { ...entry.defaultTheme },
        };

        const { container } = render(
          <TemplateComponent resume={themedSample} readOnly />
        );

        // Header basics + summary
        expect(screen.getByText('Maya Lin')).toBeInTheDocument();
        expect(screen.getByText('Staff Frontend & Platform Architect')).toBeInTheDocument();
        expect(screen.getByText(/Staff engineer with 9\+ years/i)).toBeInTheDocument();

        // Representative content across all 14 canonical section kinds
        expect(screen.getByText('Staff Frontend Architect')).toBeInTheDocument(); // work
        expect(
          screen.getByText(/Cut P95 bundle load time by 41%/i)
        ).toBeInTheDocument(); // work highlight bullet
        expect(screen.getByText('Lattice UI Primitives')).toBeInTheDocument(); // projects
        expect(screen.getByText('M.S. in Computer Science')).toBeInTheDocument(); // education
        expect(screen.getByText('Frontend Architecture')).toBeInTheDocument(); // skills
        expect(screen.getByText('Keynote Speaker at JSConf West')).toBeInTheDocument(); // achievements
        expect(
          screen.getByText('Composable Accessibility Trees for Rich Canvas Editors')
        ).toBeInTheDocument(); // publications
        expect(screen.getByText('W3C Web Accessibility Specialist')).toBeInTheDocument(); // certificates
        expect(screen.getByText('Distinguished Engineering Impact Award')).toBeInTheDocument(); // awards
        expect(screen.getByText('OpenJS Accessibility Working Group')).toBeInTheDocument(); // organizations
        expect(screen.getByText('Distributed Systems Engineering')).toBeInTheDocument(); // courses
        expect(screen.getByText('Mandarin')).toBeInTheDocument(); // languages
        expect(screen.getByText('Trail Running')).toBeInTheDocument(); // interests
        expect(screen.getByText('Devon Brooks')).toBeInTheDocument(); // references
        expect(screen.getByText('CodePath Career Fellow Mentor')).toBeInTheDocument(); // custom

        // Linear single-column section order matching sampleResume.content.sectionOrder
        const renderedSectionIds = Array.from(
          container.querySelectorAll('section[data-section-id]')
        ).map((el) => el.getAttribute('data-section-id'));
        expect(renderedSectionIds).toEqual(sampleResume.content.sectionOrder);

        // Default heading & skill variants applied via shared primitives
        expect(
          container.querySelector(`[data-heading-variant="${defaultHeadingVariant}"]`)
        ).toBeInTheDocument();
        expect(
          container.querySelector(`[data-skill-variant="${defaultSkillVariant}"]`)
        ).toBeInTheDocument();
      });

      it('hides items and sections where enabled === false while keeping enabled/default items visible', () => {
        const resumeWithDisabled: IResume = {
          ...sampleResume,
          templateId: id,
          content: {
            ...sampleResume.content,
            sections: [
              {
                id: 'sec-work',
                type: SectionType.WORK,
                title: 'Work Experience',
                enabled: true,
                content: [
                  {
                    id: 'w-visible',
                    name: 'Visible Systems Inc.',
                    position: 'Principal Engineer',
                    startDate: 'Jan 2022',
                    current: true,
                    description: 'Built resilient distributed services.',
                    enabled: true,
                  },
                  {
                    id: 'w-hidden',
                    name: 'Hidden Stealth Corp',
                    position: 'Secret Role',
                    startDate: 'Jan 2019',
                    endDate: 'Dec 2021',
                    description: 'Should never be rendered.',
                    enabled: false,
                  },
                ],
              },
              {
                id: 'sec-skills',
                type: SectionType.SKILLS,
                title: 'Skills',
                content: [
                  { id: 's-default', name: 'TypeScript' },
                  { id: 's-disabled', name: 'ObsoleteSkillXYZ', enabled: false },
                ],
              },
              {
                id: 'sec-disabled',
                type: SectionType.AWARDS,
                title: 'Hidden Awards Section',
                enabled: false,
                content: [
                  { id: 'a-1', name: 'Unshown Award', enabled: true },
                ],
              },
            ],
            sectionOrder: ['sec-work', 'sec-skills', 'sec-disabled'],
          },
        };

        render(<TemplateComponent resume={resumeWithDisabled} readOnly />);

        expect(screen.getByText('Principal Engineer')).toBeInTheDocument();
        expect(screen.getByText('Visible Systems Inc.')).toBeInTheDocument();
        expect(screen.getByText('TypeScript')).toBeInTheDocument();

        expect(screen.queryByText('Secret Role')).not.toBeInTheDocument();
        expect(screen.queryByText('Hidden Stealth Corp')).not.toBeInTheDocument();
        expect(screen.queryByText('Should never be rendered.')).not.toBeInTheDocument();
        expect(screen.queryByText('ObsoleteSkillXYZ')).not.toBeInTheDocument();
        expect(screen.queryByText('Hidden Awards Section')).not.toBeInTheDocument();
        expect(screen.queryByText('Unshown Award')).not.toBeInTheDocument();
      });

      it('renders cleanly with a sparse resume (name + one job) and when all sections are disabled', () => {
        const sparseResume: IResume = {
          templateId: id,
          content: {
            basics: {
              name: 'Alex Morgan',
            },
            sections: [
              {
                id: 'only-work',
                type: SectionType.WORK,
                title: 'Experience',
                content: [
                  {
                    id: 'job-1',
                    name: 'Acme Robotics',
                    position: 'Software Engineer',
                    startDate: '2023',
                    current: true,
                  },
                ],
              },
            ],
            sectionOrder: ['only-work'],
          },
        };

        const { container, rerender } = render(
          <TemplateComponent resume={sparseResume} readOnly />
        );

        expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
        expect(screen.getByText('Software Engineer')).toBeInTheDocument();
        expect(screen.getByText('Acme Robotics')).toBeInTheDocument();
        // No dangling pipe separator or empty summary heading
        expect(container.textContent).not.toContain('|');
        expect(screen.queryByRole('heading', { name: /summary/i })).not.toBeInTheDocument();

        // Disable the remaining section
        const allDisabledResume: IResume = {
          ...sparseResume,
          content: {
            ...sparseResume.content,
            sections: sparseResume.content.sections.map((s) => ({
              ...s,
              enabled: false,
            })),
          },
        };

        rerender(<TemplateComponent resume={allDisabledResume} readOnly />);
        expect(screen.getByText('Alex Morgan')).toBeInTheDocument();
        expect(screen.queryByText('Software Engineer')).not.toBeInTheDocument();
      });

      it('supports inline click-to-edit for basics and section items via TemplateProvider', async () => {
        const handleChange = jest.fn();
        render(
          <TemplateComponent
            resume={sampleResume}
            onChange={handleChange}
            readOnly={false}
          />
        );

        // Edit basics.name
        fireEvent.click(screen.getByText('Maya Lin'));
        const nameInput = await screen.findByDisplayValue('Maya Lin');
        fireEvent.change(nameInput, { target: { value: 'Maya Lin, PhD' } });
        fireEvent.blur(nameInput);

        expect(handleChange).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              basics: expect.objectContaining({ name: 'Maya Lin, PhD' }),
            }),
          })
        );

        // Edit work item position
        fireEvent.click(screen.getByText('Staff Frontend Architect'));
        const posInput = await screen.findByDisplayValue('Staff Frontend Architect');
        fireEvent.change(posInput, { target: { value: 'VP of Frontend Architecture' } });
        fireEvent.blur(posInput);

        const lastCallResume = handleChange.mock.calls[
          handleChange.mock.calls.length - 1
        ][0] as IResume;
        const workSec = lastCallResume.content.sections.find(
          (s) => s.id === 'sample-work'
        )!;
        expect((workSec.content[0] as any).position).toBe(
          'VP of Frontend Architecture'
        );
      });
    }
  );

  describe('TemplateGalleryModal categories & full-card-width thumbnail scaling', () => {
    const originalResizeObserver = (window as any).ResizeObserver;

    afterEach(() => {
      (window as any).ResizeObserver = originalResizeObserver;
    });

    it('displays Classic and Executive under Professional, and Compact under Simple, with ATS-friendly badges', () => {
      const onSelect = jest.fn();
      const onClose = jest.fn();

      render(
        <TemplateGalleryModal
          isOpen
          activeTemplateId="modern"
          resume={sampleResume}
          onSelect={onSelect}
          onClose={onClose}
        />
      );

      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      // All 3 appear under 'All' with ATS-friendly badges
      expect(within(dialog).getByTestId('template-card-classic')).toBeInTheDocument();
      expect(within(dialog).getByTestId('template-card-executive')).toBeInTheDocument();
      expect(within(dialog).getByTestId('template-card-compact')).toBeInTheDocument();
      expect(within(dialog).getByTestId('ats-badge-classic')).toBeInTheDocument();
      expect(within(dialog).getByTestId('ats-badge-executive')).toBeInTheDocument();
      expect(within(dialog).getByTestId('ats-badge-compact')).toBeInTheDocument();

      // Filter by 'professional' -> Classic, Executive, and Professional appear; Compact does not
      fireEvent.click(within(dialog).getByTestId('gallery-category-professional'));
      expect(within(dialog).getByTestId('template-card-classic')).toBeInTheDocument();
      expect(within(dialog).getByTestId('template-card-executive')).toBeInTheDocument();
      expect(within(dialog).getByTestId('template-card-professional')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('template-card-compact')).not.toBeInTheDocument();

      // Filter by 'simple' -> Compact and Clean Slate appear; Classic & Executive do not
      fireEvent.click(within(dialog).getByTestId('gallery-category-simple'));
      expect(within(dialog).getByTestId('template-card-compact')).toBeInTheDocument();
      expect(within(dialog).getByTestId('template-card-minimal')).toBeInTheDocument();
      expect(within(dialog).queryByTestId('template-card-classic')).not.toBeInTheDocument();
      expect(within(dialog).queryByTestId('template-card-executive')).not.toBeInTheDocument();

      // Selecting Compact triggers onSelect with Compact definition
      fireEvent.click(within(dialog).getByTestId('template-card-compact'));
      expect(onSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'compact', name: 'Compact', category: 'simple' })
      );
    });

    it('scales each thumbnail dynamically to 100% of the card width with A4 aspect ratio and no grey band', () => {
      type ResizeCallback = (
        entries: Array<{ target: Element; contentRect: { width: number; height: number } }>
      ) => void;
      const observers: Array<{ cb: ResizeCallback; elements: Element[] }> = [];

      (window as any).ResizeObserver = class MockResizeObserver {
        cb: ResizeCallback;
        elements: Element[] = [];
        constructor(cb: ResizeCallback) {
          this.cb = cb;
          observers.push(this);
        }
        observe(el: Element) {
          this.elements.push(el);
        }
        unobserve() {}
        disconnect() {}
      };

      render(
        <ResumePreview
          resume={{ ...sampleResume, templateId: 'classic' }}
          onChange={jest.fn()}
        />
      );

      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      const thumbViewport = within(dialog).getByTestId('template-thumbnail-classic');
      const thumbCanvas = within(dialog).getByTestId('template-thumbnail-canvas-classic');

      // Viewport spans full card width (w-full), white background (no grey band), and A4 aspect ratio
      expect(thumbViewport.className).toContain('w-full');
      expect(thumbViewport.className).toContain('bg-white');
      expect(thumbViewport.className).not.toContain('bg-neutral-100');
      expect(thumbViewport.className).not.toContain('py-3');
      expect(thumbViewport.style.aspectRatio).toBe('794 / 1123');

      // Simulate a 336px card width via ResizeObserver and verify exact full-width scale
      act(() => {
        observers.forEach((obs) => {
          obs.elements.forEach((el) => {
            obs.cb([{ target: el, contentRect: { width: 336, height: 475 } }]);
          });
        });
      });

      const expectedScale = Number((336 / 794).toFixed(6));
      expect(thumbCanvas.style.width).toBe('794px');
      expect(thumbCanvas.style.transform).toBe(`scale(${expectedScale})`);
      expect(Math.round(794 * expectedScale)).toBe(336);
    });
  });
});
