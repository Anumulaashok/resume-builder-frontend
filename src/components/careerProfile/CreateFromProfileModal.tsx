import React, { useEffect, useState } from 'react';
import {
  CheckCircleIcon,
  DocumentPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ICareerProfile } from '../../types/careerProfile';
import { IResume } from '../../types/resume';
import { careerProfileToSeededResume } from '../../services/careerProfile.service';

export interface CreateFromProfileModalProps {
  isOpen: boolean;
  profile: ICareerProfile;
  onClose: () => void;
  onCreateSeededResume: (seededDraft: IResume) => void;
  onStartBlank: () => void;
}

export const CreateFromProfileModal: React.FC<CreateFromProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onCreateSeededResume,
  onStartBlank,
}) => {
  const [title, setTitle] = useState('');
  const [includeSummary, setIncludeSummary] = useState(true);
  const [selectedExpIds, setSelectedExpIds] = useState<Set<string>>(new Set());
  const [selectedProjIds, setSelectedProjIds] = useState<Set<string>>(new Set());
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [selectedEduIds, setSelectedEduIds] = useState<Set<string>>(new Set());
  const [selectedCertIds, setSelectedCertIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || !profile) return;
    const defaultTitle = profile.basics?.label?.trim()
      ? `${profile.basics.label.trim()} Resume`
      : profile.basics?.name?.trim()
      ? `${profile.basics.name.trim()} — Tailored Resume`
      : 'Tailored Resume';
    setTitle(defaultTitle);
    setIncludeSummary(Boolean(profile.basics?.summary?.trim()));
    setSelectedExpIds(new Set((profile.experiences || []).map((e) => e.id)));
    setSelectedProjIds(new Set((profile.projects || []).map((p) => p.id)));
    setSelectedSkillIds(new Set((profile.skills || []).map((s) => s.id)));
    setSelectedEduIds(new Set((profile.education || []).map((ed) => ed.id)));
    setSelectedCertIds(new Set((profile.certifications || []).map((c) => c.id)));
  }, [isOpen, profile]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleInSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllInSection = (
    items: Array<{ id: string }>,
    currentSet: Set<string>,
    setter: React.Dispatch<React.SetStateAction<Set<string>>>
  ) => {
    if (currentSet.size === items.length) {
      setter(new Set());
    } else {
      setter(new Set(items.map((i) => i.id)));
    }
  };

  const handleConfirm = () => {
    const seeded = careerProfileToSeededResume(profile, {
      title,
      includeSummary,
      includeExperience: selectedExpIds.size > 0,
      selectedExperienceIds: Array.from(selectedExpIds),
      includeProjects: selectedProjIds.size > 0,
      selectedProjectIds: Array.from(selectedProjIds),
      includeSkills: selectedSkillIds.size > 0,
      selectedSkillIds: Array.from(selectedSkillIds),
      includeEducation: selectedEduIds.size > 0,
      selectedEducationIds: Array.from(selectedEduIds),
      includeCertifications: selectedCertIds.size > 0,
      selectedCertificationIds: Array.from(selectedCertIds),
    });
    onCreateSeededResume(seeded);
  };

  const totalSelectedCount =
    selectedExpIds.size +
    selectedProjIds.size +
    selectedSkillIds.size +
    selectedEduIds.size +
    selectedCertIds.size;

  return (
    <div
      data-testid="create-from-profile-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/50 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-from-profile-title"
        data-testid="create-from-profile-modal"
        className="bg-white rounded-panel border border-neutral-200 shadow-modal w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <DocumentPlusIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="create-from-profile-title"
                className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
              >
                Create Tailored Resume from Career Profile
              </h2>
              <p className="text-xs text-neutral-500">
                Select which approved roles, projects, skills, and credentials to include
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="h-9 w-9 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus-ring"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          <div>
            <label
              htmlFor="seeded-resume-title-input"
              className="block text-xs font-semibold text-neutral-700 mb-1.5"
            >
              Tailored Resume Title
            </label>
            <input
              id="seeded-resume-title-input"
              data-testid="seeded-resume-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Backend Engineer — Stripe"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="rounded-card border border-primary-100 bg-primary-50/40 px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-neutral-700">
              <span className="font-semibold text-neutral-900">
                Contact Details Included:{' '}
              </span>
              {[
                profile.basics?.name,
                profile.basics?.email,
                profile.basics?.phone,
                profile.basics?.location?.city,
              ]
                .filter(Boolean)
                .join(' · ') || 'Profile contact details'}
            </div>
            <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          </div>

          {profile.basics?.summary && (
            <label className="flex items-start gap-3 p-3.5 rounded-card border border-neutral-200 bg-white cursor-pointer hover:border-neutral-300">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                aria-label="Include Professional Summary"
                className="h-4 w-4 mt-0.5 text-primary-600 rounded border-neutral-300 focus-ring"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-semibold text-neutral-900 block">
                  Professional Summary
                </span>
                <p className="text-xs text-neutral-600 mt-0.5 line-clamp-2">
                  {profile.basics.summary}
                </p>
              </div>
            </label>
          )}

          {/* Experience Selector */}
          {profile.experiences?.length > 0 && (
            <div
              data-testid="profile-seed-section-experience"
              className="rounded-card border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <span className="text-sm font-semibold text-neutral-900">
                  Professional Experience ({selectedExpIds.size}/{profile.experiences.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggleAllInSection(
                      profile.experiences,
                      selectedExpIds,
                      setSelectedExpIds
                    )
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedExpIds.size === profile.experiences.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {profile.experiences.map((exp) => (
                  <label
                    key={exp.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedExpIds.has(exp.id)}
                      onChange={() => toggleInSet(setSelectedExpIds, exp.id)}
                      aria-label={`Include role ${exp.position || exp.company}`}
                      className="h-4 w-4 mt-0.5 text-primary-600 rounded border-neutral-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900">
                        {exp.position || 'Role'}
                        {exp.company ? ` · ${exp.company}` : ''}
                      </div>
                      {(exp.startDate || exp.endDate) && (
                        <div className="text-xs text-neutral-500">
                          {exp.startDate || ''}{' '}
                          {exp.endDate || (exp.current ? 'Present' : '')
                            ? `– ${exp.current ? 'Present' : exp.endDate}`
                            : ''}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Projects Selector */}
          {profile.projects?.length > 0 && (
            <div
              data-testid="profile-seed-section-projects"
              className="rounded-card border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <span className="text-sm font-semibold text-neutral-900">
                  Projects ({selectedProjIds.size}/{profile.projects.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggleAllInSection(
                      profile.projects,
                      selectedProjIds,
                      setSelectedProjIds
                    )
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedProjIds.size === profile.projects.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {profile.projects.map((proj) => (
                  <label
                    key={proj.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjIds.has(proj.id)}
                      onChange={() => toggleInSet(setSelectedProjIds, proj.id)}
                      aria-label={`Include project ${proj.name}`}
                      className="h-4 w-4 mt-0.5 text-primary-600 rounded border-neutral-300"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-neutral-900">
                        {proj.name}
                      </div>
                      {proj.description && (
                        <div className="text-xs text-neutral-500 line-clamp-1">
                          {proj.description}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Skills Selector */}
          {profile.skills?.length > 0 && (
            <div
              data-testid="profile-seed-section-skills"
              className="rounded-card border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <span className="text-sm font-semibold text-neutral-900">
                  Skills ({selectedSkillIds.size}/{profile.skills.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggleAllInSection(
                      profile.skills,
                      selectedSkillIds,
                      setSelectedSkillIds
                    )
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedSkillIds.size === profile.skills.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="p-3.5 flex flex-wrap gap-2">
                {profile.skills.map((skill) => {
                  const checked = selectedSkillIds.has(skill.id);
                  return (
                    <label
                      key={skill.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                        checked
                          ? 'bg-primary-50 text-primary-700 border-primary-300'
                          : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInSet(setSelectedSkillIds, skill.id)}
                        aria-label={`Include skill ${skill.name}`}
                        className="sr-only"
                      />
                      <span>{skill.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Education Selector */}
          {profile.education?.length > 0 && (
            <div
              data-testid="profile-seed-section-education"
              className="rounded-card border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <span className="text-sm font-semibold text-neutral-900">
                  Education ({selectedEduIds.size}/{profile.education.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggleAllInSection(
                      profile.education,
                      selectedEduIds,
                      setSelectedEduIds
                    )
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedEduIds.size === profile.education.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {profile.education.map((edu) => (
                  <label
                    key={edu.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEduIds.has(edu.id)}
                      onChange={() => toggleInSet(setSelectedEduIds, edu.id)}
                      aria-label={`Include education ${edu.institution}`}
                      className="h-4 w-4 mt-0.5 text-primary-600 rounded border-neutral-300"
                    />
                    <div className="min-w-0 flex-1 text-sm text-neutral-900">
                      <span className="font-medium">{edu.institution}</span>
                      {edu.degree || edu.field
                        ? ` · ${[edu.degree, edu.field].filter(Boolean).join(' in ')}`
                        : ''}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Certifications Selector */}
          {profile.certifications?.length > 0 && (
            <div
              data-testid="profile-seed-section-certifications"
              className="rounded-card border border-neutral-200 bg-white overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                <span className="text-sm font-semibold text-neutral-900">
                  Certifications ({selectedCertIds.size}/{profile.certifications.length})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    toggleAllInSection(
                      profile.certifications,
                      selectedCertIds,
                      setSelectedCertIds
                    )
                  }
                  className="text-xs font-medium text-primary-600 hover:text-primary-700"
                >
                  {selectedCertIds.size === profile.certifications.length
                    ? 'Deselect all'
                    : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-neutral-100">
                {profile.certifications.map((cert) => (
                  <label
                    key={cert.id}
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-50/70"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCertIds.has(cert.id)}
                      onChange={() => toggleInSet(setSelectedCertIds, cert.id)}
                      aria-label={`Include certification ${cert.name}`}
                      className="h-4 w-4 mt-0.5 text-primary-600 rounded border-neutral-300"
                    />
                    <div className="min-w-0 flex-1 text-sm text-neutral-900">
                      <span className="font-medium">{cert.name}</span>
                      {cert.issuer ? ` · ${cert.issuer}` : ''}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-neutral-500">
            Edits inside this tailored resume will not overwrite your saved Career Profile
            unless you explicitly trigger a sync.
          </p>
        </div>

        {/* Footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <button
            type="button"
            data-testid="start-blank-resume-btn"
            onClick={onStartBlank}
            className="text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 underline text-center sm:text-left"
          >
            Start Blank Resume Instead
          </button>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto h-10 px-4 border border-neutral-300 bg-white rounded-control text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
            >
              Cancel
            </button>
            <button
              type="button"
              data-testid="confirm-seed-from-profile-btn"
              onClick={handleConfirm}
              className="w-full sm:w-auto h-10 px-5 rounded-control text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-colors focus-ring"
            >
              Create Tailored Resume ({totalSelectedCount} items)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
