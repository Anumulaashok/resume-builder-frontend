import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioList } from '../PortfolioList';
import { PortfolioEditor } from '../PortfolioEditor';
import { PortfolioPublicView } from '../PortfolioPublicView';
import { ImportProjectsModal } from '../ImportProjectsModal';
import { portfolioService } from '../../../services/portfolio.service';
import { resumeService } from '../../../services/resume.service';
import { IPortfolio } from '../../../types/portfolio';

jest.mock('../../../services/portfolio.service');
jest.mock('../../../services/resume.service');
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

const mockPortfolio: IPortfolio = {
  _id: 'portfolio-123',
  title: 'Alex Designer Portfolio',
  slug: 'alex-design',
  isPublished: true,
  basics: {
    name: 'Alex Rivera',
    title: 'Senior Product Designer',
    email: 'alex@example.com',
    location: 'San Francisco, CA',
    bio: 'Designing user-centered enterprise experiences.',
    socialLinks: {
      github: 'https://github.com/alexrivera',
      linkedin: 'https://linkedin.com/in/alexrivera'
    }
  },
  sections: [
    {
      id: 'projects',
      type: 'projects',
      title: 'Featured Projects',
      content: [
        {
          id: 'proj-1',
          title: 'Design System Platform',
          description: 'A scalable multi-brand component library for modern web apps.',
          tags: ['Figma', 'React', 'Tailwind'],
          demoUrl: 'https://design-system.example.com',
          githubUrl: 'https://github.com/alex/design-system',
          images: ['/uploads/portfolio-mock.png']
        }
      ],
      enabled: true
    },
    {
      id: 'skills',
      type: 'skills',
      title: 'Design & Code Skills',
      content: [
        { id: 's1', name: 'UI/UX Design' },
        { id: 's2', name: 'TypeScript' }
      ],
      enabled: true
    },
    {
      id: 'contact',
      type: 'contact',
      title: 'Get In Touch',
      content: [],
      enabled: true
    }
  ],
  sectionOrder: ['projects', 'skills', 'contact']
};

describe('Frontend Portfolio Platform Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PortfolioList Component', () => {
    it('renders portfolio list with vanity URL and published badge', async () => {
      (portfolioService.getPortfolios as jest.Mock).mockResolvedValueOnce([mockPortfolio]);

      const onEdit = jest.fn();
      const onNew = jest.fn();

      render(<PortfolioList onEditPortfolio={onEdit} onNewPortfolio={onNew} />);

      expect(screen.getByText(/Loading your portfolios/i)).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-list-skeleton')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /Loading portfolios/i })).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Alex Designer Portfolio')).toBeInTheDocument();
      });

      expect(screen.getByText('/p/alex-design')).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-card')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-card-preview')).toBeInTheDocument();
      expect(screen.getByText('AR')).toBeInTheDocument();
      expect(screen.getByTestId('portfolios-count-subtitle')).toHaveTextContent(/1 portfolio\b/i);
    });

    it('renders empty state when user has no portfolios', async () => {
      (portfolioService.getPortfolios as jest.Mock).mockResolvedValueOnce([]);

      const onEdit = jest.fn();
      const onNew = jest.fn();

      render(<PortfolioList onEditPortfolio={onEdit} onNewPortfolio={onNew} />);

      await waitFor(() => {
        expect(screen.getByText(/No portfolios yet/i)).toBeInTheDocument();
      });

      expect(screen.getByTestId('portfolio-empty-state')).toBeInTheDocument();
      expect(screen.getByTestId('portfolios-count-subtitle')).toHaveTextContent(/0 portfolios/i);

      const createBtn = screen.getByRole('button', { name: /Build My First Portfolio/i });
      expect(createBtn).toHaveClass('focus-ring');
      fireEvent.click(createBtn);
      expect(onNew).toHaveBeenCalledTimes(1);
    });

    it('supports confirm-based deletion and updates count', async () => {
      (portfolioService.getPortfolios as jest.Mock).mockResolvedValueOnce([mockPortfolio]);
      (portfolioService.deletePortfolio as jest.Mock).mockResolvedValueOnce(undefined);
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(true);

      render(<PortfolioList onEditPortfolio={jest.fn()} onNewPortfolio={jest.fn()} />);

      await waitFor(() => {
        expect(screen.getByTestId('portfolio-card')).toBeInTheDocument();
      });

      const deleteBtn = screen.getByRole('button', { name: /delete portfolio/i });
      fireEvent.click(deleteBtn);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to delete portfolio "Alex Designer Portfolio"?'
      );
      await waitFor(() => {
        expect(portfolioService.deletePortfolio).toHaveBeenCalledWith('portfolio-123');
      });
      await waitFor(() => {
        expect(screen.getByTestId('portfolio-empty-state')).toBeInTheDocument();
      });

      confirmSpy.mockRestore();
    });
  });

  describe('PortfolioEditor Component (Split-Screen & Canvas)', () => {
    it('renders split-screen with workspace controls on left and live preview on right', () => {
      render(
        <PortfolioEditor
          initialPortfolio={mockPortfolio}
          onSave={jest.fn()}
          onBack={jest.fn()}
        />
      );

      // Check header controls
      expect(screen.getByDisplayValue('Alex Designer Portfolio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('alex-design')).toBeInTheDocument();
      expect(screen.getByText('Live & Published')).toBeInTheDocument();

      // Check left panel (workspace controls & associated labels)
      expect(screen.getByText('Basics & Hero Profile')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Sections Order')).toBeInTheDocument();
      expect(screen.getByLabelText(/Your Full Name/i)).toHaveValue('Alex Rivera');
      expect(screen.getByLabelText(/Professional Title/i)).toHaveValue('Senior Product Designer');
      expect(screen.getByLabelText(/Contact Email/i)).toHaveValue('alex@example.com');

      // Check right panel (live canvas header & canvas content)
      expect(screen.getByText(/Live Visual Preview Canvas/i)).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('Senior Product Designer')).toBeInTheDocument();
    });

    it('stacks default hero H1 name and accent headline on separate lines on a light neutral canvas with working zoom and inline edit', async () => {
      render(<PortfolioEditor onSave={jest.fn()} onBack={jest.fn()} />);

      // Light neutral canvas & light toolbar (matching resume preview)
      const previewPane = screen.getByTestId('portfolio-preview-pane');
      const previewToolbar = screen.getByTestId('portfolio-preview-toolbar');
      const previewViewport = screen.getByTestId('portfolio-preview-viewport');

      expect(previewPane).toHaveClass('bg-neutral-100');
      expect(previewPane).not.toHaveClass('bg-neutral-800');
      expect(previewToolbar).toHaveClass('bg-white', 'border-neutral-200');
      expect(previewToolbar).not.toHaveClass('bg-neutral-900');
      expect(previewViewport).toHaveClass('bg-neutral-100');

      // Page card itself remains unchanged on top of the light neutral canvas
      const pageCard = previewViewport.firstElementChild as HTMLElement;
      expect(pageCard).toHaveClass(
        'bg-white',
        'rounded-panel',
        'shadow-modal',
        'border',
        'border-neutral-200'
      );

      // Hero stacks name as H1 and headline on its own block line below in accent colour
      const heroH1 = screen.getByRole('heading', { level: 1 });
      expect(heroH1).toHaveTextContent('Your Name');
      expect(heroH1).not.toHaveClass('inline-block');

      const headlineWrapper = screen.getByTestId('canvas-hero-headline');
      expect(headlineWrapper).toHaveTextContent('Software Developer & Creator');
      expect(headlineWrapper).not.toHaveClass('inline-block');
      const headlineText = screen.getByText('Software Developer & Creator');
      expect(headlineText).toHaveClass('block', 'text-primary-600');

      // Existing zoom controls still work
      const zoomOutBtn = screen.getByRole('button', { name: /Zoom out/i });
      const resetZoomBtn = screen.getByRole('button', { name: /Reset zoom/i });
      const zoomInBtn = screen.getByRole('button', { name: /Zoom in/i });

      expect(resetZoomBtn).toHaveTextContent('100%');
      fireEvent.click(zoomInBtn);
      expect(resetZoomBtn).toHaveTextContent('110%');
      expect(pageCard).toHaveStyle({ transform: 'scale(1.1)' });

      fireEvent.click(zoomOutBtn);
      fireEvent.click(zoomOutBtn);
      expect(resetZoomBtn).toHaveTextContent('90%');
      expect(pageCard).toHaveStyle({ transform: 'scale(0.9)' });

      fireEvent.click(resetZoomBtn);
      expect(resetZoomBtn).toHaveTextContent('100%');
      expect(pageCard).toHaveStyle({ transform: 'scale(1)' });

      // Inline editing on the hero H1 and headline syncs with form inputs
      fireEvent.click(screen.getByText('Your Name'));
      await waitFor(() => {
        expect(heroH1.querySelector('input')).toBeInTheDocument();
      });
      const inlineNameInput = heroH1.querySelector('input') as HTMLInputElement;
      fireEvent.change(inlineNameInput, { target: { value: 'Jordan Taylor' } });
      fireEvent.blur(inlineNameInput);

      await waitFor(() => {
        expect(screen.getByLabelText(/Your Full Name/i)).toHaveValue('Jordan Taylor');
      });

      fireEvent.click(screen.getByText('Software Developer & Creator'));
      await waitFor(() => {
        expect(headlineWrapper.querySelector('input')).toBeInTheDocument();
      });
      const inlineTitleInput = headlineWrapper.querySelector('input') as HTMLInputElement;
      fireEvent.change(inlineTitleInput, { target: { value: 'Principal Engineer' } });
      fireEvent.blur(inlineTitleInput);

      await waitFor(() => {
        expect(screen.getByLabelText(/Professional Title/i)).toHaveValue('Principal Engineer');
      });
    });

    it('toggles publish status between draft and published', async () => {
      (portfolioService.updatePortfolio as jest.Mock).mockResolvedValueOnce({
        ...mockPortfolio,
        isPublished: true
      });

      render(
        <PortfolioEditor
          initialPortfolio={{ ...mockPortfolio, isPublished: false }}
          onSave={jest.fn()}
          onBack={jest.fn()}
        />
      );

      expect(screen.getByText('Draft (Private)')).toBeInTheDocument();
      const publishBtn = screen.getByRole('button', { name: /Publish to Web/i });
      expect(publishBtn).toHaveClass('focus-ring');
      fireEvent.click(publishBtn);

      await waitFor(() => {
        expect(screen.getByText('Live & Published')).toBeInTheDocument();
      });
    });

    it('switches mobile pane between Workspace Form and Live Preview', () => {
      render(
        <PortfolioEditor
          initialPortfolio={mockPortfolio}
          onSave={jest.fn()}
          onBack={jest.fn()}
        />
      );

      const workspaceBtn = screen.getByRole('button', { name: /Workspace Form/i });
      const previewBtn = screen.getByRole('button', { name: /Live Preview/i });

      expect(workspaceBtn).toHaveAttribute('aria-pressed', 'true');
      expect(previewBtn).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(previewBtn);
      expect(previewBtn).toHaveAttribute('aria-pressed', 'true');
      expect(workspaceBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('validates file upload media types and enforces 5MB limit', async () => {
      const toast = require('react-hot-toast').default;

      render(
        <PortfolioEditor
          initialPortfolio={mockPortfolio}
          onSave={jest.fn()}
          onBack={jest.fn()}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Test 1: Uploading unsupported file type (e.g. text/plain)
      const invalidFile = new File(['dummy content'], 'document.txt', { type: 'text/plain' });
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/only jpeg, png, and webp/i)
      );

      // Test 2: Uploading oversized file (> 5MB)
      const oversizedFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'huge.png', {
        type: 'image/png'
      });
      fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/5mb limit/i)
      );
    });
  });

  describe('ImportProjectsModal Component', () => {
    it('fetches user resumes and allows importing projects into portfolio', async () => {
      const mockResumes = [
        {
          id: 'res-1',
          title: 'Software Engineer Resume',
          content: {
            sections: [
              {
                id: 'sec-proj',
                type: 'ProjectItem',
                title: 'Projects',
                content: [
                  {
                    id: 'p1',
                    name: 'Cloud Storage App',
                    description: 'High-concurrency file storage system.',
                    technologies: ['Go', 'Kubernetes'],
                    url: 'https://cloud.example.com'
                  }
                ]
              }
            ]
          }
        }
      ];

      (resumeService.getResumes as jest.Mock).mockResolvedValueOnce(mockResumes);

      const onImport = jest.fn();
      const onClose = jest.fn();

      render(
        <ImportProjectsModal
          isOpen={true}
          onClose={onClose}
          onImport={onImport}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      await waitFor(() => {
        expect(screen.getByText('Cloud Storage App')).toBeInTheDocument();
      });

      expect(screen.getByText('Software Engineer Resume')).toBeInTheDocument();

      const importBtn = screen.getByRole('button', { name: /Import Selected/i });
      fireEvent.click(importBtn);

      expect(onImport).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: 'Cloud Storage App',
            description: 'High-concurrency file storage system.',
            tags: ['Go', 'Kubernetes'],
            demoUrl: 'https://cloud.example.com'
          })
        ])
      );
      expect(onClose).toHaveBeenCalled();
    });

    it('renders skeleton while loading, empty state when no projects exist, traps Tab focus, and closes on Escape', async () => {
      let resolveResumes: (val: any[]) => void = () => {};
      (resumeService.getResumes as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveResumes = resolve;
        })
      );

      const onClose = jest.fn();
      render(
        <ImportProjectsModal
          isOpen={true}
          onClose={onClose}
          onImport={jest.fn()}
        />
      );

      expect(screen.getByTestId('import-projects-skeleton')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /Loading resume projects/i })).toBeInTheDocument();

      resolveResumes([]);

      await waitFor(() => {
        expect(screen.getByTestId('import-projects-empty-state')).toBeInTheDocument();
      });

      const closeBtn = screen.getByRole('button', { name: /Close modal/i });
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      const importBtn = screen.getByRole('button', { name: /Import Selected/i });
      expect(importBtn).toBeDisabled();

      // Focus trap: Shift+Tab from first focusable element wraps to last enabled element (Cancel)
      closeBtn.focus();
      expect(document.activeElement).toBe(closeBtn);
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(cancelBtn);

      // Focus trap: Tab from last enabled element wraps back to first focusable element (Close)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeBtn);

      // Escape closes modal
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('PortfolioPublicView Component (Unauthenticated Access)', () => {
    it('renders skeleton while loading and published portfolio content via slug', async () => {
      let resolvePortfolio: (val: IPortfolio) => void = () => {};
      (portfolioService.getPublicPortfolio as jest.Mock).mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePortfolio = resolve;
        })
      );

      const { container } = render(<PortfolioPublicView slug="alex-design" />);

      expect(screen.getByTestId('portfolio-public-skeleton')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /Loading portfolio/i })).toBeInTheDocument();

      resolvePortfolio(mockPortfolio);

      await waitFor(() => {
        expect(screen.getAllByText('Alex Rivera')[0]).toBeInTheDocument();
      });

      // Uses shared Container (.page-container)
      expect(container.querySelector('header .page-container')).toBeInTheDocument();
      expect(container.querySelector('main.page-container')).toBeInTheDocument();

      const publicHeroH1 = screen.getByRole('heading', { level: 1, name: 'Alex Rivera' });
      expect(publicHeroH1).toHaveClass('block');
      const publicHeadline = screen.getByTestId('portfolio-hero-headline');
      expect(publicHeadline).toHaveTextContent('Senior Product Designer');
      expect(publicHeadline).toHaveClass('block', 'text-primary-600');
      expect(publicHeadline).toHaveStyle({ color: '#2563EB' });

      expect(screen.getByText('Design System Platform')).toBeInTheDocument();
      expect(screen.getByText('A scalable multi-brand component library for modern web apps.')).toBeInTheDocument();
      expect(screen.getByText('Live Demo')).toBeInTheDocument();
      expect(screen.getByText('Source Code')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-hero-contacts')).toBeInTheDocument();

      // Open image preview lightbox and close with Escape
      fireEvent.click(screen.getByRole('button', { name: /Preview Design System Platform image/i }));
      expect(screen.getByRole('dialog', { name: /Project image preview/i })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: /Project image preview/i })).not.toBeInTheDocument();
    });

    it('renders error message when portfolio is unpublished or not found', async () => {
      (portfolioService.getPublicPortfolio as jest.Mock).mockRejectedValueOnce(
        new Error('This portfolio is currently private or does not exist.')
      );

      render(<PortfolioPublicView slug="private-slug" />);

      await waitFor(() => {
        expect(screen.getByText(/Portfolio Unavailable/i)).toBeInTheDocument();
      });

      expect(screen.getByTestId('portfolio-unavailable-card')).toBeInTheDocument();
      expect(screen.getByText(/This portfolio is currently private or does not exist./i)).toBeInTheDocument();
    });
  });
});
