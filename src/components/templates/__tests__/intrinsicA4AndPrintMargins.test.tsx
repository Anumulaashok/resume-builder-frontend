import React, { useState } from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview from '../../ResumePreview';
import { ThemeCustomizationPanel } from '../../ThemeCustomizationPanel';
import { TemplateGalleryModal } from '../TemplateGalleryModal';
import { templateRegistry } from '../registry';
import { sampleResume } from '../sampleResume';
import { ContactRow, SkillList } from '../shared';
import { IResume, ISection } from '../../../types/resume';

function buildFullFeatureResume(templateId: string): IResume {
  return {
    ...sampleResume,
    templateId,
    content: {
      ...sampleResume.content,
      sections: sampleResume.content.sections.map((sec) => {
        if (sec.id === 'sample-references') {
          return {
            ...sec,
            content: [
              ...sec.content,
              {
                id: 'ref-second',
                name: 'Dr. Elena Vance',
                position: 'Principal Scientist',
                company: 'MIT CSAIL',
                email: 'evance@csail.mit.edu',
                enabled: true,
              },
              {
                id: 'ref-disabled',
                name: 'Hidden Reference',
                position: 'Director',
                company: 'Disabled Corp',
                enabled: false,
              },
            ],
          };
        }
        return sec;
      }),
    },
  };
}

function findElementsWithSmBreakpoint(root: HTMLElement): string[] {
  const matches: string[] = [];
  const allElements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of allElements) {
    const cls = typeof el.className === 'string' ? el.className : '';
    const smTokens = cls
      .split(/\s+/)
      .filter((token) => token.startsWith('sm:') || token.includes(':sm:'));
    if (smTokens.length > 0) {
      matches.push(`${el.tagName.toLowerCase()}: ${smTokens.join(' ')}`);
    }
  }
  return matches;
}

describe('Intrinsic A4 Canvas Layouts and Unified Print Margins', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  describe('1. Zero viewport-dependent sm: classes inside A4 templates and shared primitives', () => {
    it.each(templateRegistry.map((t) => [t.id, t] as const))(
      'renders %s template with zero sm: breakpoint classes at 375px mobile viewport',
      (templateId, entry) => {
        Object.defineProperty(window, 'innerWidth', {
          writable: true,
          configurable: true,
          value: 375,
        });

        const TemplateComponent = entry.component;
        const resume = buildFullFeatureResume(templateId);
        const { container } = render(
          <TemplateComponent resume={resume} readOnly={false} />
        );

        expect(findElementsWithSmBreakpoint(container)).toEqual([]);
      }
    );

    it('renders all SkillList variants and ContactRow variants without sm: classes', () => {
      const skillsSection = sampleResume.content.sections.find(
        (s) => s.id === 'sample-skills'
      ) as ISection;

      const skillVariants = ['chips', 'bars', 'dots', 'columns', 'comma'] as const;
      for (const variant of skillVariants) {
        const { container, unmount } = render(
          <SkillList section={skillsSection} variant={variant} readOnly />
        );
        expect(findElementsWithSmBreakpoint(container)).toEqual([]);
        unmount();
      }

      const contactVariants = [
        'inline-center',
        'inline-left',
        'stacked-right',
        'stacked-left',
      ] as const;
      for (const variant of contactVariants) {
        const { container, unmount } = render(
          <ContactRow resume={sampleResume} variant={variant} />
        );
        expect(findElementsWithSmBreakpoint(container)).toEqual([]);
        unmount();
      }

      const rightContact = render(
        <ContactRow resume={sampleResume} variant="stacked-right" />
      );
      const contactRoot = rightContact.container.firstElementChild as HTMLElement;
      expect(contactRoot.className).toContain('text-right');
      const contactEntry = contactRoot.querySelector('div') as HTMLElement;
      expect(contactEntry.className).toContain('justify-end');
    });
  });

  describe('2. Multi-column, sidebar, and side-label tracks preserved at 375px and in TemplateGalleryModal', () => {
    it('preserves intrinsic multi-column tracks across CreativeSidebar, TechSplit, AccentSidebar, ExecutiveTwoColumn, and Banded templates', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const creativeEntry = templateRegistry.find((t) => t.id === 'creative-sidebar')!;
      const creativeRender = render(
        <creativeEntry.component resume={sampleResume} readOnly />
      );
      const creativeRoot = creativeRender.container.firstElementChild as HTMLElement;
      expect(creativeRoot.className).toContain('flex-row');
      expect(creativeRoot.className).not.toContain('flex-col');
      const creativeAside = creativeRender.container.querySelector('aside') as HTMLElement;
      expect(creativeAside.className).toContain('border-r');
      expect(creativeAside.className).toContain('print:!py-0');
      creativeRender.unmount();

      const techSplitEntry = templateRegistry.find((t) => t.id === 'tech-split')!;
      const techRender = render(
        <techSplitEntry.component resume={sampleResume} readOnly />
      );
      const techAside = techRender.container.querySelector('aside') as HTMLElement;
      expect(techAside.className).toContain('border-l');
      expect((techAside.parentElement as HTMLElement).className).toContain('flex-row');
      expect((techAside.parentElement as HTMLElement).className).not.toContain('flex-col');
      techRender.unmount();

      const accentEntry = templateRegistry.find((t) => t.id === 'accent-sidebar')!;
      const accentRender = render(
        <accentEntry.component resume={sampleResume} readOnly />
      );
      const accentGrid = accentRender.getByTestId('accent-sidebar-aside')
        .parentElement as HTMLElement;
      expect(accentGrid.className).toContain(
        'grid-cols-[var(--theme-sidebar-width,33%)_minmax(0,1fr)]'
      );
      expect(accentGrid.className).not.toContain('grid-cols-1');
      accentRender.unmount();

      const twoColEntry = templateRegistry.find((t) => t.id === 'two-column')!;
      const twoColRender = render(
        <twoColEntry.component resume={sampleResume} readOnly />
      );
      const twoColGrid = twoColRender.container.querySelector(
        '.grid-cols-12'
      ) as HTMLElement;
      expect(twoColGrid).toBeTruthy();
      expect(twoColGrid.className).not.toContain('grid-cols-1 ');
      expect(twoColGrid.querySelector('.col-span-7')).toBeTruthy();
      expect(twoColGrid.querySelector('.col-span-5')).toBeTruthy();
      twoColRender.unmount();

      const bandedEntry = templateRegistry.find((t) => t.id === 'banded')!;
      const bandedRender = render(
        <bandedEntry.component resume={sampleResume} readOnly />
      );
      const bandedSections = bandedRender.getByTestId('banded-sections');
      expect(bandedSections.className).toContain(
        '[&>section]:grid-cols-[11rem_minmax(0,1fr)]'
      );
      bandedRender.unmount();
    });

    it('mounts all 17 thumbnails in TemplateGalleryModal without sm: classes inside thumbnails or global <style>/@page mutations', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const headStyleCountBefore = document.head.querySelectorAll('style').length;

      const { container } = render(
        <TemplateGalleryModal
          isOpen
          onClose={jest.fn()}
          resume={sampleResume}
          activeTemplateId="modern"
          onSelectTemplate={jest.fn()}
        />
      );

      expect(container.querySelectorAll('style').length).toBe(0);
      expect(document.head.querySelectorAll('style').length).toBe(
        headStyleCountBefore
      );

      // Verify layout badges match actual multi-column thumbnail DOM
      expect(screen.getAllByTestId('layout-icon-sidebar-left').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('layout-icon-sidebar-right').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('layout-icon-two-column').length).toBeGreaterThan(0);
    });
  });

  describe('3. Unified zero-margin @page rule and standardized PrintMarginTable spacers', () => {
    it('replaces legacy 2cm print padding in src/index.css with zero-margin A4 @page rule', () => {
      const indexCssPath = path.resolve(__dirname, '../../../index.css');
      const cssContent = fs.readFileSync(indexCssPath, 'utf8');

      expect(cssContent).toMatch(/@page\s*\{[^}]*size:\s*A4;[^}]*margin:\s*0;/s);
      expect(cssContent).not.toContain('padding: 2cm !important');
    });

    it.each(templateRegistry.map((t) => [t.id, t] as const))(
      'renders standardized repeating print margin spacers and zero hardcoded <style>@page rules in %s',
      (templateId, entry) => {
        const TemplateComponent = entry.component;
        const resume = buildFullFeatureResume(templateId);
        const { container } = render(
          <TemplateComponent resume={resume} readOnly />
        );

        // No inline <style>@page overrides
        expect(container.querySelectorAll('style').length).toBe(0);

        const topSpacers = within(container).getAllByTestId(
          'print-margin-spacer-top'
        );
        const bottomSpacers = within(container).getAllByTestId(
          'print-margin-spacer-bottom'
        );

        expect(topSpacers.length).toBeGreaterThanOrEqual(1);
        expect(bottomSpacers.length).toBe(topSpacers.length);

        for (const group of topSpacers) {
          expect(group.tagName.toLowerCase()).toBe('thead');
          expect(group.className).toContain('hidden');
          expect(group.className).toContain('print:table-header-group');
          const td = group.querySelector('td') as HTMLElement;
          expect(td.style.getPropertyValue('--print-spacer-height')).toContain(
            'var(--theme-page-margin,'
          );
        }

        for (const group of bottomSpacers) {
          expect(group.tagName.toLowerCase()).toBe('tfoot');
          expect(group.className).toContain('hidden');
          expect(group.className).toContain('print:table-footer-group');
          const td = group.querySelector('td') as HTMLElement;
          expect(td.style.getPropertyValue('--print-spacer-height')).toContain(
            'var(--theme-page-margin,'
          );
        }
      }
    );

    it('updates --theme-page-margin live across Narrow (1.25cm), Normal (1.75cm), and Wide (2.25cm) in ThemeCustomizationPanel + ResumePreview', () => {
      const Harness: React.FC<{ templateId: string }> = ({ templateId }) => {
        const [resume, setResume] = useState<IResume>({
          ...sampleResume,
          templateId,
          themeConfig: { pageMargins: 'normal' },
        });
        return (
          <div>
            <ThemeCustomizationPanel
              themeConfig={resume.themeConfig}
              onChange={(nextTheme) =>
                setResume((prev) => ({ ...prev, themeConfig: nextTheme }))
              }
              onClose={jest.fn()}
            />
            <ResumePreview resume={{ ...resume, templateId }} readOnly />
          </div>
        );
      };

      const { rerender } = render(<Harness templateId="classic" />);
      const previewPage = screen.getByTestId('resume-preview-page');
      expect(previewPage.style.getPropertyValue('--theme-page-margin')).toBe(
        '1.75cm'
      );

      fireEvent.click(screen.getByTestId('margin-option-narrow'));
      expect(previewPage.style.getPropertyValue('--theme-page-margin')).toBe(
        '1.25cm'
      );

      fireEvent.click(screen.getByTestId('margin-option-wide'));
      expect(previewPage.style.getPropertyValue('--theme-page-margin')).toBe(
        '2.25cm'
      );

      fireEvent.click(screen.getByTestId('margin-option-normal'));
      expect(previewPage.style.getPropertyValue('--theme-page-margin')).toBe(
        '1.75cm'
      );

      // Verify full-bleed / print-fixed templates preserve special chrome
      rerender(<Harness templateId="bold-header" />);
      expect(screen.getByTestId('bold-header-band')).toBeInTheDocument();

      rerender(<Harness templateId="startup" />);
      expect(screen.getByTestId('startup-two-tone-header')).toBeInTheDocument();

      rerender(<Harness templateId="accent-sidebar" />);
      expect(screen.getByTestId('accent-sidebar-print-bg')).toHaveClass(
        'print:fixed'
      );

      rerender(<Harness templateId="creative-sidebar" />);
      expect(screen.getByTestId('creative-sidebar-print-bg')).toHaveClass(
        'print:fixed'
      );
    });

    it('preserves disabled-item filtering and InlineEdit editing in updated templates', () => {
      const onChange = jest.fn();
      const resume = buildFullFeatureResume('academic');
      const AcademicComponent = templateRegistry.find(
        (t) => t.id === 'academic'
      )!.component;

      render(<AcademicComponent resume={resume} onChange={onChange} readOnly={false} />);

      expect(screen.getByText('Dr. Elena Vance')).toBeInTheDocument();
      expect(screen.queryByText('Hidden Reference')).not.toBeInTheDocument();
      expect(screen.getByTestId('academic-references-grid').className).toContain(
        'grid-cols-2'
      );

      const nameNode = screen.getByText('Maya Lin');
      fireEvent.click(nameNode);
      const input = screen.getByDisplayValue('Maya Lin');
      fireEvent.change(input, { target: { value: 'Dr. Maya Lin' } });
      fireEvent.blur(input);
      expect(onChange).toHaveBeenCalled();
    });
  });
});
