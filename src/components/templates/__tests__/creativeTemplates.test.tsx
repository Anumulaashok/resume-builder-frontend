import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../../ResumePreview';
import { TimelineTemplate } from '../TimelineTemplate';
import { BoldHeaderTemplate } from '../BoldHeaderTemplate';
import { ElegantTemplate } from '../ElegantTemplate';
import { getTemplate, templateRegistry } from '../registry';
import { sampleResume } from '../sampleResume';
import { IResume, SectionType } from '../../../types/resume';

const NEW_CREATIVE_TEMPLATES = [
  ['timeline', 'Timeline', TimelineTemplate],
  ['bold-header', 'Bold Header', BoldHeaderTemplate],
  ['elegant', 'Elegant', ElegantTemplate],
] as const;

describe('Creative Templates: Timeline, Bold Header, and Elegant', () => {
  describe('Registry entries & existing template preservation', () => {
    it('registers timeline, bold-header, and elegant under creative with atsFriendly=false and preserves existing ids', () => {
      const ids = templateRegistry.map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Existing 6 IDs remain intact
      [
        'modern',
        'professional',
        'minimal',
        'tech-split',
        'creative-sidebar',
        'two-column',
      ].forEach((existingId) => {
        expect(ids).toContain(existingId);
      });

      NEW_CREATIVE_TEMPLATES.forEach(([id, expectedName, ExpectedComponent]) => {
        const entry = getTemplate(id);
        expect(entry.id).toBe(id);
        expect(entry.name).toBe(expectedName);
        expect(entry.category).toBe('creative');
        expect(entry.atsFriendly).toBe(false);
        expect(entry.component).toBe(ExpectedComponent);
        expect(entry.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe.each(NEW_CREATIVE_TEMPLATES)(
    '%s (%s)',
    (templateId, _templateName, TemplateComponent) => {
      it('renders sampleResume across all sections without crashing', () => {
        const { container } = render(
          <TemplateComponent
            resume={{ ...sampleResume, templateId }}
            readOnly
          />
        );

        // Basics & summary
        expect(screen.getByText('Maya Lin')).toBeInTheDocument();
        expect(
          screen.getByText('Staff Frontend & Platform Architect')
        ).toBeInTheDocument();
        expect(screen.getByText(/4M\+ monthly active users/)).toBeInTheDocument();

        // All 14 section kinds present in sampleResume
        expect(screen.getByText('Staff Frontend Architect')).toBeInTheDocument();
        expect(
          screen.getAllByText('Veridian Cloud').length
        ).toBeGreaterThanOrEqual(2);
        expect(screen.getByText('M.S. in Computer Science')).toBeInTheDocument();
        expect(screen.getByText('Lattice UI Primitives')).toBeInTheDocument();
        expect(screen.getByText('Frontend Architecture')).toBeInTheDocument();
        expect(screen.getByText('Mandarin')).toBeInTheDocument();
        expect(
          screen.getByText('W3C Web Accessibility Specialist')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Distinguished Engineering Impact Award')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Distributed Systems Engineering')
        ).toBeInTheDocument();
        expect(
          screen.getByText('OpenJS Accessibility Working Group')
        ).toBeInTheDocument();
        expect(
          screen.getByText('Composable Accessibility Trees for Rich Canvas Editors')
        ).toBeInTheDocument();
        expect(screen.getByText('Devon Brooks')).toBeInTheDocument();
        expect(screen.getByText('Trail Running')).toBeInTheDocument();
        expect(
          screen.getByText('Keynote Speaker at JSConf West')
        ).toBeInTheDocument();
        expect(
          screen.getByText('CodePath Career Fellow Mentor')
        ).toBeInTheDocument();

        // Section ordering preserved
        const renderedIds = Array.from(
          container.querySelectorAll('section[data-section-id]')
        ).map((el) => el.getAttribute('data-section-id'));
        expect(renderedIds).toEqual(sampleResume.content.sectionOrder);
      });

      it('hides items and sections where enabled === false in both readOnly and editable modes', () => {
        const resumeWithDisabled: IResume = {
          ...sampleResume,
          templateId,
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
                    name: 'Visible Studio',
                    position: 'Lead Creative Technologist',
                    startDate: 'Jan 2022',
                    current: true,
                    enabled: true,
                  },
                  {
                    id: 'w-hidden',
                    name: 'Hidden Stealth Corp',
                    position: 'Suppressed Work Role',
                    startDate: 'Jan 2019',
                    endDate: 'Dec 2021',
                    enabled: false,
                  },
                ],
              },
              {
                id: 'sec-edu',
                type: SectionType.EDUCATION,
                title: 'Education',
                enabled: true,
                content: [
                  {
                    id: 'e-visible',
                    degree: 'B.F.A. Graphic Design',
                    field: 'Visual Systems',
                    enabled: true,
                  },
                  {
                    id: 'e-hidden',
                    degree: 'Suppressed Degree Entry',
                    field: 'Hidden Major',
                    enabled: false,
                  },
                ],
              },
              {
                id: 'sec-skills',
                type: SectionType.SKILLS,
                title: 'Skills',
                content: [
                  { id: 's-visible', name: 'Figma' },
                  { id: 's-hidden', name: 'HiddenObsoleteTool', enabled: false },
                ],
              },
              {
                id: 'sec-disabled',
                type: SectionType.AWARDS,
                title: 'Disabled Section Heading',
                enabled: false,
                content: [{ id: 'a-1', name: 'Hidden Section Award' }],
              },
            ],
            sectionOrder: ['sec-work', 'sec-edu', 'sec-skills', 'sec-disabled'],
          },
        };

        const { rerender } = render(
          <TemplateComponent resume={resumeWithDisabled} readOnly />
        );

        expect(
          screen.getByText('Lead Creative Technologist')
        ).toBeInTheDocument();
        expect(screen.getByText('Visible Studio')).toBeInTheDocument();
        expect(screen.getByText('B.F.A. Graphic Design')).toBeInTheDocument();
        expect(screen.getByText('Figma')).toBeInTheDocument();

        expect(
          screen.queryByText('Suppressed Work Role')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Hidden Stealth Corp')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Suppressed Degree Entry')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('HiddenObsoleteTool')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Disabled Section Heading')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Hidden Section Award')
        ).not.toBeInTheDocument();

        // Also verify interactive mode suppresses disabled items
        rerender(
          <TemplateComponent
            resume={resumeWithDisabled}
            onChange={jest.fn()}
            readOnly={false}
          />
        );
        expect(
          screen.queryByText('Suppressed Work Role')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Suppressed Degree Entry')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('HiddenObsoleteTool')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Disabled Section Heading')
        ).not.toBeInTheDocument();
      });

      it('renders cleanly with a sparse resume (name + one job) and no summary or extra sections', () => {
        const sparseResume: IResume = {
          title: 'Sparse Creative Resume',
          templateId,
          content: {
            basics: {
              name: 'Nora Vance',
            },
            sections: [
              {
                id: 'sparse-work',
                type: SectionType.WORK,
                title: 'Experience',
                content: [
                  {
                    id: 'job-only',
                    name: 'Atelier North',
                    position: 'Product Designer',
                    startDate: '2024',
                    current: true,
                  },
                ],
              },
            ],
            sectionOrder: ['sparse-work'],
          },
        };

        render(<TemplateComponent resume={sparseResume} readOnly />);

        expect(screen.getByText('Nora Vance')).toBeInTheDocument();
        expect(screen.getByText('Product Designer')).toBeInTheDocument();
        expect(screen.getByText('Atelier North')).toBeInTheDocument();
        expect(screen.getByText('2024 - Present')).toBeInTheDocument();
      });

      it('supports inline click-to-edit via TemplateProvider for basics and work items', async () => {
        const onChange = jest.fn();
        render(
          <TemplateComponent
            resume={{ ...sampleResume, templateId }}
            onChange={onChange}
            readOnly={false}
          />
        );

        // Edit basics.name
        fireEvent.click(screen.getByText('Maya Lin'));
        const nameInput = await screen.findByDisplayValue('Maya Lin');
        fireEvent.change(nameInput, { target: { value: 'Maya Lin-Rivera' } });
        fireEvent.blur(nameInput);

        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({
            content: expect.objectContaining({
              basics: expect.objectContaining({ name: 'Maya Lin-Rivera' }),
            }),
          })
        );

        // Edit work item position
        fireEvent.click(screen.getByText('Staff Frontend Architect'));
        const posInput = await screen.findByDisplayValue(
          'Staff Frontend Architect'
        );
        fireEvent.change(posInput, {
          target: { value: 'Design Systems Director' },
        });
        fireEvent.blur(posInput);

        const latestResume = onChange.mock.calls[
          onChange.mock.calls.length - 1
        ][0] as IResume;
        const workSection = latestResume.content.sections.find(
          (s) => s.id === 'sample-work'
        )!;
        expect((workSection.content[0] as any).position).toBe(
          'Design Systems Director'
        );
      });
    }
  );

  describe('Template-specific visual structure', () => {
    it('Timeline places work and education dates on the left rail with dots and connecting lines without duplicating dates', () => {
      render(<TimelineTemplate resume={sampleResume} readOnly />);

      const dateRails = screen.getAllByTestId('timeline-date-rail');
      expect(dateRails.length).toBe(3); // 2 work items + 1 education item in sampleResume

      expect(screen.getAllByTestId('timeline-dot').length).toBe(3);
      expect(screen.getAllByTestId('timeline-line').length).toBe(3);

      // Dates appear once (on the left rail, not duplicated inside ItemHeader)
      expect(screen.getAllByText('Mar 2022 - Present')).toHaveLength(1);
      expect(screen.getAllByText('Jun 2018 - Feb 2022')).toHaveLength(1);
      expect(screen.getAllByText('Sep 2016 - May 2018')).toHaveLength(1);
    });

    it('Bold Header renders the full-width accent band, circular initials badge via CSS ::before, and card-like sections', () => {
      const { rerender } = render(
        <BoldHeaderTemplate resume={sampleResume} readOnly />
      );

      expect(screen.getByTestId('bold-header-band')).toBeInTheDocument();
      const badge = screen.getByTestId('bold-header-initials');
      expect(badge).toHaveAttribute('data-monogram', 'ML');
      expect(badge.className).toContain('before:content-[attr(data-monogram)]');
      expect(badge).toHaveTextContent('');
      expect(screen.getByTestId('bold-header-summary-card')).toBeInTheDocument();
      expect(screen.getByTestId('bold-header-cards')).toBeInTheDocument();

      // Omits monogram badge when name is empty
      rerender(
        <BoldHeaderTemplate
          resume={{
            ...sampleResume,
            content: {
              ...sampleResume.content,
              basics: { ...sampleResume.content.basics, name: '' },
            },
          }}
          readOnly={false}
        />
      );
      expect(screen.queryByTestId('bold-header-initials')).not.toBeInTheDocument();
    });

    it('Elegant renders the initials monogram via CSS ::before, thin accent rules, and centered section headings', () => {
      const { rerender } = render(
        <ElegantTemplate resume={sampleResume} readOnly />
      );

      const monogram = screen.getByTestId('elegant-monogram');
      expect(monogram).toHaveAttribute('data-monogram', 'ML');
      expect(monogram.className).toContain('before:content-[attr(data-monogram)]');
      expect(monogram).toHaveTextContent('');
      expect(screen.getByTestId('elegant-sections')).toBeInTheDocument();

      // Omits monogram when name is empty
      rerender(
        <ElegantTemplate
          resume={{
            ...sampleResume,
            content: {
              ...sampleResume.content,
              basics: { ...sampleResume.content.basics, name: '' },
            },
          }}
          readOnly={false}
        />
      );
      expect(screen.queryByTestId('elegant-monogram')).not.toBeInTheDocument();
    });
  });

  describe('TemplateGalleryModal creative category integration', () => {
    it('displays Timeline, Bold Header, and Elegant under the Creative category without ATS badges and selects them cleanly', () => {
      const onChange = jest.fn();
      render(<ResumePreview resume={sampleResume} onChange={onChange} />);

      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });

      const creativeFilterBtn = within(dialog).getByTestId(
        'gallery-category-creative'
      );
      expect(creativeFilterBtn).toHaveTextContent('Creative (4)');
      fireEvent.click(creativeFilterBtn);

      // Studio Sidebar + the 3 new creative templates are shown
      expect(
        within(dialog).getByTestId('template-card-creative-sidebar')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('template-card-timeline')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('template-card-bold-header')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('template-card-elegant')
      ).toBeInTheDocument();

      // Non-creative templates are filtered out
      expect(
        within(dialog).queryByTestId('template-card-modern')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('template-card-professional')
      ).not.toBeInTheDocument();

      // None of the new creative templates displays an ATS-friendly badge; all show caution badges
      expect(
        within(dialog).queryByTestId('ats-badge-timeline')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-bold-header')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByTestId('ats-badge-elegant')
      ).not.toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-timeline')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-bold-header')
      ).toBeInTheDocument();
      expect(
        within(dialog).getByTestId('ats-caution-badge-elegant')
      ).toBeInTheDocument();

      // Selecting Bold Header applies its templateId and defaultTheme
      fireEvent.click(within(dialog).getByTestId('template-card-bold-header'));
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'bold-header',
          themeConfig: expect.objectContaining({
            accentColor: '#991b1b',
            headingStyle: 'bar',
          }),
        })
      );
    });
  });
});
