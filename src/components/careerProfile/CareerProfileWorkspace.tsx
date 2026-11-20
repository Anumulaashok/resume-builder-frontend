import React, { useCallback, useEffect, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowUpTrayIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  DocumentPlusIcon,
  FolderIcon,
  IdentificationIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  CareerProfileCertification,
  CareerProfileEducation,
  CareerProfileExperience,
  CareerProfileProject,
  CareerProfileSkill,
  ICareerProfile,
} from '../../types/careerProfile';
import { IResume } from '../../types/resume';
import {
  careerProfileService,
  createEmptyCareerProfile,
  hasApprovedCareerProfileFacts,
} from '../../services/careerProfile.service';
import ImportResumeModal from '../ImportResumeModal';
import { CreateFromProfileModal } from './CreateFromProfileModal';
import { Container } from '../ui/container';
import { Skeleton } from '../ui/skeleton';
import { formatResumeDate } from '../../utils/date';

interface CareerProfileWorkspaceProps {
  user?: {
    name?: string;
    email?: string;
  } | null;
  onStartTailoredResume: (seededResume: IResume) => void;
  onStartBlankResume: () => void;
}

const makeItemId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const CareerProfileWorkspace: React.FC<CareerProfileWorkspaceProps> = ({
  user,
  onStartTailoredResume,
  onStartBlankResume,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSavedRecord, setHasSavedRecord] = useState(false);
  const [isManualEditing, setIsManualEditing] = useState(false);
  const [profile, setProfile] = useState<ICareerProfile>(() =>
    createEmptyCareerProfile(user)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCreateResumeModal, setShowCreateResumeModal] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await careerProfileService.getProfile();
      if (data) {
        setProfile(data);
        setHasSavedRecord(true);
      } else {
        setProfile(createEmptyCareerProfile(user));
        setHasSavedRecord(false);
      }
      setIsDirty(false);
    } catch {
      toast.error('Unable to load your Career Profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const saved = await careerProfileService.saveProfile(profile);
      setProfile(saved);
      setHasSavedRecord(true);
      setIsDirty(false);
      toast.success('Career Profile saved!');
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to save Career Profile'
      );
    } finally {
      setSaving(false);
    }
  };

  const updateBasics = (field: string, value: any) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        [field]: value,
      },
    }));
  };

  const updateLocation = (field: 'city' | 'region', value: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        location: {
          ...(prev.basics.location || {}),
          [field]: value,
        },
      },
    }));
  };

  // Experience helpers
  const addExperience = () => {
    setIsDirty(true);
    const nextExp: CareerProfileExperience = {
      id: makeItemId('exp'),
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      highlights: [],
      technologies: [],
    };
    setProfile((prev) => ({
      ...prev,
      experiences: [...prev.experiences, nextExp],
    }));
  };

  const updateExperience = (
    id: string,
    updater: (exp: CareerProfileExperience) => CareerProfileExperience
  ) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      experiences: prev.experiences.map((e) => (e.id === id ? updater(e) : e)),
    }));
  };

  const removeExperience = (id: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((e) => e.id !== id),
    }));
  };

  // Project helpers
  const addProject = () => {
    setIsDirty(true);
    const nextProj: CareerProfileProject = {
      id: makeItemId('proj'),
      name: '',
      description: '',
      highlights: [],
      technologies: [],
      url: '',
      githubUrl: '',
    };
    setProfile((prev) => ({
      ...prev,
      projects: [...prev.projects, nextProj],
    }));
  };

  const updateProject = (
    id: string,
    updater: (proj: CareerProfileProject) => CareerProfileProject
  ) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? updater(p) : p)),
    }));
  };

  const removeProject = (id: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((p) => p.id !== id),
    }));
  };

  // Skill helpers
  const addSkill = () => {
    setIsDirty(true);
    const nextSkill: CareerProfileSkill = {
      id: makeItemId('skill'),
      name: '',
      category: '',
      level: 'Intermediate',
      keywords: [],
    };
    setProfile((prev) => ({
      ...prev,
      skills: [...prev.skills, nextSkill],
    }));
  };

  const updateSkill = (
    id: string,
    updater: (sk: CareerProfileSkill) => CareerProfileSkill
  ) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? updater(s) : s)),
    }));
  };

  const removeSkill = (id: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
  };

  // Education helpers
  const addEducation = () => {
    setIsDirty(true);
    const nextEdu: CareerProfileEducation = {
      id: makeItemId('edu'),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: '',
      location: '',
      score: '',
      description: '',
      highlights: [],
    };
    setProfile((prev) => ({
      ...prev,
      education: [...prev.education, nextEdu],
    }));
  };

  const updateEducation = (
    id: string,
    updater: (ed: CareerProfileEducation) => CareerProfileEducation
  ) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      education: prev.education.map((ed) => (ed.id === id ? updater(ed) : ed)),
    }));
  };

  const removeEducation = (id: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((ed) => ed.id !== id),
    }));
  };

  // Certification helpers
  const addCertification = () => {
    setIsDirty(true);
    const nextCert: CareerProfileCertification = {
      id: makeItemId('cert'),
      name: '',
      issuer: '',
      date: '',
      url: '',
      description: '',
    };
    setProfile((prev) => ({
      ...prev,
      certifications: [...prev.certifications, nextCert],
    }));
  };

  const updateCertification = (
    id: string,
    updater: (c: CareerProfileCertification) => CareerProfileCertification
  ) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) => (c.id === id ? updater(c) : c)),
    }));
  };

  const removeCertification = (id: string) => {
    setIsDirty(true);
    setProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  };

  const showEditor = hasSavedRecord || isManualEditing;
  const canCreateTailoredResume =
    hasSavedRecord && hasApprovedCareerProfileFacts(profile);

  return (
    <Container
      as="main"
      data-testid="career-profile-workspace"
      className="pt-24 sm:pt-28 pb-16"
    >
      {/* Workspace Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold ring-1 ring-inset ring-primary-200 mb-2">
            <IdentificationIcon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Single Source of Truth</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
            Career Profile
          </h1>
          <p className="mt-1.5 text-sm text-neutral-600 max-w-2xl">
            Store your verified roles, achievements, metrics, projects, and skills once.
            Reuse them across tailored resumes, grounded cover letters, and portfolios.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="profile-import-merge-btn"
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center justify-center h-10 px-4 border border-neutral-300 rounded-control shadow-sm text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 transition-colors focus-ring"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            {hasSavedRecord ? 'Import & Merge Resume' : 'Import Resume (PDF, DOCX, TXT)'}
          </button>

          {canCreateTailoredResume && (
            <button
              type="button"
              data-testid="profile-create-tailored-resume-btn"
              onClick={() => setShowCreateResumeModal(true)}
              className="inline-flex items-center justify-center h-10 px-4 border border-accent-200 rounded-control shadow-sm text-sm font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 transition-colors focus-ring"
            >
              <DocumentPlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Create Tailored Resume
            </button>
          )}

          {showEditor && (
            <button
              type="button"
              data-testid="save-career-profile-btn"
              disabled={saving}
              onClick={handleSaveProfile}
              className="inline-flex items-center justify-center h-10 px-5 border border-transparent rounded-control shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors focus-ring"
            >
              {saving ? 'Saving…' : isDirty ? 'Save Profile Changes' : 'Save Profile'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4" data-testid="career-profile-loading">
          <Skeleton className="h-36 w-full rounded-panel" />
          <Skeleton className="h-48 w-full rounded-panel" />
        </div>
      ) : !showEditor ? (
        <div
          data-testid="career-profile-empty-state"
          className="bg-white rounded-panel border border-dashed border-neutral-300 p-8 sm:p-12 text-center shadow-sm"
        >
          <div className="w-14 h-14 rounded-card bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100 flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">
            Build your reusable Career Profile
          </h2>
          <p className="mt-2 text-sm text-neutral-600 max-w-lg mx-auto">
            Upload an existing PDF, Word (.docx), Plain Text (.txt), or JSON Resume. You
            will review and approve every extracted section before anything is saved.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              data-testid="empty-state-import-profile-btn"
              onClick={() => setShowImportModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium shadow-sm transition-colors focus-ring"
            >
              <ArrowUpTrayIcon className="h-4 w-4 mr-2" aria-hidden="true" />
              Upload PDF, DOCX, or TXT Resume
            </button>
            <button
              type="button"
              data-testid="empty-state-manual-profile-btn"
              onClick={() => setIsManualEditing(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center h-10 px-4 rounded-control border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 text-sm font-medium transition-colors focus-ring"
            >
              <PlusIcon className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Enter Career Facts Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Roles', count: profile.experiences.length },
              { label: 'Projects', count: profile.projects.length },
              { label: 'Skills', count: profile.skills.length },
              { label: 'Education', count: profile.education.length },
              { label: 'Certifications', count: profile.certifications.length },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white rounded-card border border-neutral-200 px-4 py-3 shadow-sm"
              >
                <div className="text-xs font-medium text-neutral-500">{stat.label}</div>
                <div className="text-xl font-bold text-neutral-900 mt-0.5">
                  {stat.count}
                </div>
              </div>
            ))}
          </div>

          {/* Contact & Summary */}
          <section className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200">
              <h2 className="text-base font-semibold text-neutral-900">
                Contact Details &amp; Summary
              </h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="cp-basics-name"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  id="cp-basics-name"
                  type="text"
                  value={profile.basics.name || ''}
                  onChange={(e) => updateBasics('name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cp-basics-label"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Professional Headline
                </label>
                <input
                  id="cp-basics-label"
                  type="text"
                  value={profile.basics.label || ''}
                  onChange={(e) => updateBasics('label', e.target.value)}
                  placeholder="e.g. Senior Full-Stack Engineer"
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cp-basics-email"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Email
                </label>
                <input
                  id="cp-basics-email"
                  type="email"
                  value={profile.basics.email || ''}
                  onChange={(e) => updateBasics('email', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cp-basics-phone"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Phone
                </label>
                <input
                  id="cp-basics-phone"
                  type="text"
                  value={profile.basics.phone || ''}
                  onChange={(e) => updateBasics('phone', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cp-basics-city"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  City / Location
                </label>
                <input
                  id="cp-basics-city"
                  type="text"
                  value={profile.basics.location?.city || ''}
                  onChange={(e) => updateLocation('city', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="cp-basics-url"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Website / Portfolio URL
                </label>
                <input
                  id="cp-basics-url"
                  type="text"
                  value={profile.basics.url || ''}
                  onChange={(e) => updateBasics('url', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="cp-basics-summary"
                  className="block text-xs font-medium text-neutral-700 mb-1"
                >
                  Executive / Career Summary
                </label>
                <textarea
                  id="cp-basics-summary"
                  rows={3}
                  value={profile.basics.summary || ''}
                  onChange={(e) => updateBasics('summary', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </section>

          {/* Experiences */}
          <section
            data-testid="cp-section-experiences"
            className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BriefcaseIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-base font-semibold text-neutral-900">
                  Roles &amp; Experience ({profile.experiences.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={addExperience}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-control bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Role
              </button>
            </div>
            <div className="p-6 space-y-4">
              {profile.experiences.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No experience entries yet. Import a resume or add a role manually.
                </p>
              ) : (
                profile.experiences.map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="p-4 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500">
                        Role #{idx + 1}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove role ${idx + 1}`}
                        onClick={() => removeExperience(exp.id)}
                        className="text-xs text-neutral-400 hover:text-red-600 inline-flex items-center gap-1"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Role / Position
                        </label>
                        <input
                          type="text"
                          aria-label={`Role position ${idx + 1}`}
                          value={exp.position || ''}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              position: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Company
                        </label>
                        <input
                          type="text"
                          aria-label={`Role company ${idx + 1}`}
                          value={exp.company || ''}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              company: e.target.value,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Start Date
                        </label>
                        <input
                          type="text"
                          value={exp.startDate || ''}
                          onChange={(e) =>
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              startDate: e.target.value,
                            }))
                          }
                          placeholder="Jan 2021"
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          End Date
                        </label>
                        <input
                          type="text"
                          value={exp.current ? 'Present' : exp.endDate || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            const isPres = /^present$/i.test(v.trim());
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              endDate: isPres ? '' : v,
                              current: isPres,
                            }));
                          }}
                          placeholder="Present"
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Verified Highlights &amp; Metrics (one bullet per line)
                        </label>
                        <textarea
                          rows={3}
                          aria-label={`Role highlights ${idx + 1}`}
                          value={(exp.highlights || []).join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value
                              .split('\n')
                              .map((l) => l.replace(/^[•*-]\s*/, ''))
                              .filter((l) => l.trim().length > 0);
                            updateExperience(exp.id, (curr) => ({
                              ...curr,
                              highlights: lines,
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Projects */}
          <section
            data-testid="cp-section-projects"
            className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-base font-semibold text-neutral-900">
                  Projects ({profile.projects.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={addProject}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-control bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Project
              </button>
            </div>
            <div className="p-6 space-y-4">
              {profile.projects.length === 0 ? (
                <p className="text-sm text-neutral-500">
                  No projects saved yet. Projects added here flow directly into resumes and
                  portfolio showcases with their bullet highlights intact.
                </p>
              ) : (
                profile.projects.map((proj, idx) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-neutral-500">
                        Project #{idx + 1}
                      </span>
                      <button
                        type="button"
                        aria-label={`Remove project ${idx + 1}`}
                        onClick={() => removeProject(proj.id)}
                        className="text-xs text-neutral-400 hover:text-red-600 inline-flex items-center gap-1"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Project Name
                        </label>
                        <input
                          type="text"
                          aria-label={`Project name ${idx + 1}`}
                          value={proj.name || ''}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              name: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Technologies (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(proj.technologies || []).join(', ')}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              technologies: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Project URL
                        </label>
                        <input
                          type="text"
                          value={proj.url || ''}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              url: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Summary
                        </label>
                        <input
                          type="text"
                          aria-label={`Project summary ${idx + 1}`}
                          value={proj.description || ''}
                          onChange={(e) =>
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              description: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-neutral-600 mb-1">
                          Bullet Highlights (one per line)
                        </label>
                        <textarea
                          rows={2}
                          aria-label={`Project highlights ${idx + 1}`}
                          value={(proj.highlights || []).join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value
                              .split('\n')
                              .map((l) => l.replace(/^[•*-]\s*/, ''))
                              .filter((l) => l.trim().length > 0);
                            updateProject(proj.id, (curr) => ({
                              ...curr,
                              highlights: lines,
                            }));
                          }}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Skills */}
          <section
            data-testid="cp-section-skills"
            className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-primary-600" />
                <h2 className="text-base font-semibold text-neutral-900">
                  Skills ({profile.skills.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={addSkill}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-control bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Skill
              </button>
            </div>
            <div className="p-6 space-y-3">
              {profile.skills.length === 0 ? (
                <p className="text-sm text-neutral-500">No skills added yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {profile.skills.map((skill, idx) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-2 p-3 rounded-card border border-neutral-200 bg-neutral-50/40"
                    >
                      <input
                        type="text"
                        aria-label={`Skill name ${idx + 1}`}
                        value={skill.name || ''}
                        placeholder="Skill or Category (e.g. TypeScript)"
                        onChange={(e) =>
                          updateSkill(skill.id, (curr) => ({
                            ...curr,
                            name: e.target.value,
                          }))
                        }
                        className="flex-1 px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                      />
                      <button
                        type="button"
                        aria-label={`Remove skill ${idx + 1}`}
                        onClick={() => removeSkill(skill.id)}
                        className="p-1.5 text-neutral-400 hover:text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Education & Certifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section
              data-testid="cp-section-education"
              className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AcademicCapIcon className="h-5 w-5 text-primary-600" />
                  <h2 className="text-base font-semibold text-neutral-900">
                    Education ({profile.education.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addEducation}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-control bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add
                </button>
              </div>
              <div className="p-6 space-y-3">
                {profile.education.length === 0 ? (
                  <p className="text-sm text-neutral-500">No education entries yet.</p>
                ) : (
                  profile.education.map((edu, idx) => (
                    <div
                      key={edu.id}
                      className="p-3.5 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500">
                          Education #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeEducation(edu.id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Institution"
                        value={edu.institution || ''}
                        onChange={(e) =>
                          updateEducation(edu.id, (curr) => ({
                            ...curr,
                            institution: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Degree (e.g. B.S.)"
                          value={edu.degree || ''}
                          onChange={(e) =>
                            updateEducation(edu.id, (curr) => ({
                              ...curr,
                              degree: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Field of Study"
                          value={edu.field || ''}
                          onChange={(e) =>
                            updateEducation(edu.id, (curr) => ({
                              ...curr,
                              field: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section
              data-testid="cp-section-certifications"
              className="bg-white rounded-panel border border-neutral-200 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 bg-neutral-50/80 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckBadgeIcon className="h-5 w-5 text-primary-600" />
                  <h2 className="text-base font-semibold text-neutral-900">
                    Certifications ({profile.certifications.length})
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={addCertification}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-control bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-medium"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add
                </button>
              </div>
              <div className="p-6 space-y-3">
                {profile.certifications.length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    No certifications added yet.
                  </p>
                ) : (
                  profile.certifications.map((cert, idx) => (
                    <div
                      key={cert.id}
                      className="p-3.5 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-500">
                          Certificate #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeCertification(cert.id)}
                          className="text-xs text-neutral-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Certificate Name"
                        value={cert.name || ''}
                        onChange={(e) =>
                          updateCertification(cert.id, (curr) => ({
                            ...curr,
                            name: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Issuer"
                          value={cert.issuer || ''}
                          onChange={(e) =>
                            updateCertification(cert.id, (curr) => ({
                              ...curr,
                              issuer: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                        <input
                          type="text"
                          placeholder="Date"
                          value={formatResumeDate(cert.date)}
                          onChange={(e) =>
                            updateCertification(cert.id, (curr) => ({
                              ...curr,
                              date: e.target.value,
                            }))
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control bg-white"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Import & Merge Modal */}
      <ImportResumeModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        user={user}
        importTarget="profile"
        onImported={() => {
          setShowImportModal(false);
        }}
        onProfileApproved={(mergedProfile) => {
          setProfile(mergedProfile);
          setHasSavedRecord(true);
          setIsDirty(false);
          setShowImportModal(false);
        }}
      />

      {/* Create Tailored Resume from Profile Modal */}
      <CreateFromProfileModal
        isOpen={showCreateResumeModal}
        profile={profile}
        onClose={() => setShowCreateResumeModal(false)}
        onCreateSeededResume={(seeded) => {
          setShowCreateResumeModal(false);
          onStartTailoredResume(seeded);
        }}
        onStartBlank={() => {
          setShowCreateResumeModal(false);
          onStartBlankResume();
        }}
      />
    </Container>
  );
};
