import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import toast from 'react-hot-toast';
import Header, { SM_MEDIA_QUERY } from '../Header';
import App from '../../../App';

jest.mock('../../ResumeEditor', () => {
  return function MockResumeEditor() {
    return <div data-testid="mock-resume-editor">Resume Editor</div>;
  };
});

jest.mock('../../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn().mockResolvedValue([]),
    deleteResume: jest.fn(),
    createResume: jest.fn(),
    generateFromPrompt: jest.fn(),
  },
}));

function mockViewportWidth(widthPx: number) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();

  const evaluateQuery = (query: string, w: number): boolean => {
    const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    if (minMatch) {
      return w >= Number(minMatch[1]);
    }
    const maxMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    if (maxMatch) {
      return w <= Number(maxMatch[1]);
    }
    return false;
  };

  let currentWidth = widthPx;

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: currentWidth,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: evaluateQuery(query, currentWidth),
      media: query,
      onchange: null,
      addListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
        if (query === SM_MEDIA_QUERY) listeners.add(cb);
      }),
      removeListener: jest.fn((cb: (event: MediaQueryListEvent) => void) => {
        listeners.delete(cb);
      }),
      addEventListener: jest.fn((_type: string, cb: (event: MediaQueryListEvent) => void) => {
        if (query === SM_MEDIA_QUERY) listeners.add(cb);
      }),
      removeEventListener: jest.fn((_type: string, cb: (event: MediaQueryListEvent) => void) => {
        listeners.delete(cb);
      }),
      dispatchEvent: jest.fn(),
    })),
  });

  return {
    resizeTo(nextWidth: number) {
      currentWidth = nextWidth;
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: currentWidth,
      });
      const matches = evaluateQuery(SM_MEDIA_QUERY, currentWidth);
      listeners.forEach((cb) =>
        cb({ matches, media: SM_MEDIA_QUERY } as MediaQueryListEvent)
      );
    },
  };
}

describe('Header mobile layout and navigation', () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    act(() => {
      toast.remove();
    });
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('renders short wordmark, reachable Logout, and hamburger menu containing all three tabs at 375px', () => {
    mockViewportWidth(375);
    const onTabChange = jest.fn();
    const onLogout = jest.fn();

    render(
      <Header
        showLogout
        onLogout={onLogout}
        activeTab="job-match"
        onTabChange={onTabChange}
      />
    );

    // Header stays visible on screen while carrying print:hidden for print export
    expect(screen.getByRole('banner')).toHaveClass('print:hidden');

    // Short wordmark shown below sm instead of wrapping full title
    expect(screen.getByText('Smart CV')).toBeInTheDocument();
    expect(screen.queryByText('Smart CV & Portfolio')).not.toBeInTheDocument();

    // Logout is directly reachable in the top bar
    const logoutBtn = screen.getByRole('button', { name: /logout/i });
    expect(logoutBtn).toBeInTheDocument();
    fireEvent.click(logoutBtn);
    expect(onLogout).toHaveBeenCalledTimes(1);

    // Hamburger toggle starts closed
    const menuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^resumes$/i })).not.toBeInTheDocument();

    // Opening the menu reveals all three tabs with aria-current on the active tab
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

    const resumesTab = screen.getByRole('button', { name: /^resumes$/i });
    const jobMatchTab = screen.getByRole('button', { name: /^job match$/i });
    const portfoliosTab = screen.getByRole('button', { name: /^portfolios$/i });

    expect(resumesTab).toBeInTheDocument();
    expect(jobMatchTab).toBeInTheDocument();
    expect(portfoliosTab).toBeInTheDocument();
    expect(jobMatchTab).toHaveAttribute('aria-current', 'page');
    expect(resumesTab).not.toHaveAttribute('aria-current');

    // Selecting a tab fires onTabChange and closes the menu
    fireEvent.click(portfoliosTab);
    expect(onTabChange).toHaveBeenCalledWith('portfolios');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^portfolios$/i })).not.toBeInTheDocument();

    // Toggling open and clicking the toggle button again closes the menu
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('button', { name: /^resumes$/i }));
    expect(onTabChange).toHaveBeenCalledWith('resumes');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuToggle);
    fireEvent.click(screen.getByRole('button', { name: /^job match$/i }));
    expect(onTabChange).toHaveBeenCalledWith('job-match');
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not render hamburger toggle on unauthenticated Header without onTabChange', () => {
    mockViewportWidth(375);
    render(<Header />);

    expect(screen.getByText('Smart CV')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle navigation menu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /logout/i })).not.toBeInTheDocument();
  });

  it('closes the mobile menu on Escape and returns focus to the toggle button', () => {
    mockViewportWidth(375);
    const onTabChange = jest.fn();

    render(
      <Header
        showLogout
        onLogout={jest.fn()}
        activeTab="resumes"
        onTabChange={onTabChange}
      />
    );

    const menuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

    const resumesTab = screen.getByRole('button', { name: /^resumes$/i });
    resumesTab.focus();
    expect(document.activeElement).toBe(resumesTab);

    fireEvent.keyDown(resumesTab, { key: 'Escape' });

    expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: /^resumes$/i })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(menuToggle);
  });

  it('switches cleanly to inline tabs and full wordmark when resized above sm (640px)', () => {
    const viewport = mockViewportWidth(320);
    render(
      <Header
        showLogout
        onLogout={jest.fn()}
        activeTab="resumes"
        onTabChange={jest.fn()}
      />
    );

    const menuToggle = screen.getByRole('button', { name: /toggle navigation menu/i });
    fireEvent.click(menuToggle);
    expect(menuToggle).toHaveAttribute('aria-expanded', 'true');

    act(() => {
      viewport.resizeTo(768);
    });

    expect(screen.getByText('Smart CV & Portfolio')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /toggle navigation menu/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^resumes$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^job match$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^portfolios$/i })).toBeInTheDocument();
  });

  it('positions toasts at bottom-center on mobile and top-center on desktop instead of top-right', () => {
    const viewport = mockViewportWidth(375);
    const { container } = render(<App />);

    act(() => {
      toast.success('Login successful');
    });

    const toastMessage = screen.getByText('Login successful');
    // Walk up to the positioned toast wrapper rendered by react-hot-toast
    const mobileWrapper = Array.from(container.querySelectorAll('div')).find(
      (el) => el.contains(toastMessage) && el.style.justifyContent === 'center' && el.style.bottom === '0px'
    );
    expect(mobileWrapper).toBeDefined();
    expect(mobileWrapper?.style.justifyContent).not.toBe('flex-end');

    act(() => {
      viewport.resizeTo(1024);
    });

    const desktopWrapper = Array.from(container.querySelectorAll('div')).find(
      (el) => el.contains(toastMessage) && el.style.justifyContent === 'center' && el.style.top === '0px'
    );
    expect(desktopWrapper).toBeDefined();
  });
});
