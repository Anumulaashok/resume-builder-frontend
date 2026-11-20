import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeEditor, { normalizeResume } from '../components/ResumeEditor';
import ShareModal from '../components/ShareModal';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import { DeveloperTemplate } from '../components/templates/DeveloperTemplate';
import {
  extractExtraBasicsLinks,
  normalizeHref,
  validateOptionalLinkInput,
} from '../components/templates/templateHelpers';
import { resumeService } from '../services/resume.service';
import { IResume } from '../types/resume';

jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  Panel: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  PanelResizeHandle: ({ children, ...props }: any) => (
    <div role="separator" {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../services/resume.service', () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    exportResumeTxt: jest.fn(),
  },
}));

describe('Basics Links & Location across Schema, Form, Canvas, Print & Privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizeHref, validateOptionalLinkInput & extractExtraBasicsLinks security', () => {
    it('normalizes bare domains to https:// while rejecting javascript:, data:, vbscript:, and file: schemes', () => {
      expect(normalizeHref('github.com/mayalin')).toBe('https://github.com/mayalin');
      expect(normalizeHref('https://mayalin.dev')).toBe('https://mayalin.dev');
      expect(normalizeHref('mailto:maya@example.com')).toBe('mailto:maya@example.com');
      expect(normalizeHref('tel:+14155550199')).toBe('tel:+14155550199');

      expect(normalizeHref('javascript:alert(1)')).toBe('');
      expect(normalizeHref('JAVASCRIPT:void(0)')).toBe('');
      expect(normalizeHref('java\tscript:alert(1)')).toBe('');
      expect(normalizeHref('data:text/html,<script>alert(1)</script>')).toBe('');
      expect(normalizeHref('vbscript:msgbox(1)')).toBe('');
      expect(normalizeHref('file:///etc/passwd')).toBe('');

      expect(validateOptionalLinkInput('')).toBeNull();
      expect(validateOptionalLinkInput('linkedin.com/in/mayalin')).toBeNull();
      expect(validateOptionalLinkInput('javascript:alert(1)')).toMatch(/unsafe url scheme/i);
      expect(validateOptionalLinkInput('data:text/html,evil')).toMatch(/unsafe url scheme/i);
      expect(validateOptionalLinkInput('not a url')).toMatch(/spaces/i);

      const links = extractExtraBasicsLinks({
        url: 'javascript:alert(1)',
        linkedin: 'linkedin.com/in/mayalin',
        github: 'data:text/plain,evil',
        profiles: [
          { network: 'Dribbble', url: 'dribbble.com/mayalin' },
          { network: 'Evil', url: 'javascript:evil()' },
        ],
      });

      expect(links).toEqual([
        expect.objectContaining({
          key: 'linkedin',
          label: 'linkedin.com/in/mayalin',
          href: 'https://linkedin.com/in/mayalin',
        }),
        expect.objectContaining({
          key: 'profile-0',
          label: 'dribbble.com/mayalin',
          href: 'https://dribbble.com/mayalin',
        }),
      ]);
    });
  });

  describe('ResumeEditor Basic Information form, disclosure toggle, custom links, undo/redo & save', () => {
    it('edits location, optional street address/postal code, LinkedIn, GitHub, Portfolio, and custom profiles with undo/redo and save persistence', async () => {
      (resumeService.updateResume as jest.Mock).mockImplementation(
        async (_id: string, payload: IResume) => payload
      );

      const initial: IResume = {
        _id: 'res-basics-1',
        title: 'Platform Engineer Resume',
        content: {
          basics: {
            name: 'Elena Rostova',
            label: 'Staff Systems Engineer',
            email: 'elena@example.com',
            phone: '555-0100',
            summary: 'Distributed systems architect.',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      render(<ResumeEditor initialResume={initial} onBack={jest.fn()} />);

      // Optional street address & postal code start collapsed when empty
      expect(screen.queryByLabelText('Street Address')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Postal Code')).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('City'), {
        target: { value: 'Seattle' },
      });
      fireEvent.change(screen.getByLabelText('State / Region'), {
        target: { value: 'WA' },
      });
      fireEvent.change(screen.getByLabelText('Country'), {
        target: { value: 'US' },
      });

      // Expand optional street address disclosure
      const disclosureBtn = screen.getByTestId('toggle-street-address');
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(disclosureBtn);
      expect(disclosureBtn).toHaveAttribute('aria-expanded', 'true');

      fireEvent.change(screen.getByLabelText('Street Address'), {
        target: { value: '400 Broad St' },
      });
      fireEvent.change(screen.getByLabelText('Postal Code'), {
        target: { value: '98109' },
      });

      // Profile & Portfolio links
      fireEvent.change(screen.getByLabelText('LinkedIn'), {
        target: { value: 'linkedin.com/in/elenarostova' },
      });
      fireEvent.change(screen.getByLabelText('GitHub'), {
        target: { value: 'https://github.com/erostova' },
      });
      fireEvent.change(screen.getByLabelText('Portfolio'), {
        target: { value: 'erostova.dev' },
      });

      // Repeatable custom links
      fireEvent.click(screen.getByTestId('add-custom-profile-btn'));
      fireEvent.change(screen.getByLabelText('Custom link 1 label'), {
        target: { value: 'Speaker Deck' },
      });
      fireEvent.change(screen.getByLabelText('Custom link 1 URL'), {
        target: { value: 'speakerdeck.com/erostova' },
      });

      // Undo and Redo track custom link edits via useResumeHistory
      const undoBtn = screen.getByRole('button', { name: 'Undo' });
      const redoBtn = screen.getByRole('button', { name: 'Redo' });
      fireEvent.click(undoBtn);
      expect((screen.getByLabelText('Custom link 1 URL') as HTMLInputElement).value).toBe('');
      fireEvent.click(redoBtn);
      expect((screen.getByLabelText('Custom link 1 URL') as HTMLInputElement).value).toBe(
        'speakerdeck.com/erostova'
      );

      // Save and verify full basics payload
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(resumeService.updateResume).toHaveBeenCalledWith(
          'res-basics-1',
          expect.objectContaining({
            content: expect.objectContaining({
              basics: expect.objectContaining({
                url: 'erostova.dev',
                linkedin: 'linkedin.com/in/elenarostova',
                github: 'https://github.com/erostova',
                location: {
                  address: '400 Broad St',
                  city: 'Seattle',
                  region: 'WA',
                  countryCode: 'US',
                  postalCode: '98109',
                },
                profiles: [
                  {
                    network: 'Speaker Deck',
                    username: '',
                    url: 'speakerdeck.com/erostova',
                  },
                ],
              }),
            }),
          })
        );
      });

      // Verify normalizeResume preserves every field on reload
      const savedPayload = (resumeService.updateResume as jest.Mock).mock.calls[0][1] as IResume;
      const rehydrated = normalizeResume(savedPayload);
      expect(rehydrated.content.basics.location).toEqual({
        address: '400 Broad St',
        city: 'Seattle',
        region: 'WA',
        countryCode: 'US',
        postalCode: '98109',
      });
      expect(rehydrated.content.basics.linkedin).toBe('linkedin.com/in/elenarostova');
      expect(rehydrated.content.basics.github).toBe('https://github.com/erostova');
      expect(rehydrated.content.basics.url).toBe('erostova.dev');
      expect(rehydrated.content.basics.profiles).toEqual([
        { network: 'Speaker Deck', username: '', url: 'speakerdeck.com/erostova' },
      ]);
    });

    it('blocks saving and shows validation alert when javascript: or data: link is entered', async () => {
      const initial: IResume = {
        _id: 'res-basics-2',
        title: 'Security Check Resume',
        content: {
          basics: {
            name: 'Elena Rostova',
            email: 'elena@example.com',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      render(<ResumeEditor initialResume={initial} onBack={jest.fn()} />);

      fireEvent.change(screen.getByLabelText('Portfolio'), {
        target: { value: 'javascript:alert(1)' },
      });

      expect(screen.getByRole('alert')).toHaveTextContent(/unsafe url scheme/i);

      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));
      expect(resumeService.updateResume).not.toHaveBeenCalled();
    });
  });

  describe('Inline canvas editing across ModernTemplate, ProfessionalTemplate, and DeveloperTemplate', () => {
    it.each([
      ['ModernTemplate', ModernTemplate],
      ['ProfessionalTemplate', ProfessionalTemplate],
      ['DeveloperTemplate', DeveloperTemplate],
    ])(
      'allows adding and editing location and links inline in %s when readOnly is false',
      (_name, TemplateComp) => {
        let currentResume: IResume = {
          title: 'Canvas Edit Test',
          content: {
            basics: {
              name: 'Jordan Lee',
              email: 'jordan@example.com',
            },
            sections: [],
            sectionOrder: [],
          },
        };

        const handleChange = jest.fn((next: IResume) => {
          currentResume = next;
        });

        const { rerender } = render(
          <TemplateComp resume={currentResume} onChange={handleChange} readOnly={false} />
        );

        // Edit location inline
        fireEvent.click(screen.getByLabelText('Inline edit: Location'));
        const locInput = screen.getByLabelText('Inline edit: Location');
        fireEvent.change(locInput, { target: { value: 'Austin, TX, US' } });
        fireEvent.keyDown(locInput, { key: 'Enter' });

        expect(currentResume.content.basics.location).toEqual(
          expect.objectContaining({
            city: 'Austin',
            region: 'TX',
            countryCode: 'US',
          })
        );

        rerender(
          <TemplateComp resume={currentResume} onChange={handleChange} readOnly={false} />
        );
        expect(screen.getByText('Austin, TX, US')).toBeInTheDocument();

        // Add GitHub link inline
        fireEvent.click(screen.getByLabelText('Inline edit: GitHub URL'));
        const ghInput = screen.getByLabelText('Inline edit: GitHub URL');
        fireEvent.change(ghInput, { target: { value: 'github.com/jordanlee' } });
        fireEvent.keyDown(ghInput, { key: 'Enter' });

        expect(currentResume.content.basics.github).toBe('github.com/jordanlee');

        rerender(
          <TemplateComp resume={currentResume} onChange={handleChange} readOnly={false} />
        );

        // Populated link renders with normalized https:// href and can be edited inline on click
        const ghLink = screen.getByRole('link', { name: /github\.com\/jordanlee/i });
        expect(ghLink).toHaveAttribute('href', 'https://github.com/jordanlee');

        fireEvent.click(ghLink);
        const editGhInput = screen.getByLabelText('Inline edit: github URL');
        fireEvent.change(editGhInput, {
          target: { value: 'https://github.com/jordan-lee-dev' },
        });
        fireEvent.blur(editGhInput);
        expect(currentResume.content.basics.github).toBe(
          'https://github.com/jordan-lee-dev'
        );
      }
    );
  });

  describe('ReadOnly & @media print link rendering and privacy redaction', () => {
    it('renders normalized https:// links, hides all empty placeholders in print/readOnly, and redacts street address & postalCode when hideAddress is enabled', () => {
      const sharedResume: IResume = {
        title: 'Shared Resume',
        sharing: {
          isPublic: true,
          privacy: {
            hideEmail: false,
            hidePhone: false,
            hideAddress: true,
          },
        },
        content: {
          basics: {
            name: 'Maya Lin',
            email: 'maya@example.com',
            linkedin: 'linkedin.com/in/mayalin',
            url: 'mayalin.dev',
            location: {
              address: '742 Market Street',
              city: 'San Francisco',
              region: 'CA',
              postalCode: '94103',
              countryCode: 'US',
            },
            profiles: [{ network: 'Dribbble', url: 'dribbble.com/mayalin' }],
          },
          sections: [],
          sectionOrder: [],
        },
      };

      // 1. Read-only mode: normalized links, no placeholders, street address & postalCode redacted while city/region/country visible
      const { unmount } = render(<ModernTemplate resume={sharedResume} readOnly />);

      expect(screen.getByText('San Francisco, CA, US')).toBeInTheDocument();
      expect(screen.queryByText(/742 Market Street/)).not.toBeInTheDocument();
      expect(screen.queryByText(/94103/)).not.toBeInTheDocument();

      expect(screen.getByRole('link', { name: 'linkedin.com/in/mayalin' })).toHaveAttribute(
        'href',
        'https://linkedin.com/in/mayalin'
      );
      expect(screen.getByRole('link', { name: 'mayalin.dev' })).toHaveAttribute(
        'href',
        'https://mayalin.dev'
      );
      expect(screen.getByRole('link', { name: 'dribbble.com/mayalin' })).toHaveAttribute(
        'href',
        'https://dribbble.com/mayalin'
      );
      expect(screen.queryByText('Add GitHub')).not.toBeInTheDocument();
      expect(screen.queryByText('Custom Link')).not.toBeInTheDocument();
      expect(screen.queryByText('Phone Number')).not.toBeInTheDocument();
      unmount();

      // 2. Edit mode (@media print classes): empty placeholders carry print:hidden while populated links stay print-visible
      render(
        <ProfessionalTemplate
          resume={sharedResume}
          onChange={jest.fn()}
          readOnly={false}
        />
      );

      expect(screen.getByText('Add GitHub').closest('.print\\:hidden')).not.toBeNull();
      expect(screen.getByText('Custom Link').closest('.print\\:hidden')).not.toBeNull();
      expect(screen.getByText('Phone Number').closest('.print\\:hidden')).not.toBeNull();
      expect(
        screen.getByRole('link', { name: 'linkedin.com/in/mayalin' }).closest('.print\\:hidden')
      ).toBeNull();
    });

    it('clarifies in ShareModal that Hide Physical Address hides street address & postal code while keeping city & region visible', () => {
      render(
        <ShareModal
          isOpen
          onClose={jest.fn()}
          resumeId="res-1"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok-1',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      expect(screen.getByTestId('hide-address-toggle')).toBeInTheDocument();
      expect(
        screen.getByText(
          /Hides street address & postal code while keeping city & region visible/i
        )
      ).toBeInTheDocument();
    });
  });
});
