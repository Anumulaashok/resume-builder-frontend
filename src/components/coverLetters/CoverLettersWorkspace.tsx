import React, { useCallback, useEffect, useState } from 'react';
import { BriefcaseIcon, SparklesIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  createDefaultCoverLetter,
  ICoverLetter,
} from '../../types/coverLetter';
import { ActiveJobContext } from '../../types/jobMatch';
import { coverLetterService } from '../../services/coverLetter.service';
import { resumeService, ResumeWithMeta } from '../../services/resume.service';
import { Container } from '../ui/container';
import CoverLetterList from './CoverLetterList';
import CoverLetterEditor from './CoverLetterEditor';

interface CoverLettersWorkspaceProps {
  user?: {
    name?: string;
    email?: string;
  } | null;
  resetSignal?: number;
  activeJob?: ActiveJobContext | null;
}

export const CoverLettersWorkspace: React.FC<CoverLettersWorkspaceProps> = ({
  user,
  resetSignal = 0,
  activeJob = null,
}) => {
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [coverLetters, setCoverLetters] = useState<ICoverLetter[]>([]);
  const [resumes, setResumes] = useState<ResumeWithMeta[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<ICoverLetter | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lettersResult, resumesResult] = await Promise.all([
        coverLetterService.getCoverLetters(),
        resumeService.getResumes().catch(() => [] as ResumeWithMeta[]),
      ]);
      setCoverLetters(lettersResult || []);
      setResumes(resumesResult || []);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to load your cover letters.';
      setError(msg);
      toast.error('Failed to load cover letters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (resetSignal > 0) {
      setView('list');
    }
  }, [resetSignal]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const activeResume = activeJob?.resumeId
        ? resumes.find((r) => (r._id || r.id) === activeJob.resumeId)
        : undefined;
      const fallbackResume = activeResume || resumes[0];
      const targetResumeId =
        activeJob?.resumeId ||
        (fallbackResume ? fallbackResume._id || fallbackResume.id || null : null);

      const trimmedCompany = activeJob?.company?.trim() || '';
      const trimmedRole = activeJob?.jobTitle?.trim() || '';
      const trimmedJd = activeJob?.jobDescription || '';
      const contextTitleParts = [trimmedCompany, trimmedRole].filter(Boolean);
      const computedTitle =
        contextTitleParts.length > 0
          ? `${contextTitleParts.join(' — ')} Cover Letter`
          : 'Untitled Cover Letter';

      const draftPayload = createDefaultCoverLetter({
        title: computedTitle,
        resumeId: targetResumeId,
        templateId: fallbackResume?.templateId || 'modern',
        themeConfig: fallbackResume?.themeConfig,
        ...(trimmedCompany ? { recipient: { name: '', company: trimmedCompany, address: '' } } : {}),
        ...(trimmedRole ? { jobTitle: trimmedRole } : {}),
        ...(trimmedJd ? { jobDescription: trimmedJd } : {}),
      });

      const created = await coverLetterService.createCoverLetter(draftPayload);
      setCoverLetters((prev) => [created, ...prev]);
      setSelectedLetter(created);
      setView('editor');
    } catch {
      toast.error('Failed to create cover letter');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (letter: ICoverLetter) => {
    setSelectedLetter(letter);
    setView('editor');
  };

  const handleDuplicate = async (letter: ICoverLetter) => {
    const id = letter._id || letter.id;
    if (!id) return;
    try {
      const duplicated = await coverLetterService.duplicateCoverLetter(id);
      setCoverLetters((prev) => [duplicated, ...prev]);
      toast.success('Cover letter duplicated');
    } catch {
      toast.error('Failed to duplicate cover letter');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await coverLetterService.deleteCoverLetter(id);
      setCoverLetters((prev) =>
        prev.filter((item) => (item._id || item.id) !== id)
      );
      toast.success('Cover letter deleted');
    } catch (err) {
      toast.error('Failed to delete cover letter');
      throw err;
    }
  };

  const handleSavedInEditor = useCallback((updated: ICoverLetter) => {
    const updatedId = updated._id || updated.id;
    if (!updatedId) return;
    setSelectedLetter((prev) => (prev ? { ...prev, ...updated } : updated));
    setCoverLetters((prev) => {
      const exists = prev.some((item) => (item._id || item.id) === updatedId);
      if (!exists) {
        return [updated, ...prev];
      }
      return prev.map((item) =>
        (item._id || item.id) === updatedId ? { ...item, ...updated } : item
      );
    });
  }, []);

  if (view === 'editor') {
    return (
      <CoverLetterEditor
        initialCoverLetter={selectedLetter || undefined}
        resumes={resumes}
        user={user}
        onSaved={handleSavedInEditor}
        onBack={() => setView('list')}
      />
    );
  }

  const hasActiveJobDetails = Boolean(
    activeJob?.company?.trim() ||
      activeJob?.jobTitle?.trim() ||
      activeJob?.jobDescription?.trim()
  );
  const linkedActiveResume = activeJob?.resumeId
    ? resumes.find((r) => (r._id || r.id) === activeJob.resumeId)
    : undefined;

  return (
    <Container as="main" className="pt-24 sm:pt-28 pb-12">
      {hasActiveJobDetails && (
        <div
          data-testid="cover-letters-active-job-banner"
          className="mb-6 rounded-card border border-primary-200/90 bg-gradient-to-r from-primary-50/90 via-white to-accent-50/70 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-100/80 text-primary-700 ring-1 ring-inset ring-primary-200">
              <BriefcaseIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Active target job
              </p>
              <p className="text-sm font-semibold text-neutral-900 truncate">
                {[activeJob?.company?.trim(), activeJob?.jobTitle?.trim()]
                  .filter(Boolean)
                  .join(' · ') || 'Saved job description ready'}
              </p>
              <p className="text-xs text-neutral-600 truncate mt-0.5">
                {linkedActiveResume
                  ? `Linked resume: ${linkedActiveResume.title || 'Tailored Resume'}`
                  : 'New cover letters will prefill this job and your tailored resume.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="draft-active-job-cover-letter-btn"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs sm:text-sm font-semibold shadow-sm hover:bg-primary-700 disabled:opacity-50 transition-colors focus-ring shrink-0"
          >
            <SparklesIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{creating ? 'Creating…' : 'Draft tailored cover letter'}</span>
          </button>
        </div>
      )}
      <CoverLetterList
        coverLetters={coverLetters}
        resumes={resumes}
        loading={loading}
        error={error}
        creating={creating}
        onRetry={loadData}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
      />
    </Container>
  );
};

export default CoverLettersWorkspace;
