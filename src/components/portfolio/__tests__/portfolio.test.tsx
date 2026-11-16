import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PortfolioList } from '../PortfolioList';
import { PortfolioEditor } from '../PortfolioEditor';
import { PortfolioPublicView } from '../PortfolioPublicView';
import { ImportProjectsModal } from '../ImportProjectsModal';
import { portfolioService } from '../../../services/portfolio.service';
import { resumeService } from '../../../services/resume.service';
import { IPortfolio, defaultPortfolio } from '../../../types/portfolio';

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
    bio: 'Designing user-centered enterprise experiences.'
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
    }
  ],
  sectionOrder: ['projects', 'skills']
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

      await waitFor(() => {
        expect(screen.getByText('Alex Designer Portfolio')).toBeInTheDocument();
      });

      expect(screen.getByText('/p/alex-design')).toBeInTheDocument();
      expect(screen.getByText('Published')).toBeInTheDocument();
    });

    it('renders empty state when user has no portfolios', async () => {
      (portfolioService.getPortfolios as jest.Mock).mockResolvedValueOnce([]);

      const onEdit = jest.fn();
      const onNew = jest.fn();

      render(<PortfolioList onEditPortfolio={onEdit} onNewPortfolio={onNew} />);

      await waitFor(() => {
        expect(screen.getByText(/No portfolios yet/i)).toBeInTheDocument();
      });

      const createBtn = screen.getByRole('button', { name: /Build My First Portfolio/i });
      fireEvent.click(createBtn);
      expect(onNew).toHaveBeenCalledTimes(1);
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

      // Check left panel (workspace controls)
      expect(screen.getByText('Basics & Hero Profile')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Sections Order')).toBeInTheDocument();

      // Check right panel (live canvas header & canvas content)
      expect(screen.getByText(/Live Visual Preview Canvas/i)).toBeInTheDocument();
      expect(screen.getByText('Alex Rivera')).toBeInTheDocument();
      expect(screen.getByText('Senior Product Designer')).toBeInTheDocument();
    });

    it('toggles publish status between draft and published', () => {
      render(
        <PortfolioEditor
          initialPortfolio={{ ...mockPortfolio, isPublished: false }}
          onSave={jest.fn()}
          onBack={jest.fn()}
        />
      );

      expect(screen.getByText('Draft (Private)')).toBeInTheDocument();
      const publishBtn = screen.getByRole('button', { name: /Publish to Web/i });
      fireEvent.click(publishBtn);
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
  });

  describe('PortfolioPublicView Component (Unauthenticated Access)', () => {
    it('renders published portfolio content for public visitors via slug', async () => {
      (portfolioService.getPublicPortfolio as jest.Mock).mockResolvedValueOnce(mockPortfolio);

      render(<PortfolioPublicView slug="alex-design" />);

      await waitFor(() => {
        expect(screen.getAllByText('Alex Rivera')[0]).toBeInTheDocument();
      });

      expect(screen.getByText('Senior Product Designer')).toBeInTheDocument();
      expect(screen.getByText('Design System Platform')).toBeInTheDocument();
      expect(screen.getByText('A scalable multi-brand component library for modern web apps.')).toBeInTheDocument();
      expect(screen.getByText('Live Demo')).toBeInTheDocument();
    });

    it('renders error message when portfolio is unpublished or not found', async () => {
      (portfolioService.getPublicPortfolio as jest.Mock).mockRejectedValueOnce(
        new Error('This portfolio is currently private or does not exist.')
      );

      render(<PortfolioPublicView slug="private-slug" />);

      await waitFor(() => {
        expect(screen.getByText(/Portfolio Unavailable/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/This portfolio is currently private or does not exist./i)).toBeInTheDocument();
    });
  });
});
