import fs from 'fs';
import path from 'path';
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumePreview, { A4_HEIGHT_PX } from '../components/ResumePreview';
import PublicResumeView from '../components/PublicResumeView';
import VersionHistoryDrawer from '../components/VersionHistoryDrawer';
import { useResumeHistory } from '../components/useResumeHistory';
import { templateRegistry, getTemplate } from '../components/templates/registry';
import { sampleResume } from '../components/templates/sampleResume';
import { resumeService } from '../services/resume.service';
import {
  AUTO_FIT_MIN_FONT_SCALE,
  AUTO_FIT_MIN_LINE_HEIGHT,
  solveThemeAutoFit,
} from '../utils/themeAutoFit';
import {
  computePageCount,
  isShortPageOverflow,
} from '../components/common/A4PageGuides';
import { IResume, SectionType, ThemeConfig } from '../types/resume';

type ResizeCallback = (
  entries: Array<{ target: Element; contentRect: { width: number; height: number } }>
) => void;

describe('A4 Page Guides, Bundled Serif Webfonts, and One-Page Theme Auto-Fit', () => {
  let observers: Array<{ callback: ResizeCallback; elements: Set<Element> }> = [];
  const originalResizeObserver = (window as any).ResizeObserver;
  const originalDocumentFonts = Object.getOwnPropertyDescriptor(document, 'fonts');

  beforeEach(() => {
    jest.restoreAllMocks();
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
    if (originalDocumentFonts) {
      Object.defineProperty(document, 'fonts', originalDocumentFonts);
    } else {
      delete (document as any).fonts;
    }
  });

  const notifyResize = (el: HTMLElement, height: number, width = 794) => {
    act(() => {
      observers.forEach((obs) => {
        if (obs.elements.has(el)) {
          obs.callback([
            {
              target: el,
              contentRect: { width, height },
            },
          ]);
        }
      });
    });
  };

  const mockDynamicPageHeight = (
    el: HTMLElement,
    computeHeightFromEl: (pageEl: HTMLElement) => number
  ) => {
    Object.defineProperty(el, 'offsetHeight', {
      configurable: true,
      get: () => computeHeightFromEl(el),
    });
  };

  describe('1. Bundled Self-Hosted Merriweather & Playfair Display Webfonts', () => {
    const projectRoot = path.resolve(__dirname, '..', '..');

    it('bundles @fontsource/merriweather and @fontsource/playfair-display locally without external CDN calls', () => {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
      );
      expect(pkgJson.dependencies['@fontsource/merriweather']).toBeDefined();
      expect(pkgJson.dependencies['@fontsource/playfair-display']).toBeDefined();

      const indexCss = fs.readFileSync(
        path.join(projectRoot, 'src', 'index.css'),
        'utf8'
      );
      expect(indexCss).toContain('@fontsource/merriweather/');
      expect(indexCss).toContain('@fontsource/playfair-display/');

      const indexHtml = fs.readFileSync(
        path.join(projectRoot, 'public', 'index.html'),
        'utf8'
      );
      expect(indexHtml).not.toContain('fonts.googleapis.com');
      expect(indexHtml).not.toContain('fonts.gstatic.com');
    });

    it('resolves Merriweather or Playfair Display across all seven serif and hybrid templates', () => {
      const serifTemplates = templateRegistry.filter(
        (t) =>
          t.defaultTheme.fontPairingId === 'classic-serif' ||
          t.defaultTheme.fontPairingId === 'elegant-hybrid'
      );
      expect(serifTemplates).toHaveLength(7);

      serifTemplates.forEach((tpl) => {
        const resumeForTemplate: IResume = {
          ...sampleResume,
          templateId: tpl.id,
        };
        const { unmount } = render(
          <ResumePreview resume={resumeForTemplate} readOnly />
        );
        const page = screen.getByTestId('resume-preview-page');
        const headingFontVar = page.style.getPropertyValue('--theme-heading-font');
        if (tpl.defaultTheme.fontPairingId === 'classic-serif') {
          expect(headingFontVar).toContain('Merriweather');
          expect(page.style.getPropertyValue('--theme-body-font')).toContain(
            'Merriweather'
          );
        } else {
          expect(headingFontVar).toContain('Playfair Display');
        }
        unmount();
      });
    });
  });

  describe('2. Font Readiness Gating Before Measurement and Auto-Fit', () => {
    it('waits for document.fonts.ready before locking multi-page height or running auto-fit', async () => {
      let resolveFonts!: () => void;
      let fontStatus = 'loading';
      const fontsReadyPromise = new Promise<void>((resolve) => {
        resolveFonts = () => {
          fontStatus = 'loaded';
          resolve();
        };
      });

      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: {
          get status() {
            return fontStatus;
          },
          ready: fontsReadyPromise,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        },
      });

      const onChange = jest.fn();
      render(<ResumePreview resume={sampleResume} onChange={onChange} />);

      const page = screen.getByTestId('resume-preview-page');
      mockDynamicPageHeight(page, (el) => {
        const margin = el.style.getPropertyValue('--theme-page-margin');
        return margin === '1.25cm' ? 1090 : 1240;
      });

      // While fonts are still loading, initial fallback metrics have not flipped badge to 2 pages
      expect(screen.getByTestId('a4-page-count-badge')).toHaveTextContent('1 page');

      // Once fonts finish loading, height settles at 1240px -> 2 pages + short overflow alert
      await act(async () => {
        resolveFonts();
        await fontsReadyPromise;
      });

      expect(screen.getByTestId('a4-page-count-badge')).toHaveTextContent('2 pages');
      expect(screen.getByTestId('short-overflow-alert')).toBeInTheDocument();
    });
  });

  describe('3. Live Page Counts and Non-Interactive Print-Hidden A4 Guides Across All 3 Surfaces', () => {
    it('calculates page counts and short-overflow thresholds accurately', () => {
      expect(computePageCount(1123)).toBe(1);
      expect(computePageCount(1124)).toBe(2);
      expect(computePageCount(2246)).toBe(2);
      expect(computePageCount(2247)).toBe(3);

      expect(isShortPageOverflow(1123)).toBe(false);
      expect(isShortPageOverflow(1124)).toBe(true);
      expect(isShortPageOverflow(1347)).toBe(true); // ~19.95%
      expect(isShortPageOverflow(1348)).toBe(false); // > 20%
    });

    it('renders live page badge and dashed 1123px rails in ResumePreview while keeping AccentSidebar continuous and editable', async () => {
      const handleChange = jest.fn();
      const sidebarResume: IResume = {
        ...sampleResume,
        templateId: 'accent-sidebar',
      };

      render(<ResumePreview resume={sidebarResume} onChange={handleChange} />);

      const page = screen.getByTestId('resume-preview-page');
      const overlay = screen.getByTestId('a4-page-guides-overlay');
      const badge = screen.getByTestId('a4-page-count-badge');

      expect(badge).toHaveTextContent('1 page');
      expect(badge.className).toContain('print:hidden');
      expect(overlay.className).toContain('pointer-events-none');
      expect(overlay.className).toContain('print:hidden');
      expect(screen.queryByTestId('a4-page-guide-2')).not.toBeInTheDocument();

      // Continuous AccentSidebarTemplate DOM structure stays intact
      expect(screen.getByTestId('accent-sidebar-template')).toBeInTheDocument();
      expect(screen.getByTestId('accent-sidebar-print-bg')).toBeInTheDocument();

      // Simulate content growing past 2 A4 pages (2500px -> 3 pages)
      let simulatedHeight = 2500;
      mockDynamicPageHeight(page, () => simulatedHeight);
      notifyResize(page, simulatedHeight);

      expect(badge).toHaveTextContent('3 pages');
      const guidePage2 = screen.getByTestId('a4-page-guide-2');
      const guidePage3 = screen.getByTestId('a4-page-guide-3');
      expect(guidePage2).toHaveStyle({ top: `${A4_HEIGHT_PX}px`, pointerEvents: 'none' });
      expect(guidePage2).toHaveTextContent('Page 2');
      expect(guidePage3).toHaveStyle({ top: `${A4_HEIGHT_PX * 2}px`, pointerEvents: 'none' });
      expect(guidePage3).toHaveTextContent('Page 3');

      // Inline editing remains undisturbed beneath the overlay
      fireEvent.click(screen.getByText('Maya Lin'));
      const nameInput = await screen.findByDisplayValue('Maya Lin');
      fireEvent.change(nameInput, { target: { value: 'Maya Lin-Updated' } });
      fireEvent.blur(nameInput);
      expect(handleChange).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            basics: expect.objectContaining({ name: 'Maya Lin-Updated' }),
          }),
        })
      );
    });

    it('renders live page badge and dashed 1123px boundary lines in PublicResumeView', async () => {
      jest.spyOn(resumeService, 'getPublicResume').mockResolvedValueOnce({
        ...sampleResume,
        _id: 'pub-a4-1',
        templateId: 'professional',
      });

      render(<PublicResumeView shareToken="tok_a4_public" />);

      await waitFor(() => {
        expect(screen.getByText('Maya Lin')).toBeInTheDocument();
      });

      const page = screen.getByTestId('resume-preview-page');
      const badge = screen.getByTestId('a4-page-count-badge');
      expect(badge).toHaveTextContent('1 page');
      expect(badge.className).toContain('print:hidden');

      mockDynamicPageHeight(page, () => 1650);
      notifyResize(page, 1650);

      expect(badge).toHaveTextContent('2 pages');
      const guide = within(page).getByTestId('a4-page-guide-2');
      expect(guide).toHaveStyle({ top: `${A4_HEIGHT_PX}px` });
      expect(guide).toHaveTextContent('Page 2');
      expect(guide.className).toContain('print:hidden');
    });

    it('renders live page badge and dashed 1123px boundary lines in VersionHistoryDrawer', async () => {
      const nowIso = new Date().toISOString();
      jest.spyOn(resumeService, 'getResumeHistory').mockResolvedValueOnce([
        {
          index: 0,
          updatedAt: nowIso,
          title: 'Two-Page Snapshot',
          summary: '6 sections · 520 words',
          sectionCount: 6,
          wordCount: 520,
        },
      ]);
      jest.spyOn(resumeService, 'getResumeHistorySnapshot').mockResolvedValueOnce({
        index: 0,
        title: 'Two-Page Snapshot',
        content: sampleResume.content,
        updatedAt: nowIso,
      });

      render(
        <VersionHistoryDrawer
          isOpen={true}
          resumeId="res-vh-a4"
          currentResume={sampleResume}
          onClose={jest.fn()}
          onRestoreVersion={jest.fn()}
        />
      );

      const previewPage = await screen.findByTestId('version-history-preview-page');
      const badge = screen.getByTestId('a4-page-count-badge');
      expect(badge).toHaveTextContent('1 page');

      mockDynamicPageHeight(previewPage, () => 1420);
      notifyResize(previewPage, 1420);

      expect(badge).toHaveTextContent('2 pages');
      const guide = within(previewPage).getByTestId('a4-page-guide-2');
      expect(guide).toHaveStyle({ top: `${A4_HEIGHT_PX}px` });
      expect(guide).toHaveTextContent('Page 2');
    });
  });

  describe('4. Deterministic Auto-Fit Solver Order, Binary Search, Undo, and Uncompressible Guardrails', () => {
    const modelHeight = (theme: ThemeConfig, baseContentPx: number): number => {
      const marginPx =
        theme.pageMargins === 'wide'
          ? 170
          : theme.pageMargins === 'narrow'
          ? 94
          : 132;
      const spacingPx =
        theme.sectionSpacing === 'spacious'
          ? 180
          : theme.sectionSpacing === 'compact'
          ? 80
          : 120;
      const lh = theme.lineHeight ?? 1.5;
      const fs = theme.fontScale ?? 1;
      return Math.round(marginPx + spacingPx + baseContentPx * (lh / 1.5) * fs);
    };

    it('tightens pageMargins and sectionSpacing first, then binary-searches lineHeight and fontScale under 150ms', () => {
      const modernDefaults = getTemplate('modern').defaultTheme;

      // Case 1: Mild overflow solved by pageMargins ('normal' -> 'narrow') alone
      const r1 = solveThemeAutoFit({
        currentTheme: {},
        templateDefaults: modernDefaults,
        measureHeight: (t) => modelHeight({ ...modernDefaults, ...t }, 900), // 132+120+900=1152 -> narrow: 94+120+900=1114 <= 1123
      });
      expect(r1.fitted).toBe(true);
      expect(r1.changedKeys).toEqual(['pageMargins']);
      expect(r1.themeConfig.pageMargins).toBe('narrow');
      expect(r1.themeConfig.sectionSpacing).toBeUndefined();
      expect(r1.themeConfig.lineHeight).toBeUndefined();
      expect(r1.themeConfig.fontScale).toBeUndefined();

      // Case 2: Solved by pageMargins ('narrow') + sectionSpacing ('compact') without shrinking typography
      const r2 = solveThemeAutoFit({
        currentTheme: {},
        templateDefaults: modernDefaults,
        measureHeight: (t) => modelHeight({ ...modernDefaults, ...t }, 940), // narrow+normal=1154 -> narrow+compact=1114 <= 1123
      });
      expect(r2.fitted).toBe(true);
      expect(r2.changedKeys).toEqual(['pageMargins', 'sectionSpacing']);
      expect(r2.themeConfig.pageMargins).toBe('narrow');
      expect(r2.themeConfig.sectionSpacing).toBe('compact');
      expect(r2.themeConfig.lineHeight).toBeUndefined();
      expect(r2.themeConfig.fontScale).toBeUndefined();

      // Case 3: Solved by binary search on lineHeight (>= 1.25) while preserving fontScale = 1
      const r3 = solveThemeAutoFit({
        currentTheme: {},
        templateDefaults: modernDefaults,
        measureHeight: (t) => modelHeight({ ...modernDefaults, ...t }, 1060), // narrow+compact+lh1.5=1234 -> lh1.34 => 94+80+947=1121 <= 1123
      });
      expect(r3.fitted).toBe(true);
      expect(r3.changedKeys).toEqual(['pageMargins', 'sectionSpacing', 'lineHeight']);
      expect(r3.themeConfig.lineHeight).toBeGreaterThanOrEqual(AUTO_FIT_MIN_LINE_HEIGHT);
      expect(r3.themeConfig.lineHeight).toBeLessThan(1.5);
      expect(r3.themeConfig.fontScale).toBeUndefined();
      expect(r3.finalHeight).toBeLessThanOrEqual(A4_HEIGHT_PX);

      // Case 4: Solved by binary search on fontScale (>= 0.85) after lineHeight reaches 1.25
      let probeCount = 0;
      const t0 = performance.now();
      const r4 = solveThemeAutoFit({
        currentTheme: {},
        templateDefaults: modernDefaults,
        measureHeight: (t) => {
          probeCount += 1;
          return modelHeight({ ...modernDefaults, ...t }, 1240);
        },
      });
      const elapsedMs = performance.now() - t0;

      expect(r4.fitted).toBe(true);
      expect(elapsedMs).toBeLessThan(150);
      expect(probeCount).toBeLessThanOrEqual(16);
      expect(r4.changedKeys).toEqual([
        'pageMargins',
        'sectionSpacing',
        'lineHeight',
        'fontScale',
      ]);
      expect(r4.themeConfig.lineHeight).toBe(AUTO_FIT_MIN_LINE_HEIGHT);
      expect(r4.themeConfig.fontScale).toBeGreaterThanOrEqual(AUTO_FIT_MIN_FONT_SCALE);
      expect(r4.finalHeight).toBeLessThanOrEqual(A4_HEIGHT_PX);
    });

    it('triggers short-overflow alert on <=20% spillover, fits to 1 page in one click, records customisedKeys, and reverts in one Undo step', async () => {
      const initialResume: IResume = {
        ...sampleResume,
        templateId: 'modern',
        themeConfig: {
          primaryColor: '#2563eb',
          pageMargins: 'wide',
          sectionSpacing: 'spacious',
          lineHeight: 1.6,
          fontScale: 1.05,
        },
      };

      const HistoryPreviewHarness: React.FC = () => {
        const { resume, setResume, undo, canUndo } = useResumeHistory(initialResume);
        const pushCountRef = React.useRef(0);

        const handleUpdate = (next: IResume) => {
          pushCountRef.current += 1;
          setResume(next);
        };

        return (
          <div>
            <span data-testid="history-push-count">{pushCountRef.current}</span>
            <button
              type="button"
              data-testid="harness-undo-btn"
              disabled={!canUndo}
              onClick={undo}
            >
              Undo
            </button>
            <ResumePreview resume={resume} onChange={handleUpdate} />
          </div>
        );
      };

      render(<HistoryPreviewHarness />);

      const page = screen.getByTestId('resume-preview-page');
      // Compute live DOM mock height directly from CSS variables set on pageRef
      mockDynamicPageHeight(page, (el) => {
        const marginCss = el.style.getPropertyValue('--theme-page-margin');
        const spacingCss = el.style.getPropertyValue('--theme-section-spacing');
        const lh = parseFloat(el.style.getPropertyValue('--theme-line-height') || '1.5');
        const fs = parseFloat(el.style.getPropertyValue('--theme-font-scale') || '1');

        const marginPx = marginCss === '2.25cm' ? 170 : marginCss === '1.25cm' ? 94 : 132;
        const spacingPx = spacingCss === '2.25rem' ? 180 : spacingCss === '1rem' ? 80 : 120;
        return Math.round(marginPx + spacingPx + 905 * (lh / 1.5) * fs);
      });

      // Trigger measurement: initial height ~ 170 + 180 + 905*(1.6/1.5)*1.05 = 1364 -> let's adjust slightly to ~1280 (<=20% short overflow!)
      mockDynamicPageHeight(page, (el) => {
        const marginCss = el.style.getPropertyValue('--theme-page-margin');
        const spacingCss = el.style.getPropertyValue('--theme-section-spacing');
        const lh = parseFloat(el.style.getPropertyValue('--theme-line-height') || '1.5');
        const fs = parseFloat(el.style.getPropertyValue('--theme-font-scale') || '1');

        const marginPx = marginCss === '2.25cm' ? 160 : marginCss === '1.25cm' ? 90 : 125;
        const spacingPx = spacingCss === '2.25rem' ? 150 : spacingCss === '1rem' ? 75 : 110;
        return Math.round(marginPx + spacingPx + 890 * (lh / 1.5) * fs);
      });
      notifyResize(page, 1306);

      // ~16% spillover -> 2 pages badge + short-overflow alert with Fit to 1 page button
      expect(screen.getByTestId('a4-page-count-badge')).toHaveTextContent('2 pages');
      const alertBanner = screen.getByTestId('short-overflow-alert');
      expect(alertBanner).toBeInTheDocument();
      expect(alertBanner.className).toContain('print:hidden');

      // Click Fit to 1 page on the short-overflow alert
      await act(async () => {
        fireEvent.click(within(alertBanner).getByTestId('alert-fit-to-one-page-btn'));
      });

      // Converged to 1 page in a SINGLE history push!
      await waitFor(() => {
        expect(screen.getByTestId('a4-page-count-badge')).toHaveTextContent('1 page');
      });
      expect(screen.queryByTestId('short-overflow-alert')).not.toBeInTheDocument();
      expect(screen.queryByTestId('a4-page-guide-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('history-push-count')).toHaveTextContent('1');

      const fittedFontScale = parseFloat(
        page.style.getPropertyValue('--theme-font-scale')
      );
      expect(fittedFontScale).toBeGreaterThanOrEqual(AUTO_FIT_MIN_FONT_SCALE);

      // Customised keys recorded: opening Template Gallery preserves auto-fitted narrow margins across cards
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      const dialog = screen.getByRole('dialog', { name: /template gallery/i });
      expect(
        within(dialog).getByTestId('template-thumbnail-canvas-classic')
      ).toHaveStyle({
        '--theme-page-margin': '1.25cm',
      });
      fireEvent.keyDown(document, { key: 'Escape' });

      // Clicking Undo once restores all four previous tokens in a single step!
      fireEvent.click(screen.getByTestId('harness-undo-btn'));

      expect(page).toHaveStyle({
        '--theme-page-margin': '2.25cm',
        '--theme-section-spacing': '2.25rem',
        '--theme-line-height': '1.6',
        '--theme-font-scale': '1.05',
      });
      expect(screen.getByTestId('a4-page-count-badge')).toHaveTextContent('2 pages');
    });

    it('supports Fit to 1 page from ThemeCustomizationPanel and leaves all resume text untouched with manual-trim message when uncompressible', async () => {
      const denseSummary =
        'Extensive 15-year principal distributed systems summary that must never be truncated or rewritten by theme auto-fit.';
      const denseResume: IResume = {
        ...sampleResume,
        summary: denseSummary,
        content: {
          ...sampleResume.content,
          basics: {
            ...sampleResume.content.basics,
            summary: denseSummary,
          },
        },
      };
      const originalContentSnapshot = JSON.stringify(denseResume.content);
      let latestResume: IResume = denseResume;

      const StatefulHarness: React.FC = () => {
        const [res, setRes] = React.useState<IResume>(denseResume);
        latestResume = res;
        return <ResumePreview resume={res} onChange={setRes} />;
      };

      render(<StatefulHarness />);

      const page = screen.getByTestId('resume-preview-page');
      // Dense 900-word resume stays at 1520px even at tightest readable floor
      mockDynamicPageHeight(page, (el) => {
        const fs = parseFloat(el.style.getPropertyValue('--theme-font-scale') || '1');
        return Math.round(1800 * fs); // at 0.85 => 1530px (> 1123px)
      });
      notifyResize(page, 1800);

      // > 20% overflow: short-overflow alert is not shown, toolbar Fit to 1 page IS shown
      expect(screen.queryByTestId('short-overflow-alert')).not.toBeInTheDocument();
      expect(screen.getByTestId('toolbar-fit-to-one-page-btn')).toBeInTheDocument();

      // Open ThemeCustomizationPanel and trigger Fit to 1 page from panel button
      fireEvent.click(screen.getByTestId('theme-customization-btn'));
      await act(async () => {
        fireEvent.click(screen.getByTestId('panel-fit-to-one-page-btn'));
      });

      // Candidate resume text is 100% untouched
      expect(JSON.stringify(latestResume.content)).toBe(originalContentSnapshot);
      expect(latestResume.summary).toBe(denseSummary);

      // Compact readability floor applied without going below 0.85 / 1.25
      expect(latestResume.themeConfig?.pageMargins).toBe('narrow');
      expect(latestResume.themeConfig?.sectionSpacing).toBe('compact');
      expect(latestResume.themeConfig?.lineHeight).toBe(AUTO_FIT_MIN_LINE_HEIGHT);
      expect(latestResume.themeConfig?.fontScale).toBe(AUTO_FIT_MIN_FONT_SCALE);

      // Clear manual-trim guidance displayed both on preview banner and inside theme panel
      const trimNotice = screen.getByTestId('autofit-manual-trim-notice');
      expect(trimNotice).toHaveTextContent(/trim bullet text/i);
      expect(trimNotice.className).toContain('print:hidden');
      expect(screen.getByTestId('panel-autofit-notice')).toHaveTextContent(
        /trim bullet text/i
      );
    });
  });
});
