import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JobMatch, { addSkillToResume } from '../JobMatch';
import { resumeService } from '../../../services/resume.service';
import { SectionType } from '../../../types/resume';

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
});
