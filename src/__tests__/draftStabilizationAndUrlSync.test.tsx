import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import toast from 'react-hot-toast';
import HomePage from '../components/HomePage';
import ResumeEditor from '../components/ResumeEditor';
import { PortfolioEditor } from '../components/portfolio/PortfolioEditor';
import { defaultResume } from '../constants/editorConstants';
import { resumeService } from '../services/resume.service';
import { portfolioService } from '../services/portfolio.service';
import { defaultPortfolio, IPortfolio } from '../types/portfolio';

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

jest.mock('../components/ResumePreview', () => {
  return function MockResumePreview({ resume }: any) {
    return <div data-testid="mock-resume-preview">{resume?.title}</div>;
  };
});

jest.mock('../services/resume.service', () => {
  const actual = jest.requireActual('../services/resume.service');
  return {
    ...actual,
    resumeService: {
      getResumes: jest.fn(),
      getResumeById: jest.fn(),
      createResume: jest.fn(),
      updateResume: jest.fn(),
      deleteResume: jest.fn(),
      generateFromPrompt: jest.fn(),
      getShareSettings: jest.fn(),
      updateShareSettings: jest.fn(),
      getResumeHistory: jest.fn().mockResolvedValue([]),
      exportResumeTxt: jest.fn(),
    },
  };
});

jest.mock('../services/portfolio.service', () => ({
  portfolioService: {
    getPortfolios: jest.fn(),
    getPortfolioById: jest.fn(),
    createPortfolio: jest.fn(),
    updatePortfolio: jest.fn(),
    deletePortfolio: jest.fn(),
    getPublicPortfolio: jest.fn(),
    uploadMedia: jest.fn(),
  },
}));

describe('Stabilize draft saves & native URL sync', () => {
  let toastSuccessSpy: jest.SpyInstance;
  let toastErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState(null, '', '/');
    (resumeService.getResumes as jest.Mock).mockResolvedValue([]);
    (portfolioService.getPortfolios as jest.Mock).mockResolvedValue([]);
    toastSuccessSpy = jest.spyOn(toast, 'success').mockImplementation(() => 'ok');
    toastErrorSpy = jest.spyOn(toast, 'error').mockImplementation(() => 'err');
  });

  afterEach(() => {
    jest.useRealTimers();
    toastSuccessSpy.mockRestore();
    toastErrorSpy.mockRestore();
  });

  describe('1. Contact prefill & defaultResume immutability', () => {
    it('prefills new resume drafts with authenticated user name and email without mutating defaultResume', async () => {
      render(
        <HomePage user={{ name: 'Grace Hopper', email: 'grace@navy.mil' }} />
      );

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);

      const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;

      expect(nameInput.value).toBe('Grace Hopper');
      expect(emailInput.value).toBe('grace@navy.mil');
      expect(defaultResume.content.basics.name).toBe('');
      expect(defaultResume.content.basics.email).toBe('');
    });

    it('never invents fake contact values when user fields are empty or missing', async () => {
      render(<HomePage user={{ name: '   ', email: '' }} />);

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);

      expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
    });
  });

  describe('2 & 5. Required Basic Information fields, inline validation, and specific save error notifications', () => {
    it('marks Full Name and Email as required and displays accessible inline alerts on invalid blur', () => {
      render(<ResumeEditor onBack={jest.fn()} />);

      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');

      expect(nameInput).toBeRequired();
      expect(nameInput).toHaveAttribute('aria-required', 'true');
      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('aria-required', 'true');

      fireEvent.blur(nameInput);
      expect(screen.getByTestId('basics-name-error')).toHaveTextContent(
        'Full name is required'
      );
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');

      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);
      expect(screen.getByTestId('basics-email-error')).toHaveTextContent(
        'Please enter a valid email address'
      );
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');

      fireEvent.change(nameInput, { target: { value: 'Katherine Johnson' } });
      fireEvent.change(emailInput, { target: { value: 'katherine@nasa.gov' } });

      expect(screen.queryByTestId('basics-name-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('basics-email-error')).not.toBeInTheDocument();
      expect(nameInput).toHaveAttribute('aria-invalid', 'false');
      expect(emailInput).toHaveAttribute('aria-invalid', 'false');
    });

    it('surfaces field-specific server validation messages in both inline state and error toast instead of generic save error', async () => {
      const validationError = Object.assign(
        new Error('Full name is required; Please enter a valid email address'),
        {
          status: 400,
          fieldErrors: {
            'content.basics.name': 'Full name is required',
            'content.basics.email': 'Please enter a valid email address',
          },
          errors: [
            { path: 'content.basics.name', msg: 'Full name is required' },
            { path: 'content.basics.email', msg: 'Please enter a valid email address' },
          ],
        }
      );
      (resumeService.createResume as jest.Mock).mockRejectedValueOnce(
        validationError
      );

      render(<ResumeEditor onBack={jest.fn()} />);

      fireEvent.change(screen.getByLabelText('Email'), {
        target: { value: 'bad@email' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(toastErrorSpy).toHaveBeenCalledWith(
          'Full name is required; Please enter a valid email address'
        );
      });
      expect(toastErrorSpy).not.toHaveBeenCalledWith('Failed to save resume');
      expect(screen.getByTestId('basics-name-error')).toHaveTextContent(
        'Full name is required'
      );
      expect(screen.getByTestId('basics-email-error')).toHaveTextContent(
        'Please enter a valid email address'
      );
    });
  });

  describe('3. Automatic debounced saving on valid new resume drafts', () => {
    it('starts debounced auto-save on an unsaved new draft once Full Name and a valid Email are entered and syncs URL id', async () => {
      jest.useFakeTimers();
      (resumeService.createResume as jest.Mock).mockResolvedValueOnce({
        _id: 'auto-created-99',
        id: 'auto-created-99',
        title: 'Untitled Resume',
        content: {
          basics: {
            name: 'Margaret Hamilton',
            email: 'margaret@mit.edu',
            label: '',
            phone: '',
            summary: '',
            location: { address: '', city: '', countryCode: '', postalCode: '' },
          },
          sections: [],
          sectionOrder: [],
        },
      });

      render(<HomePage user={null} />);

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);

      expect(window.location.search).toBe('?tab=resumes&view=editor');

      const nameInput = screen.getByLabelText('Full Name');
      const emailInput = screen.getByLabelText('Email');

      // Invalid email should NOT trigger auto-save
      fireEvent.change(nameInput, { target: { value: 'Margaret Hamilton' } });
      fireEvent.change(emailInput, { target: { value: 'margaret@invalid' } });

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(resumeService.createResume).not.toHaveBeenCalled();

      // Valid email triggers debounced auto-save after 2000ms
      fireEvent.change(emailInput, { target: { value: 'margaret@mit.edu' } });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(resumeService.createResume).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(window.location.search).toBe(
          '?tab=resumes&view=editor&id=auto-created-99'
        );
      });
      expect(screen.getByTestId('save-status-indicator')).toHaveTextContent(
        'All changes saved'
      );
    });
  });

  describe('6. Keep active editor open after manual save & single confirmation toast', () => {
    it('keeps ResumeEditor open after manual Save, updates URL id, and shows a single confirmation toast', async () => {
      (resumeService.createResume as jest.Mock).mockResolvedValueOnce({
        _id: 'saved-resume-42',
        id: 'saved-resume-42',
        title: 'Untitled Resume',
        content: {
          basics: {
            name: 'Alan Turing',
            email: 'alan@bletchley.uk',
            label: '',
            phone: '',
            summary: '',
            location: { address: '', city: '', countryCode: '', postalCode: '' },
          },
          sections: [],
          sectionOrder: [],
        },
      });

      render(
        <HomePage user={{ name: 'Alan Turing', email: 'alan@bletchley.uk' }} />
      );

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);

      fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(resumeService.createResume).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(window.location.search).toBe(
          '?tab=resumes&view=editor&id=saved-resume-42'
        );
      });

      // Editor remains open and only ONE toast notification was emitted
      expect(screen.getByTestId('resume-editor-toolbar')).toBeInTheDocument();
      expect(toastSuccessSpy).toHaveBeenCalledTimes(1);
      expect(toastSuccessSpy).toHaveBeenCalledWith('Resume saved successfully!');
    });

    it('keeps PortfolioEditor open after manual Save, updates URL id, and shows a single confirmation toast', async () => {
      const savedPortfolio: IPortfolio = {
        ...defaultPortfolio,
        _id: 'saved-port-7',
        id: 'saved-port-7',
        title: 'Design Portfolio',
        slug: 'design-portfolio',
      };
      (portfolioService.createPortfolio as jest.Mock).mockResolvedValueOnce(
        savedPortfolio
      );

      window.history.replaceState(null, '', '/?tab=portfolios&view=editor');
      render(<HomePage user={{ name: 'Alan Turing', email: 'alan@bletchley.uk' }} />);

      fireEvent.change(screen.getByLabelText('Portfolio Title'), {
        target: { value: 'Design Portfolio' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Save$/i }));

      await waitFor(() => {
        expect(portfolioService.createPortfolio).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(window.location.search).toBe(
          '?tab=portfolios&view=editor&id=saved-port-7'
        );
      });

      expect(screen.getByLabelText('Portfolio Title')).toBeInTheDocument();
      expect(toastSuccessSpy).toHaveBeenCalledWith('Portfolio saved successfully!');
    });
  });

  describe('7. URL query hydration on reload, 404 fallback, and popstate navigation', () => {
    it('restores ResumeEditor on reload when ?tab=resumes&view=editor&id=... is present', async () => {
      (resumeService.getResumeById as jest.Mock).mockResolvedValueOnce({
        _id: 'hydrated-res-1',
        id: 'hydrated-res-1',
        title: 'Hydrated Staff CV',
        content: {
          basics: {
            name: 'Barbara Liskov',
            email: 'liskov@mit.edu',
            label: 'Institute Professor',
            phone: '',
            summary: '',
            location: { address: '', city: '', countryCode: '', postalCode: '' },
          },
          sections: [],
          sectionOrder: [],
        },
      });

      window.history.replaceState(
        null,
        '',
        '/?tab=resumes&view=editor&id=hydrated-res-1'
      );
      render(<HomePage user={null} />);

      expect(resumeService.getResumeById).toHaveBeenCalledWith('hydrated-res-1');
      expect(
        await screen.findByRole('heading', { name: 'Hydrated Staff CV' })
      ).toBeInTheDocument();
      expect((screen.getByLabelText('Full Name') as HTMLInputElement).value).toBe(
        'Barbara Liskov'
      );
    });

    it('falls back cleanly to list view and strips invalid id when getResumeById returns 404', async () => {
      (resumeService.getResumeById as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Resume not found'), { status: 404 })
      );

      window.history.replaceState(
        null,
        '',
        '/?tab=resumes&view=editor&id=deleted-id'
      );
      render(<HomePage user={null} />);

      expect(await screen.findByText('My Resumes')).toBeInTheDocument();
      expect(window.location.search).toBe('?tab=resumes&view=list');
      expect(toastErrorSpy).toHaveBeenCalledWith('Resume not found');
    });

    it('restores PortfolioEditor on reload and falls back to list view on 404', async () => {
      (portfolioService.getPortfolioById as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Portfolio not found'), { status: 404 })
      );

      window.history.replaceState(
        null,
        '',
        '/?tab=portfolios&view=editor&id=missing-port'
      );
      render(<HomePage user={null} />);

      await waitFor(() => {
        expect(window.location.search).toBe('?tab=portfolios&view=list');
      });
      expect(toastErrorSpy).toHaveBeenCalledWith('Portfolio not found');
    });
  });

  describe('8. Dirty exit confirmation dialog & focus trap across Back buttons, Header tabs, and browser popstate', () => {
    it('prompts before discarding unsaved edits on ResumeEditor Back button and traps Tab focus', async () => {
      render(
        <HomePage user={{ name: 'Donald Knuth', email: 'knuth@stanford.edu' }} />
      );

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);

      fireEvent.change(screen.getByLabelText('Professional Title'), {
        target: { value: 'Computer Scientist' },
      });

      fireEvent.click(screen.getByRole('button', { name: 'Back' }));

      const dialog = screen.getByTestId('unsaved-changes-dialog');
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');

      const keepBtn = within(dialog).getByTestId('unsaved-keep-editing-btn');
      const discardBtn = within(dialog).getByTestId('unsaved-discard-btn');

      // Verify focus trap cycles within dialog buttons
      discardBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab' });
      expect(document.activeElement).toBe(keepBtn);

      keepBtn.focus();
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(discardBtn);

      // Keep editing keeps editor open and preserves edits
      fireEvent.click(keepBtn);
      expect(
        screen.queryByTestId('unsaved-changes-dialog')
      ).not.toBeInTheDocument();
      expect(
        (screen.getByLabelText('Professional Title') as HTMLInputElement).value
      ).toBe('Computer Scientist');

      // Discard changes exits to list without auto-saving discarded draft
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      fireEvent.click(screen.getByTestId('unsaved-discard-btn'));

      expect(await screen.findByText('My Resumes')).toBeInTheDocument();
      expect(resumeService.createResume).not.toHaveBeenCalled();
      expect(window.location.search).toBe('?tab=resumes&view=list');
    });

    it('prompts before discarding unsaved edits on Header tab navigation and browser Back (popstate)', async () => {
      render(
        <HomePage user={{ name: 'Frances Allen', email: 'allen@ibm.com' }} />
      );

      const createBtn = await screen.findByRole('button', {
        name: /New Resume/i,
      });
      fireEvent.click(createBtn);
      expect(window.location.search).toBe('?tab=resumes&view=editor');

      fireEvent.change(screen.getByLabelText('Professional Title'), {
        target: { value: 'Compiler Pioneer' },
      });

      // 1. Header tab switch blocked by confirmation dialog
      const jobMatchTab = screen.getAllByRole('button', { name: /Job Match/i })[0];
      fireEvent.click(jobMatchTab);

      expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('unsaved-keep-editing-btn'));
      expect(screen.getByTestId('resume-editor-toolbar')).toBeInTheDocument();

      // 2. Browser Back (popstate) blocked while Keep editing is chosen, then allowed on Discard
      act(() => {
        window.history.replaceState(null, '', '/?tab=resumes&view=list');
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
      expect(window.location.search).toBe('?tab=resumes&view=editor');

      fireEvent.click(screen.getByTestId('unsaved-discard-btn'));

      expect(await screen.findByText('My Resumes')).toBeInTheDocument();
      expect(window.location.search).toBe('?tab=resumes&view=list');
      expect(resumeService.createResume).not.toHaveBeenCalled();
    });

    it('prompts before discarding unsaved edits on PortfolioEditor Back button', () => {
      const onBack = jest.fn();
      render(
        <PortfolioEditor
          initialPortfolio={{ ...defaultPortfolio, _id: 'p-1', title: 'Initial' }}
          onBack={onBack}
        />
      );

      fireEvent.change(screen.getByLabelText('Portfolio Title'), {
        target: { value: 'Modified Portfolio Title' },
      });

      fireEvent.click(
        screen.getByRole('button', { name: /Back to portfolios list/i })
      );
      expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
      expect(onBack).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('unsaved-discard-btn'));
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });
});
