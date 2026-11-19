import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from '../../Login';
import Signup from '../../Signup';
import Header from '../../common/Header';
import HomePage from '../../HomePage';
import ResumeList from '../../ResumeList';
import { resumeService } from '../../../services/resume.service';

jest.mock('../../ResumeEditor', () => {
  return function MockResumeEditor() {
    return <div data-testid="mock-resume-editor">Resume Editor</div>;
  };
});

jest.mock('../../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn(),
    deleteResume: jest.fn(),
    createResume: jest.fn(),
    generateFromPrompt: jest.fn(),
  },
}));

describe('UI Polish: Auth, Shared Header Container, and Resume Dashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth Screens (Login & Signup)', () => {
    it('offsets the fixed header and centers the Login card with accessible password toggle', () => {
      const onToggleAuth = jest.fn();
      const onLoginSuccess = jest.fn();
      const { container } = render(
        <Login onToggleAuth={onToggleAuth} onLoginSuccess={onLoginSuccess} />
      );

      // Outer wrapper clears the 64px (h-16) fixed header
      const rootWrapper = container.firstElementChild as HTMLElement;
      expect(rootWrapper).toHaveClass('pt-16', 'flex', 'flex-col', 'min-h-screen');

      const main = container.querySelector('main');
      expect(main).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');

      expect(screen.getByTestId('auth-card')).toBeInTheDocument();

      // Password toggle works and has accessible label + focus ring
      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const togglePasswordBtn = screen.getByRole('button', { name: /show password/i });
      expect(togglePasswordBtn).toHaveClass('focus-ring');
      fireEvent.click(togglePasswordBtn);
      expect(passwordInput.type).toBe('text');

      fireEvent.click(screen.getByRole('button', { name: /sign up now/i }));
      expect(onToggleAuth).toHaveBeenCalledTimes(1);
    });

    it('offsets the fixed header and centers the Signup card with accessible password toggles', () => {
      const onToggleAuth = jest.fn();
      const { container } = render(<Signup onToggleAuth={onToggleAuth} />);

      const rootWrapper = container.firstElementChild as HTMLElement;
      expect(rootWrapper).toHaveClass('pt-16', 'flex', 'flex-col', 'min-h-screen');

      const main = container.querySelector('main');
      expect(main).toHaveClass('flex-1', 'flex', 'items-center', 'justify-center');

      const passwordToggle = screen.getByRole('button', { name: /^show password$/i });
      const confirmToggle = screen.getByRole('button', { name: /show confirm password/i });
      expect(passwordToggle).toHaveClass('focus-ring');
      expect(confirmToggle).toHaveClass('focus-ring');

      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(onToggleAuth).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shared Container & Header Focus Rings', () => {
    it('uses the shared page-container in both Header and HomePage content', async () => {
      (resumeService.getResumes as jest.Mock).mockResolvedValueOnce([]);

      const { container } = render(<HomePage />);

      const headerContainer = container.querySelector('header .page-container');
      const mainContainer = container.querySelector('main.page-container');

      expect(headerContainer).toBeInTheDocument();
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('pt-24');

      await waitFor(() => {
        expect(screen.getByTestId('resume-empty-state')).toBeInTheDocument();
      });
    });

    it('applies focus rings and aria-current to Header tabs and Logout button', () => {
      const onTabChange = jest.fn();
      const onLogout = jest.fn();
      render(
        <Header
          showLogout
          onLogout={onLogout}
          activeTab="resumes"
          onTabChange={onTabChange}
        />
      );

      const resumesTab = screen.getByRole('button', { name: /resumes/i });
      const jobMatchTab = screen.getByRole('button', { name: /job match/i });
      const logoutBtn = screen.getByRole('button', { name: /logout/i });

      expect(resumesTab).toHaveAttribute('aria-current', 'page');
      expect(resumesTab).toHaveClass('focus-ring');
      expect(jobMatchTab).toHaveClass('focus-ring');
      expect(logoutBtn).toHaveClass('focus-ring');
    });
  });

  describe('Dashboard Loading Skeleton, Empty State & Resume Cards', () => {
    it('renders skeleton cards while resumes are loading', () => {
      (resumeService.getResumes as jest.Mock).mockReturnValueOnce(
        new Promise(() => {})
      );

      render(<ResumeList onEditResume={jest.fn()} />);

      expect(screen.getByTestId('resume-list-skeleton')).toBeInTheDocument();
      expect(screen.getByRole('status', { name: /loading resumes/i })).toBeInTheDocument();
    });

    it('renders empty state with New Resume and AI Generate CTAs and 0 resumes count', async () => {
      (resumeService.getResumes as jest.Mock).mockResolvedValueOnce([]);

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByTestId('resume-empty-state')).toBeInTheDocument();
      });

      expect(screen.getByRole('heading', { name: 'My Resumes' })).toBeInTheDocument();
      expect(screen.getByTestId('resumes-count-subtitle')).toHaveTextContent(/0 resumes/i);
      expect(screen.getByRole('button', { name: /new resume/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ai generate/i })).toBeInTheDocument();
    });

    it('renders resume cards with preview initials, template name, last updated, and confirm-based delete', async () => {
      const mockResumes = [
        {
          id: 'res-1',
          userId: 'u-1',
          title: 'Senior Frontend CV',
          templateId: 'professional',
          createdAt: '2026-02-01T10:00:00.000Z',
          updatedAt: '2026-03-15T12:00:00.000Z',
          content: {
            basics: {
              name: 'Anumula Ashok',
              label: 'Staff Frontend Engineer',
            },
            sections: [],
            sectionOrder: [],
          },
        },
        {
          id: 'res-2',
          userId: 'u-1',
          title: 'Product Engineer CV',
          templateId: 'modern',
          createdAt: '2026-02-10T10:00:00.000Z',
          updatedAt: '2026-03-20T12:00:00.000Z',
          content: {
            basics: {
              name: 'Jane Doe',
              label: 'Product Engineer',
            },
            sections: [],
            sectionOrder: [],
          },
        },
      ];

      (resumeService.getResumes as jest.Mock).mockResolvedValueOnce(mockResumes);
      (resumeService.deleteResume as jest.Mock).mockResolvedValueOnce(undefined);
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValueOnce(true);

      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getAllByTestId('resume-card')).toHaveLength(2);
      });

      // Live resume count subtitle
      expect(screen.getByTestId('resumes-count-subtitle')).toHaveTextContent(/2 resumes/i);

      // Card preview displays initials & template labels
      expect(screen.getByText('AA')).toBeInTheDocument();
      expect(screen.getByText('JD')).toBeInTheDocument();
      expect(screen.getByText('Professional')).toBeInTheDocument();
      expect(screen.getByText('Modern')).toBeInTheDocument();

      // Demoted Delete icon button triggers confirm flow and updates count
      const deleteButtons = screen.getAllByRole('button', { name: /delete resume/i });
      expect(deleteButtons).toHaveLength(2);

      fireEvent.click(deleteButtons[0]);
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this resume?');

      await waitFor(() => {
        expect(resumeService.deleteResume).toHaveBeenCalledWith('res-1');
      });

      await waitFor(() => {
        expect(screen.getAllByTestId('resume-card')).toHaveLength(1);
      });
      expect(screen.getByTestId('resumes-count-subtitle')).toHaveTextContent(/1 resume\b/i);

      confirmSpy.mockRestore();
    });
  });
});
