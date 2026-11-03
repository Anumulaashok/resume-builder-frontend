import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ThemeCustomizationPanel } from '../ThemeCustomizationPanel';
import ResumePreview from '../ResumePreview';
import { useResumeHistory } from '../useResumeHistory';
import { IResume } from '../../types/resume';
import { defaultResume } from '../../constants/editorConstants';
import { defaultThemeConfig, fontPairingOptions, colorOptions, spacingOptions } from '../../constants/themeConstants';

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

      // Check spacing options
      spacingOptions.forEach((s) => {
        expect(screen.getByTestId(`spacing-option-${s.id}`)).toBeInTheDocument();
      });
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
  });
});
