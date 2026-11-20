import React from 'react';
import ReactDOMServer from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeCustomizationPanel } from '../ThemeCustomizationPanel';
import ResumePreview from '../ResumePreview';
import { useResumeHistory } from '../useResumeHistory';
import { IResume } from '../../types/resume';
import { defaultResume } from '../../constants/editorConstants';
import {
  defaultThemeConfig,
  fontPairingOptions,
  colorOptions,
  textColorOptions,
  spacingOptions,
  getThemeStyles,
} from '../../constants/themeConstants';
import { ItemHeader } from '../templates/shared/ItemHeader';
import { SectionRenderer } from '../templates/shared/SectionRenderer';
import { SkillList, KeywordList } from '../templates/shared/SkillList';
import { ContactRow } from '../templates/shared/ContactRow';

describe('Theme Customization and Token System', () => {
  const sampleResume: IResume = {
    ...defaultResume,
    _id: 'resume-1',
    title: 'John Doe Resume',
    content: {
      basics: {
        name: 'John Doe',
        label: 'Senior Engineer',
        email: 'john@example.com',
        phone: '123-456-7890',
        summary: 'Experienced developer',
        location: {
          address: '123 Tech Lane',
          city: 'San Francisco',
          countryCode: 'US',
          postalCode: '94105',
        },
      },
      sections: [],
      sectionOrder: [],
    },
  };

  describe('ThemeCustomizationPanel Component', () => {
    it('renders all font pairings, colors, and spacing options', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('theme-customization-panel')).toBeInTheDocument();
      expect(screen.getByText('Theme Customization')).toBeInTheDocument();

      // Check all font pairings
      fontPairingOptions.forEach((pairing) => {
        expect(screen.getByTestId(`font-option-${pairing.id}`)).toBeInTheDocument();
      });

      // Check color options
      colorOptions.forEach((c) => {
        expect(screen.getByTestId(`color-option-${c.id}`)).toBeInTheDocument();
      });

      // Check body text color options and custom picker
      textColorOptions.forEach((c) => {
        expect(screen.getByTestId(`text-color-option-${c.id}`)).toBeInTheDocument();
      });
      expect(screen.getByTestId('text-color-picker-input')).toBeInTheDocument();

      // Check spacing options
      spacingOptions.forEach((s) => {
        expect(screen.getByTestId(`spacing-option-${s.id}`)).toBeInTheDocument();
      });
    });

    it('updates body text color via preset swatch and custom picker and records textColor in onKeysCustomised', () => {
      const mockOnChange = jest.fn();
      const mockOnKeysCustomised = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onKeysCustomised={mockOnKeysCustomised}
          onClose={mockOnClose}
        />
      );

      const inkSwatch = screen.getByTestId('text-color-option-ink');
      fireEvent.click(inkSwatch);

      expect(mockOnKeysCustomised).toHaveBeenCalledWith(['textColor']);
      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          textColor: '#111827',
        })
      );

      const textColorPicker = screen.getByTestId('text-color-picker-input');
      fireEvent.change(textColorPicker, { target: { value: '#1b4332' } });

      expect(mockOnKeysCustomised).toHaveBeenLastCalledWith(['textColor']);
      expect(mockOnChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          textColor: '#1b4332',
        })
      );
    });

    it('updates font pairing when clicked', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const classicSerifBtn = screen.getByTestId('font-option-classic-serif');
      fireEvent.click(classicSerifBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          fontPairingId: 'classic-serif',
          headingFont: expect.stringContaining('Merriweather'),
          bodyFont: expect.stringContaining('Merriweather'),
        })
      );
    });

    it('updates accent color when a swatch or color picker is selected', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const blueColorBtn = screen.getByTestId('color-option-blue');
      fireEvent.click(blueColorBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryColor: '#2563eb',
          headingColor: '#2563eb',
        })
      );

      const colorInput = screen.getByTestId('color-picker-input');
      fireEvent.change(colorInput, { target: { value: '#ff0055' } });

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          primaryColor: '#ff0055',
        })
      );
    });

    it('updates spacing when spacing option is selected', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const compactBtn = screen.getByTestId('spacing-option-compact');
      fireEvent.click(compactBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sectionSpacing: 'compact',
        })
      );
    });

    it('resets theme to defaults when reset is clicked', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={{
            primaryColor: '#ff0000',
            fontPairingId: 'technical-mono',
            sectionSpacing: 'spacious',
          }}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const resetBtn = screen.getByTitle('Reset theme to defaults');
      fireEvent.click(resetBtn);

      expect(mockOnChange).toHaveBeenCalledWith(defaultThemeConfig);
    });

    it('calls onClose when dismiss button is clicked', () => {
      const mockOnChange = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <ThemeCustomizationPanel
          themeConfig={defaultThemeConfig}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const closeBtn = screen.getByLabelText('Dismiss theme panel');
      fireEvent.click(closeBtn);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ResumePreview Overlay and CSS Variables', () => {
    it('opens and closes the customization panel via toolbar toggle button', () => {
      render(<ResumePreview resume={sampleResume} />);

      expect(screen.queryByTestId('theme-customization-panel')).not.toBeInTheDocument();

      const customizeBtn = screen.getByTestId('theme-customization-btn');
      fireEvent.click(customizeBtn);

      expect(screen.getByTestId('theme-customization-panel')).toBeInTheDocument();

      // Dismiss via close button
      const closeBtn = screen.getByLabelText('Dismiss theme panel');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('theme-customization-panel')).not.toBeInTheDocument();
    });

    it('applies theme tokens as CSS variables dynamically to the document wrapper', () => {
      const customThemeResume: IResume = {
        ...sampleResume,
        themeConfig: {
          fontPairingId: 'classic-serif',
          headingFont: '"Merriweather", serif',
          bodyFont: '"Merriweather", serif',
          primaryColor: '#2563eb',
          headingColor: '#2563eb',
          textColor: '#1f2937',
          sectionSpacing: 'compact',
        },
      };

      const { container } = render(<ResumePreview resume={customThemeResume} />);

      const wrapper = container.querySelector('[style*="--theme-primary"]');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toHaveStyle({
        '--theme-primary': '#2563eb',
        '--theme-heading-font': '"Merriweather", serif',
        '--theme-body-font': '"Merriweather", serif',
        '--theme-section-spacing': '1rem',
        '--theme-item-spacing': '0.5rem',
      });
    });

    it('calls onChange with updated themeConfig when user selects a new accent color', () => {
      const mockOnChange = jest.fn();
      render(<ResumePreview resume={sampleResume} onChange={mockOnChange} />);

      const customizeBtn = screen.getByTestId('theme-customization-btn');
      fireEvent.click(customizeBtn);

      const emeraldBtn = screen.getByTestId('color-option-emerald');
      fireEvent.click(emeraldBtn);

      expect(mockOnChange).toHaveBeenCalledWith(
        expect.objectContaining({
          themeConfig: expect.objectContaining({
            primaryColor: '#059669',
          }),
        })
      );
    });
  });

  describe('Undo/Redo Integration with useResumeHistory', () => {
    function TestHistoryComponent() {
      const { resume, setResume, undo, redo, canUndo, canRedo } = useResumeHistory(sampleResume);

      return (
        <div>
          <span data-testid="current-color">{resume.themeConfig?.primaryColor || 'default'}</span>
          <span data-testid="current-font">{resume.themeConfig?.fontPairingId || 'default'}</span>
          <button
            data-testid="change-theme"
            onClick={() =>
              setResume((prev) => ({
                ...prev,
                themeConfig: {
                  ...prev.themeConfig,
                  primaryColor: '#991b1b',
                  fontPairingId: 'classic-serif',
                },
              }))
            }
          >
            Update Theme
          </button>
          <button data-testid="undo-btn" disabled={!canUndo} onClick={undo}>
            Undo
          </button>
          <button data-testid="redo-btn" disabled={!canRedo} onClick={redo}>
            Redo
          </button>
        </div>
      );
    }

    it('integrates theme changes into undo/redo history and restores previous tokens', () => {
      render(<TestHistoryComponent />);

      expect(screen.getByTestId('current-color')).toHaveTextContent('default');

      // Update theme
      fireEvent.click(screen.getByTestId('change-theme'));
      expect(screen.getByTestId('current-color')).toHaveTextContent('#991b1b');
      expect(screen.getByTestId('current-font')).toHaveTextContent('classic-serif');

      // Undo theme change
      fireEvent.click(screen.getByTestId('undo-btn'));
      expect(screen.getByTestId('current-color')).toHaveTextContent('default');
      expect(screen.getByTestId('current-font')).toHaveTextContent('default');

      // Redo theme change
      fireEvent.click(screen.getByTestId('redo-btn'));
      expect(screen.getByTestId('current-color')).toHaveTextContent('#991b1b');
      expect(screen.getByTestId('current-font')).toHaveTextContent('classic-serif');
    });

    it('coalesces multi-event drags across all 6 color and range inputs into one undo step each', () => {
      const nowSpy = jest.spyOn(Date, 'now');
      let currentTime = 2_000_000;
      nowSpy.mockImplementation(() => currentTime);

      function PanelWithHistoryHarness() {
        const { resume, setResume, undo, canUndo } = useResumeHistory(sampleResume);
        return (
          <div>
            <ResumePreview
              resume={resume}
              onChange={(updated) => setResume(updated)}
            />
            <button data-testid="harness-undo" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
          </div>
        );
      }

      try {
        render(<PanelWithHistoryHarness />);
        fireEvent.click(screen.getByTestId('theme-customization-btn'));

        const dragControls: Array<{
          testId: string;
          values: string[];
        }> = [
          { testId: 'color-picker-input', values: ['#112233', '#223344', '#334455', '#445566'] },
          { testId: 'accent-color-picker-input', values: ['#aa1122', '#bb2233', '#cc3344'] },
          { testId: 'text-color-picker-input', values: ['#222222', '#2b2b2b', '#1a2e35'] },
          { testId: 'font-scale-input', values: ['0.9', '0.95', '1.05', '1.1'] },
          { testId: 'line-height-input', values: ['1.35', '1.45', '1.6', '1.7'] },
          { testId: 'sidebar-width-input', values: ['28', '31', '35', '38'] },
        ];

        for (const control of dragControls) {
          // Separate gestures by > 400ms, events within each gesture by 30ms
          currentTime += 600;
          const input = screen.getByTestId(control.testId);
          for (const val of control.values) {
            currentTime += 30;
            fireEvent.change(input, { target: { value: val } });
          }
        }

        // Exactly 6 undo clicks should unwind all 6 multi-event drags back to baseline
        const undoBtn = screen.getByTestId('harness-undo');
        for (let step = 0; step < dragControls.length; step++) {
          expect(undoBtn).not.toBeDisabled();
          fireEvent.click(undoBtn);
        }
        expect(undoBtn).toBeDisabled();
      } finally {
        nowSpy.mockRestore();
      }
    });

    it('reverts activeTemplateId back to modern when undoing a template switch to undefined externalTemplateId', () => {
      function TemplateUndoHarness() {
        const { resume, setResume, undo, canUndo } = useResumeHistory({
          ...sampleResume,
          templateId: undefined,
        });
        return (
          <div>
            <ResumePreview
              resume={resume}
              onChange={(updated) => setResume(updated)}
            />
            <button data-testid="template-undo-btn" disabled={!canUndo} onClick={undo}>
              Undo
            </button>
          </div>
        );
      }

      render(<TemplateUndoHarness />);

      // Initial unset templateId resolves to 'modern'
      expect(screen.getByTestId('resume-preview-page')).toHaveAttribute(
        'data-active-template',
        'modern'
      );

      // Open template gallery, verify 'modern' badge, and switch to 'classic'
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      expect(screen.getByTestId('active-template-badge-modern')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('template-card-classic'));
      expect(screen.getByTestId('resume-preview-page')).toHaveAttribute(
        'data-active-template',
        'classic'
      );

      // Undo restores resume.templateId === undefined, and ResumePreview must revert to 'modern'
      fireEvent.click(screen.getByTestId('template-undo-btn'));
      expect(screen.getByTestId('resume-preview-page')).toHaveAttribute(
        'data-active-template',
        'modern'
      );
      fireEvent.click(screen.getByTestId('open-template-gallery-btn'));
      expect(screen.getByTestId('active-template-badge-modern')).toBeInTheDocument();
    });
  });

  describe('Bundled Fontsource Assets, Legacy Font Sizes, and Shared Color Tokens', () => {
    it('bundles self-hosted Merriweather and Playfair Display latin and latin-ext subsets without external CDN links', () => {
      const indexCssPath = path.resolve(__dirname, '../../index.css');
      const indexCss = fs.readFileSync(indexCssPath, 'utf8');

      const expectedImports = [
        "@fontsource/merriweather/latin-ext-400.css",
        "@fontsource/merriweather/latin-400.css",
        "@fontsource/merriweather/latin-ext-400-italic.css",
        "@fontsource/merriweather/latin-400-italic.css",
        "@fontsource/merriweather/latin-ext-600.css",
        "@fontsource/merriweather/latin-600.css",
        "@fontsource/merriweather/latin-ext-700.css",
        "@fontsource/merriweather/latin-700.css",
        "@fontsource/playfair-display/latin-ext-400.css",
        "@fontsource/playfair-display/latin-400.css",
        "@fontsource/playfair-display/latin-ext-400-italic.css",
        "@fontsource/playfair-display/latin-400-italic.css",
        "@fontsource/playfair-display/latin-ext-600.css",
        "@fontsource/playfair-display/latin-600.css",
        "@fontsource/playfair-display/latin-ext-700.css",
        "@fontsource/playfair-display/latin-700.css",
      ];

      expectedImports.forEach((imp) => {
        expect(indexCss).toContain(imp);
      });
      expect(indexCss).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);

      const indexHtmlPath = path.resolve(__dirname, '../../../public/index.html');
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      expect(indexHtml).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/i);
    });

    it('maps legacy fontSize values in getThemeStyles when numeric fontScale is omitted', () => {
      const smallStyles = getThemeStyles({ fontSize: 'sm' }, { fontScale: 1 });
      expect(smallStyles['--theme-font-scale' as keyof React.CSSProperties]).toBe('0.9');
      expect(smallStyles['--theme-base-font-size' as keyof React.CSSProperties]).toBe('12.15px');

      const legacySmallWord = getThemeStyles({ fontSize: 'small' });
      expect(legacySmallWord['--theme-font-scale' as keyof React.CSSProperties]).toBe('0.9');

      const baseStyles = getThemeStyles({ fontSize: 'base' }, { fontScale: 0.95 });
      expect(baseStyles['--theme-font-scale' as keyof React.CSSProperties]).toBe('1');
      expect(baseStyles['--theme-base-font-size' as keyof React.CSSProperties]).toBe('13.5px');

      const largeStyles = getThemeStyles({ fontSize: 'lg' }, { fontScale: 1 });
      expect(largeStyles['--theme-font-scale' as keyof React.CSSProperties]).toBe('1.1');
      expect(largeStyles['--theme-base-font-size' as keyof React.CSSProperties]).toBe('14.85px');

      // Explicit numeric fontScale takes precedence over legacy fontSize
      const explicitNumeric = getThemeStyles({ fontSize: 'sm', fontScale: 1.05 });
      expect(explicitNumeric['--theme-font-scale' as keyof React.CSSProperties]).toBe('1.05');

      // Template default fontScale still applies when resume omits both fontScale and fontSize
      const templateDefaultOnly = getThemeStyles({}, { fontScale: 0.95 });
      expect(templateDefaultOnly['--theme-font-scale' as keyof React.CSSProperties]).toBe('0.95');
    });

    it('applies --theme-primary on classic ItemHeader subtitles and inherits --theme-text-color without text-slate-* overrides', () => {
      const richResume: IResume = {
        ...sampleResume,
        content: {
          basics: {
            ...sampleResume.content.basics,
            website: 'https://johndoe.dev',
          },
          sectionOrder: ['sec-work', 'sec-edu', 'sec-skills', 'sec-lang', 'sec-int'],
          sections: [
            {
              id: 'sec-work',
              type: 'work',
              title: 'Experience',
              content: [
                {
                  id: 'w1',
                  position: 'Principal Architect',
                  company: 'Acme Cloud',
                  startDate: 'Jan 2022',
                  endDate: 'Present',
                  location: 'Austin, TX',
                  description: 'Led platform engineering.',
                  highlights: ['Reduced latency by 40%'],
                  keywords: ['TypeScript', 'Rust'],
                },
              ],
            },
            {
              id: 'sec-edu',
              type: 'education',
              title: 'Education',
              content: [
                {
                  id: 'e1',
                  degree: 'M.S.',
                  institution: 'Stanford University',
                  field: 'Computer Science',
                  gpa: '3.95',
                  startDate: '2018',
                  endDate: '2020',
                },
              ],
            },
            {
              id: 'sec-skills',
              type: 'skills',
              title: 'Skills',
              content: [
                {
                  id: 's1',
                  name: 'Distributed Systems',
                  level: 'Expert',
                  keywords: ['Kubernetes', 'gRPC'],
                },
              ],
            },
            {
              id: 'sec-lang',
              type: 'languages',
              title: 'Languages',
              content: [
                { id: 'l1', language: 'English', fluency: 'Native', proficiency: 100 },
              ],
            },
            {
              id: 'sec-int',
              type: 'interests',
              title: 'Interests',
              content: [{ id: 'i1', name: 'Open Source' }],
            },
          ],
        },
      };

      const headerNode = (
        <ItemHeader
          title="Principal Architect"
          subtitle="Acme Cloud"
          startDate="Jan 2022"
          endDate="Present"
          location="Austin, TX"
          tone="classic"
          readOnly
        />
      );
      const headerSsrHtml = ReactDOMServer.renderToStaticMarkup(headerNode);
      expect(headerSsrHtml).toContain('color:var(--theme-primary, #334155)');
      expect(headerSsrHtml).toContain('color:var(--theme-text-color, #374151)');
      expect(headerSsrHtml).not.toMatch(/text-slate-/);

      const { container: headerContainer } = render(headerNode);

      const classicSubtitle = screen.getByText('Acme Cloud');
      expect(classicSubtitle.className).not.toMatch(/text-slate-/);

      const locationEl = screen.getByText('Austin, TX');
      expect(locationEl.className).toContain('opacity-75');
      expect(locationEl.className).not.toMatch(/text-slate-/);
      expect(headerContainer.innerHTML).not.toMatch(/text-slate-/);

      const sectionsNode = <SectionRenderer resume={richResume} tone="classic" readOnly />;
      const sectionsSsrHtml = ReactDOMServer.renderToStaticMarkup(sectionsNode);
      expect(sectionsSsrHtml).toContain('color:var(--theme-text-color, #374151)');
      expect(sectionsSsrHtml).not.toMatch(/text-slate-/);

      const { container: sectionsContainer } = render(sectionsNode);
      expect(sectionsContainer.innerHTML).not.toMatch(/text-slate-/);

      const skillVariants: Array<'chips' | 'comma' | 'bars' | 'dots' | 'columns'> = [
        'chips',
        'comma',
        'bars',
        'dots',
        'columns',
      ];
      for (const variant of skillVariants) {
        const skillNode = (
          <SkillList
            items={[
              { id: 'sk1', name: 'Go', level: 'Advanced', keywords: ['Concurrency'] },
              { id: 'sk2', name: 'PostgreSQL', level: 'Expert' },
            ]}
            variant={variant}
            readOnly
          />
        );
        const skillSsrHtml = ReactDOMServer.renderToStaticMarkup(skillNode);
        expect(skillSsrHtml).toContain('color:var(--theme-text-color, #374151)');
        expect(skillSsrHtml).not.toMatch(/text-slate-/);

        const { container: skillContainer, unmount } = render(skillNode);
        expect(skillContainer.innerHTML).not.toMatch(/text-slate-/);
        unmount();
      }

      const kwNode = <KeywordList keywords={['React', 'GraphQL']} variant="chips" />;
      const kwSsrHtml = ReactDOMServer.renderToStaticMarkup(kwNode);
      expect(kwSsrHtml).toContain('color:var(--theme-text-color, #374151)');
      expect(kwSsrHtml).not.toMatch(/text-slate-/);

      const contactNode = <ContactRow resume={richResume} variant="inline-center" readOnly />;
      const contactSsrHtml = ReactDOMServer.renderToStaticMarkup(contactNode);
      expect(contactSsrHtml).toContain('color:var(--theme-text-color, #475569)');
      expect(contactSsrHtml).not.toMatch(/text-slate-/);

      const { container: contactContainer } = render(contactNode);
      expect(contactContainer.innerHTML).not.toMatch(/text-slate-/);
    });
  });
});
