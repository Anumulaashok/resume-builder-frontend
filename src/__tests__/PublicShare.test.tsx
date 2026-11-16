import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareModal from '../components/ShareModal';
import PublicResumeView from '../components/PublicResumeView';
import { resumeService } from '../services/resume.service';
import { SectionType } from '../types/resume';

// Mock resumeService
jest.mock('../services/resume.service', () => ({
  resumeService: {
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    getPublicResume: jest.fn(),
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
    it('shows error screen with friendly message for invalid or revoked token without redirecting', async () => {
      (resumeService.getPublicResume as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 404,
          data: { message: 'Shared resume not found or sharing has been disabled' },
        },
      });

      render(<PublicResumeView token="invalid_token" />);

      // Should show loading then error
      await waitFor(() => {
        expect(
          screen.getByText('Resume Unavailable')
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(/This shared resume link is invalid, has expired, or has been revoked by the owner/i)
      ).toBeInTheDocument();
      expect(screen.getByText('Go to Resume Builder')).toBeInTheDocument();
    });

    it('renders shared resume in read-only mode and strictly omits redacted contact fields', async () => {
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

      (resumeService.getPublicResume as jest.Mock).mockResolvedValueOnce(publicResumeData);

      render(<PublicResumeView token="tok_valid_redacted" />);

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });

      // Name, title, and public metadata should be visible
      expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Lead Developer')).toBeInTheDocument();
      expect(screen.getByText('Built microservices architecture')).toBeInTheDocument();
      expect(screen.getByText('Read Only')).toBeInTheDocument();
      expect(screen.getByText('Contact Privacy Protected')).toBeInTheDocument();

      // Redacted fields should NOT be in the document
      expect(screen.queryByText('jane@example.com')).not.toBeInTheDocument();
      expect(screen.queryByText('+1-555-0199')).not.toBeInTheDocument();
      expect(screen.queryByText('123 Private St')).not.toBeInTheDocument();
    });
  });
});
