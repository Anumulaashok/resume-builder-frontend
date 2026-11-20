import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import axiosInstance from '../services/axios';
import { resumeService, ResumeWithMeta } from '../services/resume.service';
import HomePage from '../components/HomePage';
import ResumeEditor from '../components/ResumeEditor';
import { ModernTemplate } from '../components/templates/ModernTemplate';
import { ProfessionalTemplate } from '../components/templates/ProfessionalTemplate';
import App from '../App';
import { IResume, SectionType } from '../types/resume';
import { getStoredUser, setStoredUser, setToken } from '../utils/token';

jest.mock('../services/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
  AUTH_LOGOUT_EVENT: 'auth:logout',
}));

jest.mock('react-resizable-panels', () => ({
  Panel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PanelResizeHandle: () => <div />,
}));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  Toaster: () => null,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe('AI Resume Generation Flow', () => {
  const originalResizeObserver = (window as any).ResizeObserver;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (window as any).ResizeObserver = class MockResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterEach(() => {
    (window as any).ResizeObserver = originalResizeObserver;
  });

  describe('resumeService.generateFromPrompt', () => {
    const sampleGeneratedResume: ResumeWithMeta = {
      _id: '665f1a2b3c4d5e6f7a8b9c0d',
      id: '665f1a2b3c4d5e6f7a8b9c0d',
      userId: 'user-1',
      title: 'Senior Full Stack Engineer',
      summary: 'Experienced engineer building scalable cloud applications.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
      content: {
        basics: {
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          label: 'Senior Full Stack Engineer',
        },
        sections: [
          {
            id: 'work-1',
            type: SectionType.WORK,
            title: 'Work Experience',
            content: [
              {
                id: 'w-item-1',
                name: 'Analytical Engine Labs',
                position: 'Principal Engineer',
                startDate: '2022-01',
                description: 'Designed distributed computation pipelines.',
              },
            ],
          },
        ],
        sectionOrder: ['work-1'],
      },
    };

    it('calls POST /api/resumes then POST /api/resumes/<_id>/generate with { prompt } and returns data.data', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: '665f1a2b3c4d5e6f7a8b9c0d',
              id: 'fallback-virtual-id',
              title: 'AI Draft',
              content: {
                basics: { name: 'Ada Lovelace', email: 'ada@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: sampleGeneratedResume,
          },
        } as any);

      const prompt = 'Senior Full Stack Engineer with 6 years of Node.js and React experience';
      const result = await resumeService.generateFromPrompt(prompt, {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
        title: 'AI Draft',
        content: {
          basics: {
            name: 'Ada Lovelace',
            email: 'ada@example.com',
          },
          sections: [],
          sectionOrder: [],
        },
      });
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/665f1a2b3c4d5e6f7a8b9c0d/generate',
        { prompt }
      );
      expect(mockedAxios.delete).not.toHaveBeenCalled();
      expect(result).toEqual(sampleGeneratedResume);
    });

    it('falls back to id when _id is not present on the created resume', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              id: 'draft-id-only-99',
              title: 'AI Draft',
              content: {
                basics: { name: 'Your Name', email: 'you@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              ...sampleGeneratedResume,
              _id: undefined,
              id: 'draft-id-only-99',
            },
          },
        } as any);

      const result = await resumeService.generateFromPrompt('Frontend engineer resume', {
        name: 'Your Name',
        email: 'you@example.com',
      });

      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/draft-id-only-99/generate',
        { prompt: 'Frontend engineer resume' }
      );
      expect(result.id).toBe('draft-id-only-99');
    });

    it('rejects when creating the draft resume (POST /api/resumes) fails without calling delete', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(
        resumeService.generateFromPrompt('Build me a resume', {
          name: 'Your Name',
          email: 'you@example.com',
        })
      ).rejects.toThrow('Validation failed');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).not.toHaveBeenCalled();
    });

    it('deletes the empty AI Draft resume and rejects when POST /api/resumes/:id/generate fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'draft-502',
              title: 'AI Draft',
              content: {
                basics: { name: 'Your Name', email: 'you@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        } as any)
        .mockRejectedValueOnce(new Error('AI Service Error: Upstream timeout'));
      mockedAxios.delete.mockResolvedValueOnce({ data: { success: true, data: null } } as any);

      await expect(
        resumeService.generateFromPrompt('Build me a resume', {
          name: 'Your Name',
          email: 'you@example.com',
        })
      ).rejects.toThrow('AI Service Error: Upstream timeout');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.delete).toHaveBeenCalledTimes(1);
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/resumes/draft-502');
    });

    it('preserves the original generation error even if draft cleanup DELETE fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'draft-cleanup-err',
              title: 'AI Draft',
              content: {
                basics: { name: 'Your Name', email: 'you@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        } as any)
        .mockRejectedValueOnce(new Error('AI Service Error: Rate limit exceeded'));
      mockedAxios.delete.mockRejectedValueOnce(new Error('Network error during delete'));

      await expect(
        resumeService.generateFromPrompt('Build me a resume', {
          name: 'Your Name',
          email: 'you@example.com',
        })
      ).rejects.toThrow('AI Service Error: Rate limit exceeded');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/resumes/draft-cleanup-err');
    });
  });

  describe('HomePage handleAIGeneration integration', () => {
    const generatedResume: ResumeWithMeta = {
      _id: 'gen-res-101',
      id: 'gen-res-101',
      userId: 'user-1',
      title: 'Staff Backend Engineer',
      summary: 'Distributed systems specialist.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
      content: {
        basics: {
          name: 'Grace Hopper',
          email: 'grace@example.com',
          label: 'Staff Backend Engineer',
        },
        sections: [],
        sectionOrder: [],
      },
    };

    it('uses fallback basics (Your Name / you@example.com) when user prop is omitted and opens editor with generated resume', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { _id: 'gen-res-101', title: 'AI Draft' },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: generatedResume,
          },
        } as any);

      render(<HomePage />);

      const aiGenerateBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiGenerateBtn);

      const promptInput = screen.getByLabelText(/Enter your requirements/i);
      fireEvent.change(promptInput, {
        target: { value: 'Staff Backend Engineer specializing in Go and Kubernetes' },
      });

      const submitBtn = screen.getByRole('button', { name: /Generate Resume/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
          title: 'AI Draft',
          content: {
            basics: {
              name: 'Your Name',
              email: 'you@example.com',
            },
            sections: [],
            sectionOrder: [],
          },
        });
      });

      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/gen-res-101/generate',
        { prompt: 'Staff Backend Engineer specializing in Go and Kubernetes' }
      );
      expect(toast.success).toHaveBeenCalledWith('Resume generated successfully!');

      await waitFor(() => {
        expect(screen.getAllByText('Grace Hopper').length).toBeGreaterThan(0);
      });
    });

    it('passes logged-in user name and email when provided via props', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { _id: 'gen-res-202', title: 'AI Draft' },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: generatedResume,
          },
        } as any);

      render(
        <HomePage
          user={{
            name: 'Grace Hopper',
            email: 'grace@example.com',
          }}
        />
      );

      const aiGenerateBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiGenerateBtn);

      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Compiler architect resume' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
          title: 'AI Draft',
          content: {
            basics: {
              name: 'Grace Hopper',
              email: 'grace@example.com',
            },
            sections: [],
            sectionOrder: [],
          },
        });
      });
    });

    it('displays error toast and stays on list view when generation fails', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);
      mockedAxios.post.mockRejectedValueOnce(new Error('AI Service unavailable'));

      render(<HomePage />);

      const aiGenerateBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiGenerateBtn);

      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Backend engineer resume' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('AI Service unavailable');
      });

      expect(screen.getByText('Generate AI Resume')).toBeInTheDocument();
    });
  });

  describe('App -> HomePage user prop wiring', () => {
    const generatedResume: ResumeWithMeta = {
      _id: 'gen-res-303',
      id: 'gen-res-303',
      userId: 'user-303',
      title: 'Principal Systems Engineer',
      summary: 'Cloud architecture leader.',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:05.000Z',
      content: {
        basics: {
          name: 'Margaret Hamilton',
          email: 'margaret@apollo.org',
          label: 'Principal Systems Engineer',
        },
        sections: [],
        sectionOrder: [],
      },
    };

    it('stores user on login and passes user prop from App to HomePage for AI draft creation', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            message: 'Login successful',
            token: 'jwt-apollo-token',
            user: {
              id: 'user-303',
              name: 'Margaret Hamilton',
              email: 'margaret@apollo.org',
            },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { _id: 'gen-res-303', title: 'AI Draft' },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: generatedResume,
          },
        } as any);
      mockedAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);

      render(<App />);

      fireEvent.change(screen.getByLabelText(/Email address/i), {
        target: { value: 'margaret@apollo.org' },
      });
      fireEvent.change(screen.getByLabelText(/^Password$/i), {
        target: { value: 'Secret123!' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));

      const aiGenerateBtn = await screen.findByRole('button', { name: /AI Generate/i });
      expect(getStoredUser()).toEqual({
        id: 'user-303',
        name: 'Margaret Hamilton',
        email: 'margaret@apollo.org',
      });

      fireEvent.click(aiGenerateBtn);
      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Flight software director resume' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenNthCalledWith(2, '/api/resumes', {
          title: 'AI Draft',
          content: {
            basics: {
              name: 'Margaret Hamilton',
              email: 'margaret@apollo.org',
            },
            sections: [],
            sectionOrder: [],
          },
        });
      });
    });

    it('hydrates stored user in App across reloads and clears stored user on logout', async () => {
      setToken('persisted-jwt');
      setStoredUser({
        id: 'user-404',
        name: 'Katherine Johnson',
        email: 'katherine@nasa.gov',
      });
      mockedAxios.get.mockResolvedValueOnce({ data: { success: true, data: [] } } as any);
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { _id: 'gen-res-404', title: 'AI Draft' },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: generatedResume,
          },
        } as any);

      render(<App />);

      const aiGenerateBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiGenerateBtn);

      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Orbital mechanics mathematician resume' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
          title: 'AI Draft',
          content: {
            basics: {
              name: 'Katherine Johnson',
              email: 'katherine@nasa.gov',
            },
            sections: [],
            sectionOrder: [],
          },
        });
      });

      // Return to list view and log out to verify stored user cleanup
      fireEvent.click(screen.getByRole('button', { name: /Logout/i }));
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('AI Output Normalization, Editor Hydration & Inline Preview Isolation', () => {
    it('normalizes raw AI section aliases, missing IDs, string education dates, and invalid emails in resumeService.generateFromPrompt', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'raw-ai-res-1',
              title: 'AI Draft',
              content: {
                basics: { name: 'Grace Hopper', email: 'grace@navy.mil' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        } as any)
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'raw-ai-res-1',
              title: 'Compiler Engineer',
              summary: 'Built early compiler toolchains.',
              content: {
                basics: {
                  name: '',
                  email: 'not-a-valid-email',
                  label: 'Compiler Engineer',
                },
                sections: [
                  {
                    type: 'work',
                    title: 'Experience',
                    content: [
                      {
                        company: 'Remington Rand',
                        position: 'Director of Automatic Programming',
                        startDate: '1952-01',
                        endDate: '1964-12',
                        description: 'Led FLOW-MATIC compiler development.',
                      },
                      {
                        company: 'Eckert-Mauchly',
                        position: 'Senior Mathematician',
                        startDate: '1949-06',
                        endDate: '1952-01',
                        description: 'Developed A-0 system.',
                      },
                    ],
                  },
                  {
                    type: 'education',
                    title: 'Education',
                    content: [
                      {
                        institution: 'Yale University',
                        degree: 'Ph.D.',
                        field: 'Mathematics',
                        startDate: '1930-09',
                        endDate: 'May 1934',
                      },
                    ],
                  },
                  {
                    type: 'skills',
                    title: 'Skills',
                    content: ['COBOL', { name: 'Compilers', level: 'Expert' }],
                  },
                  {
                    type: 'patents',
                    title: 'Patents & Specifications',
                    content: [
                      {
                        name: 'Automatic Programming Specification',
                        description: 'Machine-independent language design',
                      },
                    ],
                  },
                ],
                sectionOrder: [],
              },
            },
          },
        } as any);

      const normalized = await resumeService.generateFromPrompt(
        'Compiler engineer resume',
        { name: 'Grace Hopper', email: 'grace@navy.mil' }
      );

      expect(normalized.content.basics.name).toBe('Grace Hopper');
      expect(normalized.content.basics.email).toBe('grace@navy.mil');

      const sections = normalized.content.sections;
      expect(sections.map((s) => s.type)).toEqual([
        SectionType.WORK,
        SectionType.EDUCATION,
        SectionType.SKILLS,
        SectionType.CUSTOM,
      ]);
      expect(sections[3].isCustom).toBe(true);

      const sectionIds = sections.map((s) => s.id);
      expect(sectionIds.every((id) => Boolean(id && id.trim()))).toBe(true);
      expect(new Set(sectionIds).size).toBe(sectionIds.length);
      expect(normalized.content.sectionOrder).toEqual(sectionIds);

      const itemIds = sections.flatMap((s) => s.content.map((i: any) => i.id));
      expect(itemIds.every((id) => Boolean(id && id.trim()))).toBe(true);
      expect(new Set(itemIds).size).toBe(itemIds.length);

      expect(sections[1].content[0].startDate).toEqual({
        month: 'Sep',
        year: '1930',
      });
      expect(sections[1].content[0].endDate).toEqual({
        month: 'May',
        year: '1934',
      });
    });

    it('hydrates legacy AI resumes in ResumeEditor, opens matching modals with education dates, and isolates edit/hide/delete per item', async () => {
      mockedAxios.put.mockResolvedValue({
        data: { success: true, data: {} },
      } as any);

      const legacyAiResume: any = {
        _id: 'legacy-ai-99',
        title: 'Full Stack Engineer',
        summary: 'Builds web platforms.',
        content: {
          basics: {
            name: 'Linus Torvalds',
            email: 'linus@kernel.org',
          },
          sections: [
            {
              type: 'work',
              title: 'Work History',
              content: [
                {
                  company: 'Alpha Systems',
                  position: 'Lead Engineer',
                  startDate: 'Jan 2022',
                  endDate: 'Dec 2024',
                  description: 'Built core platform.',
                },
                {
                  company: 'Beta Labs',
                  position: 'Software Engineer',
                  startDate: 'Jan 2020',
                  endDate: 'Dec 2021',
                  description: 'Built developer tools.',
                },
              ],
            },
            {
              type: 'education',
              title: 'Academic Background',
              content: [
                {
                  institution: 'University of Helsinki',
                  degree: 'M.Sc.',
                  field: 'Computer Science',
                  startDate: '2018-09',
                  endDate: 'May 2022',
                },
              ],
            },
            {
              type: 'patents',
              title: 'Open Source Stewardship',
              content: [
                {
                  title: 'Git SCM',
                  description: 'Distributed version control',
                },
              ],
            },
          ],
          sectionOrder: [],
        },
      };

      render(<ResumeEditor initialResume={legacyAiResume} onBack={jest.fn()} />);

      // Open Education modal and verify string dates hydrated into Month/Year selects
      fireEvent.click(screen.getByRole('button', { name: /Edit University of Helsinki/i }));
      expect(screen.queryByText(/Unsupported Section/i)).not.toBeInTheDocument();
      const eduDialog = screen.getByRole('dialog');
      expect(within(eduDialog).getByLabelText(/School \/ Institution/i)).toHaveValue(
        'University of Helsinki'
      );
      const startDateGroup = within(eduDialog).getByText('Start Date').parentElement!;
      const endDateGroup = within(eduDialog).getByText('End Date').parentElement!;
      expect(within(startDateGroup).getByRole('button', { name: 'Sep' })).toBeInTheDocument();
      expect(within(startDateGroup).getByRole('button', { name: '2018' })).toBeInTheDocument();
      expect(within(endDateGroup).getByRole('button', { name: 'May' })).toBeInTheDocument();
      expect(within(endDateGroup).getByRole('button', { name: '2022' })).toBeInTheDocument();
      fireEvent.click(within(eduDialog).getByRole('button', { name: /^Save$/i }));

      // Open unknown section ("patents" -> CustomItem) and verify no "Unsupported Section" dialog
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Edit Git SCM/i }));
      expect(screen.queryByText(/Unsupported Section/i)).not.toBeInTheDocument();
      const customDialog = screen.getByRole('dialog');
      expect(within(customDialog).getByDisplayValue('Git SCM')).toBeInTheDocument();
      fireEvent.click(within(customDialog).getByRole('button', { name: /Cancel/i }));

      // Edit ONLY the second work item (Beta Labs) and verify Alpha Systems is untouched
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Edit Beta Labs/i }));
      const workDialog = screen.getByRole('dialog');
      const companyInput = within(workDialog).getByDisplayValue('Beta Labs');
      fireEvent.change(companyInput, { target: { value: 'Beta Cloud Labs' } });
      fireEvent.click(within(workDialog).getByRole('button', { name: /^Save$/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Edit Beta Cloud Labs/i })).toBeInTheDocument();
      });
      expect(screen.getByRole('button', { name: /Edit Alpha Systems/i })).toBeInTheDocument();

      // Hide ONLY Alpha Systems and verify Beta Cloud Labs remains visible (not hidden)
      fireEvent.click(screen.getByRole('button', { name: /Hide Alpha Systems/i }));
      expect(screen.getByRole('button', { name: /Show Alpha Systems/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Hide Beta Cloud Labs/i })).toBeInTheDocument();

      // Delete ONLY Alpha Systems and verify Beta Cloud Labs remains in the section
      fireEvent.click(screen.getByRole('button', { name: /Remove Alpha Systems/i }));
      expect(screen.queryByRole('button', { name: /Alpha Systems/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Edit Beta Cloud Labs/i })).toBeInTheDocument();
    });

    it('isolates inline preview edits to the single edited item in ModernTemplate and ProfessionalTemplate even when raw items omit IDs', async () => {
      const buildRawMultiItemResume = (): IResume =>
        ({
          title: 'Systems Engineer',
          summary: 'Builds reliable services.',
          content: {
            basics: {
              name: 'Barbara Liskov',
              email: 'liskov@mit.edu',
            },
            sections: [
              {
                id: 'work-sec',
                type: 'work' as any,
                title: 'Experience',
                content: [
                  {
                    company: 'First Corp',
                    position: 'Principal Architect',
                    description: 'Designed CLU language.',
                  },
                  {
                    company: 'Second Corp',
                    position: 'Staff Researcher',
                    description: 'Designed Thor object database.',
                  },
                ],
              },
              {
                id: 'skill-sec',
                type: 'skills' as any,
                title: 'Skills',
                content: [
                  { name: 'Distributed Systems', level: 'Expert' },
                  { name: 'Type Theory', level: 'Advanced' },
                ],
              },
            ],
            sectionOrder: ['work-sec', 'skill-sec'],
          },
        } as IResume);

      // Verify ModernTemplate inline edit isolation
      let modernLatest: IResume | null = null;
      const { unmount } = render(
        <ModernTemplate
          resume={buildRawMultiItemResume()}
          onChange={(updated) => {
            modernLatest = updated;
          }}
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Inline edit: Designed Thor object database.' })
      );
      const modernTextarea = await screen.findByDisplayValue(
        'Designed Thor object database.'
      );
      fireEvent.change(modernTextarea, {
        target: { value: 'Designed Byzantine fault-tolerant replication.' },
      });
      fireEvent.blur(modernTextarea);

      expect(modernLatest).not.toBeNull();
      expect(modernLatest!.content.sections[0].content[0].description).toBe(
        'Designed CLU language.'
      );
      expect(modernLatest!.content.sections[0].content[1].description).toBe(
        'Designed Byzantine fault-tolerant replication.'
      );
      unmount();

      // Verify ProfessionalTemplate inline edit isolation on skills
      let professionalLatest: IResume | null = null;
      render(
        <ProfessionalTemplate
          resume={buildRawMultiItemResume()}
          onChange={(updated) => {
            professionalLatest = updated;
          }}
        />
      );

      fireEvent.click(
        screen.getByRole('button', { name: 'Inline edit: Type Theory' })
      );
      const skillInput = await screen.findByDisplayValue('Type Theory');
      fireEvent.change(skillInput, {
        target: { value: 'Program Verification' },
      });
      fireEvent.blur(skillInput);

      expect(professionalLatest).not.toBeNull();
      expect(professionalLatest!.content.sections[1].content[0].name).toBe(
        'Distributed Systems'
      );
      expect(professionalLatest!.content.sections[1].content[1].name).toBe(
        'Program Verification'
      );
    });
  });
});
