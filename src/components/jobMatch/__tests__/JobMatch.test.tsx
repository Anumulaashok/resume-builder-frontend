import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobMatch, { addSkillToResume } from '../JobMatch';
import HomePage, { JOB_MATCH_SESSION_STORAGE_KEY } from '../../HomePage';
import { ModernTemplate } from '../../templates/ModernTemplate';
import { ProfessionalTemplate } from '../../templates/ProfessionalTemplate';
import { resumeService } from '../../../services/resume.service';
import { SectionType } from '../../../types/resume';

jest.mock('react-resizable-panels', () => ({
  PanelGroup: ({ children }: any) => <div>{children}</div>,
  Panel: ({ children }: any) => <div>{children}</div>,
  PanelResizeHandle: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('../../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn(),
    analyzeJobMatch: jest.fn(),
    updateResume: jest.fn(),
  },
}));

const baseResume: any = {
  _id: 'r1',
  title: 'Frontend Resume',
  content: {
    basics: { name: 'Jane', email: 'jane@x.com' },
    sections: [{ id: 'skills-1', type: SectionType.SKILLS, title: 'Skills', content: [{ id: 's1', name: 'React' }] }],
    sectionOrder: ['skills-1'],
  },
};

const analysis = {
  score: 60,
  label: 'Fair match',
  breakdown: { skills: 50, experience: 70, title: 100 },
  matchedKeywords: [{ keyword: 'React', occurrences: 2 }],
  missingKeywords: [{ keyword: 'GraphQL', occurrences: 3 }],
  suggestions: ['Add GraphQL to your Skills section if you have experience with it — the job description mentions it 3 times.'],
  totals: { matched: 1, required: 2 },
};

const JD = 'We need a React engineer with GraphQL, GraphQL and more GraphQL experience.';

describe('addSkillToResume', () => {
  it('appends to an existing skills section', () => {
    const updated = addSkillToResume(baseResume, 'GraphQL');
    expect(updated.content.sections[0].content.map((i: any) => i.name)).toEqual(['React', 'GraphQL']);
    expect(updated.content.sectionOrder).toEqual(['skills-1']);
  });

  it('creates a skills section when none exists', () => {
    const noSkills = { ...baseResume, content: { ...baseResume.content, sections: [], sectionOrder: [] } };
    const updated = addSkillToResume(noSkills, 'GraphQL');
    expect(updated.content.sections).toHaveLength(1);
    expect(updated.content.sections[0].type).toBe(SectionType.SKILLS);
    expect(updated.content.sectionOrder).toEqual([updated.content.sections[0].id]);
  });

  it('updates an existing TechnicalSkillItem or grouped subSkills section without duplicating sections and renders keywords in both templates', () => {
    const techResume: any = {
      _id: 'r-tech',
      title: 'Backend Engineer Resume',
      content: {
        basics: { name: 'Alex' },
        sections: [
          {
            id: 'tech-skills-1',
            type: SectionType.TECK_SKILLS,
            title: 'Technical Skills',
            content: [
              {
                id: 'ts-1',
                name: 'Data & Storage',
                technologies: ['PostgreSQL', 'Redis'],
              },
            ],
          },
        ],
        sectionOrder: ['tech-skills-1'],
      },
    };

    const withGo = addSkillToResume(techResume, 'Go');
    const withGoAndExpress = addSkillToResume(withGo, 'Express');
    // Re-adding an existing skill does not create a duplicate
    const deduped = addSkillToResume(withGoAndExpress, 'go');

    expect(deduped.content.sections).toHaveLength(1);
    expect(deduped.content.sections[0].id).toBe('tech-skills-1');
    expect(deduped.content.sectionOrder).toEqual(['tech-skills-1']);
    expect(deduped.content.sections[0].content).toHaveLength(2);
    expect((deduped.content.sections[0].content[1] as any).technologies).toEqual(['Go', 'Express']);

    const { unmount } = render(<ModernTemplate resume={deduped} readOnly />);
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Express')).toBeInTheDocument();
    unmount();

    render(<ProfessionalTemplate resume={deduped} readOnly />);
    expect(screen.getByText('Go')).toBeInTheDocument();
    expect(screen.getByText('Express')).toBeInTheDocument();

    // Grouped SkillItem (subSkills) updates existing section cleanly
    const groupedResume: any = {
      _id: 'r-grouped',
      title: 'Platform Resume',
      content: {
        basics: { name: 'Maya' },
        sections: [
          {
            id: 'core-skills',
            type: SectionType.SKILLS,
            title: 'Core Skills',
            content: [
              {
                id: 'sk-1',
                name: 'Frontend Architecture',
                subSkills: ['React', 'TypeScript'],
              },
            ],
          },
        ],
        sectionOrder: ['core-skills'],
      },
    };
    const updatedGrouped = addSkillToResume(groupedResume, 'GraphQL');
    expect(updatedGrouped.content.sections).toHaveLength(1);
    expect((updatedGrouped.content.sections[0].content[1] as any).subSkills).toEqual(['GraphQL']);
  });
});

describe('<JobMatch />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeService.getResumes as jest.Mock).mockResolvedValue([baseResume]);
    (resumeService.analyzeJobMatch as jest.Mock).mockResolvedValue(analysis);
    (resumeService.updateResume as jest.Mock).mockResolvedValue({});
  });

  it('analyzes the selected resume and renders the results', async () => {
    render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });

    const button = screen.getByRole('button', { name: /analyze match/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/job description text/i), { target: { value: JD } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Frontend Engineer' } });
    fireEvent.click(button);

    expect(await screen.findByText('Fair match')).toBeInTheDocument();
    expect(resumeService.analyzeJobMatch).toHaveBeenCalledWith('r1', JD, 'Frontend Engineer');
    expect(screen.getByText('1 of 2 key skills found')).toBeInTheDocument();
    expect(screen.getByText('×3')).toBeInTheDocument();
  });

  it('adds a missing keyword to the resume skills and re-runs the analysis', async () => {
    render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });
    fireEvent.change(screen.getByLabelText(/job description text/i), { target: { value: JD } });
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }));
    await screen.findByText('Fair match');

    fireEvent.click(screen.getByRole('button', { name: /add to skills/i }));

    await waitFor(() => expect(resumeService.updateResume).toHaveBeenCalledTimes(1));
    const [id, payload] = (resumeService.updateResume as jest.Mock).mock.calls[0];
    expect(id).toBe('r1');
    expect(payload.content.sections[0].content.map((i: any) => i.name)).toContain('GraphQL');
    expect(payload).not.toHaveProperty('_id');
    await waitFor(() => expect(resumeService.analyzeJobMatch).toHaveBeenCalledTimes(2));
  });

  it('shows an empty state when the user has no resumes', async () => {
    (resumeService.getResumes as jest.Mock).mockResolvedValue([]);
    render(<JobMatch />);
    expect(await screen.findByText(/create a resume first/i)).toBeInTheDocument();
  });

  it('renders page header, friendly empty state before analysis, focus rings, and design tokens', async () => {
    const { container } = render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });

    expect(screen.getByRole('heading', { level: 1, name: /job match/i })).toBeInTheDocument();
    expect(screen.getByTestId('job-match-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /ready to check your match/i })).toBeInTheDocument();
    expect(container.querySelector('.page-container')).toBeInTheDocument();
    expect(container.querySelector('.rounded-card.shadow-card')).toBeInTheDocument();

    expect(screen.getByLabelText(/target resume/i)).toHaveClass('focus-ring');
    expect(screen.getByLabelText(/job title/i)).toHaveClass('focus-ring');
    expect(screen.getByLabelText(/job description text/i)).toHaveClass('focus-ring');
    expect(screen.getByRole('button', { name: /analyze match/i })).toHaveClass('focus-ring');
  });

  it('shows a loading skeleton while analyzing and replaces it with score ring, breakdown bars, chips, and checklist', async () => {
    let resolveAnalysis!: (value: typeof analysis) => void;
    (resumeService.analyzeJobMatch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAnalysis = resolve;
        })
    );

    render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });

    fireEvent.change(screen.getByLabelText(/job description text/i), { target: { value: JD } });
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }));

    expect(screen.getByTestId('job-match-skeleton')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /analyzing job match/i })).toBeInTheDocument();
    expect(screen.queryByTestId('job-match-empty-state')).not.toBeInTheDocument();

    resolveAnalysis(analysis);

    expect(await screen.findByRole('img', { name: /match score 60%/i })).toBeInTheDocument();
    expect(screen.queryByTestId('job-match-skeleton')).not.toBeInTheDocument();

    expect(screen.getByRole('progressbar', { name: /core skills/i })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('progressbar', { name: /experience keywords/i })).toHaveAttribute('aria-valuenow', '70');
    expect(screen.getByRole('progressbar', { name: /title alignment/i })).toHaveAttribute('aria-valuenow', '100');

    const matchedChips = screen.getAllByTestId('matched-keyword-chip');
    const missingChips = screen.getAllByTestId('missing-keyword-chip');
    expect(matchedChips).toHaveLength(1);
    expect(matchedChips[0]).toHaveTextContent('React');
    expect(missingChips).toHaveLength(1);
    expect(missingChips[0]).toHaveTextContent('GraphQL');

    // Interactive suggestions checklist
    expect(screen.getByText('0 of 1 done')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: /add graphql to your skills section/i });
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveClass('focus-ring');

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 of 1 done')).toBeInTheDocument();
  });

  it('validates minimum job description length and supports clearing the input', async () => {
    render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });

    const jdInput = screen.getByLabelText(/job description text/i);
    fireEvent.change(jdInput, { target: { value: 'Too short JD' } });

    expect(screen.getByText(/add at least 30 characters/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyze match/i })).toBeDisabled();

    const clearBtn = screen.getByRole('button', { name: /clear job description/i });
    expect(clearBtn).toHaveClass('focus-ring');
    fireEvent.click(clearBtn);
    expect(jdInput).toHaveValue('');
  });
});

describe('HomePage <-> JobMatch session persistence and editor navigation', () => {
  const secondResume: any = {
    _id: 'r2',
    title: 'Backend Go Resume',
    content: {
      basics: { name: 'Jane', email: 'jane@x.com', label: 'Backend Engineer' },
      sections: [
        {
          id: 'tech-1',
          type: SectionType.TECK_SKILLS,
          title: 'Technical Skills',
          content: [{ id: 't1', name: 'Languages', technologies: ['Go'] }],
        },
      ],
      sectionOrder: ['tech-1'],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    (resumeService.getResumes as jest.Mock).mockResolvedValue([baseResume, secondResume]);
    (resumeService.analyzeJobMatch as jest.Mock).mockResolvedValue(analysis);
    (resumeService.updateResume as jest.Mock).mockResolvedValue(secondResume);
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('preserves selected resume, job inputs, checklist selections across tab switches and refreshes score after opening the editor', async () => {
    render(<HomePage />);
    await screen.findByText('My Resumes');

    // Switch to Job Match tab
    fireEvent.click(screen.getByRole('button', { name: /^job match$/i }));
    await screen.findByRole('option', { name: 'Backend Go Resume' });

    // Select second resume, fill inputs, run analysis, and check a suggestion
    fireEvent.change(screen.getByLabelText(/target resume/i), { target: { value: 'r2' } });
    fireEvent.change(screen.getByLabelText(/job title/i), {
      target: { value: 'Staff Backend Engineer' },
    });
    fireEvent.change(screen.getByLabelText(/job description text/i), {
      target: { value: JD },
    });
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }));

    expect(await screen.findByRole('img', { name: /match score 60%/i })).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', {
      name: /add graphql to your skills section/i,
    });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    // Verify state is persisted in sessionStorage
    const stored = JSON.parse(window.sessionStorage.getItem(JOB_MATCH_SESSION_STORAGE_KEY) || '{}');
    expect(stored.selectedId).toBe('r2');
    expect(stored.jobTitle).toBe('Staff Backend Engineer');
    expect(stored.jobDescription).toBe(JD);

    // Prepare updated score for when the user returns from editing their resume
    const refreshedAnalysis = {
      ...analysis,
      score: 90,
      label: 'Excellent match' as const,
      breakdown: { skills: 100, experience: 85, title: 100 },
    };
    (resumeService.analyzeJobMatch as jest.Mock).mockResolvedValueOnce(refreshedAnalysis);

    // Click direct "Edit resume" action in Job Match -> opens ResumeEditor for Backend Go Resume
    fireEvent.click(screen.getByTestId('jm-edit-resume-btn'));
    expect(await screen.findByText('Backend Go Resume')).toBeInTheDocument();

    // Click Back in ResumeEditor -> returns directly to Job Match with preserved state & refreshed score
    fireEvent.click(screen.getByRole('button', { name: /^back$/i }));

    expect(await screen.findByRole('heading', { level: 1, name: /job match/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText(/target resume/i)).toHaveValue('r2');
    });
    expect(screen.getByLabelText(/job title/i)).toHaveValue('Staff Backend Engineer');
    expect(screen.getByLabelText(/job description text/i)).toHaveValue(JD);
    expect(
      screen.getByRole('checkbox', { name: /add graphql to your skills section/i })
    ).toBeChecked();
    expect(await screen.findByRole('img', { name: /match score 90%/i })).toBeInTheDocument();
    expect(screen.getByText('Excellent match')).toBeInTheDocument();
  });
});
