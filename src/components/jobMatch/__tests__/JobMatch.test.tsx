import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobMatch, { addSkillToResume } from '../JobMatch';
import { resumeService } from '../../../services/resume.service';
import { applicationService } from '../../../services/application.service';
import { SectionType } from '../../../types/resume';

jest.mock('../../../services/resume.service', () => ({
  resumeService: {
    getResumes: jest.fn(),
    analyzeJobMatch: jest.fn(),
    createResume: jest.fn(),
    updateResume: jest.fn(),
  },
}));

jest.mock('../../../services/application.service', () => ({
  applicationService: {
    updateApplication: jest.fn(),
  },
}));

const baseResume: any = {
  _id: 'r1',
  id: 'r1',
  title: 'Frontend Resume',
  content: {
    basics: { name: 'Jane', email: 'jane@x.com' },
    sections: [{ id: 'skills-1', type: SectionType.SKILLS, title: 'Skills', content: [{ id: 's1', name: 'React' }] }],
    sectionOrder: ['skills-1'],
  },
};

const analysis = {
  score: 60,
  label: 'Fair match' as const,
  breakdown: { skills: 50, experience: 70, title: 100 },
  matchedKeywords: [{ keyword: 'React', occurrences: 2 }],
  missingKeywords: [
    { keyword: 'GraphQL', occurrences: 3 },
    { keyword: 'TypeScript', occurrences: 2 },
  ],
  relatedExperience: [
    {
      keyword: 'GraphQL',
      occurrences: 3,
      relatedSkills: ['REST APIs'],
      guidance:
        'Highlight your verified REST APIs experience in your Work Experience or Project bullets when describing relevant systems — without claiming unverified GraphQL hands-on work.',
    },
  ],
  suggestions: ['Add GraphQL to your Skills section if you have experience with it — the job description mentions it 3 times.'],
  totals: { matched: 1, required: 3 },
};

const JD = 'We need a React engineer with GraphQL, GraphQL, GraphQL and TypeScript experience.';

describe('addSkillToResume', () => {
  it('appends to an existing skills section', () => {
    const updated = addSkillToResume(baseResume, 'GraphQL');
    expect(updated.content.sections[0].content.map((i: any) => i.name)).toEqual(['React', 'GraphQL']);
    expect(updated.content.sectionOrder).toEqual(['skills-1']);
  });

  it('inserts into an existing TECK_SKILLS section without appending a duplicate Skills section', () => {
    const techSkillsResume = {
      ...baseResume,
      content: {
        ...baseResume.content,
        sections: [
          {
            id: 'tech-skills-1',
            type: SectionType.TECK_SKILLS,
            title: 'Technical Skills',
            content: [{ id: 'ts1', name: 'React' }],
          },
        ],
        sectionOrder: ['tech-skills-1'],
      },
    };
    const updated = addSkillToResume(techSkillsResume, 'GraphQL');
    expect(updated.content.sections).toHaveLength(1);
    expect(updated.content.sections[0].type).toBe(SectionType.TECK_SKILLS);
    expect(updated.content.sections[0].content.map((i: any) => i.name)).toEqual(['React', 'GraphQL']);
    expect(updated.content.sectionOrder).toEqual(['tech-skills-1']);
  });

  it('does not add duplicate skills case-insensitively across SKILLS or TECK_SKILLS', () => {
    const updated = addSkillToResume(baseResume, 'react');
    expect(updated.content.sections).toHaveLength(1);
    expect(updated.content.sections[0].content).toHaveLength(1);
  });

  it('creates a skills section when none exists', () => {
    const noSkills = { ...baseResume, content: { ...baseResume.content, sections: [], sectionOrder: [] } };
    const updated = addSkillToResume(noSkills, 'GraphQL');
    expect(updated.content.sections).toHaveLength(1);
    expect(updated.content.sections[0].type).toBe(SectionType.SKILLS);
    expect(updated.content.sectionOrder).toEqual([updated.content.sections[0].id]);
  });
});

describe('<JobMatch />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resumeService.getResumes as jest.Mock).mockResolvedValue([baseResume]);
    (resumeService.analyzeJobMatch as jest.Mock).mockResolvedValue(analysis);
    (resumeService.createResume as jest.Mock).mockImplementation(async (payload: any) => ({
      ...payload,
      _id: 'r-branched',
      id: 'r-branched',
    }));
    (resumeService.updateResume as jest.Mock).mockImplementation(async (id: string, payload: any) => ({
      ...payload,
      _id: id,
      id,
    }));
    (applicationService.updateApplication as jest.Mock).mockResolvedValue({});
  });

  it('analyzes the selected resume and renders the results including Related experience', async () => {
    render(<JobMatch />);
    await screen.findByRole('option', { name: 'Frontend Resume' });

    const button = screen.getByRole('button', { name: /analyze match/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/job description text/i), { target: { value: JD } });
    fireEvent.change(screen.getByLabelText(/job title/i), { target: { value: 'Frontend Engineer' } });
    fireEvent.click(button);

    expect(await screen.findByText('Fair match')).toBeInTheDocument();
    expect(resumeService.analyzeJobMatch).toHaveBeenCalledWith('r1', JD, 'Frontend Engineer');
    expect(screen.getByText('1 of 3 key skills found')).toBeInTheDocument();
    expect(screen.getAllByText('×3').length).toBeGreaterThan(0);

    // Related experience transferable guidance
    const relatedSection = screen.getByTestId('related-experience-section');
    expect(relatedSection).toBeInTheDocument();
    expect(relatedSection).toHaveTextContent('REST API');
    expect(relatedSection).toHaveTextContent(/without claiming unverified GraphQL hands-on work/i);
  });

  it('branches a tailored copy with parentResumeId before modifying a base resume, relinks JobApplication, and updates the branched copy on subsequent edits', async () => {
    render(
      <JobMatch
        initialResumeId="r1"
        initialCompany="Stripe"
        initialJobTitle="Frontend Engineer"
        initialJobDescription={JD}
        initialApplicationId="app-99"
      />
    );
    await screen.findByRole('option', { name: 'Frontend Resume' });
    fireEvent.click(screen.getByRole('button', { name: /analyze match/i }));
    await screen.findByText('Fair match');

    const addButtons = screen.getAllByRole('button', { name: /add to skills/i });
    fireEvent.click(addButtons[0]);

    // First addition branches a tailored copy rather than mutating r1
    await waitFor(() => expect(resumeService.createResume).toHaveBeenCalledTimes(1));
    expect(resumeService.updateResume).not.toHaveBeenCalled();

    const createdPayload = (resumeService.createResume as jest.Mock).mock.calls[0][0];
    expect(createdPayload.parentResumeId).toBe('r1');
    expect(createdPayload.targetCompany).toBe('Stripe');
    expect(createdPayload.targetRole).toBe('Frontend Engineer');
    expect(createdPayload.jobDescription).toBe(JD);
    expect(createdPayload).not.toHaveProperty('_id');
    expect(createdPayload.content.sections[0].content.map((i: any) => i.name)).toContain('GraphQL');

    // Linked Job Tracker application is updated to point to the branched copy
    await waitFor(() =>
      expect(applicationService.updateApplication).toHaveBeenCalledWith('app-99', {
        resumeId: 'r-branched',
      })
    );
    await waitFor(() =>
      expect(resumeService.analyzeJobMatch).toHaveBeenLastCalledWith('r-branched', JD, 'Frontend Engineer')
    );

    // Second skill addition updates the already-branched copy in place without re-branching
    const updatedAddButtons = screen.getAllByRole('button', { name: /add to skills/i });
    fireEvent.click(updatedAddButtons[1]);

    await waitFor(() => expect(resumeService.updateResume).toHaveBeenCalledTimes(1));
    expect(resumeService.createResume).toHaveBeenCalledTimes(1);
    const [updatedId, updatedPayload] = (resumeService.updateResume as jest.Mock).mock.calls[0];
    expect(updatedId).toBe('r-branched');
    expect(updatedPayload.content.sections[0].content.map((i: any) => i.name)).toContain('TypeScript');
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
    expect(missingChips).toHaveLength(2);
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
