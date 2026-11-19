import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import Header, { SM_MEDIA_QUERY } from '../../common/Header';
import HomePage from '../../HomePage';
import CoverLetterEditor from '../CoverLetterEditor';
import CoverLettersWorkspace from '../CoverLettersWorkspace';
import { coverLetterService } from '../../../services/coverLetter.service';
import { resumeService, ResumeWithMeta } from '../../../services/resume.service';
import { ICoverLetter } from '../../../types/coverLetter';
import axiosInstance from '../../../services/axios';

jest.mock('../../../services/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../ResumeEditor', () => {
  return function MockResumeEditor() {
    return <div data-testid="mock-resume-editor">Resume Editor</div>;
  };
});

const sampleResumes: ResumeWithMeta[] = [
  {
    id: 'res-101',
    _id: 'res-101',
    userId: 'u-1',
    title: 'Staff Frontend CV',
    templateId: 'bold-header',
    themeConfig: {
      primaryColor: '#0f766e',
      accentColor: '#7c3aed',
      fontPairingId: 'elegant-hybrid',
    },
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-11-10T12:00:00.000Z',
    content: {
      basics: {
        name: 'Ashok Anumula',
        label: 'Staff Frontend Architect',
        email: 'ashok@example.com',
        phone: '+1 (415) 555-0192',
        location: {
          city: 'San Francisco',
          countryCode: 'US',
        },
      },
      sections: [],
      sectionOrder: [],
    },
  },
  {
    id: 'res-102',
    _id: 'res-102',
    userId: 'u-1',
    title: 'Platform Engineer CV',
    templateId: 'executive',
    themeConfig: {
      primaryColor: '#1e293b',
      accentColor: '#2563eb',
      fontPairingId: 'modern-sans',
    },
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-11-12T12:00:00.000Z',
    content: {
      basics: {
        name: 'Jordan Rivera',
        label: 'Principal Platform Engineer',
        email: 'jordan@example.com',
        phone: '+1 (206) 555-0144',
      },
      sections: [],
      sectionOrder: [],
    },
  },
];

const sampleCoverLetter: ICoverLetter = {
  _id: 'cl-1',
  id: 'cl-1',
  title: 'Northstar Frontend Application',
  resumeId: 'res-101',
  recipient: {
    name: 'Taylor Morgan',
    company: 'Northstar Systems',
    address: '100 Market St\nSan Francisco, CA',
  },
  jobTitle: 'Senior Frontend Engineer',
  jobDescription: 'Lead accessible React and TypeScript architecture.',
  date: '2026-11-19',
  greeting: 'Dear Taylor Morgan,',
  body: 'Opening paragraph connecting background to Northstar.\n\nSecond paragraph highlighting React and design systems.\n\nClosing paragraph thanking the team.',
  closing: 'Warm regards,',
  templateId: 'bold-header',
  themeConfig: {
    primaryColor: '#0f766e',
    accentColor: '#7c3aed',
    fontPairingId: 'elegant-hybrid',
  },
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-19T12:00:00.000Z',
};

function mockViewport(widthPx: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: widthPx,
  });

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => {
      const minMatch = query.match(/\(min-width:\s*(\d+)px\)/);
      const matches = minMatch ? widthPx >= Number(minMatch[1]) : query === SM_MEDIA_QUERY ? widthPx >= 640 : true;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      };
    }),
  });
}

describe('Cover Letters Feature', () => {
  const originalMatchMedia = window.matchMedia;
  const originalInnerWidth = window.innerWidth;
  const originalPrint = window.print;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    window.print = jest.fn();
  });

  afterEach(() => {
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
    window.print = originalPrint;
  });

  describe('coverLetterService API integration', () => {
    it('normalizes IDs and calls /api/cover-letters CRUD, duplicate, and generate endpoints', async () => {
      (axiosInstance.get as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: [{ _id: 'cl-99', title: 'My Letter' }] },
      });
      const list = await coverLetterService.getCoverLetters();
      expect(axiosInstance.get).toHaveBeenCalledWith('/api/cover-letters');
      expect(list[0].id).toBe('cl-99');
      expect(list[0]._id).toBe('cl-99');

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { _id: 'cl-100', title: 'Created' } },
      });
      const created = await coverLetterService.createCoverLetter({ title: 'Created' });
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/cover-letters', { title: 'Created' });
      expect(created.id).toBe('cl-100');

      (axiosInstance.patch as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { _id: 'cl-100', title: 'Patched' } },
      });
      const updated = await coverLetterService.updateCoverLetter('cl-100', { title: 'Patched' });
      expect(axiosInstance.patch).toHaveBeenCalledWith('/api/cover-letters/cl-100', {
        title: 'Patched',
      });
      expect(updated.title).toBe('Patched');

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { _id: 'cl-101', title: 'Patched (Copy)' } },
      });
      const duplicated = await coverLetterService.duplicateCoverLetter('cl-100');
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/cover-letters/cl-100/duplicate');
      expect(duplicated.title).toBe('Patched (Copy)');

      (axiosInstance.post as jest.Mock).mockResolvedValueOnce({
        data: { success: true, data: { _id: 'cl-100', body: 'AI generated body' } },
      });
      const generated = await coverLetterService.generateCoverLetter('cl-100', 'focus on React');
      expect(axiosInstance.post).toHaveBeenCalledWith('/api/cover-letters/cl-100/generate', {
        prompt: 'focus on React',
      });
      expect(generated.body).toBe('AI generated body');

      (axiosInstance.delete as jest.Mock).mockResolvedValueOnce({ data: { success: true } });
      await coverLetterService.deleteCoverLetter('cl-100');
      expect(axiosInstance.delete).toHaveBeenCalledWith('/api/cover-letters/cl-100');
    });
  });

  describe('Navigation & List Page (Loading, Error, Empty, Cards, Duplicate, Confirm Delete)', () => {
    it('exposes Cover Letters tab in desktop and 375px mobile menu and switches HomePage tab', async () => {
      mockViewport(375);
      const onTabChange = jest.fn();
      const { unmount } = render(
        <Header showLogout activeTab="resumes" onTabChange={onTabChange} />
      );

      fireEvent.click(screen.getByRole('button', { name: /toggle navigation menu/i }));
      const mobileCoverLettersBtn = screen.getByRole('button', { name: /^cover letters$/i });
      expect(mobileCoverLettersBtn).toBeInTheDocument();
      fireEvent.click(mobileCoverLettersBtn);
      expect(onTabChange).toHaveBeenCalledWith('cover-letters');
      unmount();

      // Desktop HomePage tab switch
      mockViewport(1280);
      jest.spyOn(resumeService, 'getResumes').mockResolvedValue([]);
      jest.spyOn(coverLetterService, 'getCoverLetters').mockResolvedValue([]);

      render(<HomePage user={{ name: 'Ashok', email: 'ashok@example.com' }} />);

      const coverLettersTab = screen.getByRole('button', { name: /^cover letters$/i });
      fireEvent.click(coverLettersTab);

      await waitFor(() => {
        expect(screen.getByTestId('cover-letter-empty-state')).toBeInTheDocument();
      });
    });

    it('renders loading skeleton, handles error + retry, and supports create, duplicate, and confirm delete', async () => {
      jest.spyOn(resumeService, 'getResumes').mockResolvedValue(sampleResumes);
      const getLettersSpy = jest
        .spyOn(coverLetterService, 'getCoverLetters')
        .mockRejectedValueOnce(new Error('Network unavailable'))
        .mockResolvedValueOnce([sampleCoverLetter]);

      const duplicateSpy = jest
        .spyOn(coverLetterService, 'duplicateCoverLetter')
        .mockResolvedValue({
          ...sampleCoverLetter,
          _id: 'cl-2',
          id: 'cl-2',
          title: 'Northstar Frontend Application (Copy)',
        });

      const deleteSpy = jest
        .spyOn(coverLetterService, 'deleteCoverLetter')
        .mockResolvedValue(undefined);

      render(<CoverLettersWorkspace user={{ name: 'Ashok', email: 'ashok@example.com' }} />);

      // Loading skeleton initially visible
      expect(screen.getByTestId('cover-letter-list-skeleton')).toBeInTheDocument();

      // Error state appears after first rejected request
      await waitFor(() => {
        expect(screen.getByTestId('cover-letter-error-state')).toBeInTheDocument();
      });
      expect(screen.getByText(/network unavailable/i)).toBeInTheDocument();

      // Retry loads the list of cards
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      await waitFor(() => {
        expect(screen.getAllByTestId('cover-letter-card')).toHaveLength(1);
      });
      expect(getLettersSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Staff Frontend CV')).toBeInTheDocument();

      // Duplicate adds copied card
      fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
      await waitFor(() => {
        expect(duplicateSpy).toHaveBeenCalledWith('cl-1');
      });
      await waitFor(() => {
        expect(screen.getAllByTestId('cover-letter-card')).toHaveLength(2);
      });
      expect(
        screen.getByText('Northstar Frontend Application (Copy)')
      ).toBeInTheDocument();

      // Delete opens confirmation modal; Cancel keeps cards; Confirm deletes
      const deleteButtons = screen.getAllByRole('button', {
        name: /delete cover letter/i,
      });
      fireEvent.click(deleteButtons[0]);

      const modal = screen.getByTestId('delete-cover-letter-modal');
      expect(modal).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      expect(screen.queryByTestId('delete-cover-letter-modal')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('cover-letter-card')).toHaveLength(2);

      // Open again and confirm delete
      fireEvent.click(
        screen.getAllByRole('button', { name: /delete cover letter/i })[0]
      );
      fireEvent.click(screen.getByTestId('confirm-delete-cover-letter-btn'));

      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('cl-2');
      });
      await waitFor(() => {
        expect(screen.getAllByTestId('cover-letter-card')).toHaveLength(1);
      });
    });
  });

  describe('CoverLetterEditor & Live A4 Preview', () => {
    it('reuses linked resume basics & theme CSS variables in letterhead, renders live paragraphs, autosaves, drafts with AI, and prints', async () => {
      mockViewport(1280);
      jest.useFakeTimers();

      let resolveSave: ((val: ICoverLetter) => void) | null = null;
      const updateSpy = jest
        .spyOn(coverLetterService, 'updateCoverLetter')
        .mockImplementation(
          (_id, payload) =>
            new Promise<ICoverLetter>((resolve) => {
              resolveSave = () =>
                resolve({
                  ...sampleCoverLetter,
                  ...payload,
                  _id: 'cl-1',
                  id: 'cl-1',
                } as ICoverLetter);
            })
        );

      const generateSpy = jest
        .spyOn(coverLetterService, 'generateCoverLetter')
        .mockResolvedValue({
          ...sampleCoverLetter,
          body: 'AI Paragraph One tailored to Northstar.\n\nAI Paragraph Two grounded in Staff Frontend CV.',
        });

      render(
        <CoverLetterEditor
          initialCoverLetter={sampleCoverLetter}
          resumes={sampleResumes}
          onBack={jest.fn()}
        />
      );

      // Initial saved indicator
      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'All changes saved'
      );

      // Letterhead reuses linked resume's basics (name, label, contact)
      expect(screen.getByTestId('letterhead-sender-name')).toHaveTextContent(
        'Ashok Anumula'
      );
      expect(screen.getByTestId('letterhead-sender-label')).toHaveTextContent(
        'Staff Frontend Architect'
      );
      expect(screen.getByTestId('cover-letter-contact-row')).toHaveTextContent(
        'ashok@example.com'
      );
      expect(screen.getByTestId('cover-letter-contact-row')).toHaveTextContent(
        '+1 (415) 555-0192'
      );

      // Preview page carries matching template/theme CSS variables
      const previewPage = screen.getByTestId('cover-letter-preview-page');
      expect(previewPage.style.getPropertyValue('--theme-primary')).toBe('#0f766e');
      expect(previewPage.style.getPropertyValue('--theme-accent')).toBe('#7c3aed');

      // Initial 3 paragraphs rendered in A4 preview
      expect(screen.getAllByTestId('cover-letter-preview-paragraph')).toHaveLength(3);

      // Switching paired resume updates letterhead & theme CSS variables live
      fireEvent.change(screen.getByLabelText(/link to a resume/i), {
        target: { value: 'res-102' },
      });

      expect(screen.getByTestId('letterhead-sender-name')).toHaveTextContent(
        'Jordan Rivera'
      );
      expect(screen.getByTestId('letterhead-sender-label')).toHaveTextContent(
        'Principal Platform Engineer'
      );
      expect(previewPage.style.getPropertyValue('--theme-primary')).toBe('#1e293b');
      expect(previewPage.style.getPropertyValue('--theme-accent')).toBe('#2563eb');

      // Editing body paragraphs updates live A4 preview immediately & triggers autosave
      fireEvent.change(screen.getByLabelText(/body paragraphs/i), {
        target: { value: 'First live paragraph.\n\nSecond live paragraph.' },
      });

      const liveParagraphs = screen.getAllByTestId('cover-letter-preview-paragraph');
      expect(liveParagraphs).toHaveLength(2);
      expect(liveParagraphs[0]).toHaveTextContent('First live paragraph.');
      expect(liveParagraphs[1]).toHaveTextContent('Second live paragraph.');

      // Advance debounce timer -> Saving… state appears
      act(() => {
        jest.advanceTimersByTime(950);
      });

      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'Saving…'
      );
      expect(updateSpy).toHaveBeenCalledTimes(1);

      // Resolve save -> All changes saved appears
      await act(async () => {
        resolveSave?.(sampleCoverLetter);
      });

      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'All changes saved'
      );

      // Switch to immediate resolve for subsequent update before AI draft
      updateSpy.mockImplementation(async (_id, payload) => ({
        ...sampleCoverLetter,
        ...payload,
        _id: 'cl-1',
        id: 'cl-1',
      }));

      fireEvent.change(screen.getByLabelText(/optional ai guidance/i), {
        target: { value: 'emphasize architecture' },
      });
      fireEvent.click(screen.getByTestId('draft-with-ai-btn'));

      await waitFor(() => {
        expect(generateSpy).toHaveBeenCalledWith('cl-1', 'emphasize architecture');
      });

      await waitFor(() => {
        expect(
          screen.getByText('AI Paragraph One tailored to Northstar.')
        ).toBeInTheDocument();
      });

      // Print button triggers window.print()
      fireEvent.click(screen.getByTestId('print-cover-letter-btn'));
      expect(window.print).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('switches to Preview tab automatically when printing from 375px mobile viewport', () => {
      mockViewport(375);

      render(
        <CoverLetterEditor
          initialCoverLetter={sampleCoverLetter}
          resumes={sampleResumes}
          onBack={jest.fn()}
        />
      );

      // Starts in Editor tab on mobile
      expect(screen.getByRole('tab', { name: /^editor$/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );

      fireEvent.click(screen.getByTestId('print-cover-letter-btn'));

      expect(window.print).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('tab', { name: /^preview$/i })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      expect(screen.getByTestId('cover-letter-preview-page')).toBeInTheDocument();
    });
  });
});
