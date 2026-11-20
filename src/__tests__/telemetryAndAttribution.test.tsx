import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import HomePage from '../components/HomePage';
import ResumeEditor from '../components/ResumeEditor';
import ResumeList from '../components/ResumeList';
import JobMatch from '../components/jobMatch/JobMatch';
import JobTracker from '../components/jobTracker/JobTracker';
import { ApplicationDrawer } from '../components/jobTracker/ApplicationDrawer';
import { resumeService } from '../services/resume.service';
import { applicationService } from '../services/application.service';
import { coverLetterService } from '../services/coverLetter.service';
import {
  CapturedClientTelemetryEvent,
  getCapturedClientEventsForTests,
  getIdentifiedUserIdForTests,
  getTelemetryInitConfigForTests,
  initTelemetry,
  resetTelemetryStateForTests,
  sanitizeClientTelemetryProperties,
  setTelemetryAdapterForTests,
} from '../services/telemetry';

jest.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}));

const FORBIDDEN_PII_STRINGS = [
  'Ada Lovelace',
  'ada.lovelace@analytical.org',
  '+44 20 7946 0958',
  'Pioneered symbolic computation algorithms',
  'Designed analytical engine instruction tables',
  'DeepMind',
  'Principal Research Engineer',
  'Confidential recruiter note',
  'https://deepmind.example.com/jobs/1',
  'secret-share-token-xyz',
  'We need a Principal Research Engineer skilled in TypeScript, Python, React, and Kubernetes.',
];

function assertZeroClientPii(evt: CapturedClientTelemetryEvent): void {
  const raw = JSON.stringify(evt);
  for (const forbidden of FORBIDDEN_PII_STRINGS) {
    expect(raw).not.toContain(forbidden);
  }
  if (evt.distinctId) {
    expect(evt.distinctId).not.toContain('@');
  }
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.sig`;
}

describe('Frontend PostHog Telemetry, Privacy Guardrails, AI Draft Review & Attribution', () => {
  const originalLocationHref = window.location.href;

  beforeEach(() => {
    resetTelemetryStateForTests();
    localStorage.clear();
    window.history.replaceState({}, '', '/');

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: (query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }),
      });
    }
    window.print = jest.fn();
  });

  afterEach(() => {
    resetTelemetryStateForTests();
    localStorage.clear();
    window.history.replaceState({}, '', originalLocationHref || '/');
    jest.restoreAllMocks();
  });

  it('initializes posthog-js for project 741313 with autocapture/session-replay disabled, binds opaque userId, and suppresses public share routes', async () => {
    const initMock = jest.fn();
    const identifyMock = jest.fn();
    const resetMock = jest.fn();
    const optOutMock = jest.fn();
    const captureMock = jest.fn();

    setTelemetryAdapterForTests({
      init: initMock,
      identify: identifyMock,
      reset: resetMock,
      opt_out_capturing: optOutMock,
      opt_in_capturing: jest.fn(),
      capture: captureMock,
    });

    initTelemetry();
    const initCfg = getTelemetryInitConfigForTests();
    expect(initCfg).not.toBeNull();
    expect(initCfg?.options).toMatchObject({
      api_host: 'https://us.i.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
    });

    const sanitized = sanitizeClientTelemetryProperties({
      resume_id: '65f1a2b3c4d5e6f7a8b9c0e1',
      format: 'pdf',
      $current_url: 'https://app.example.com/share/secret-share-token-xyz',
      $pathname: '/share/secret-share-token-xyz',
      name: 'Ada Lovelace',
      email: 'ada.lovelace@analytical.org',
      phone: '+44 20 7946 0958',
      summary: 'Pioneered symbolic computation algorithms',
      jobDescription:
        'We need a Principal Research Engineer skilled in TypeScript, Python, React, and Kubernetes.',
    });
    expect(sanitized).toEqual({
      resume_id: '65f1a2b3c4d5e6f7a8b9c0e1',
      format: 'pdf',
    });

    // Session binding from JWT id claim without leaking email
    const opaqueId = '65f1a2b3c4d5e6f7a8b9c0d1';
    localStorage.setItem('jwt_token', makeFakeJwt({ id: opaqueId }));
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        name: 'Ada Lovelace',
        email: 'ada.lovelace@analytical.org',
      })
    );
    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([]);

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(identifyMock).toHaveBeenCalledWith(opaqueId);
    });
    expect(getIdentifiedUserIdForTests()).toBe(opaqueId);

    // Public share route opts out of capturing and never identifies user
    unmount();
    identifyMock.mockClear();
    window.history.replaceState({}, '', '/share/secret-share-token-xyz');
    jest
      .spyOn(resumeService, 'getPublicResume')
      .mockRejectedValue(new Error('Not found'));

    render(<App />);
    await waitFor(() => {
      expect(optOutMock).toHaveBeenCalled();
    });
    expect(identifyMock).not.toHaveBeenCalled();
  });

  it('requires accepting or discarding AI-generated drafts and emits ai_rewrite_accepted / ai_rewrite_rejected with zero PII', async () => {
    const generatedDraft = {
      id: '65f1a2b3c4d5e6f7a8b9c0e1',
      _id: '65f1a2b3c4d5e6f7a8b9c0e1',
      title: 'AI Draft',
      templateId: 'modern',
      summary: 'Pioneered symbolic computation algorithms',
      content: {
        basics: {
          name: 'Ada Lovelace',
          label: 'Principal Research Engineer',
          email: 'ada.lovelace@analytical.org',
          phone: '+44 20 7946 0958',
          summary: 'Pioneered symbolic computation algorithms',
        },
        sections: [
          {
            id: 'work',
            type: 'WorkItem' as any,
            title: 'Experience',
            content: [
              {
                id: 'w1',
                name: 'DeepMind',
                position: 'Principal Research Engineer',
                highlights: ['Designed analytical engine instruction tables'],
              },
            ],
          },
        ],
        sectionOrder: ['work'],
      },
    };

    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([]);
    jest
      .spyOn(resumeService, 'generateFromPrompt')
      .mockResolvedValue(generatedDraft as any);
    const updateSpy = jest
      .spyOn(resumeService, 'updateResume')
      .mockImplementation((_id, payload) =>
        Promise.resolve({ ...generatedDraft, ...payload } as any)
      );
    const deleteSpy = jest
      .spyOn(resumeService, 'deleteResume')
      .mockResolvedValue(undefined);

    render(
      <HomePage
        user={{ name: 'Ada Lovelace', email: 'ada.lovelace@analytical.org' }}
      />
    );

    const aiGenBtn = await screen.findByRole('button', { name: /AI Generate/i });
    fireEvent.click(aiGenBtn);

    const promptInput = await screen.findByPlaceholderText(/Describe your experience/i);
    fireEvent.change(promptInput, {
      target: {
        value: 'Ada Lovelace at DeepMind building symbolic computation engines',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

    const reviewBanner = await screen.findByTestId('ai-draft-review-banner');
    expect(reviewBanner).toBeInTheDocument();
    expect(updateSpy).not.toHaveBeenCalled();

    // Accept AI Draft -> confirms save and emits ai_rewrite_accepted
    fireEvent.click(screen.getByTestId('accept-ai-draft-btn'));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
    expect(updateSpy.mock.calls[0][1]).toMatchObject({
      confirmAiDraft: true,
      title: 'Principal Research Engineer',
    });

    const acceptedEvents = getCapturedClientEventsForTests().filter(
      (e) => e.event === 'ai_rewrite_accepted'
    );
    expect(acceptedEvents).toHaveLength(1);
    assertZeroClientPii(acceptedEvents[0]);

    // Go back, generate again, and Discard AI Draft -> deletes temporary draft and emits ai_rewrite_rejected
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    const aiGenBtn2 = await screen.findByRole('button', { name: /AI Generate/i });
    fireEvent.click(aiGenBtn2);
    const promptInput2 = await screen.findByPlaceholderText(/Describe your experience/i);
    fireEvent.change(promptInput2, {
      target: { value: 'Another prompt for Ada Lovelace' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

    await screen.findByTestId('ai-draft-review-banner');
    fireEvent.click(screen.getByTestId('discard-ai-draft-btn'));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith('65f1a2b3c4d5e6f7a8b9c0e1');
    });

    const rejectedEvents = getCapturedClientEventsForTests().filter(
      (e) => e.event === 'ai_rewrite_rejected'
    );
    expect(rejectedEvents).toHaveLength(1);
    assertZeroClientPii(rejectedEvents[0]);
  });

  it('emits resume_tailored in JobMatch and resume_exported + time_to_export across PDF and JSON exports with zero PII', async () => {
    const sampleResume: any = {
      id: '65f1a2b3c4d5e6f7a8b9c0e1',
      _id: '65f1a2b3c4d5e6f7a8b9c0e1',
      title: 'Principal Research Engineer',
      templateId: 'professional',
      createdAt: new Date(Date.now() - 30_000).toISOString(),
      summary: 'Pioneered symbolic computation algorithms',
      content: {
        basics: {
          name: 'Ada Lovelace',
          label: 'Principal Research Engineer',
          email: 'ada.lovelace@analytical.org',
          phone: '+44 20 7946 0958',
        },
        sections: [],
        sectionOrder: [],
      },
    };

    jest.spyOn(resumeService, 'getResumes').mockResolvedValue([sampleResume]);
    jest.spyOn(resumeService, 'analyzeJobMatch').mockResolvedValue({
      score: 72,
      label: 'Good match',
      breakdown: { skills: 65, experience: 80, title: 75 },
      matchedKeywords: [{ keyword: 'Python', occurrences: 2 }],
      missingKeywords: [{ keyword: 'Kubernetes', occurrences: 2 }],
      suggestions: ['Add Kubernetes to your Skills section'],
      totals: { matched: 1, required: 2 },
    });
    jest.spyOn(resumeService, 'updateResume').mockResolvedValue(sampleResume);

    const { unmount } = render(
      <JobMatch
        initialResumeId={sampleResume.id}
        initialJobTitle="Principal Research Engineer"
        initialJobDescription="We need a Principal Research Engineer skilled in TypeScript, Python, React, and Kubernetes."
      />
    );

    const analyzeBtn = await screen.findByRole('button', { name: /Analyze Match/i });
    fireEvent.click(analyzeBtn);

    const addKeywordBtn = await screen.findByRole('button', {
      name: /Kubernetes/i,
    });
    fireEvent.click(addKeywordBtn);

    await waitFor(() => {
      expect(
        getCapturedClientEventsForTests().some(
          (e) => e.event === 'resume_tailored'
        )
      ).toBe(true);
    });

    unmount();

    // Test ApplicationDrawer Check Match tailoring event
    const onCheckMatchSpy = jest.fn();
    const { unmount: unmountDrawer } = render(
      <ApplicationDrawer
        isOpen
        mode="edit"
        application={{
          id: '65f1a2b3c4d5e6f7a8b9c0f1',
          company: 'DeepMind',
          role: 'Principal Research Engineer',
          status: 'applied',
          order: 0,
          resumeId: sampleResume.id,
          jobDescription:
            'We need a Principal Research Engineer skilled in TypeScript, Python, React, and Kubernetes.',
          notes: 'Confidential recruiter note',
          contacts: [],
        }}
        resumes={[sampleResume]}
        coverLetters={[]}
        saving={false}
        deleting={false}
        onClose={jest.fn()}
        onSave={jest.fn().mockResolvedValue(undefined)}
        onDelete={jest.fn()}
        onCheckMatch={onCheckMatchSpy}
      />
    );

    const checkMatchBtn = screen.getByRole('button', { name: /Check Match/i });
    fireEvent.click(checkMatchBtn);

    await waitFor(() => {
      expect(onCheckMatchSpy).toHaveBeenCalledTimes(1);
    });
    expect(
      getCapturedClientEventsForTests().some(
        (e) =>
          e.event === 'resume_tailored' &&
          e.properties.source === 'application_drawer'
      )
    ).toBe(true);

    unmountDrawer();

    // Test PDF and JSON export telemetry in ResumeEditor
    if (typeof URL.createObjectURL !== 'function') {
      (URL as any).createObjectURL = jest.fn(() => 'blob:resume-json');
    } else {
      jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:resume-json');
    }
    if (typeof URL.revokeObjectURL !== 'function') {
      (URL as any).revokeObjectURL = jest.fn();
    } else {
      jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    }

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    render(<ResumeEditor initialResume={sampleResume} onBack={jest.fn()} />);

    const moreActionsBtn = screen.getByRole('button', { name: /more actions/i });
    fireEvent.click(moreActionsBtn);
    fireEvent.click(await screen.findByTestId('export-resume-btn'));

    fireEvent.click(moreActionsBtn);
    fireEvent.click(await screen.findByTestId('export-json-resume-btn'));

    const allEvents = getCapturedClientEventsForTests();
    const exportEvents = allEvents.filter((e) => e.event === 'resume_exported');
    const timingEvents = allEvents.filter((e) => e.event === 'time_to_export');

    expect(exportEvents.map((e) => e.properties.format)).toEqual(['pdf', 'json']);
    expect(timingEvents.map((e) => e.properties.format)).toEqual(['pdf', 'json']);

    for (const evt of allEvents) {
      assertZeroClientPii(evt);
    }
  });

  it('stamps appliedAt on wishlist->applied, preserves sticky interviewRate on interview->rejected, and renders attribution in JobTracker and ResumeList', async () => {
    const resume1: any = {
      id: 'res-modern-1',
      _id: 'res-modern-1',
      title: 'Systems Architecture CV',
      templateId: 'modern',
      content: { basics: { name: 'Ada Lovelace', email: 'ada.lovelace@analytical.org' }, sections: [], sectionOrder: [] },
    };
    const resume2: any = {
      id: 'res-prof-2',
      _id: 'res-prof-2',
      title: 'Research Scientist CV',
      templateId: 'professional',
      content: { basics: { name: 'Ada Lovelace', email: 'ada.lovelace@analytical.org' }, sections: [], sectionOrder: [] },
    };

    const wishlistApp: any = {
      id: 'app-wishlist-1',
      _id: 'app-wishlist-1',
      company: 'DeepMind',
      role: 'Principal Research Engineer',
      status: 'wishlist',
      order: 0,
      appliedAt: null,
      reachedInterviewAt: null,
      stageHistory: [{ status: 'wishlist', changedAt: '2026-11-01T00:00:00.000Z' }],
      resumeId: 'res-modern-1',
      contacts: [],
    };
    const appliedOtherApp: any = {
      id: 'app-applied-2',
      _id: 'app-applied-2',
      company: 'OpenAI',
      role: 'Research Engineer',
      status: 'applied',
      order: 0,
      appliedAt: '2026-11-01T00:00:00.000Z',
      reachedInterviewAt: null,
      stageHistory: [{ status: 'applied', changedAt: '2026-11-01T00:00:00.000Z' }],
      resumeId: 'res-prof-2',
      contacts: [],
    };

    jest
      .spyOn(applicationService, 'getApplications')
      .mockResolvedValue([wishlistApp, appliedOtherApp]);
    jest
      .spyOn(applicationService, 'reorderApplications')
      .mockResolvedValue(undefined);
    jest.spyOn(applicationService, 'getAttributionSummary').mockResolvedValue({
      totals: {
        totalApplications: 2,
        submittedCount: 2,
        interviewCount: 1,
        offerCount: 0,
        interviewRate: 50,
      },
      byResume: [
        {
          resumeId: 'res-modern-1',
          title: 'Systems Architecture CV',
          templateId: 'modern',
          totalApplications: 1,
          submittedCount: 1,
          interviewCount: 1,
          offerCount: 0,
          interviewRate: 100,
        },
        {
          resumeId: 'res-prof-2',
          title: 'Research Scientist CV',
          templateId: 'professional',
          totalApplications: 1,
          submittedCount: 1,
          interviewCount: 0,
          offerCount: 0,
          interviewRate: 0,
        },
      ],
      byTemplate: [
        {
          templateId: 'modern',
          resumeCount: 1,
          totalApplications: 1,
          submittedCount: 1,
          interviewCount: 1,
          offerCount: 0,
          interviewRate: 100,
        },
      ],
      unlinked: {
        totalApplications: 0,
        submittedCount: 0,
        interviewCount: 0,
        offerCount: 0,
        interviewRate: 0,
      },
    });
    jest
      .spyOn(resumeService, 'getResumes')
      .mockResolvedValue([resume1, resume2]);
    jest.spyOn(coverLetterService, 'getCoverLetters').mockResolvedValue([]);

    const { unmount } = render(<JobTracker onCheckMatch={jest.fn()} />);

    const cardBefore = await screen.findByTestId('application-card-app-wishlist-1');
    expect(within(cardBefore).getByText('Not applied yet')).toBeInTheDocument();
    expect(within(screen.getByTestId('stat-applied-week')).getByText('0')).toBeInTheDocument();

    // Drag wishlist card to applied -> stamps appliedAt, increments appliedThisWeek, replaces "Not applied yet"
    fireEvent.dragStart(cardBefore);
    fireEvent.drop(screen.getByTestId('kanban-column-applied'));

    await waitFor(() => {
      const cardAfterApply = screen.getByTestId('application-card-app-wishlist-1');
      expect(within(cardAfterApply).queryByText('Not applied yet')).not.toBeInTheDocument();
      expect(within(cardAfterApply).getByText('Applied today')).toBeInTheDocument();
    });
    expect(within(screen.getByTestId('stat-applied-week')).getByText('1')).toBeInTheDocument();

    // Move applied -> interview -> sets 50% overall interview rate (1 of 2 submitted) and 100% for res-modern-1
    fireEvent.dragStart(screen.getByTestId('application-card-app-wishlist-1'));
    fireEvent.drop(screen.getByTestId('kanban-column-interview'));

    await waitFor(() => {
      expect(
        within(screen.getByTestId('stat-interview-rate')).getByText('50%')
      ).toBeInTheDocument();
    });

    // Move interview -> rejected -> preserves sticky reachedInterviewAt & historical 50% interviewRate!
    fireEvent.dragStart(screen.getByTestId('application-card-app-wishlist-1'));
    fireEvent.drop(screen.getByTestId('kanban-column-rejected'));

    await waitFor(() => {
      expect(
        within(screen.getByTestId('kanban-column-rejected')).getByTestId(
          'application-card-app-wishlist-1'
        )
      ).toBeInTheDocument();
    });

    expect(
      within(screen.getByTestId('stat-interview-rate')).getByText('50%')
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('resume-attribution-row-res-modern-1')).getByText(
        '100% interview rate'
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId('template-attribution-row-modern')).getByText(
        '100% interview rate'
      )
    ).toBeInTheDocument();

    unmount();

    // Verify ResumeList renders linked application counts and interview rates on cards
    render(<ResumeList onEditResume={jest.fn()} />);

    const cards = await screen.findAllByTestId('resume-card');
    expect(cards).toHaveLength(2);
    await waitFor(() => {
      expect(screen.getByText('100% interview rate')).toBeInTheDocument();
    });
    expect(screen.getAllByTestId('resume-card-attribution')).toHaveLength(2);
  });
});
