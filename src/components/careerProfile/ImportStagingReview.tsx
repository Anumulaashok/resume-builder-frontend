import React, { useMemo, useState } from 'react';
import {
  CheckCircleIcon,
  DocumentCheckIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  AchievementCategory,
  ExtractedResumeStagingResponse,
  ICareerAchievement,
  ICareerCertification,
  ICareerEducation,
  ICareerExperience,
  ICareerGroupedSkills,
  ICareerProfile,
  ICareerProject,
  SKILL_CATEGORY_META,
  SkillCategoryKey,
} from '../../types/careerProfile';

export interface ImportStagingReviewProps {
  staging: ExtractedResumeStagingResponse;
  onApprove: (
    approvedProfile: Partial<ICareerProfile>,
    mode: 'merge' | 'replace',
    createResumeAfter?: boolean
  ) => Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  allowCreateResumeOption?: boolean;
}

function cloneProfile(profile: ICareerProfile): ICareerProfile {
  return JSON.parse(JSON.stringify(profile)) as ICareerProfile;
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•●▪◦]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function splitComma(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const ImportStagingReview: React.FC<ImportStagingReviewProps> = ({
  staging,
  onApprove,
  onCancel,
  submitting = false,
  allowCreateResumeOption = false,
}) => {
  const [draft, setDraft] = useState<ICareerProfile>(() =>
    cloneProfile(staging.stagedProfile)
  );
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');

  const hasPersonalInfoContent = Boolean(
    draft.personalInfo.fullName ||
      draft.personalInfo.email ||
      draft.personalInfo.phone ||
      draft.personalInfo.location ||
      draft.personalInfo.linkedin ||
      draft.personalInfo.github
  );
  const hasSummaryContent = Boolean(
    draft.summary.text || draft.summary.currentTitle || draft.summary.yearsOfExperience
  );

  const [approvePersonalInfo, setApprovePersonalInfo] = useState<boolean>(
    hasPersonalInfoContent
  );
  const [approveSummary, setApproveSummary] = useState<boolean>(hasSummaryContent);

  const [approvedIds, setApprovedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    staging.stagedProfile.experience.forEach((item) => {
      initial[item.id] = true;
    });
    staging.stagedProfile.projects.forEach((item) => {
      initial[item.id] = true;
    });
    SKILL_CATEGORY_META.forEach(({ key }) => {
      (staging.stagedProfile.skills[key] || []).forEach((skill) => {
        initial[skill.id] = true;
      });
    });
    staging.stagedProfile.education.forEach((item) => {
      initial[item.id] = true;
    });
    staging.stagedProfile.certifications.forEach((item) => {
      initial[item.id] = true;
    });
    staging.stagedProfile.achievements.forEach((item) => {
      initial[item.id] = true;
    });
    return initial;
  });

  const toggleItemApproval = (id: string) => {
    setApprovedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const updateExperience = (
    id: string,
    updater: (curr: ICareerExperience) => ICareerExperience
  ) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === id ? updater(item) : item
      ),
    }));
  };

  const discardExperience = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id),
    }));
  };

  const updateProject = (
    id: string,
    updater: (curr: ICareerProject) => ICareerProject
  ) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.map((item) => (item.id === id ? updater(item) : item)),
    }));
  };

  const discardProject = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  };

  const updateSkillName = (
    category: SkillCategoryKey,
    id: string,
    nextName: string
  ) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].map((skill) =>
          skill.id === id ? { ...skill, name: nextName } : skill
        ),
      },
    }));
  };

  const discardSkill = (category: SkillCategoryKey, id: string) => {
    setDraft((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((skill) => skill.id !== id),
      },
    }));
  };

  const updateEducation = (
    id: string,
    updater: (curr: ICareerEducation) => ICareerEducation
  ) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.map((item) =>
        item.id === id ? updater(item) : item
      ),
    }));
  };

  const discardEducation = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id),
    }));
  };

  const updateCertification = (
    id: string,
    updater: (curr: ICareerCertification) => ICareerCertification
  ) => {
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.map((item) =>
        item.id === id ? updater(item) : item
      ),
    }));
  };

  const discardCertification = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((item) => item.id !== id),
    }));
  };

  const updateAchievement = (
    id: string,
    updater: (curr: ICareerAchievement) => ICareerAchievement
  ) => {
    setDraft((prev) => ({
      ...prev,
      achievements: prev.achievements.map((item) =>
        item.id === id ? updater(item) : item
      ),
    }));
  };

  const discardAchievement = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((item) => item.id !== id),
    }));
  };

  const approvedCount = useMemo(() => {
    let total = 0;
    if (approvePersonalInfo) total += 1;
    if (approveSummary) total += 1;
    draft.experience.forEach((item) => {
      if (approvedIds[item.id] !== false) total += 1;
    });
    draft.projects.forEach((item) => {
      if (approvedIds[item.id] !== false) total += 1;
    });
    SKILL_CATEGORY_META.forEach(({ key }) => {
      draft.skills[key].forEach((skill) => {
        if (approvedIds[skill.id] !== false && skill.name.trim()) total += 1;
      });
    });
    draft.education.forEach((item) => {
      if (approvedIds[item.id] !== false) total += 1;
    });
    draft.certifications.forEach((item) => {
      if (approvedIds[item.id] !== false) total += 1;
    });
    draft.achievements.forEach((item) => {
      if (approvedIds[item.id] !== false) total += 1;
    });
    return total;
  }, [approvePersonalInfo, approveSummary, approvedIds, draft]);

  const buildApprovedPayload = (): Partial<ICareerProfile> => {
    const filteredSkills = {} as ICareerGroupedSkills;
    SKILL_CATEGORY_META.forEach(({ key }) => {
      filteredSkills[key] = draft.skills[key].filter(
        (skill) => approvedIds[skill.id] !== false && Boolean(skill.name.trim())
      );
    });

    const payload: Partial<ICareerProfile> = {
      experience: draft.experience.filter(
        (item) => approvedIds[item.id] !== false
      ),
      projects: draft.projects.filter((item) => approvedIds[item.id] !== false),
      skills: filteredSkills,
      education: draft.education.filter((item) => approvedIds[item.id] !== false),
      certifications: draft.certifications.filter(
        (item) => approvedIds[item.id] !== false
      ),
      achievements: draft.achievements.filter(
        (item) => approvedIds[item.id] !== false
      ),
    };

    if (approvePersonalInfo) {
      payload.personalInfo = draft.personalInfo;
    }
    if (approveSummary) {
      payload.summary = draft.summary;
    }
    return payload;
  };

  const nonEmptySkillCategories = SKILL_CATEGORY_META.filter(
    ({ key }) => (draft.skills[key] || []).length > 0
  );

  return (
    <div
      data-testid="import-staging-review"
      className="bg-white rounded-panel border border-primary-200 shadow-card overflow-hidden space-y-5"
    >
      {/* Staging Banner */}
      <div className="bg-primary-50/80 border-b border-primary-200/80 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-600 text-white shadow-sm">
            <DocumentCheckIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
                Review Staged Import
              </h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white text-primary-700 ring-1 ring-inset ring-primary-200 uppercase">
                {staging.metadata.format}
              </span>
              <span className="text-xs text-neutral-600 font-medium">
                {staging.metadata.filename}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-700 mt-0.5">
              Staged preview — approve, edit, or discard extracted items below. Nothing is saved to your Career Profile until you approve.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="staging-approved-count"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200"
          >
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            {approvedCount} approved
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            aria-label="Discard staged import"
            className="inline-flex items-center justify-center h-8 w-8 rounded-control text-neutral-500 hover:text-neutral-800 hover:bg-white/80 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Import Persistence Mode */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-card bg-neutral-50 border border-neutral-200">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
              Approval Mode
            </p>
            <p className="text-xs text-neutral-600 mt-0.5">
              Choose whether approved facts merge into your Career Profile or replace existing sections.
            </p>
          </div>
          <div className="inline-flex rounded-control border border-neutral-300 bg-white p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setMode('merge')}
              aria-pressed={mode === 'merge'}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                mode === 'merge'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Merge into Profile
            </button>
            <button
              type="button"
              onClick={() => setMode('replace')}
              aria-pressed={mode === 'replace'}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                mode === 'replace'
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              Replace Profile
            </button>
          </div>
        </div>

        {/* Personal Info */}
        <section
          data-testid="staging-section-personal"
          className="rounded-card border border-neutral-200 bg-white overflow-hidden"
        >
          <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-neutral-900 cursor-pointer">
              <input
                type="checkbox"
                checked={approvePersonalInfo}
                onChange={(e) => setApprovePersonalInfo(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Personal Information &amp; Links</span>
            </label>
            <span className="text-xs text-neutral-500">
              {approvePersonalInfo ? 'Approved' : 'Skipped'}
            </span>
          </div>

          {approvePersonalInfo && (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  aria-label="Staged Full Name"
                  value={draft.personalInfo.fullName}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, fullName: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  aria-label="Staged Email"
                  value={draft.personalInfo.email}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, email: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  aria-label="Staged Phone"
                  value={draft.personalInfo.phone}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, phone: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  aria-label="Staged Location"
                  value={draft.personalInfo.location}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, location: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  LinkedIn
                </label>
                <input
                  type="text"
                  aria-label="Staged LinkedIn"
                  value={draft.personalInfo.linkedin}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, linkedin: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  GitHub
                </label>
                <input
                  type="text"
                  aria-label="Staged GitHub"
                  value={draft.personalInfo.github}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, github: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
            </div>
          )}
        </section>

        {/* Professional Summary */}
        <section
          data-testid="staging-section-summary"
          className="rounded-card border border-neutral-200 bg-white overflow-hidden"
        >
          <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-neutral-900 cursor-pointer">
              <input
                type="checkbox"
                checked={approveSummary}
                onChange={(e) => setApproveSummary(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Professional Summary</span>
            </label>
            <span className="text-xs text-neutral-500">
              {approveSummary ? 'Approved' : 'Skipped'}
            </span>
          </div>

          {approveSummary && (
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Current / Target Title
                  </label>
                  <input
                    type="text"
                    aria-label="Staged Current Title"
                    value={draft.summary.currentTitle}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        summary: { ...prev.summary, currentTitle: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1">
                    Years of Experience
                  </label>
                  <input
                    type="text"
                    aria-label="Staged Years of Experience"
                    value={draft.summary.yearsOfExperience}
                    onChange={(e) =>
                      setDraft((prev) => ({
                        ...prev,
                        summary: { ...prev.summary, yearsOfExperience: e.target.value },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-600 mb-1">
                  Summary Bio
                </label>
                <textarea
                  rows={3}
                  aria-label="Staged Summary Text"
                  value={draft.summary.text}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      summary: { ...prev.summary, text: e.target.value },
                    }))
                  }
                  className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900"
                />
              </div>
            </div>
          )}
        </section>

        {/* Work Experience */}
        {draft.experience.length > 0 && (
          <section
            data-testid="staging-section-experience"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-neutral-900">
                Work Experience ({draft.experience.length})
              </h3>
              <span className="text-xs text-neutral-500">
                Approve, edit, or discard each role
              </span>
            </div>
            <div className="p-4 space-y-3">
              {draft.experience.map((exp, idx) => {
                const isApproved = approvedIds[exp.id] !== false;
                return (
                  <div
                    key={exp.id}
                    data-testid={`staged-experience-item-${idx}`}
                    className={`p-3.5 rounded-control border space-y-3 transition-colors ${
                      isApproved
                        ? 'border-neutral-200 bg-neutral-50/40'
                        : 'border-neutral-200 bg-neutral-100/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isApproved}
                          onChange={() => toggleItemApproval(exp.id)}
                          aria-label={`Approve experience ${exp.company || exp.role || idx + 1}`}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                        <span>
                          {exp.role || 'Role'} {exp.company ? `at ${exp.company}` : ''}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => discardExperience(exp.id)}
                        aria-label={`Discard experience ${exp.company || exp.role || idx + 1}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Discard
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Company
                        </label>
                        <input
                          type="text"
                          aria-label={`Experience company ${idx + 1}`}
                          value={exp.company}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              company: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Role / Title
                        </label>
                        <input
                          type="text"
                          aria-label={`Experience role ${idx + 1}`}
                          value={exp.role}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              role: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              startDate: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="text"
                          value={exp.current ? 'Present' : exp.endDate}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              current: /^present|current$/i.test(e.target.value.trim()),
                              endDate: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Responsibilities &amp; Achievements (one bullet per line)
                        </label>
                        <textarea
                          rows={3}
                          aria-label={`Experience bullets ${idx + 1}`}
                          value={[...exp.responsibilities, ...exp.achievements].join('\n')}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              responsibilities: splitLines(e.target.value),
                              achievements: [],
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Technologies (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={exp.technologies.join(', ')}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              technologies: splitComma(e.target.value),
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Projects */}
        {draft.projects.length > 0 && (
          <section
            data-testid="staging-section-projects"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Projects ({draft.projects.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {draft.projects.map((proj, idx) => {
                const isApproved = approvedIds[proj.id] !== false;
                return (
                  <div
                    key={proj.id}
                    data-testid={`staged-project-item-${idx}`}
                    className={`p-3.5 rounded-control border space-y-3 ${
                      isApproved
                        ? 'border-neutral-200 bg-neutral-50/40'
                        : 'border-neutral-200 bg-neutral-100/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isApproved}
                          onChange={() => toggleItemApproval(proj.id)}
                          aria-label={`Approve project ${proj.name || idx + 1}`}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                        <span>{proj.name || `Project #${idx + 1}`}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => discardProject(proj.id)}
                        aria-label={`Discard project ${proj.name || idx + 1}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Discard
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          value={proj.name}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Technologies
                        </label>
                        <input
                          type="text"
                          value={proj.technologies.join(', ')}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              technologies: splitComma(e.target.value),
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Description &amp; Impact
                        </label>
                        <textarea
                          rows={2}
                          value={proj.description}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              description: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Grouped Skills */}
        {nonEmptySkillCategories.length > 0 && (
          <section
            data-testid="staging-section-skills"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Extracted Skills by Category
              </h3>
            </div>
            <div className="p-4 space-y-4">
              {nonEmptySkillCategories.map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {draft.skills[key].map((skill) => {
                      const isApproved = approvedIds[skill.id] !== false;
                      return (
                        <div
                          key={skill.id}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${
                            isApproved
                              ? 'bg-primary-50/70 border-primary-200 text-neutral-900'
                              : 'bg-neutral-100 border-neutral-200 text-neutral-500 opacity-70'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isApproved}
                            onChange={() => toggleItemApproval(skill.id)}
                            aria-label={`Approve skill ${skill.name}`}
                            className="h-3.5 w-3.5 rounded border-neutral-300 text-primary-600"
                          />
                          <input
                            type="text"
                            aria-label={`Edit skill ${skill.name}`}
                            value={skill.name}
                            onChange={(e) =>
                              updateSkillName(key, skill.id, e.target.value)
                            }
                            size={Math.max(4, skill.name.length)}
                            className="bg-transparent font-medium focus:outline-none focus:underline"
                          />
                          <button
                            type="button"
                            onClick={() => discardSkill(key, skill.id)}
                            aria-label={`Discard skill ${skill.name}`}
                            className="text-neutral-400 hover:text-red-600"
                          >
                            <XMarkIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Education */}
        {draft.education.length > 0 && (
          <section
            data-testid="staging-section-education"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Education ({draft.education.length})
              </h3>
            </div>
            <div className="p-4 space-y-3">
              {draft.education.map((edu, idx) => {
                const isApproved = approvedIds[edu.id] !== false;
                return (
                  <div
                    key={edu.id}
                    className={`p-3.5 rounded-control border space-y-3 ${
                      isApproved
                        ? 'border-neutral-200 bg-neutral-50/40'
                        : 'border-neutral-200 bg-neutral-100/60 opacity-65'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isApproved}
                          onChange={() => toggleItemApproval(edu.id)}
                          aria-label={`Approve education ${edu.institution || edu.degree || idx + 1}`}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                        <span>
                          {edu.degree || 'Degree'}{' '}
                          {edu.institution ? `— ${edu.institution}` : ''}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => discardEducation(edu.id)}
                        aria-label={`Discard education ${edu.institution || idx + 1}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Discard
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Institution
                        </label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) =>
                            updateEducation(edu.id, (curr) => ({
                              ...curr,
                              institution: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Degree
                        </label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) =>
                            updateEducation(edu.id, (curr) => ({
                              ...curr,
                              degree: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Field of Study
                        </label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={(e) =>
                            updateEducation(edu.id, (curr) => ({
                              ...curr,
                              field: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white text-neutral-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Certifications */}
        {draft.certifications.length > 0 && (
          <section
            data-testid="staging-section-certifications"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Certifications ({draft.certifications.length})
              </h3>
            </div>
            <div className="p-4 space-y-2.5">
              {draft.certifications.map((cert, idx) => {
                const isApproved = approvedIds[cert.id] !== false;
                return (
                  <div
                    key={cert.id}
                    className="p-3 rounded-control border border-neutral-200 bg-neutral-50/40 flex flex-wrap items-center justify-between gap-3"
                  >
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isApproved}
                        onChange={() => toggleItemApproval(cert.id)}
                        aria-label={`Approve certification ${cert.name || idx + 1}`}
                        className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                      />
                      <span>{cert.name}</span>
                    </label>
                    <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                      <input
                        type="text"
                        value={cert.name}
                        onChange={(e) =>
                          updateCertification(cert.id, (curr) => ({
                            ...curr,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Certificate name"
                        className="flex-1 px-2.5 py-1 text-xs border border-neutral-300 rounded-control bg-white text-neutral-900"
                      />
                      <input
                        type="text"
                        value={cert.issuer}
                        onChange={(e) =>
                          updateCertification(cert.id, (curr) => ({
                            ...curr,
                            issuer: e.target.value,
                          }))
                        }
                        placeholder="Issuer"
                        className="w-36 px-2.5 py-1 text-xs border border-neutral-300 rounded-control bg-white text-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={() => discardCertification(cert.id)}
                        aria-label={`Discard certification ${cert.name || idx + 1}`}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Achievements */}
        {draft.achievements.length > 0 && (
          <section
            data-testid="staging-section-achievements"
            className="rounded-card border border-neutral-200 bg-white overflow-hidden"
          >
            <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
              <h3 className="text-sm font-semibold text-neutral-900">
                Achievements &amp; Awards ({draft.achievements.length})
              </h3>
            </div>
            <div className="p-4 space-y-2.5">
              {draft.achievements.map((ach, idx) => {
                const isApproved = approvedIds[ach.id] !== false;
                return (
                  <div
                    key={ach.id}
                    className="p-3 rounded-control border border-neutral-200 bg-neutral-50/40 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isApproved}
                          onChange={() => toggleItemApproval(ach.id)}
                          aria-label={`Approve achievement ${ach.title || idx + 1}`}
                          className="h-4 w-4 rounded border-neutral-300 text-primary-600"
                        />
                        <span>{ach.title}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => discardAchievement(ach.id)}
                        aria-label={`Discard achievement ${ach.title || idx + 1}`}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Discard
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={ach.title}
                        onChange={(e) =>
                          updateAchievement(ach.id, (curr) => ({
                            ...curr,
                            title: e.target.value,
                          }))
                        }
                        className="sm:col-span-2 px-2.5 py-1 text-xs border border-neutral-300 rounded-control bg-white text-neutral-900"
                      />
                      <select
                        value={ach.category}
                        onChange={(e) =>
                          updateAchievement(ach.id, (curr) => ({
                            ...curr,
                            category: e.target.value as AchievementCategory,
                          }))
                        }
                        className="px-2.5 py-1 text-xs border border-neutral-300 rounded-control bg-white text-neutral-900"
                      >
                        <option value="award">Award</option>
                        <option value="publication">Publication</option>
                        <option value="open-source">Open Source</option>
                        <option value="hackathon">Hackathon</option>
                        <option value="leadership">Leadership</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-5 py-4 bg-neutral-50 border-t border-neutral-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          type="button"
          data-testid="staging-cancel-btn"
          onClick={onCancel}
          disabled={submitting}
          className="w-full sm:w-auto h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors focus-ring"
        >
          Cancel (Keep Profile Unchanged)
        </button>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            data-testid="staging-approve-btn"
            disabled={submitting || approvedCount === 0}
            onClick={() => void onApprove(buildApprovedPayload(), mode, false)}
            className="w-full sm:w-auto h-10 px-5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors focus-ring"
          >
            {submitting ? 'Saving…' : 'Approve & Save to Career Profile'}
          </button>

          {allowCreateResumeOption && (
            <button
              type="button"
              data-testid="staging-approve-and-seed-btn"
              disabled={submitting || approvedCount === 0}
              onClick={() => void onApprove(buildApprovedPayload(), mode, true)}
              className="w-full sm:w-auto h-10 px-5 rounded-control bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 inline-flex items-center justify-center gap-1.5 transition-colors focus-ring"
            >
              <SparklesIcon className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Creating…' : 'Approve & Create Resume'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportStagingReview;
