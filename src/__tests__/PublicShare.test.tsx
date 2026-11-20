import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ShareModal from '../components/ShareModal';
import PublicResumeView from '../components/PublicResumeView';
import { A4_WIDTH_PX } from '../components/ResumePreview';
import { resumeService } from '../services/resume.service';
import { SectionType } from '../types/resume';

// Mock resumeService
jest.mock('../services/resume.service', () => ({
  resumeService: {
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    getPublicResume: jest.fn(),
    getPublicResumeBySlug: jest.fn(),
    exportSharedResumePdf: jest.fn(),
    exportSharedResumeDocx: jest.fn(),
    exportSharedResumeTxt: jest.fn(),
  },
}));

describe('Public Share & Privacy Controls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ShareModal Component', () => {
    it('renders modal with initial disabled share state and privacy options', () => {
      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="resume-123"
          resumeTitle="Software Engineer Resume"
          initialSharing={{
            isPublic: false,
            shareToken: undefined,
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      expect(screen.getByText(/Share "Software Engineer Resume"/i)).toBeInTheDocument();
      expect(screen.getByText('Public Link Access')).toBeInTheDocument();
      expect(screen.getByLabelText(/Hide Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hide Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Hide Physical Address/i)).toBeInTheDocument();
    });

    it('enables sharing and displays generated link and token', async () => {
      (resumeService.updateShareSettings as jest.Mock).mockResolvedValueOnce({
        isPublic: true,
        shareToken: 'tok_abc123456789',
        privacy: { hideEmail: true, hidePhone: false, hideAddress: false },
      });

      const onSharingUpdated = jest.fn();

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="resume-123"
          initialSharing={{
            isPublic: false,
            shareToken: undefined,
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
          onSharingUpdated={onSharingUpdated}
        />
      );

      // Toggle public switch
      const toggleSwitch = screen.getByRole('switch');
      fireEvent.click(toggleSwitch);

      await waitFor(() => {
        expect(resumeService.updateShareSettings).toHaveBeenCalledWith(
          'resume-123',
          expect.objectContaining({
            isPublic: true,
          })
        );
      });

      await waitFor(() => {
        expect(onSharingUpdated).toHaveBeenCalledWith(
          expect.objectContaining({
            isPublic: true,
            shareToken: 'tok_abc123456789',
          })
        );
      });

      // Verify share URL input contains the token
      await waitFor(() => {
        expect(screen.getByDisplayValue(/tok_abc123456789/)).toBeInTheDocument();
      });
    });

    it('toggles privacy settings and sends update', async () => {
      (resumeService.updateShareSettings as jest.Mock).mockResolvedValueOnce({
        isPublic: true,
        shareToken: 'tok_existing',
        privacy: { hideEmail: true, hidePhone: false, hideAddress: false },
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="resume-123"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_existing',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      const hideEmailCheckbox = screen.getByLabelText(/Hide Email Address/i);
      expect(hideEmailCheckbox).not.toBeChecked();

      fireEvent.click(hideEmailCheckbox);

      await waitFor(() => {
        expect(resumeService.updateShareSettings).toHaveBeenCalledWith(
          'resume-123',
          expect.objectContaining({
            isPublic: true,
            privacy: expect.objectContaining({ hideEmail: true }),
          })
        );
      });
    });

    it('copies share link to clipboard when copy button is clicked', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
      });

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="resume-123"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_12345',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      const copyBtn = screen.getByTestId('copy-share-link');
      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          expect.stringContaining('/share/tok_12345')
        );
      });
    });
  });

  describe('PublicResumeView Component', () => {
    type ResizeCallback = (
      entries: Array<{ target: Element; contentRect: { width: number; height: number } }>
    ) => void;

    let observers: Array<{ callback: ResizeCallback; elements: Set<Element> }> = [];
    const originalResizeObserver = (window as any).ResizeObserver;

    beforeEach(() => {
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
    });

    it('renders loading skeleton while shared resume is being fetched', () => {
      (resumeService.getPublicResume as jest.Mock).mockReturnValueOnce(
        new Promise(() => {})
      );

      render(<PublicResumeView shareToken="tok_loading" />);

      expect(screen.getByTestId('public-resume-loading')).toBeInTheDocument();
      expect(
        screen.getByRole('status', { name: /loading shared resume/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText('Made with Smart CV & Portfolio')
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('public-resume-print-btn')
      ).not.toBeInTheDocument();
    });

    it('shows error screen with friendly message and home link for invalid or revoked token without redirecting', async () => {
      (resumeService.getPublicResume as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Shared resume not found or sharing has been disabled' },
        },
      });

      render(<PublicResumeView shareToken="invalid_token" />);

      await waitFor(() => {
        expect(screen.getByText('Resume Unavailable')).toBeInTheDocument();
      });

      const errorView = screen.getByTestId('public-resume-error');
      expect(errorView.querySelector('svg')).toBeInTheDocument();
      expect(
        screen.getByText(
          /This shared resume link is invalid, has expired, or has been revoked by the owner/i
        )
      ).toBeInTheDocument();

      const homeLink = screen.getByRole('link', { name: /go to home/i });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('renders contextual friendly error states for expired and private links', async () => {
      (resumeService.getPublicResume as jest.Mock).mockRejectedValueOnce(
        new Error('This shared resume link has expired.')
      );

      const { unmount } = render(<PublicResumeView shareToken="expired_token" />);

      await waitFor(() => {
        expect(screen.getByText('Link Expired')).toBeInTheDocument();
      });
      expect(
        screen.getByText('This shared resume link has expired.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /go to home/i })
      ).toHaveAttribute('href', '/');

      unmount();

      (resumeService.getPublicResume as jest.Mock).mockRejectedValueOnce(
        new Error('This resume is private and sharing has been disabled.')
      );

      render(<PublicResumeView shareToken="private_token" />);

      await waitFor(() => {
        expect(screen.getByText('Resume Is Private')).toBeInTheDocument();
      });
      expect(
        screen.getByText('This resume is private and sharing has been disabled.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /go to home/i })
      ).toHaveAttribute('href', '/');
    });

    it('renders branded top bar, Print/Download button calling window.print, read-only resume without editor controls, and omits redacted fields', async () => {
      const printSpy = jest
        .spyOn(window, 'print')
        .mockImplementation(() => undefined);

      const publicResumeData = {
        _id: 'res-shared-1',
        title: 'Senior Developer Resume',
        template: 'modern',
        content: {
          basics: {
            name: 'Jane Doe',
            label: 'Full Stack Engineer',
            // email: redacted / omitted!
            // phone: redacted / omitted!
            location: {
              city: 'San Francisco',
              region: 'CA',
              // address: redacted / omitted!
            },
          },
          sections: [
            {
              id: 'sec-work',
              title: 'Work Experience',
              type: SectionType.WORK,
              content: [
                {
                  id: 'w1',
                  name: 'Acme Corp',
                  position: 'Lead Developer',
                  startDate: '2020-01',
                  description: 'Built microservices architecture',
                },
              ],
            },
          ],
          sectionOrder: ['sec-work'],
        },
        sharing: {
          isPublic: true,
          privacy: {
            hideEmail: true,
            hidePhone: true,
            hideAddress: true,
          },
        },
      };

      (resumeService.getPublicResume as jest.Mock).mockResolvedValueOnce(
        publicResumeData
      );

      render(<PublicResumeView shareToken="tok_valid_redacted" />);

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });

      // Branded top bar + link to home
      const brandLink = screen.getByRole('link', {
        name: /Made with Smart CV & Portfolio/i,
      });
      expect(brandLink).toHaveAttribute('href', '/');

      // Download PDF, Download DOCX, and secondary Print controls are rendered
      expect(screen.getByTestId('public-export-pdf-btn')).toHaveTextContent(
        /download pdf/i
      );
      expect(screen.getByTestId('public-export-docx-btn')).toHaveTextContent(
        /download docx/i
      );

      const printBtn = screen.getByTestId('public-resume-print-btn');
      expect(printBtn).toHaveTextContent(/^print$/i);
      fireEvent.click(printBtn);
      expect(printSpy).toHaveBeenCalledTimes(1);

      // Document title synchronizes with shared resume title
      expect(document.title).toContain('Senior Developer Resume');

      // Editor-only toolbar controls must not appear on the public viewer
      expect(screen.queryByText('Templates')).not.toBeInTheDocument();
      expect(screen.queryByText('Customize Theme')).not.toBeInTheDocument();

      // Resume content should be visible
      expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Lead Developer')).toBeInTheDocument();
      expect(
        screen.getByText('Built microservices architecture')
      ).toBeInTheDocument();

      // Redacted fields should NOT be in the document
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('+1-555-0199')).not.toBeInTheDocument();
      expect(screen.queryByText('123 Private St')).not.toBeInTheDocument();

      printSpy.mockRestore();
    });

    it('scales the centred resume page to fit narrow mobile viewports and strips non-resume chrome in print styles', async () => {
      const publicResumeData = {
        _id: 'res-shared-2',
        title: 'Mobile & Print Resume',
        templateId: 'professional',
        content: {
          basics: {
            name: 'Alex Rivera',
            label: 'Staff Product Designer',
            summary: 'Designing accessible design systems.',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      (resumeService.getPublicResume as jest.Mock).mockResolvedValueOnce(
        publicResumeData
      );

      render(<PublicResumeView token="tok_mobile_print" />);

      await waitFor(() => {
        expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      });

      // Professional template uses 'Profile' heading for summary
      expect(screen.getByText('Profile')).toBeInTheDocument();

      const topBar = screen.getByTestId('public-resume-topbar');
      const viewport = screen.getByTestId('resume-preview-viewport');
      const scaler = screen.getByTestId('resume-preview-scaler');
      const page = screen.getByTestId('resume-preview-page');

      // Simulate narrow 350px mobile viewport
      act(() => {
        observers.forEach((obs) => {
          if (obs.elements.has(viewport)) {
            obs.callback([
              {
                target: viewport,
                contentRect: { width: 350, height: 740 },
              },
            ]);
          }
        });
      });

      const expectedMobileScale = Number(((350 - 2) / A4_WIDTH_PX).toFixed(4));
      expect(page.style.transform).toBe(`scale(${expectedMobileScale})`);
      expect(parseInt(scaler.style.width, 10)).toBeLessThanOrEqual(350);

      // Simulate widening to 1100px desktop viewport -> caps scale at 1
      act(() => {
        observers.forEach((obs) => {
          if (obs.elements.has(viewport)) {
            obs.callback([
              {
                target: viewport,
                contentRect: { width: 1100, height: 900 },
              },
            ]);
          }
        });
      });
      expect(page.style.transform).toBe('scale(1)');

      // Print output classes hide top bar and reset canvas/page transforms & shadows
      expect(topBar.className).toContain('print:hidden');
      expect(page.contains(topBar)).toBe(false);
      expect(viewport.className).toContain('print:!p-0');
      expect(viewport.className).toContain('print:!bg-white');
      expect(scaler.className).toContain('print:!w-full');
      expect(page.className).toContain('print:!transform-none');
      expect(page.className).toContain('print:!shadow-none');
    });

    it('downloads shared PDF and DOCX files and restores document.title on unmount', async () => {
      const originalTitle = document.title;
      document.title = 'Smart CV & Portfolio';
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      URL.createObjectURL = jest.fn(() => 'blob:http://localhost/shared-file');
      URL.revokeObjectURL = jest.fn();
      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => undefined);

      (resumeService.getPublicResume as jest.Mock).mockResolvedValueOnce({
        _id: 'res-shared-export',
        title: 'Shared Principal Resume',
        templateId: 'modern',
        content: {
          basics: { name: 'Elena Rostova', label: 'Principal Architect' },
          sections: [],
          sectionOrder: [],
        },
      });
      (resumeService.exportSharedResumePdf as jest.Mock).mockResolvedValueOnce({
        blob: new Blob(['%PDF-1.7'], { type: 'application/pdf' }),
        filename: 'shared-principal-resume.pdf',
      });
      (resumeService.exportSharedResumeDocx as jest.Mock).mockResolvedValueOnce({
        blob: new Blob(['PK\x03\x04'], {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
        filename: 'shared-principal-resume.docx',
      });

      const { unmount } = render(
        <PublicResumeView shareToken="tok_shared_exports" />
      );

      await waitFor(() => {
        expect(screen.getByText('Elena Rostova')).toBeInTheDocument();
      });

      expect(document.title).toBe('Shared Principal Resume');

      fireEvent.click(screen.getByTestId('public-export-pdf-btn'));
      await waitFor(() => {
        expect(resumeService.exportSharedResumePdf).toHaveBeenCalledWith({
          shareToken: 'tok_shared_exports',
          slug: '',
          fallbackTitle: 'Shared Principal Resume',
        });
      });

      fireEvent.click(screen.getByTestId('public-export-docx-btn'));
      await waitFor(() => {
        expect(resumeService.exportSharedResumeDocx).toHaveBeenCalledWith({
          shareToken: 'tok_shared_exports',
          slug: '',
          fallbackTitle: 'Shared Principal Resume',
        });
      });

      expect(clickSpy).toHaveBeenCalledTimes(2);

      unmount();
      expect(document.title).toBe('Smart CV & Portfolio');

      clickSpy.mockRestore();
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.title = originalTitle;
    });
  });
});
