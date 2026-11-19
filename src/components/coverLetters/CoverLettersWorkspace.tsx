import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createDefaultCoverLetter,
  ICoverLetter,
} from '../../types/coverLetter';
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
}

export const CoverLettersWorkspace: React.FC<CoverLettersWorkspaceProps> = ({
  user,
  resetSignal = 0,
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
      const defaultResume = resumes[0];
      const defaultResumeId = defaultResume
        ? defaultResume._id || defaultResume.id || null
        : null;
      const draftPayload = createDefaultCoverLetter({
        title: 'Untitled Cover Letter',
        resumeId: defaultResumeId,
        templateId: defaultResume?.templateId || 'modern',
        themeConfig: defaultResume?.themeConfig,
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

  return (
    <Container as="main" className="pt-24 sm:pt-28 pb-12">
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
