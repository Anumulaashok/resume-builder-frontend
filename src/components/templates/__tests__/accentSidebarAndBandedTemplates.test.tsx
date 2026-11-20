import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../../ResumePreview';
import { AccentSidebarTemplate } from '../AccentSidebarTemplate';
import { BandedTemplate } from '../BandedTemplate';
import { getTemplate, templateRegistry } from '../registry';
import { sampleResume } from '../sampleResume';
import { IResume, SectionType } from '../../../types/resume';

describe('Accent Sidebar and Banded Templates', () => {
  describe('1. Registry entries & preservation of existing templates', () => {
    it('registers accent-sidebar and banded with exact metadata and keeps all existing IDs unique', () => {
      const ids = templateRegistry.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);

      expect(ids).toEqual(
        expect.arrayContaining([
          'modern',
          'professional',
          'minimal',
          'tech-split',
          'creative-sidebar',
          'two-column',
          'accent-sidebar',
          'banded',
        ])
      );

      const accentEntry = getTemplate('accent-sidebar');
      expect(accentEntry.id).toBe('accent-sidebar');
      expect(accentEntry.name).toBe('Accent Sidebar');
      expect(accentEntry.category).toBe('modern');
      expect(accentEntry.layout).toBe('sidebar-left');
      expect(accentEntry.atsFriendly).toBe(false);
      expect(accentEntry.component).toBe(AccentSidebarTemplate);

      const bandedEntry = getTemplate('banded');
      expect(bandedEntry.id).toBe('banded');
      expect(bandedEntry.name).toBe('Banded');
      expect(bandedEntry.category).toBe('professional');
      expect(bandedEntry.layout).toBe('single');
      expect(bandedEntry.atsFriendly).toBe(false);
      expect(bandedEntry.defaultTheme.headingStyle).toBe('side-label');
      expect(bandedEntry.component).toBe(BandedTemplate);
    });
  });

  describe('2. Rendering sampleResume, column placement, and linear DOM order', () => {
    it('renders AccentSidebarTemplate with sampleResume, pseudo-element monogram, main-before-aside DOM reading order, and visual grid placement', () => {
      const { rerender } = render(
        <AccentSidebarTemplate resume={sampleResume} readOnly />
      );

      const aside = screen.getByTestId('accent-sidebar-aside');
      const main = screen.getByRole('main');
      const monogram = screen.getByTestId('accent-sidebar-monogram');
      expect(monogram).toHaveAttribute('data-monogram', 'ML');
      expect(monogram.className).toContain('before:content-[attr(data-monogram)]');
      expect(monogram).toHaveTextContent('');
      expect(screen.getByTestId('accent-sidebar-print-bg')).toBeInTheDocument();

      // Linear DOM reading order places <main> before <aside> while grid placement keeps aside visually left
      expect(
        Boolean(main.compareDocumentPosition(aside) & Node.DOCUMENT_POSITION_FOLLOWING)
      ).toBe(true);
      expect(main.className).toContain('sm:col-start-2');
      expect(aside.className).toContain('sm:col-start-1');

      // Sidebar holds contact, skills, languages, certificates
      expect(within(aside).getByText('maya.lin@example.dev')).toBeInTheDocument();
      expect(within(aside).getByText('Frontend Architecture')).toBeInTheDocument();
      expect(within(aside).getByText('Mandarin')).toBeInTheDocument();
      expect(
        within(aside).getByText('W3C Web Accessibility Specialist')
      ).toBeInTheDocument();

      // Main column holds name, title, summary, work experience, education, projects
      expect(within(main).getByText('Maya Lin')).toBeInTheDocument();
      expect(
        within(main).getByText('Staff Frontend & Platform Architect')
      ).toBeInTheDocument();
      expect(
        within(main).getByText(/Staff engineer with 9\+ years of experience/i)
      ).toBeInTheDocument();
      expect(within(main).getByText('Staff Frontend Architect')).toBeInTheDocument();
      expect(within(main).getByText('M.S. in Computer Science')).toBeInTheDocument();
      expect(within(main).getByText('Lattice UI Primitives')).toBeInTheDocument();

      // Omits monogram element and attribute when candidate name is empty
      rerender(
        <AccentSidebarTemplate
          resume={{
            ...sampleResume,
            content: {
              ...sampleResume.content,
              basics: { ...sampleResume.content.basics, name: '   ' },
            },
          }}
          readOnly={false}
        />
      );
      expect(
        screen.queryByTestId('accent-sidebar-monogram')
      ).not.toBeInTheDocument();
    });

    it('respects skillStyle theme configuration in AccentSidebarTemplate', () => {
      const barsResume: IResume = {
        ...sampleResume,
        themeConfig: { skillStyle: 'bars' },
      };
      const { container } = render(
        <AccentSidebarTemplate resume={barsResume} readOnly />
      );
      expect(
        container.querySelector('[data-skill-variant="bars"]')
      ).toBeInTheDocument();
    });

    it('renders BandedTemplate with sampleResume using side-label headings in linear DOM order', () => {
      const { container } = render(
        <BandedTemplate resume={sampleResume} readOnly />
      );

      expect(screen.getByText('Maya Lin')).toBeInTheDocument();
      expect(
        screen.getByText('Staff Frontend & Platform Architect')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Staff engineer with 9\+ years of experience/i)
      ).toBeInTheDocument();

      // All section headings default to side-label
      const sideLabelHeadings = container.querySelectorAll(
        '[data-heading-variant="side-label"]'
      );
      expect(sideLabelHeadings.length).toBeGreaterThanOrEqual(
        sampleResume.content.sectionOrder.length + 1
      );

      // Linear DOM order matches summary followed by sampleResume.content.sectionOrder
      const bandsRoot = screen.getByTestId('banded-sections');
      const renderedSectionIds = Array.from(
        bandsRoot.querySelectorAll('section[data-section-id]')
      ).map((el) => el.getAttribute('data-section-id'));
      expect(renderedSectionIds).toEqual([
        'summary',
        ...sampleResume.content.sectionOrder,
      ]);
    });
  });

  describe.each([
    ['AccentSidebarTemplate', AccentSidebarTemplate],
    ['BandedTemplate', BandedTemplate],
  ] as const)('3. %s sparse resume, disabled filtering, and inline editing', (_name, TemplateComponent) => {
    it('hides enabled===false items and enabled===false sections while keeping enabled===true and undefined visible', () => {
      const filteredResume: IResume = {
        ...sampleResume,
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
                  startDate: '2022',
                  current: true,
                  enabled: true,
                },
                {
                  id: 'w-default',
                  name: 'Default Legacy Co.',
                  position: 'Senior Developer',
                  startDate: '2019',
                  endDate: '2022',
                },
                {
                  id: 'w-hidden',
                  name: 'Hidden Stealth Corp',
                  position: 'Secret Role',
                  startDate: '2017',
                  endDate: '2019',
                  enabled: false,
                },
              ],
            },
            {
              id: 'sec-skills',
              type: SectionType.SKILLS,
              title: 'Skills',
              enabled: true,
              content: [
                { id: 'sk-on', name: 'TypeScript', enabled: true },
                { id: 'sk-off', name: 'ObsoleteSkillToken', enabled: false },
              ],
            },
            {
              id: 'sec-certs-disabled',
              type: SectionType.CERTIFICATES,
              title: 'Hidden Certifications Section',
              enabled: false,
              content: [
                { id: 'cert-1', name: 'Suppressed Certificate' },
              ],
            },
          ],
          sectionOrder: ['sec-work', 'sec-skills', 'sec-certs-disabled'],
        },
      };

      render(<TemplateComponent resume={filteredResume} readOnly />);

      expect(screen.getByText('Principal Engineer')).toBeInTheDocument();
      expect(screen.getByText('Visible Systems Inc.')).toBeInTheDocument();
      expect(screen.getByText('Senior Developer')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();

      expect(screen.queryByText('Secret Role')).not.toBeInTheDocument();
      expect(screen.queryByText('Hidden Stealth Corp')).not.toBeInTheDocument();
      expect(screen.queryByText('ObsoleteSkillToken')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Hidden Certifications Section')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Suppressed Certificate')
      ).not.toBeInTheDocument();
    });

    it('renders cleanly with a sparse resume (name + one job) without orphaned headings', () => {
      const sparseResume: IResume = {
        title: 'Sparse Resume',
        content: {
          basics: {
            name: 'Jordan Taylor',
          },
          sections: [
            {
              id: 'sparse-work',
              type: SectionType.WORK,
              title: 'Experience',
              content: [
                {
                  id: 'job-1',
                  name: 'Acme Robotics',
                  position: 'Software Engineer',
                  startDate: 'Jan 2024',
                  current: true,
                  description: 'Built control plane UI.',
                },
              ],
            },
          ],
          sectionOrder: ['sparse-work'],
        },
      };

      render(<TemplateComponent resume={sparseResume} readOnly />);

      expect(screen.getByText('Jordan Taylor')).toBeInTheDocument();
      expect(screen.getByText('Software Engineer')).toBeInTheDocument();
      expect(screen.getByText('Acme Robotics')).toBeInTheDocument();
      expect(screen.queryByText('Contact')).not.toBeInTheDocument();
      expect(screen.queryByText('Summary')).not.toBeInTheDocument();
    });

    it('supports inline click-to-edit for basics and section items via shared TemplateProvider context', async () => {
      const handleChange = jest.fn();
      render(
        <TemplateComponent
          resume={sampleResume}
          onChange={handleChange}
          readOnly={false}
        />
      );

      // Edit candidate name
      fireEvent.click(screen.getByText('Maya Lin'));
      const nameInput = await screen.findByDisplayValue('Maya Lin');
      fireEvent.change(nameInput, { target: { value: 'Maya Lin-Park' } });
      fireEvent.blur(nameInput);

      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            basics: expect.objectContaining({ name: 'Maya Lin-Park' }),
          }),
        })
      );

      // Edit work item position
      fireEvent.click(screen.getByText('Staff Frontend Architect'));
      const posInput = await screen.findByDisplayValue(
        'Staff Frontend Architect'
      );
      fireEvent.change(posInput, { target: { value: 'Distinguished Architect' } });
      fireEvent.blur(posInput);

      const lastCallResume = handleChange.mock.calls[
        handleChange.mock.calls.length - 1
      ][0] as IResume;
      const workSec = lastCallResume.content.sections.find(
        (s) => s.id === 'sample-work'
      )!;
      expect((workSec.content[0] as any).position).toBe(
        'Distinguished Architect'
      );
    });
  });

  describe('4. TemplateGalleryModal category filtering and selection', () => {
    it('shows Accent Sidebar under Modern and Banded under Professional in TemplateGalleryModal', () => {
      const onChange = jest.fn();
      render(<ResumePreview resume={sampleResume} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      // Both appear under 'All'
      expect(
        within(dialog).getByTestId('template-card-accent-sidebar')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('template-card-banded')
      ).toBeInTheDocument();

      // Filter by Modern -> Accent Sidebar appears with caution badge (atsFriendly is false), Banded hidden
      fireEvent.click(within(dialog).getByTestId('gallery-category-modern'));
      expect(
        within(dialog).getByTestId('template-card-accent-sidebar')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-accent-sidebar')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-accent-sidebar')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-banded')
      ).not.toBeInTheDocument();

      // Filter by Professional -> Banded appears with caution badge (2-column label grid, atsFriendly is false), Accent Sidebar hidden
      fireEvent.click(
        within(dialog).getByTestId('gallery-category-professional')
      );
      expect(
        within(dialog).getByTestId('template-card-banded')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-banded')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-banded')
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-accent-sidebar')
      ).not.toBeInTheDocument();

      // Select Banded and verify ResumePreview applies it
      fireEvent.click(within(dialog).getByTestId('template-card-banded'));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'banded',
          themeConfig: expect.objectContaining({
            headingStyle: 'side-label',
          }),
        })
      );
      expect(screen.getByTestId('banded-template')).toBeInTheDocument();
    });
  });
});
