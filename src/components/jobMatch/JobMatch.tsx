import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlusIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Resume, resumeService } from '../../services/resume.service';
import { ISection, SectionType } from '../../types/resume';
import { JobMatchResult } from '../../types/jobMatch';

const MIN_JD_LENGTH = 30;
const MAX_JD_LENGTH = 20000;

type ResumeWithId = Resume & { _id?: string; id?: string };

const resumeIdOf = (resume: ResumeWithId) => resume._id || resume.id || '';

const scoreTone = (score: number) => {
  if (score >= 65) return { stroke: '#2563eb', text: 'text-blue-600' };
  if (score >= 40) return { stroke: '#f59e0b', text: 'text-amber-600' };
  return { stroke: '#dc2626', text: 'text-red-600' };
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

  const newSection = { id: `skills-${Date.now()}`, type: SectionType.SKILLS, title: 'Skills', content: [newItem] } as ISection;
  return {
    ...resume,
    content: {
      ...resume.content,
      sections: [...sections, newSection],
      sectionOrder: [...(resume.content.sectionOrder || []), newSection.id],
    },
  };
};

function ScoreRing({ score }: { score: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  return (
    <svg viewBox="0 0 128 128" className="w-36 h-36" role="img" aria-label={`Match score ${score}%`}>
      <circle cx="64" cy="64" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="64"
        cy="64"
        r={radius}
        fill="none"
        stroke={tone.stroke}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - score / 100)}
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dashoffset 600ms ease' }}
      />
      <text x="64" y="64" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 28, fontWeight: 700 }}>
        {score}%
      </text>
      <text x="64" y="84" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}>
        OVERALL
      </text>
    </svg>
  );
}

function BreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-800">{label}</span>
        <span className="font-semibold tabular-nums text-gray-700">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%`, transition: 'width 600ms ease' }} />
      </div>
    </div>
  );
}

export default function JobMatch() {
  const [resumes, setResumes] = useState<ResumeWithId[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<JobMatchResult | null>(null);
  const [addingSkill, setAddingSkill] = useState<string | null>(null);

  useEffect(() => {
    resumeService
      .getResumes()
      .then((list) => {
        setResumes(list as ResumeWithId[]);
        if (list.length) setSelectedId(resumeIdOf(list[0] as ResumeWithId));
      })
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoadingResumes(false));
  }, []);

  const selectedResume = useMemo(() => resumes.find((r) => resumeIdOf(r) === selectedId), [resumes, selectedId]);
  const trimmedLength = jobDescription.trim().length;
  const canAnalyze = Boolean(selectedId) && trimmedLength >= MIN_JD_LENGTH && !analyzing;

  const runAnalysis = async () => {
    if (!canAnalyze) return;
    setAnalyzing(true);
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
      setResumes((prev) => prev.map((r) => (resumeIdOf(r) === selectedId ? { ...r, content: updated.content } : r)));
      toast.success(`Added ${skill} to your Skills section`);
      setResult(await resumeService.analyzeJobMatch(selectedId, jobDescription, jobTitle.trim()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to add ${skill}`);
    } finally {
      setAddingSkill(null);
    }
  };

  if (!loadingResumes && resumes.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
        <DocumentTextIcon className="w-10 h-10 mx-auto text-gray-400" />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">Create a resume first</h2>
        <p className="mt-1 text-sm text-gray-600">Job Match compares one of your resumes with a job description.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Job Match</h1>
        <p className="mt-1 text-sm text-gray-600">Compare your resume against a job description to see what recruiters' filters will look for.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <section className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <DocumentTextIcon className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-semibold text-gray-900">Job description</h2>
          </div>

          <label htmlFor="jm-resume" className="block text-sm font-medium text-gray-800 mb-1.5">Target resume</label>
          <select
            id="jm-resume"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setResult(null);
            }}
            disabled={loadingResumes}
            className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 outline-none"
          >
            {loadingResumes && <option>Loading resumes…</option>}
            {resumes.map((r) => (
              <option key={resumeIdOf(r)} value={resumeIdOf(r)}>
                {r.title || r.content?.basics?.name || 'Untitled resume'}
              </option>
            ))}
          </select>

          <div className="flex justify-between items-baseline mt-5 mb-1.5">
            <label htmlFor="jm-title" className="text-sm font-medium text-gray-800">Job title</label>
            <span className="text-xs text-gray-500">Optional</span>
          </div>
          <input
            id="jm-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 outline-none"
          />

          <div className="flex justify-between items-baseline mt-5 mb-1.5">
            <label htmlFor="jm-jd" className="text-sm font-medium text-gray-800">Job description text</label>
            {jobDescription && (
              <button type="button" onClick={() => setJobDescription('')} className="text-xs font-medium text-gray-500 hover:text-gray-800 inline-flex items-center gap-1">
                <XMarkIcon className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          <textarea
            id="jm-jd"
            value={jobDescription}
            maxLength={MAX_JD_LENGTH}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
            className="w-full h-64 p-3 rounded-lg border border-slate-300 text-sm leading-relaxed resize-y focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 outline-none"
          />
          <div className="flex justify-between text-xs mt-1.5">
            <span className="text-gray-500 tabular-nums">{jobDescription.length.toLocaleString()} characters</span>
            {trimmedLength > 0 && trimmedLength < MIN_JD_LENGTH && (
              <span className="text-amber-700">Add at least {MIN_JD_LENGTH} characters</span>
            )}
          </div>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={!canAnalyze}
            className="mt-5 w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
          >
            <SparklesIcon className="w-5 h-5" />
            {analyzing ? 'Analyzing…' : 'Analyze match'}
          </button>
        </section>

        <div className="lg:col-span-3 space-y-6">
          {!result && (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
              <SparklesIcon className="w-10 h-10 mx-auto text-blue-500" />
              <h2 className="mt-3 text-lg font-semibold text-gray-900">No analysis yet</h2>
              <p className="mt-1 text-sm text-gray-600">Pick a resume, paste a job description and run the analysis to see your match score.</p>
            </div>
          )}

          {result && (
            <>
              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Match overview</h2>
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <div className="text-center shrink-0">
                    <ScoreRing score={result.score} />
                    <p className={`mt-2 font-semibold ${scoreTone(result.score).text}`}>{result.label}</p>
                    <p className="text-xs text-gray-500 tabular-nums">
                      {result.totals.matched} of {result.totals.required} key skills found
                    </p>
                  </div>
                  <div className="flex-1 w-full space-y-4">
                    <BreakdownBar label="Core skills" value={result.breakdown.skills} color="bg-blue-600" />
                    <BreakdownBar label="Experience keywords" value={result.breakdown.experience} color="bg-teal-600" />
                    <BreakdownBar label="Title alignment" value={result.breakdown.title} color="bg-amber-500" />
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <CheckIcon className="w-5 h-5 text-teal-600" /> Matched keywords
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {result.matchedKeywords.length} found
                    </span>
                  </div>
                  {result.matchedKeywords.length === 0 ? (
                    <p className="text-sm text-gray-500">None of the job's key skills appear in this resume yet.</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {result.matchedKeywords.map((k) => (
                        <li key={k.keyword} className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckIcon className="w-3.5 h-3.5" /> {k.keyword}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" /> Missing keywords
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {result.missingKeywords.length} missing
                    </span>
                  </div>
                  {result.missingKeywords.length === 0 ? (
                    <p className="text-sm text-gray-500">Every key skill in this job description is on your resume.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.missingKeywords.map((k) => (
                        <li key={k.keyword} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                          <span className="text-sm text-gray-900">
                            {k.keyword}
                            {k.occurrences > 1 && <span className="ml-1.5 text-xs text-gray-500 tabular-nums">×{k.occurrences}</span>}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddSkill(k.keyword)}
                            disabled={addingSkill !== null}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md disabled:opacity-50"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            {addingSkill === k.keyword ? 'Adding…' : 'Add to skills'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <LightBulbIcon className="w-5 h-5 text-amber-500" /> Suggestions
                </h2>
                {result.suggestions.length === 0 ? (
                  <p className="text-sm text-gray-500">No changes needed — this resume is well aligned with the job.</p>
                ) : (
                  <ol className="space-y-3">
                    {result.suggestions.map((s, i) => (
                      <li key={s} className="flex gap-3 rounded-xl bg-slate-50 p-4 text-sm text-gray-800">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
