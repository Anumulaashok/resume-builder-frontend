import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import ResumeEditor from '../ResumeEditor';
import ResumeCheckerDrawer from '../ResumeCheckerDrawer';
import { checkResume } from '../../utils/resumeChecker';
import { IResume, SectionType } from '../../types/resume';

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

jest.mock('../../services/resume.service', () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
    exportResumeTxt: jest.fn(),
  },
}));

function buildEditorResumeWithIssues(): IResume {
  return {
    _id: 'res-ats-ui-1',
    title: 'ATS Checker UI Test Resume',
    templateId: 'creative-sidebar', // multi-column warning
    content: {
      basics: {
        name: 'Morgan Vance',
        label: 'Backend Engineer',
        email: '', // critical: contact-missing-email
        phone: '+1 415-555-0144',
        url: 'https://github.com/morganvance',
        image: 'https://example.com/photo.jpg', // tip: ats-photo-present for US
        location: {
          city: 'Seattle',
          countryCode: 'US',
        },
        summary: 'Short summary.', // warning: summary-too-short
      },
      sections: [
        {
          id: 'sec-work-1',
          type: SectionType.WORK,
          title: 'Work Experience',
          enabled: true,
          content: [
            {
              id: 'work-item-1',
              company: 'Nimbus Data',
              position: 'Software Engineer',
              startDate: 'Jan 2023',
              current: true,
              description: 'Worked on backend services.', // weak opener + <2 bullets + <40% metrics
            },
          ],
        },
        {
          id: 'sec-skills-1',
          type: SectionType.SKILLS,
          title: 'Skills',
          enabled: true,
          content: [
            {
              id: 'skill-1',
              name: 'Languages',
              subSkills: ['TypeScript', 'Python', 'SQL'],
            },
            {
              id: 'skill-2',
              name: 'Cloud',
              subSkills: ['AWS', 'Docker', 'Kubernetes'],
            },
          ],
        },
      ],
      sectionOrder: ['sec-work-1', 'sec-skills-1'],
    },
  };
}

describe('ResumeCheckerDrawer & Editor Preview Toolbar Integration', () => {
  const originalScrollIntoView = Element.prototype.scrollIntoView;

  beforeEach(() => {
    jest.clearAllMocks();
    Element.prototype.scrollIntoView = jest.fn();
  });

  afterEach(() => {
    Element.prototype.scrollIntoView = originalScrollIntoView;
    jest.useRealTimers();
  });

  it('renders the ATS check button with accessible score badge right next to Download ATS text in the preview toolbar', () => {
    render(
      <ResumeEditor
        initialResume={buildEditorResumeWithIssues()}
        onBack={jest.fn()}
      />
    );

    const toolbar = screen.getByTestId('resume-preview-toolbar');
    const exportTxtBtn = within(toolbar).getByTestId('export-txt-btn');
    const atsCheckBtn = within(toolbar).getByTestId('ats-check-btn');
    const scoreBadge = within(atsCheckBtn).getByTestId('ats-score-badge');

    expect(atsCheckBtn).toHaveTextContent(/ATS check/i);
    expect(scoreBadge).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/ATS score \d+ out of 100, grade [ABCDF]/)
    );

    // Verify ATS check button sits immediately next to Download ATS text in DOM order
    expect(atsCheckBtn.nextElementSibling).toBe(exportTxtBtn);
  });

  it('opens and closes the accessible drawer, groups issues by severity (Critical, Warnings, Tips), and traps keyboard focus', () => {
    render(
      <ResumeEditor
        initialResume={buildEditorResumeWithIssues()}
        onBack={jest.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const triggerBtn = screen.getByTestId('ats-check-btn');
    fireEvent.click(triggerBtn);

    const dialog = screen.getByTestId('ats-checker-drawer');
    expect(dialog).toHaveAttribute('role', 'dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Overall score ring + all 6 category scores rendered
    expect(
      within(dialog).getByTestId('ats-overall-score-ring')
    ).toBeInTheDocument();
    ['contact', 'summary', 'experience', 'skills', 'language', 'ats'].forEach(
      (catId) => {
        expect(
          within(dialog).getByTestId(`ats-category-card-${catId}`)
        ).toBeInTheDocument();
        expect(
          within(dialog).getByTestId(`ats-category-score-${catId}`)
        ).toHaveTextContent(/\/100$/);
      }
    );

    // Issues grouped into Critical, Warnings, and Tips
    const criticalGroup = within(dialog).getByTestId(
      'ats-severity-group-critical'
    );
    const warningGroup = within(dialog).getByTestId(
      'ats-severity-group-warning'
    );
    const tipGroup = within(dialog).getByTestId('ats-severity-group-tip');

    expect(within(criticalGroup).getByText('Critical')).toBeInTheDocument();
    expect(within(warningGroup).getByText('Warnings')).toBeInTheDocument();
    expect(within(tipGroup).getByText('Tips')).toBeInTheDocument();

    // Expandable severity group toggle
    const criticalToggle = within(dialog).getByTestId(
      'ats-severity-toggle-critical'
    );
    expect(criticalToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(criticalToggle);
    expect(criticalToggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(criticalToggle);
    expect(criticalToggle).toHaveAttribute('aria-expanded', 'true');

    // Focus trap: Tab on last focusable wraps to first; Shift+Tab on first wraps to last
    const focusableButtons = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled])'
      )
    );
    expect(focusableButtons.length).toBeGreaterThan(2);
    const firstFocusable = focusableButtons[0];
    const lastFocusable = focusableButtons[focusableButtons.length - 1];

    lastFocusable.focus();
    expect(document.activeElement).toBe(lastFocusable);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstFocusable);

    firstFocusable.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastFocusable);

    // Escape closes the drawer
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(
      screen.queryByTestId('ats-checker-drawer')
    ).not.toBeInTheDocument();
  });

  it('scrolls to and highlights the matching section/item in the form when clicking an issue', () => {
    const scrollSpy = jest.fn();
    Element.prototype.scrollIntoView = scrollSpy;

    const { container } = render(
      <ResumeEditor
        initialResume={buildEditorResumeWithIssues()}
        onBack={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('ats-check-btn'));

    // Click an experience item issue with sectionId='sec-work-1' and itemId='work-item-1'
    const itemIssueBtn = screen.getByTestId(
      'ats-issue-btn-experience-weak-opener-work-item-1'
    );
    fireEvent.click(itemIssueBtn);

    expect(scrollSpy).toHaveBeenCalled();

    // Fix suggestion expands on click
    expect(
      screen.getByTestId('ats-issue-fix-experience-weak-opener-work-item-1')
    ).toBeInTheDocument();

    // Target item row in the form receives data-highlighted="true"
    const highlightedItem = container.querySelector(
      '[data-item-id="work-item-1"]'
    );
    expect(highlightedItem).not.toBeNull();
    expect(highlightedItem).toHaveAttribute('data-highlighted', 'true');

    // Clicking a contact issue highlights the Basic Information card
    const emailIssueBtn = screen.getByTestId(
      'ats-issue-btn-contact-missing-email'
    );
    fireEvent.click(emailIssueBtn);

    const basicsCard = container.querySelector('[data-section-id="basics"]');
    expect(basicsCard).toHaveAttribute('data-highlighted', 'true');

    // Clicking "Edit field" on the email issue closes drawer and focuses the Email input
    const editEmailBtn = screen.getByTestId(
      'ats-issue-edit-btn-contact-missing-email'
    );
    fireEvent.click(editEmailBtn);

    expect(
      screen.queryByTestId('ats-checker-drawer')
    ).not.toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText('Email'));
  });

  it('recomputes the ATS score live with a 300ms debounce as the user edits the form', () => {
    jest.useFakeTimers();

    render(
      <ResumeEditor
        initialResume={buildEditorResumeWithIssues()}
        onBack={jest.fn()}
      />
    );

    const badge = screen.getByTestId('ats-score-badge');
    const initialScore = Number(badge.textContent);
    expect(Number.isNaN(initialScore)).toBe(false);

    // Fix the missing email AND expand the short summary to 35+ words
    const emailInput = screen.getByLabelText('Email');
    const summaryTextarea = screen.getByLabelText('Professional Summary');

    fireEvent.change(emailInput, {
      target: { value: 'morgan.vance@example.com' },
    });
    fireEvent.change(summaryTextarea, {
      target: {
        value:
          'Senior Backend Engineer with 7+ years of experience building fault-tolerant distributed services, cloud-native data pipelines, and low-latency APIs that reduced infrastructure spend by 38% across high-growth SaaS platforms.',
      },
    });

    // Before 300ms debounce window elapses, score remains unchanged
    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(Number(screen.getByTestId('ats-score-badge').textContent)).toBe(
      initialScore
    );

    // After 300ms debounce completes, score increases live
    act(() => {
      jest.advanceTimersByTime(200);
    });
    const updatedScore = Number(screen.getByTestId('ats-score-badge').textContent);
    expect(updatedScore).toBeGreaterThan(initialScore);
  });

  it('supports closing via backdrop click in standalone ResumeCheckerDrawer', () => {
    const onClose = jest.fn();
    const result = checkResume(buildEditorResumeWithIssues());

    render(
      <ResumeCheckerDrawer isOpen result={result} onClose={onClose} />
    );

    fireEvent.click(screen.getByTestId('ats-checker-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
