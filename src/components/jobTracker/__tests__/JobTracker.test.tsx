import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import JobTracker, { computeBoardMove, formatDaysSinceApplied } from '../JobTracker';
import HomePage from '../../HomePage';
import { applicationService } from '../../../services/application.service';
import { coverLetterService } from '../../../services/coverLetter.service';
import { resumeService } from '../../../services/resume.service';
import { IJobApplication } from '../../../types/application';
import { ICoverLetter } from '../../../types/coverLetter';

jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../../services/application.service', () => ({
  applicationService: {
    getApplications: jest.fn(),
    createApplication: jest.fn(),
    updateApplication: jest.fn(),
    deleteApplication: jest.fn(),
    reorderApplications: jest.fn(),
  },
}));

jest.mock('../../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn(),
    analyzeJobMatch: jest.fn(),
    updateResume: jest.fn(),
    deleteResume: jest.fn(),
    createResume: jest.fn(),
    generateFromPrompt: jest.fn(),
  },
}));

jest.mock('../../../services/coverLetter.service', () => ({
  coverLetterService: {
    getCoverLetters: jest.fn(),
    getCoverLetterById: jest.fn(),
    createCoverLetter: jest.fn(),
    updateCoverLetter: jest.fn(),
    deleteCoverLetter: jest.fn(),
    generateCoverLetter: jest.fn(),
    exportCoverLetterTxt: jest.fn(),
  },
}));

const mockCoverLetters: ICoverLetter[] = [
  {
    id: '507f1f77bcf86cd7994390a1',
    _id: '507f1f77bcf86cd7994390a1',
    title: 'Stripe Senior Frontend Cover Letter',
    company: 'Stripe',
    jobTitle: 'Senior Frontend Engineer',
    tone: 'formal',
    body: 'Dear Stripe Hiring Team...',
  },
  {
    id: '507f1f77bcf86cd7994390a2',
    _id: '507f1f77bcf86cd7994390a2',
    title: 'Vercel Design Systems Cover Letter',
    company: 'Vercel',
    jobTitle: 'Design Engineer',
    tone: 'conversational',
    body: 'Hello Vercel Team...',
  },
];

const mockResumes: any[] = [
  {
    id: '507f1f77bcf86cd799439011',
    _id: '507f1f77bcf86cd799439011',
    title: 'Frontend Resume',
    content: { basics: { name: 'Jane Doe', email: 'jane@example.com' }, sections: [], sectionOrder: [] },
  },
  {
    id: '507f1f77bcf86cd799439022',
    _id: '507f1f77bcf86cd799439022',
    title: 'Staff Systems Resume',
    content: { basics: { name: 'Jane Doe', email: 'jane@example.com' }, sections: [], sectionOrder: [] },
  },
];

function makeIsoDaysAgo(daysAgo: number): string {
  const now = new Date();
  const utc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo));
  return utc.toISOString();
}

const sampleApplications = (): IJobApplication[] => [
  {
    id: 'app-1',
    _id: 'app-1',
    company: 'Stripe',
    role: 'Senior Frontend Engineer',
    status: 'applied',
    order: 0,
    appliedAt: makeIsoDaysAgo(2),
    salary: '$185k',
    location: 'San Francisco, CA',
    resumeId: '507f1f77bcf86cd799439011',
    jobDescription: 'Build Stripe checkout experiences with React, TypeScript, and GraphQL.',
    contacts: [{ name: 'Jordan Kim', email: 'jordan@stripe.example.com', role: 'Recruiter' }],
    nextActionAt: makeIsoDaysAgo(-2),
    nextActionNote: 'Follow up with Jordan on take-home review',
  },
  {
    id: 'app-2',
    _id: 'app-2',
    company: 'Vercel',
    role: 'Design Engineer',
    status: 'applied',
    order: 1,
    appliedAt: makeIsoDaysAgo(10),
    resumeId: '507f1f77bcf86cd799439022',
    jobDescription: '',
    contacts: [],
    nextActionAt: null,
    nextActionNote: '',
  },
  {
    id: 'app-3',
    _id: 'app-3',
    company: 'Linear',
    role: 'Product Engineer',
    status: 'interview',
    order: 0,
    appliedAt: makeIsoDaysAgo(5),
    resumeId: '507f1f77bcf86cd799439011',
    jobDescription: 'Build fast collaborative workflows with TypeScript and WebSockets.',
    contacts: [],
    nextActionAt: makeIsoDaysAgo(0),
    nextActionNote: 'Prepare system design walk-through',
  },
  {
    id: 'app-4',
    _id: 'app-4',
    company: 'Datadog',
    role: 'UI Platform Engineer',
    status: 'wishlist',
    order: 0,
    appliedAt: null,
    resumeId: null,
    jobDescription: '',
    contacts: [],
    nextActionAt: null,
    nextActionNote: '',
  },
];

describe('JobTracker helpers', () => {
  it('computes cross-column and within-column board moves cleanly', () => {
    const initial = sampleApplications();

    // Within-column reorder: move app-2 above app-1 in 'applied'
    const withinMove = computeBoardMove(initial, 'app-2', 'applied', 0);
    const appliedCards = withinMove.nextApplications.filter((a) => a.status === 'applied');
    expect(appliedCards.map((a) => a.id)).toEqual(['app-2', 'app-1']);
    expect(withinMove.moves).toEqual([
      { id: 'app-2', status: 'applied', order: 0 },
      { id: 'app-1', status: 'applied', order: 1 },
    ]);

    // Cross-column move: move app-1 from 'applied' to 'interview'
    const crossMove = computeBoardMove(initial, 'app-1', 'interview');
    expect(crossMove.moves).toEqual([
      { id: 'app-2', status: 'applied', order: 0 },
      { id: 'app-1', status: 'interview', order: 1 },
    ]);
  });

  it('formats days since applied accurately across calendar boundaries', () => {
    const refNow = new Date(2026, 10, 19, 12, 0, 0); // Nov 19, 2026
    expect(formatDaysSinceApplied(null, refNow)).toBe('Not applied yet');
    expect(formatDaysSinceApplied('2026-11-19T00:00:00.000Z', refNow)).toBe('Applied today');
    expect(formatDaysSinceApplied('2026-11-18T00:00:00.000Z', refNow)).toBe('1 day since applied');
    expect(formatDaysSinceApplied('2026-11-14T00:00:00.000Z', refNow)).toBe('5 days since applied');
  });
});

describe('<JobTracker />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeService.getResumes as jest.Mock).mockResolvedValue(mockResumes);
    (coverLetterService.getCoverLetters as jest.Mock).mockResolvedValue(mockCoverLetters);
    (applicationService.getApplications as jest.Mock).mockResolvedValue(sampleApplications());
    (applicationService.reorderApplications as jest.Mock).mockResolvedValue(undefined);
  });

  it('shows loading skeleton while fetching and renders error retry state on failure', async () => {
    (applicationService.getApplications as jest.Mock).mockRejectedValueOnce(
      new Error('Network unavailable')
    );

    render(<JobTracker onCheckMatch={jest.fn()} />);
    expect(screen.getByTestId('job-tracker-skeleton')).toBeInTheDocument();

    expect(await screen.findByTestId('job-tracker-error')).toBeInTheDocument();
    expect(screen.getByText('Network unavailable')).toBeInTheDocument();

    // Retry succeeds
    (applicationService.getApplications as jest.Mock).mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByTestId('job-tracker-empty-state')).toBeInTheDocument();
  });

  it('renders header KPI stats, upcoming next-actions list, 5 columns, and card metadata', async () => {
    render(<JobTracker onCheckMatch={jest.fn()} />);

    expect(await screen.findByText('Stripe')).toBeInTheDocument();

    // Header stats: 4 total, 2 applied within last 7 days (Stripe 2d ago + Linear 5d ago),
    // 3 non-wishlist submitted, 1 in interview/offer => 33% interview rate
    expect(within(screen.getByTestId('stat-total')).getByText('4')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-applied-week')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-interview-rate')).getByText('33%')).toBeInTheDocument();

    // Upcoming next-actions list sorted chronologically (Today before +2d)
    const actionsSection = screen.getByTestId('upcoming-next-actions');
    const actionItems = within(actionsSection).getAllByRole('listitem');
    expect(actionItems).toHaveLength(2);
    expect(actionItems[0]).toHaveTextContent('Prepare system design walk-through');
    expect(actionItems[1]).toHaveTextContent('Follow up with Jordan on take-home review');

    // All 5 columns exist
    expect(screen.getByTestId('kanban-column-wishlist')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-applied')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-interview')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-offer')).toBeInTheDocument();
    expect(screen.getByTestId('kanban-column-rejected')).toBeInTheDocument();

    // Card shows company, role, days since applied, linked resume
    const stripeCard = screen.getByTestId('application-card-app-1');
    expect(stripeCard).toHaveTextContent('Stripe');
    expect(stripeCard).toHaveTextContent('Senior Frontend Engineer');
    expect(stripeCard).toHaveTextContent('2 days since applied');
    expect(stripeCard).toHaveTextContent('Frontend Resume');
  });

  it('supports native HTML5 drag-and-drop between columns and within a column', async () => {
    render(<JobTracker onCheckMatch={jest.fn()} />);
    await screen.findByText('Stripe');

    // Drag Vercel above Stripe within the 'applied' column
    const vercelCard = screen.getByTestId('application-card-app-2');
    const stripeCard = screen.getByTestId('application-card-app-1');

    fireEvent.dragStart(vercelCard);
    fireEvent.dragOver(stripeCard);
    fireEvent.drop(stripeCard);
    fireEvent.dragEnd(vercelCard);

    await waitFor(() => {
      expect(applicationService.reorderApplications).toHaveBeenCalledWith([
        { id: 'app-2', status: 'applied', order: 0 },
        { id: 'app-1', status: 'applied', order: 1 },
      ]);
    });

    // Drag Linear from 'interview' to 'offer' column
    const linearCard = screen.getByTestId('application-card-app-3');
    const offerColumn = screen.getByTestId('kanban-column-offer');

    fireEvent.dragStart(linearCard);
    fireEvent.dragOver(offerColumn);
    fireEvent.drop(offerColumn);
    fireEvent.dragEnd(linearCard);

    await waitFor(() => {
      expect(applicationService.reorderApplications).toHaveBeenLastCalledWith([
        { id: 'app-3', status: 'offer', order: 0 },
      ]);
    });
    expect(within(offerColumn).getByText('Linear')).toBeInTheDocument();
  });

  it('supports keyboard alternative Move Left/Right buttons and rolls back optimistic update on error', async () => {
    render(<JobTracker onCheckMatch={jest.fn()} />);
    await screen.findByText('Datadog');

    // Datadog starts in Wishlist -> Move right to Applied succeeds
    fireEvent.click(screen.getByRole('button', { name: /move datadog right to applied/i }));

    const appliedCol = screen.getByTestId('kanban-column-applied');
    expect(within(appliedCol).getByText('Datadog')).toBeInTheDocument();
    await waitFor(() => {
      expect(applicationService.reorderApplications).toHaveBeenCalledWith([
        { id: 'app-4', status: 'applied', order: 2 },
      ]);
    });

    // Now simulate server failure when moving Linear right to Offer -> optimistic move rolls back!
    let rejectReorder!: (err: Error) => void;
    (applicationService.reorderApplications as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectReorder = reject;
        })
    );

    fireEvent.click(screen.getByRole('button', { name: /move linear right to offer/i }));

    // Optimistically appears in Offer immediately
    const offerCol = screen.getByTestId('kanban-column-offer');
    const interviewCol = screen.getByTestId('kanban-column-interview');
    expect(within(offerCol).getByText('Linear')).toBeInTheDocument();

    // Reject API call -> rolls back to Interview column
    rejectReorder(new Error('Server timeout'));

    await waitFor(() => {
      expect(within(interviewCol).getByText('Linear')).toBeInTheDocument();
    });
    expect(within(offerCol).queryByText('Linear')).not.toBeInTheDocument();
  });

  it('edits card fields in the detail drawer and opens Job Match preselecting linked resume and job description', async () => {
    (applicationService.updateApplication as jest.Mock).mockImplementation(
      async (id: string, payload: any) => ({
        id,
        _id: id,
        ...payload,
      })
    );

    render(<HomePage />);

    // Navigate to Job Tracker tab in Header
    await screen.findByText('My Resumes');
    fireEvent.click(screen.getByRole('button', { name: /^job tracker$/i }));

    // Open Vercel card detail drawer
    await screen.findByText('Vercel');
    fireEvent.click(screen.getByRole('button', { name: /open details for vercel/i }));

    const drawer = screen.getByTestId('application-detail-drawer');
    expect(drawer).toBeInTheDocument();

    // Select Staff Systems Resume and paste a job description
    fireEvent.change(within(drawer).getByLabelText(/linked resume/i), {
      target: { value: '507f1f77bcf86cd799439022' },
    });
    const targetJd =
      'Join Vercel as a Design Engineer building high-craft developer tools with React, TypeScript, and Next.js.';
    fireEvent.change(within(drawer).getByLabelText(/job description/i), {
      target: { value: targetJd },
    });

    // Click Check match -> switches to Job Match tab with resume & JD preselected!
    fireEvent.click(within(drawer).getByTestId('drawer-check-match-btn'));

    expect(await screen.findByRole('heading', { level: 1, name: /job match/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/target resume/i)).toHaveValue('507f1f77bcf86cd799439022');
    });
    expect(screen.getByLabelText(/job description text/i)).toHaveValue(targetJd);
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Design Engineer');
  });

  it('creates a new application with contacts and supports deleting an existing card', async () => {
    (applicationService.createApplication as jest.Mock).mockImplementation(async (payload: any) => ({
      id: 'app-new',
      _id: 'app-new',
      ...payload,
    }));
    (applicationService.deleteApplication as jest.Mock).mockResolvedValue(undefined);
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(<JobTracker onCheckMatch={jest.fn()} />);
    await screen.findByText('Stripe');

    // Open New Application drawer via top CTA
    fireEvent.click(screen.getByTestId('add-application-btn'));
    const drawer = screen.getByTestId('application-detail-drawer');

    fireEvent.change(within(drawer).getByLabelText(/^company/i), {
      target: { value: 'Anthropic' },
    });
    fireEvent.change(within(drawer).getByLabelText(/^role/i), {
      target: { value: 'Research Engineer' },
    });
    fireEvent.change(within(drawer).getByLabelText(/^stage$/i), {
      target: { value: 'interview' },
    });

    // Add a contact
    fireEvent.click(within(drawer).getByRole('button', { name: /add contact/i }));
    fireEvent.change(within(drawer).getByLabelText(/contact 1 name/i), {
      target: { value: 'Taylor Morgan' },
    });
    fireEvent.change(within(drawer).getByLabelText(/contact 1 email/i), {
      target: { value: 'taylor@anthropic.example.com' },
    });
    fireEvent.change(within(drawer).getByLabelText(/contact 1 role/i), {
      target: { value: 'Engineering Manager' },
    });

    fireEvent.click(within(drawer).getByRole('button', { name: /create application/i }));

    await waitFor(() => {
      expect(applicationService.createApplication).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByText('Anthropic')).toBeInTheDocument();

    // Open Datadog card and delete it
    fireEvent.click(screen.getByRole('button', { name: /open details for datadog/i }));
    const editDrawer = screen.getByTestId('application-detail-drawer');
    fireEvent.click(within(editDrawer).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(applicationService.deleteApplication).toHaveBeenCalledWith('app-4');
      expect(screen.queryByText('Datadog')).not.toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });

  it("populates Linked cover letter select from GET /api/cover-letters with 'None' option and shows linked cover letter title on the card", async () => {
    const appsWithCoverLetter = sampleApplications().map((app) =>
      app.id === 'app-1'
        ? { ...app, coverLetterId: '507f1f77bcf86cd7994390a1' }
        : app
    );
    (applicationService.getApplications as jest.Mock).mockResolvedValueOnce(
      appsWithCoverLetter
    );
    (applicationService.updateApplication as jest.Mock).mockImplementation(
      async (id: string, payload: any) => ({
        ...appsWithCoverLetter.find((a) => a.id === id),
        id,
        _id: id,
        ...payload,
      })
    );

    render(<JobTracker onCheckMatch={jest.fn()} />);
    await screen.findByText('Stripe');

    expect(coverLetterService.getCoverLetters).toHaveBeenCalledTimes(1);

    // Linked cover letter title renders directly on the Stripe card
    const stripeCard = screen.getByTestId('application-card-app-1');
    expect(
      within(stripeCard).getByText('Stripe Senior Frontend Cover Letter')
    ).toBeInTheDocument();

    // Unlinked card does not show cover letter badge
    const vercelCard = screen.getByTestId('application-card-app-2');
    expect(
      within(vercelCard).queryByTestId('application-card-cover-letter-app-2')
    ).not.toBeInTheDocument();

    // Open Vercel card drawer -> verify <select> with 'None' and user's cover letters (no free-text ObjectId input)
    fireEvent.click(screen.getByRole('button', { name: /open details for vercel/i }));
    const drawer = screen.getByTestId('application-detail-drawer');
    expect(within(drawer).queryByText(/cover letter id/i)).not.toBeInTheDocument();

    const coverLetterSelect = within(drawer).getByLabelText(
      /linked cover letter/i
    ) as HTMLSelectElement;
    expect(coverLetterSelect.tagName).toBe('SELECT');
    expect(coverLetterSelect.value).toBe('');

    const optionLabels = Array.from(coverLetterSelect.options).map((o) => o.textContent);
    expect(optionLabels).toEqual([
      'None',
      'Stripe Senior Frontend Cover Letter',
      'Vercel Design Systems Cover Letter',
    ]);

    // Link Vercel cover letter and save -> card now displays linked cover letter title
    fireEvent.change(coverLetterSelect, {
      target: { value: '507f1f77bcf86cd7994390a2' },
    });
    fireEvent.click(within(drawer).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(applicationService.updateApplication).toHaveBeenCalledWith(
        'app-2',
        expect.objectContaining({
          coverLetterId: '507f1f77bcf86cd7994390a2',
        })
      );
    });
    expect(
      within(screen.getByTestId('application-card-app-2')).getByText(
        'Vercel Design Systems Cover Letter'
      )
    ).toBeInTheDocument();

    // Re-open Stripe card and switch Linked cover letter to 'None' -> clears coverLetterId to null
    fireEvent.click(screen.getByRole('button', { name: /open details for stripe/i }));
    const stripeDrawer = screen.getByTestId('application-detail-drawer');
    const stripeClSelect = within(stripeDrawer).getByLabelText(
      /linked cover letter/i
    ) as HTMLSelectElement;
    expect(stripeClSelect.value).toBe('507f1f77bcf86cd7994390a1');

    fireEvent.change(stripeClSelect, { target: { value: '' } });
    fireEvent.click(within(stripeDrawer).getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(applicationService.updateApplication).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({
          coverLetterId: null,
        })
      );
    });
    expect(
      within(screen.getByTestId('application-card-app-1')).queryByText(
        'Stripe Senior Frontend Cover Letter'
      )
    ).not.toBeInTheDocument();
  });
});
