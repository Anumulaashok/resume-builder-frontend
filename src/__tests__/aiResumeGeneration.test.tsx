import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import axiosInstance from '../services/axios';
import { resumeService, ResumeWithMeta } from '../services/resume.service';
import HomePage from '../components/HomePage';

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

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn(),
  }),
  Toaster: () => null,
}));

jest.mock('../components/ResumeEditor', () => ({
  __esModule: true,
  default: ({ initialResume }: { initialResume?: ResumeWithMeta }) => (
    <div data-testid="mock-resume-editor">
      <span data-testid="editor-resume-id">{initialResume?._id || initialResume?.id}</span>
      <span data-testid="editor-resume-title">{initialResume?.title}</span>
      <span data-testid="editor-basics-name">{initialResume?.content?.basics?.name}</span>
    </div>
  ),
}));

const mockedAxios = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe('AI Resume Generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resumeService.generateFromPrompt', () => {
    it('creates an AI Draft resume via POST /api/resumes then calls POST /api/resumes/<_id>/generate and returns data.data', async () => {
      const createdDraft: ResumeWithMeta = {
        _id: 'mongo-id-123',
        id: 'virtual-id-999',
        userId: 'user-1',
        title: 'AI Draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        content: {
          basics: { name: 'Jane Doe', email: 'jane@example.com' },
          sections: [],
          sectionOrder: [],
        },
      };

      const generatedResume: ResumeWithMeta = {
        ...createdDraft,
        title: 'Senior Backend Engineer',
        summary: 'Experienced backend developer',
        content: {
          basics: {
            name: 'Jane Doe',
            email: 'jane@example.com',
            label: 'Senior Backend Engineer',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { success: true, data: createdDraft },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: generatedResume },
        });

      const prompt = 'Senior backend engineer with 6 years of Node.js experience';
      const result = await resumeService.generateFromPrompt(prompt, {
        name: 'Jane Doe',
        email: 'jane@example.com',
      });

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
        title: 'AI Draft',
        content: {
          basics: {
            name: 'Jane Doe',
            email: 'jane@example.com',
          },
          sections: [],
          sectionOrder: [],
        },
      });
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/mongo-id-123/generate',
        { prompt }
      );
      expect(result).toEqual(generatedResume);
    });

    it('falls back to id when _id is not present on the created resume', async () => {
      const createdDraft = {
        id: 'fallback-id-456',
        userId: 'user-1',
        title: 'AI Draft',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        content: {
          basics: { name: 'Your Name', email: 'you@example.com' },
          sections: [],
          sectionOrder: [],
        },
      } as ResumeWithMeta;

      const generatedResume: ResumeWithMeta = {
        ...createdDraft,
        title: 'Full Stack Developer',
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: { success: true, data: createdDraft },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: generatedResume },
        });

      const result = await resumeService.generateFromPrompt('Build a full stack resume', {
        name: 'Your Name',
        email: 'you@example.com',
      });

      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/fallback-id-456/generate',
        { prompt: 'Build a full stack resume' }
      );
      expect(result).toEqual(generatedResume);
    });

    it('rejects if POST /api/resumes fails and does not call generate', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Validation failed'));

      await expect(
        resumeService.generateFromPrompt('Frontend engineer prompt', {
          name: 'Your Name',
          email: 'you@example.com',
        })
      ).rejects.toThrow('Validation failed');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('rejects if POST /api/resumes/<id>/generate fails', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'draft-789',
              title: 'AI Draft',
              content: {
                basics: { name: 'Your Name', email: 'you@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        })
        .mockRejectedValueOnce(new Error('AI Service Error: Upstream timeout'));

      await expect(
        resumeService.generateFromPrompt('Frontend engineer prompt', {
          name: 'Your Name',
          email: 'you@example.com',
        })
      ).rejects.toThrow('AI Service Error: Upstream timeout');

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('HomePage handleAIGeneration integration', () => {
    it('falls back to default basics ("Your Name", "you@example.com") and opens ResumeEditor with the generated resume', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      const generatedResume: ResumeWithMeta = {
        _id: 'gen-resume-101',
        id: 'gen-resume-101',
        userId: 'user-1',
        title: 'Cloud Architect Resume',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        content: {
          basics: {
            name: 'Your Name',
            email: 'you@example.com',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'gen-resume-101',
              title: 'AI Draft',
              content: {
                basics: { name: 'Your Name', email: 'you@example.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: generatedResume },
        });

      render(<HomePage />);

      const aiBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiBtn);

      const promptInput = screen.getByLabelText(/Enter your requirements/i);
      fireEvent.change(promptInput, {
        target: { value: 'Cloud architect with AWS and Kubernetes experience' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(screen.getByTestId('mock-resume-editor')).toBeInTheDocument();
      });

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
      expect(mockedAxios.post).toHaveBeenNthCalledWith(
        2,
        '/api/resumes/gen-resume-101/generate',
        { prompt: 'Cloud architect with AWS and Kubernetes experience' }
      );
      expect(toast.success).toHaveBeenCalledWith('Resume generated successfully!');
      expect(screen.getByTestId('editor-resume-id')).toHaveTextContent('gen-resume-101');
      expect(screen.getByTestId('editor-resume-title')).toHaveTextContent('Cloud Architect Resume');
    });

    it('uses logged-in user name and email when provided via props', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });

      const generatedResume: ResumeWithMeta = {
        _id: 'gen-resume-202',
        id: 'gen-resume-202',
        userId: 'user-2',
        title: 'Staff Engineer Resume',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        content: {
          basics: {
            name: 'Alice Johnson',
            email: 'alice@company.com',
          },
          sections: [],
          sectionOrder: [],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              _id: 'gen-resume-202',
              title: 'AI Draft',
              content: {
                basics: { name: 'Alice Johnson', email: 'alice@company.com' },
                sections: [],
                sectionOrder: [],
              },
            },
          },
        })
        .mockResolvedValueOnce({
          data: { success: true, data: generatedResume },
        });

      render(<HomePage user={{ name: 'Alice Johnson', email: 'alice@company.com' }} />);

      const aiBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiBtn);

      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Staff engineer with distributed systems background' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Generate Resume/i }));

      await waitFor(() => {
        expect(screen.getByTestId('mock-resume-editor')).toBeInTheDocument();
      });

      expect(mockedAxios.post).toHaveBeenNthCalledWith(1, '/api/resumes', {
        title: 'AI Draft',
        content: {
          basics: {
            name: 'Alice Johnson',
            email: 'alice@company.com',
          },
          sections: [],
          sectionOrder: [],
        },
      });
      expect(screen.getByTestId('editor-basics-name')).toHaveTextContent('Alice Johnson');
    });

    it('shows error toast and resets loading state when AI generation fails', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { success: true, data: [] },
      });
      mockedAxios.post.mockRejectedValueOnce(new Error('AI Service unavailable'));

      render(<HomePage />);

      const aiBtn = await screen.findByRole('button', { name: /AI Generate/i });
      fireEvent.click(aiBtn);

      fireEvent.change(screen.getByLabelText(/Enter your requirements/i), {
        target: { value: 'Backend engineer resume' },
      });

      const generateBtn = screen.getByRole('button', { name: /Generate Resume/i });
      fireEvent.click(generateBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('AI Service unavailable');
      });

      expect(screen.getByRole('button', { name: /Generate Resume/i })).not.toBeDisabled();
      expect(screen.queryByTestId('mock-resume-editor')).not.toBeInTheDocument();
    });
  });
});
