import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Resume, resumeService } from '../../services/resume.service';
import { captureClientEvent } from '../../services/telemetry';
import { ISection, SectionType } from '../../types/resume';
import { JobMatchResult } from '../../types/jobMatch';
import { Container } from '../ui/container';
import { Skeleton } from '../ui/skeleton';

const MIN_JD_LENGTH = 30;
const MAX_JD_LENGTH = 20000;

type ResumeWithId = Resume & { _id?: string; id?: string };

const resumeIdOf = (resume: ResumeWithId) => resume._id || resume.id || '';

const scoreTone = (score: number) => {
  if (score >= 80) {
    return {
      stroke: '#059669',
      badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
      ringBg: 'from-emerald-50/70 to-white',
    };
  }
  if (score >= 60) {
    return {
      stroke: '#2563eb',
      badge: 'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
      ringBg: 'from-primary-50/70 to-white',
    };
  }
  if (score >= 40) {
    return {
      stroke: '#d97706',
      badge: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
      ringBg: 'from-amber-50/70 to-white',
    };
  }
  return {
    stroke: '#dc2626',
    badge: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
    ringBg: 'from-red-50/70 to-white',
  };
};

export const addSkillToResume = (resume: Resume, skill: string): Resume => {
  const sections = resume.content.sections || [];
  const skillsSection = sections.find((s) => s.type === SectionType.SKILLS);
  const newItem = { id: `skill-item-${Date.now()}`, name: skill };

  if (skillsSection) {
    return {
      ...resume,
      content: {
        ...resume.content,
        sections: sections.map((s) =>
          s.id === skillsSection.id ? { ...s, content: [...(s.content || []), newItem] } : s
        ) as ISection[],
      },
    };
  }

  const newSection = {
    id: `skills-${Date.now()}`,
    type: SectionType.SKILLS,
    title: 'Skills',
    content: [newItem],
  } as ISection;

  return {
    ...resume,
    content: {
      ...resume.content,
      sections: [...sections, newSection],
      sectionOrder: [...(resume.content.sectionOrder || []), newSection.id],
    },
  };
};

function PageHeader() {
  return (
    <header className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
        Job Match
      </h1>
      <p className="mt-1.5 text-sm text-neutral-600 max-w-2xl">
        Compare your resume against a job description to uncover ATS keyword gaps, role alignment, and actionable improvements.
      </p>
    </header>
  );
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(clamped);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full p-2.5 bg-gradient-to-b ${tone.ringBg} ring-1 ring-inset ring-neutral-200/70`}
    >
      <svg
        viewBox="0 0 132 132"
        className="w-32 h-32 sm:w-36 sm:h-36"
        role="img"
        aria-label={`Match score ${clamped}% — ${label}`}
      >
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform="rotate(-90 66 66)"
          style={{ transition: 'stroke-dashoffset 600ms ease' }}
        />
        <text
          x="66"
          y="63"
          textAnchor="middle"
          className="fill-neutral-900"
          style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          {clamped}%
        </text>
        <text
          x="66"
          y="83"
          textAnchor="middle"
          className="fill-neutral-500"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.2 }}
        >
          MATCH SCORE
        </text>
      </svg>
    </div>
  );
}

function BreakdownBar({
  label,
  hint,
  value,
  colorClass,
}: {
  label: string;
  hint: string;
  value: number;
  colorClass: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-1 text-sm mb-1.5">
        <div className="min-w-0">
          <span className="font-medium text-neutral-800">{label}</span>
          <span className="hidden sm:inline text-xs text-neutral-500 ml-2">{hint}</span>
        </div>
        <span className="font-semibold tabular-nums text-neutral-800">{clamped}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 rounded-full bg-neutral-100 ring-1 ring-inset ring-neutral-200/70 overflow-hidden"
      >
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${clamped}%`, transition: 'width 600ms ease' }}
        />
      </div>
    </div>
  );
}

function AnalysisSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Analyzing job match"
      data-testid="job-match-skeleton"
      className="space-y-6"
    >
      <span className="sr-only">Analyzing your resume against the job description…</span>

      {/* Overview Card Skeleton */}
      <div className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
          <div className="flex flex-col items-center shrink-0 space-y-2.5">
            <Skeleton className="w-32 h-32 sm:w-36 sm:h-36 rounded-full" />
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="flex-1 w-full space-y-4">
            {[0, 1, 2].map((idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-10" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keywords Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((cardIdx) => (
          <div
            key={cardIdx}
            className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-28 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Suggestions Checklist Skeleton */}
      <div className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="space-y-2.5">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-control border border-neutral-200/70 bg-neutral-50/70 p-3.5"
            >
              <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreAnalysisEmptyState() {
  return (
    <div
      data-testid="job-match-empty-state"
      className="bg-white rounded-card border border-dashed border-neutral-300 shadow-card px-5 py-12 sm:px-8 sm:py-14 text-center"
    >
      <div className="max-w-md mx-auto">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="w-16 h-16 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center">
            <ClipboardDocumentCheckIcon className="h-8 w-8" aria-hidden="true" />
          </div>
          <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm ring-2 ring-white">
            <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
          Ready to check your match
        </h2>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
          Select one of your resumes, paste a target job description, and run the analysis to see your match score, keyword chips, and tailored checklist.
        </p>

        <ol
          aria-label="How Job Match works"
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-neutral-700"
        >
          <li className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-inset ring-neutral-200/80">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
              1
            </span>
            Pick resume
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-inset ring-neutral-200/80">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
              2
            </span>
            Paste job post
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 ring-1 ring-inset ring-neutral-200/80">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white">
              3
            </span>
            Add missing skills
          </li>
        </ol>
      </div>
    </div>
  );
}

export interface JobMatchProps {
  initialResumeId?: string;
  initialJobDescription?: string;
  initialJobTitle?: string;
}

export default function JobMatch({
  initialResumeId,
  initialJobDescription,
  initialJobTitle,
}: JobMatchProps = {}) {
  const [resumes, setResumes] = useState<ResumeWithId[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedId, setSelectedId] = useState(initialResumeId || '');
  const [jobTitle, setJobTitle] = useState(initialJobTitle || '');
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);
  const [checkedSuggestions, setCheckedSuggestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    resumeService
      .getResumes()
      .then((list) => {
        const typedList = list as ResumeWithId[];
        setResumes(typedList);
        if (typedList.length) {
          const matchingInitial = initialResumeId
            ? typedList.find((r) => resumeIdOf(r) === initialResumeId)
            : undefined;
          setSelectedId(resumeIdOf(matchingInitial || typedList[0]));
        }
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoadingResumes(false));
  }, [initialResumeId]);

  useEffect(() => {
    if (initialJobDescription !== undefined) {
      setJobDescription(initialJobDescription);
      setResult(null);
      setCheckedSuggestions({});
    }
  }, [initialJobDescription]);

  useEffect(() => {
    if (initialJobTitle !== undefined) {
      setJobTitle(initialJobTitle);
    }
  }, [initialJobTitle]);

  const selectedResume = useMemo(
    () => resumes.find((r) => resumeIdOf(r) === selectedId),
    [resumes, selectedId]
  );
  const trimmedLength = jobDescription.trim().length;
  const canAnalyze = Boolean(selectedId) && trimmedLength >= MIN_JD_LENGTH && !analyzing;

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setCheckedSuggestions({});
    try {
      setResult(await resumeService.analyzeJobMatch(selectedId, jobDescription, jobTitle.trim()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to analyze job match');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddSkill = async (skill: string) => {
    if (!selectedResume) return;
    setAddingSkill(skill);
    try {
      const updated = addSkillToResume(selectedResume, skill);
      await resumeService.updateResume(selectedId, {
        title: updated.title,
        summary: updated.summary,
        templateId: updated.templateId,
        themeConfig: updated.themeConfig,
        content: updated.content,
      });
      captureClientEvent('resume_tailored', {
        resume_id: selectedId,
        template_id: updated.templateId || 'modern',
        source: 'job_match',
        action: 'add_missing_skill',
        previous_score: result?.score ?? null,
      });
      setResumes((prev) =>
        prev.map((r) => (resumeIdOf(r) === selectedId ? { ...r, content: updated.content } : r))
      );
      toast.success(`Added ${skill} to your Skills section`);
      setResult(await resumeService.analyzeJobMatch(selectedId, jobDescription, jobTitle.trim()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to add ${skill}`);
    } finally {
      setAddingSkill(null);
    }
  };

  const toggleSuggestion = (suggestion: string) => {
    setCheckedSuggestions((prev) => ({
      ...prev,
      [suggestion]: !prev[suggestion],
    }));
  };

  if (!loadingResumes && resumes.length === 0) {
    return (
      <Container className="px-0 sm:px-0 lg:px-0">
        <PageHeader />
        <div
          data-testid="job-match-no-resumes"
          className="bg-white rounded-card border border-dashed border-neutral-300 shadow-card px-6 py-14 sm:py-16 text-center"
        >
          <div className="max-w-md mx-auto">
            <div className="relative w-16 h-16 mx-auto mb-5">
              <div className="w-16 h-16 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center">
                <DocumentTextIcon className="h-8 w-8" aria-hidden="true" />
              </div>
              <span className="absolute -bottom-1 -right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-600 text-white shadow-sm ring-2 ring-white">
                <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
              Create a resume first
            </h2>
            <p className="mt-2 text-sm text-neutral-600">
              Job Match compares one of your saved resumes against a target job description. Head to the Resumes tab to create or generate one.
            </p>
          </div>
        </div>
      </Container>
    );
  }

  const completedSuggestionsCount = result
    ? result.suggestions.filter((s) => Boolean(checkedSuggestions[s])).length
    : 0;

  return (
    <Container className="px-0 sm:px-0 lg:px-0">
      <PageHeader />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inputs */}
        <section
          aria-labelledby="jm-inputs-heading"
          className="lg:col-span-5 lg:sticky lg:top-24 min-w-0 bg-white rounded-card border border-neutral-200/90 shadow-card overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-4 bg-neutral-50/80 border-b border-neutral-200/80 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <DocumentTextIcon className="w-5 h-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 id="jm-inputs-heading" className="text-base font-semibold text-neutral-900">
                Job details
              </h2>
              <p className="text-xs text-neutral-500 truncate">
                Choose a resume and paste the posting
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            <div>
              <label
                htmlFor="jm-resume"
                className="block text-sm font-medium text-neutral-800 mb-1.5"
              >
                Target resume
              </label>
              <div className="relative">
                <select
                  id="jm-resume"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    setResult(null);
                    setCheckedSuggestions({});
                  }}
                  disabled={loadingResumes}
                  className="w-full min-w-0 h-10 pl-3 pr-9 appearance-none rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500 transition-colors focus:border-primary-500 focus-ring"
                >
                  {loadingResumes && <option>Loading resumes…</option>}
                  {resumes.map((r) => (
                    <option key={resumeIdOf(r)} value={resumeIdOf(r)}>
                      {r.title || r.content?.basics?.name || 'Untitled resume'}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500"
                  aria-hidden="true"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-baseline gap-1 mb-1.5">
                <label htmlFor="jm-title" className="text-sm font-medium text-neutral-800">
                  Job title
                </label>
                <span id="jm-title-optional" className="text-xs text-neutral-500">
                  Optional
                </span>
              </div>
              <input
                id="jm-title"
                type="text"
                value={jobTitle}
                aria-describedby="jm-title-optional"
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full min-w-0 h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 transition-colors focus:border-primary-500 focus-ring"
              />
            </div>

            <div>
              <div className="flex flex-wrap justify-between items-center gap-2 mb-1.5">
                <label htmlFor="jm-jd" className="text-sm font-medium text-neutral-800">
                  Job description text
                </label>
                {jobDescription && (
                  <button
                    type="button"
                    onClick={() => setJobDescription('')}
                    aria-label="Clear job description"
                    className="inline-flex items-center gap-1 rounded-control px-2 py-0.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors focus-ring"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
              <textarea
                id="jm-jd"
                value={jobDescription}
                maxLength={MAX_JD_LENGTH}
                aria-describedby="jm-jd-hint"
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description, responsibilities, and qualifications here…"
                className="w-full min-w-0 h-56 sm:h-64 p-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 leading-relaxed resize-y transition-colors focus:border-primary-500 focus-ring"
              />
              <div
                id="jm-jd-hint"
                aria-live="polite"
                className="flex flex-wrap justify-between items-center gap-1 text-xs mt-1.5"
              >
                <span className="text-neutral-500 tabular-nums">
                  {jobDescription.length.toLocaleString()} characters
                </span>
                {trimmedLength > 0 && trimmedLength < MIN_JD_LENGTH && (
                  <span className="font-medium text-amber-700">
                    Add at least {MIN_JD_LENGTH} characters
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={runAnalysis}
              disabled={!canAnalyze}
              aria-busy={analyzing}
              className="w-full h-11 px-4 inline-flex items-center justify-center gap-2 rounded-control bg-primary-600 text-white text-sm font-semibold shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring"
            >
              <SparklesIcon
                className={`w-5 h-5 shrink-0 ${analyzing ? 'animate-pulse' : ''}`}
                aria-hidden="true"
              />
              <span>{analyzing ? 'Analyzing…' : 'Analyze match'}</span>
            </button>
          </div>
        </section>

        {/* Right Column: Skeleton / Empty State / Results */}
        <div className="lg:col-span-7 min-w-0 space-y-6">
          {analyzing && <AnalysisSkeleton />}

          {!analyzing && !result && <PreAnalysisEmptyState />}

          {!analyzing && result && (
            <>
              {/* Score Ring & Breakdown Card */}
              <section
                aria-labelledby="jm-overview-heading"
                className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
                  <h2 id="jm-overview-heading" className="text-lg font-semibold text-neutral-900">
                    Match overview
                  </h2>
                  {selectedResume && (
                    <span className="inline-flex items-center gap-1.5 max-w-full truncate text-xs font-medium text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-full ring-1 ring-inset ring-neutral-200/80">
                      <DocumentTextIcon className="w-3.5 h-3.5 shrink-0 text-neutral-500" aria-hidden="true" />
                      <span className="truncate">
                        {selectedResume.title || selectedResume.content?.basics?.name || 'Selected resume'}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
                  <div className="text-center shrink-0 flex flex-col items-center">
                    <ScoreRing score={result.score} label={result.label} />
                    <span
                      className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        scoreTone(result.score).badge
                      }`}
                    >
                      {result.label}
                    </span>
                    <p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
                      {result.totals.matched} of {result.totals.required} key skills found
                    </p>
                  </div>

                  <div className="flex-1 w-full min-w-0 space-y-4">
                    <BreakdownBar
                      label="Core skills"
                      hint="Hard & technical keywords"
                      value={result.breakdown.skills}
                      colorClass="bg-primary-600"
                    />
                    <BreakdownBar
                      label="Experience keywords"
                      hint="Action & domain terms"
                      value={result.breakdown.experience}
                      colorClass="bg-accent-600"
                    />
                    <BreakdownBar
                      label="Title alignment"
                      hint="Role headline match"
                      value={result.breakdown.title}
                      colorClass="bg-emerald-600"
                    />
                  </div>
                </div>
              </section>

              {/* Matched vs Missing Keyword Chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Matched Keywords Card */}
                <section
                  aria-labelledby="jm-matched-heading"
                  className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6 flex flex-col"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2
                      id="jm-matched-heading"
                      className="text-base font-semibold text-neutral-900 flex items-center gap-2"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-200/80">
                        <CheckIcon className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
                      </span>
                      <span>Matched keywords</span>
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 tabular-nums">
                      {result.matchedKeywords.length} found
                    </span>
                  </div>

                  {result.matchedKeywords.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      None of the job&apos;s key skills appear in this resume yet.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2" aria-label="Matched keywords">
                      {result.matchedKeywords.map((k) => (
                        <li
                          key={k.keyword}
                          data-testid="matched-keyword-chip"
                          className="inline-flex items-center gap-1.5 max-w-full px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200/90"
                        >
                          <CheckIcon
                            className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]"
                            aria-hidden="true"
                          />
                          <span className="break-words min-w-0">{k.keyword}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                {/* Missing Keywords Card */}
                <section
                  aria-labelledby="jm-missing-heading"
                  className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6 flex flex-col"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2
                      id="jm-missing-heading"
                      className="text-base font-semibold text-neutral-900 flex items-center gap-2"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-200/80">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />
                      </span>
                      <span>Missing keywords</span>
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 tabular-nums">
                      {result.missingKeywords.length} missing
                    </span>
                  </div>

                  {result.missingKeywords.length === 0 ? (
                    <div className="flex items-center gap-2.5 rounded-control bg-emerald-50/70 border border-emerald-200/80 p-3 text-sm text-emerald-800">
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                      <span>Every key skill in this job description is on your resume.</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-neutral-500 mb-3">
                        Add skills you genuinely have to update your resume and refresh your score:
                      </p>
                      <ul className="flex flex-wrap gap-2" aria-label="Missing keywords">
                        {result.missingKeywords.map((k) => (
                          <li
                            key={k.keyword}
                            data-testid="missing-keyword-chip"
                            className="inline-flex flex-wrap items-center gap-1.5 max-w-full pl-3 pr-1.5 py-1 rounded-2xl sm:rounded-full text-xs font-semibold bg-amber-50/90 text-amber-900 ring-1 ring-inset ring-amber-200/90"
                          >
                            <span className="break-words min-w-0">{k.keyword}</span>
                            {k.occurrences > 1 && (
                              <span className="text-[11px] font-medium text-amber-700 tabular-nums">
                                ×{k.occurrences}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAddSkill(k.keyword)}
                              disabled={addingSkill !== null}
                              aria-label={
                                addingSkill === k.keyword
                                  ? `Adding ${k.keyword} to skills`
                                  : `Add to skills: ${k.keyword}`
                              }
                              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-primary-700 ring-1 ring-inset ring-amber-300/90 hover:bg-primary-50 hover:text-primary-800 hover:ring-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-ring shrink-0"
                            >
                              <PlusIcon className="w-3 h-3 stroke-[2.5]" aria-hidden="true" />
                              <span>{addingSkill === k.keyword ? 'Adding…' : 'Add to skills'}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              </div>

              {/* Suggestions Checklist Card */}
              <section
                aria-labelledby="jm-suggestions-heading"
                className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h2
                    id="jm-suggestions-heading"
                    className="text-base font-semibold text-neutral-900 flex items-center gap-2"
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-50 text-accent-600 ring-1 ring-inset ring-accent-200/80">
                      <LightBulbIcon className="w-3.5 h-3.5 stroke-[2.2]" aria-hidden="true" />
                    </span>
                    <span>Actionable suggestions</span>
                  </h2>
                  {result.suggestions.length > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200 tabular-nums">
                      {completedSuggestionsCount} of {result.suggestions.length} done
                    </span>
                  )}
                </div>

                {result.suggestions.length === 0 ? (
                  <div className="flex items-center gap-2.5 rounded-control bg-emerald-50/70 border border-emerald-200/80 p-3.5 text-sm text-emerald-800">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>No changes needed — this resume is well aligned with the job.</span>
                  </div>
                ) : (
                  <ul className="space-y-2.5" aria-label="Suggestions checklist">
                    {result.suggestions.map((suggestion, index) => {
                      const isChecked = Boolean(checkedSuggestions[suggestion]);
                      const checkboxId = `jm-suggestion-${index}`;
                      return (
                        <li
                          key={`${index}-${suggestion}`}
                          className={`flex items-start gap-3 rounded-control border p-3.5 transition-colors ${
                            isChecked
                              ? 'bg-emerald-50/50 border-emerald-200/80'
                              : 'bg-neutral-50/80 border-neutral-200/80 hover:border-neutral-300'
                          }`}
                        >
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSuggestion(suggestion)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 accent-primary-600 cursor-pointer focus-ring"
                          />
                          <label
                            htmlFor={checkboxId}
                            className={`flex-1 min-w-0 text-sm leading-relaxed cursor-pointer select-none break-words ${
                              isChecked ? 'line-through text-neutral-500' : 'text-neutral-800'
                            }`}
                          >
                            {suggestion}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
