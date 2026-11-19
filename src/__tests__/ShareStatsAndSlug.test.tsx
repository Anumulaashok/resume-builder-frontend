import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import ShareModal from '../components/ShareModal';
import App, { getPublicSlugFromLocation } from '../App';
import { resumeService } from '../services/resume.service';
import { SectionType } from '../types/resume';

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
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    getShareStats: jest.fn(),
    checkSlugAvailability: jest.fn(),
    updateShareSlug: jest.fn(),
    getPublicResume: jest.fn(),
    getPublicResumeBySlug: jest.fn(),
  },
}));

describe('Share Modal Analytics, Custom URL Editor & /r/:slug Public Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('ShareModal Viewer Analytics & 30-Day Bar Chart', () => {
    it('renders loading skeleton, then displays total views, last viewed, and 30-day bar chart with keyboard focus readout', async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const twoDaysAgoStr = new Date(
        today.getTime() - 2 * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 10);

      let resolveStats!: (val: any) => void;
      (resumeService.getShareStats as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStats = resolve;
        })
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="res-analytics-1"
          resumeTitle="Staff Engineer CV"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_abc',
            slug: 'jane-doe',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      expect(screen.getByTestId('share-stats-loading')).toBeInTheDocument();

      await act(async () => {
        resolveStats({
          viewCount: 42,
          lastViewedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          dailyViews: [
            { date: twoDaysAgoStr, count: 5 },
            { date: todayStr, count: 9 },
          ],
          isPublic: true,
          slug: 'jane-doe',
        });
      });

      expect(screen.getByTestId('share-total-views')).toHaveTextContent('42');
      expect(screen.getByTestId('share-last-viewed')).toHaveTextContent(/2h ago/i);

      const bars = screen.getAllByTestId('daily-view-bar');
      expect(bars).toHaveLength(30);
      expect(bars[29]).toHaveAttribute('data-date', todayStr);
      expect(bars[29]).toHaveAttribute('data-count', '9');

      // Keyboard focus updates chart readout
      expect(screen.getByTestId('share-chart-readout')).toHaveTextContent(
        '14 views in 30d'
      );
      fireEvent.focus(bars[29]);
      expect(screen.getByTestId('share-chart-readout')).toHaveTextContent(
        /9 views/i
      );
    });

    it('renders empty state when viewCount is 0 and error state with retry when stats request fails', async () => {
      (resumeService.getShareStats as jest.Mock).mockRejectedValueOnce(
        new Error('Stats service unavailable')
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="res-err-1"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_1',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('share-stats-error')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Stats service unavailable')
      ).toBeInTheDocument();

      // Retry succeeds with 0 views -> shows empty state
      (resumeService.getShareStats as jest.Mock).mockResolvedValueOnce({
        viewCount: 0,
        lastViewedAt: null,
        dailyViews: [],
      });

      fireEvent.click(screen.getByRole('button', { name: /retry/i }));

      await waitFor(() => {
        expect(screen.getByTestId('share-total-views')).toHaveTextContent('0');
      });
      expect(screen.getByTestId('share-last-viewed')).toHaveTextContent(
        'Never viewed'
      );
      expect(screen.getByTestId('share-stats-empty')).toBeInTheDocument();
    });
  });

  describe('Custom URL Editor (debounced live check, save, 409 error & copy)', () => {
    it('blocks reserved/short slugs client-side, debounces live availability check, saves custom URL, and copies /r/:slug', async () => {
      jest.useFakeTimers();

      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      (resumeService.getShareStats as jest.Mock).mockResolvedValue({
        viewCount: 3,
        lastViewedAt: null,
        dailyViews: [],
      });
      (resumeService.checkSlugAvailability as jest.Mock).mockResolvedValueOnce({
        slug: 'alex-rivera-cv',
        available: true,
      });
      (resumeService.updateShareSlug as jest.Mock).mockResolvedValueOnce({
        isPublic: true,
        shareToken: 'tok_1',
        slug: 'alex-rivera-cv',
        privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
      });

      const onSharingUpdated = jest.fn();

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="res-slug-1"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_1',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
          onSharingUpdated={onSharingUpdated}
        />
      );

      await act(async () => {
        await Promise.resolve();
      });

      const slugInput = screen.getByTestId('custom-slug-input');

      // Reserved word rejected immediately without network request
      fireEvent.change(slugInput, { target: { value: 'admin' } });
      expect(screen.getByTestId('slug-status-unavailable')).toHaveTextContent(
        /reserved word/i
      );
      expect(resumeService.checkSlugAvailability).not.toHaveBeenCalled();

      // Valid slug triggers debounced availability check
      fireEvent.change(slugInput, { target: { value: 'alex-rivera-cv' } });
      expect(screen.getByTestId('slug-status-checking')).toBeInTheDocument();
      expect(resumeService.checkSlugAvailability).not.toHaveBeenCalled();

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(resumeService.checkSlugAvailability).toHaveBeenCalledTimes(1);
      expect(resumeService.checkSlugAvailability).toHaveBeenCalledWith(
        'res-slug-1',
        'alex-rivera-cv'
      );

      await waitFor(() => {
        expect(screen.getByTestId('slug-status-available')).toBeInTheDocument();
      });

      // Save custom URL
      const saveBtn = screen.getByTestId('save-custom-slug');
      expect(saveBtn).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(saveBtn);
      });

      expect(resumeService.updateShareSlug).toHaveBeenCalledWith(
        'res-slug-1',
        'alex-rivera-cv'
      );
      expect(onSharingUpdated).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'alex-rivera-cv' })
      );

      // Copy custom URL
      const copySlugBtn = screen.getByTestId('copy-custom-slug-link');
      expect(copySlugBtn).not.toBeDisabled();

      await act(async () => {
        fireEvent.click(copySlugBtn);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/r/alex-rivera-cv')
      );
    });

    it('displays inline unavailable error when PATCH /sharing/slug returns 409 conflict', async () => {
      jest.useFakeTimers();

      (resumeService.getShareStats as jest.Mock).mockResolvedValue({
        viewCount: 0,
        lastViewedAt: null,
        dailyViews: [],
      });
      (resumeService.checkSlugAvailability as jest.Mock).mockResolvedValueOnce({
        slug: 'contested-slug',
        available: true,
      });
      const conflictError: any = new Error(
        'This custom URL slug is already taken'
      );
      conflictError.status = 409;
      (resumeService.updateShareSlug as jest.Mock).mockRejectedValueOnce(
        conflictError
      );

      render(
        <ShareModal
          isOpen={true}
          onClose={jest.fn()}
          resumeId="res-slug-conflict"
          initialSharing={{
            isPublic: true,
            shareToken: 'tok_2',
            privacy: { hideEmail: false, hidePhone: false, hideAddress: false },
          }}
        />
      );

      const slugInput = screen.getByTestId('custom-slug-input');
      fireEvent.change(slugInput, { target: { value: 'contested-slug' } });

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      await waitFor(() => {
        expect(screen.getByTestId('slug-status-available')).toBeInTheDocument();
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-custom-slug'));
      });

      expect(screen.getByTestId('slug-status-unavailable')).toHaveTextContent(
        /already taken/i
      );
    });
  });

  describe('Public Route /r/:slug -> PublicResumeView', () => {
    it('extracts slug from /r/:slug and renders PublicResumeView without authentication', async () => {
      window.history.pushState({}, '', '/r/jane-doe-cv');
      expect(getPublicSlugFromLocation()).toBe('jane-doe-cv');

      (resumeService.getPublicResumeBySlug as jest.Mock).mockResolvedValueOnce({
        _id: 'pub-slug-res-1',
        title: 'Jane Public Resume',
        templateId: 'modern',
        content: {
          basics: {
            name: 'Jane Doe',
            label: 'Principal Systems Engineer',
            location: { city: 'Austin' },
          },
          sections: [
            {
              id: 'work-1',
              title: 'Experience',
              type: SectionType.WORK,
              content: [
                {
                  id: 'item-1',
                  name: 'CloudScale',
                  position: 'Principal Engineer',
                  startDate: '2022-01',
                  description: 'Designed global edge routing.',
                },
              ],
            },
          ],
          sectionOrder: ['work-1'],
        },
      });

      render(<App />);

      await waitFor(() => {
        expect(resumeService.getPublicResumeBySlug).toHaveBeenCalledWith(
          'jane-doe-cv'
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Principal Systems Engineer')
      ).toBeInTheDocument();
      expect(screen.getByText('CloudScale')).toBeInTheDocument();
    });
  });
});
