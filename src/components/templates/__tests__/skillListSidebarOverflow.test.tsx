import React from 'react';
import { act, render, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StartupTemplate } from '../StartupTemplate';
import { TechSplitTemplate } from '../TechSplitTemplate';
import { ModernTemplate } from '../ModernTemplate';
import { sampleResume } from '../sampleResume';
import {
  isNarrowSkillLayout,
  NARROW_SKILL_CONTAINER_WIDTH_PX,
  SkillList,
} from '../shared';
import { IResume, ISection } from '../../../types/resume';

const TWELVE_LONG_KEYWORDS = [
  'MicroFrontendModuleFederationRuntime',
  'TypeScriptCompilerTransformPipelines',
  'ServerComponentsStreamingArchitecture',
  'CrossBrowserAccessibilityAutomation',
  'DistributedTracingOpenTelemetrySDK',
  'DesignTokensMultiBrandThemingEngine',
  'WebAssemblyEdgeComputeWorkers',
  'GraphQLFederatedSchemaComposition',
  'ProgressiveWebAppOfflineSyncEngine',
  'ContinuousPerformanceRegressionGates',
  'ZeroDowntimeBlueGreenDeploymentMesh',
  'InternationalizationBidirectionalLayout',
];

function buildResumeWith12LongKeywords(
  templateId: string,
  skillStyle?: 'chips' | 'comma'
): IResume {
  return {
    ...sampleResume,
    templateId,
    themeConfig: skillStyle ? { skillStyle } : sampleResume.themeConfig,
    content: {
      ...sampleResume.content,
      sections: sampleResume.content.sections.map((sec) =>
        sec.id === 'sample-skills'
          ? {
              ...sec,
              content: [
                ...sec.content,
                {
                  id: 'skill-long-12',
                  name: 'Distributed Frontend Infrastructure',
                  subSkills: TWELVE_LONG_KEYWORDS,
                },
              ],
            }
          : sec
      ),
    },
  };
}

describe('SkillList narrow-column stacking and sidebar overflow prevention', () => {
  describe('isNarrowSkillLayout utility', () => {
    it('exports a 260px default container width threshold', () => {
      expect(NARROW_SKILL_CONTAINER_WIDTH_PX).toBe(260);
    });

    it('honors explicit boolean narrow overrides over layout and containerWidth', () => {
      expect(isNarrowSkillLayout({ narrow: true })).toBe(true);
      expect(
        isNarrowSkillLayout({
          narrow: true,
          layout: 'single',
          containerWidth: 680,
        })
      ).toBe(true);
      expect(
        isNarrowSkillLayout({
          narrow: false,
          layout: 'sidebar-right',
          containerWidth: 180,
        })
      ).toBe(false);
    });

    it('returns true for sidebar layouts even when containerWidth is unmeasured (0/null/undefined)', () => {
      expect(isNarrowSkillLayout({ layout: 'sidebar' })).toBe(true);
      expect(
        isNarrowSkillLayout({ layout: 'sidebar-left', containerWidth: 0 })
      ).toBe(true);
      expect(
        isNarrowSkillLayout({ layout: 'sidebar-right', containerWidth: null })
      ).toBe(true);
    });

    it('switches based on measured containerWidth < 260px for non-sidebar layouts', () => {
      // Unmeasured / zero width in jsdom does not falsely mark wide layouts narrow
      expect(isNarrowSkillLayout({})).toBe(false);
      expect(isNarrowSkillLayout({ containerWidth: 0 })).toBe(false);
      expect(isNarrowSkillLayout({ containerWidth: null })).toBe(false);
      expect(isNarrowSkillLayout({ containerWidth: Number.NaN })).toBe(false);

      // Narrow measured widths (< 260px) stack
      expect(isNarrowSkillLayout({ containerWidth: 160 })).toBe(true);
      expect(isNarrowSkillLayout({ containerWidth: 259 })).toBe(true);
      expect(
        isNarrowSkillLayout({ layout: 'two-column', containerWidth: 245 })
      ).toBe(true);

      // At or above threshold (>= 260px) stays inline
      expect(isNarrowSkillLayout({ containerWidth: 260 })).toBe(false);
      expect(
        isNarrowSkillLayout({ layout: 'single', containerWidth: 620 })
      ).toBe(false);

      // Supports custom thresholdPx
      expect(
        isNarrowSkillLayout({ containerWidth: 280, thresholdPx: 300 })
      ).toBe(true);
    });
  });

  describe.each([
    ['startup', StartupTemplate, 'startup-sidebar'],
    ['tech-split', TechSplitTemplate, 'tech-split-sidebar'],
  ] as const)(
    '%s template sidebar skill containment and stacked structure',
    (templateId, TemplateComponent, sidebarTestId) => {
      it('renders sampleResume + 12 long keywords inside the sidebar column with stacked chip groups and overflow-wrap:anywhere', () => {
        const resume = buildResumeWith12LongKeywords(templateId);
        const { container } = render(
          <TemplateComponent resume={resume} readOnly />
        );

        const sidebar = container.querySelector(
          `aside[data-testid="${sidebarTestId}"]`
        ) as HTMLElement;
        expect(sidebar).toBeInTheDocument();
        expect(sidebar.tagName).toBe('ASIDE');
        expect(sidebar.className).toContain('min-w-0');
        expect(sidebar.style.overflowWrap).toBe('anywhere');

        // SkillList root is inside the sidebar and marked stacked
        const skillList = sidebar.querySelector(
          '[data-skill-variant="chips"]'
        ) as HTMLElement;
        expect(skillList).toBeInTheDocument();
        expect(skillList).toHaveAttribute('data-skill-layout', 'stacked');

        // Existing sampleResume groups + the 12-keyword group all render inside the sidebar
        expect(
          within(sidebar).getByText('Frontend Architecture')
        ).toBeInTheDocument();
        expect(
          within(sidebar).getByText('Platform & Quality')
        ).toBeInTheDocument();
        expect(
          within(sidebar).getByText('Distributed Frontend Infrastructure')
        ).toBeInTheDocument();

        TWELVE_LONG_KEYWORDS.forEach((kw) => {
          const chipEl = within(sidebar).getByText(kw);
          expect(chipEl).toBeInTheDocument();
          expect(sidebar.contains(chipEl)).toBe(true);
          expect(chipEl.className).toContain('min-w-0');
          expect(chipEl.className).toContain('max-w-full');
          expect(chipEl.className).toContain('[overflow-wrap:anywhere]');
          expect(chipEl.style.overflowWrap).toBe('anywhere');
        });

        // Every skill group row stacks vertically (group label on its own line, chip list wrapping below)
        const groupRows = Array.from(
          skillList.querySelectorAll('[data-skill-group]')
        ) as HTMLElement[];
        expect(groupRows.length).toBe(3);

        groupRows.forEach((row) => {
          expect(row.className).toContain('flex-col');
          expect(row.className).not.toContain('sm:flex-row');

          const labelWrapper = row.children[0] as HTMLElement;
          const chipsWrapper = row.children[1] as HTMLElement;

          expect(labelWrapper.className).toContain('w-full');
          expect(labelWrapper.className).toContain('min-w-0');
          expect(labelWrapper.className).not.toContain('sm:w-40');
          expect(labelWrapper.className).not.toContain('shrink-0');

          expect(chipsWrapper.className).toContain('flex-wrap');
          expect(chipsWrapper.className).toContain('min-w-0');
        });
      });

      it('stacks comma-variant grouped skills inside the sidebar with flex-wrap, min-w-0, and overflow-wrap:anywhere', () => {
        const resume = buildResumeWith12LongKeywords(templateId, 'comma');
        const { container } = render(
          <TemplateComponent resume={resume} readOnly />
        );

        const sidebar = container.querySelector(
          `aside[data-testid="${sidebarTestId}"]`
        ) as HTMLElement;
        const skillList = sidebar.querySelector(
          '[data-skill-variant="comma"]'
        ) as HTMLElement;

        expect(skillList).toBeInTheDocument();
        expect(skillList).toHaveAttribute('data-skill-layout', 'stacked');

        const longGroupRow = skillList.querySelector(
          '[data-skill-group="Distributed Frontend Infrastructure"]'
        ) as HTMLElement;
        expect(longGroupRow).toBeInTheDocument();
        expect(longGroupRow.className).toContain('flex-col');
        expect(longGroupRow.className).not.toContain('sm:flex-row');

        const commaListWrapper = longGroupRow.children[1] as HTMLElement;
        expect(commaListWrapper.className).toContain('flex-wrap');
        expect(commaListWrapper.className).toContain('min-w-0');
        expect(commaListWrapper.style.overflowWrap).toBe('anywhere');

        TWELVE_LONG_KEYWORDS.forEach((kw) => {
          expect(within(sidebar).getByText(kw)).toBeInTheDocument();
        });
      });
    }
  );

  describe('Dynamic container-width (<260px) detection and wide-column preservation', () => {
    const originalResizeObserver = (window as any).ResizeObserver;

    afterEach(() => {
      (window as any).ResizeObserver = originalResizeObserver;
    });

    it('switches standalone SkillList to stacked layout when ResizeObserver reports width < 260px', () => {
      type ResizeCallback = (
        entries: Array<{ target: Element; contentRect: { width: number } }>
      ) => void;
      let capturedCallback: ResizeCallback | null = null;
      let observedElement: Element | null = null;

      (window as any).ResizeObserver = class MockResizeObserver {
        cb: ResizeCallback;
        constructor(cb: ResizeCallback) {
          this.cb = cb;
          capturedCallback = cb;
        }
        observe(el: Element) {
          observedElement = el;
        }
        unobserve() {}
        disconnect() {}
      };

      const skillsSection = buildResumeWith12LongKeywords('modern').content.sections.find(
        (s) => s.id === 'sample-skills'
      ) as ISection;

      const { container } = render(<SkillList section={skillsSection} readOnly />);

      const root = container.querySelector('[data-skill-variant="chips"]')!;
      expect(root).toHaveAttribute('data-skill-layout', 'inline');

      act(() => {
        capturedCallback?.([
          { target: observedElement!, contentRect: { width: 220 } },
        ]);
      });

      expect(root).toHaveAttribute('data-skill-layout', 'stacked');
      const row = root.querySelector('[data-skill-group]') as HTMLElement;
      expect(row.className).toContain('flex-col');
      expect(row.className).not.toContain('flex-row');

      act(() => {
        capturedCallback?.([
          { target: observedElement!, contentRect: { width: 480 } },
        ]);
      });

      expect(root).toHaveAttribute('data-skill-layout', 'inline');
      expect(
        (root.querySelector('[data-skill-group]') as HTMLElement).className
      ).toContain('flex-row');
    });

    it('preserves inline flex-row layout in wide single-column templates while keeping overflow-wrap:anywhere on chips', () => {
      const resume = buildResumeWith12LongKeywords('modern');
      const { container } = render(<ModernTemplate resume={resume} readOnly />);

      const skillList = container.querySelector('[data-skill-variant="chips"]')!;
      expect(skillList).toHaveAttribute('data-skill-layout', 'inline');

      const firstGroup = skillList.querySelector(
        '[data-skill-group]'
      ) as HTMLElement;
      expect(firstGroup.className).toContain('flex-row');
    });
  });
});
