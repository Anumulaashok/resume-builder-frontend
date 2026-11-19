import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import axiosInstance from '../services/axios';
import { resumeService, ResumeWithMeta } from '../services/resume.service';
import HomePage from '../components/HomePage';
import App from '../App';
import { SectionType } from '../types/resume';
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
});
