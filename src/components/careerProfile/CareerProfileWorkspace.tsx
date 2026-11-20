import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowUpTrayIcon,
  BriefcaseIcon,
  CheckBadgeIcon,
  CodeBracketSquareIcon,
  DocumentPlusIcon,
  ExclamationCircleIcon,
  FolderIcon,
  GlobeAltIcon,
  IdentificationIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  TrophyIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { careerProfileService } from '../../services/careerProfile.service';
import { ResumeWithMeta } from '../../services/resume.service';
import {
  AchievementCategory,
  createEmptyFrontendCareerProfile,
  ExtractedResumeStagingResponse,
  ICareerProfile,
  SKILL_CATEGORY_META,
  SkillCategoryKey,
} from '../../types/careerProfile';
import { IPortfolio } from '../../types/portfolio';
import { Container } from '../ui/container';
import { Skeleton } from '../ui/skeleton';
import ImportStagingReview from './ImportStagingReview';

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMPORT_EXTENSIONS = ['.pdf', '.docx', '.txt'];

type ProfileSectionTab =
  | 'personal'
  | 'summary'
  | 'experience'
  | 'projects'
  | 'skills'
  | 'education'
  | 'certifications'
  | 'achievements';

const SECTION_TABS: ReadonlyArray<{
  id: ProfileSectionTab;
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { id: 'personal', label: 'Personal Info', Icon: UserCircleIcon },
  { id: 'summary', label: 'Summary', Icon: IdentificationIcon },
  { id: 'experience', label: 'Experience', Icon: BriefcaseIcon },
  { id: 'projects', label: 'Projects', Icon: FolderIcon },
  { id: 'skills', label: 'Skills', Icon: CodeBracketSquareIcon },
  { id: 'education', label: 'Education', Icon: AcademicCapIcon },
  { id: 'certifications', label: 'Certifications', Icon: CheckBadgeIcon },
  { id: 'achievements', label: 'Achievements', Icon: TrophyIcon },
];

function createLocalFactId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function splitLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•●▪◦]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
}

function splitComma(text: string): string[] {
  return text
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const maybeAxios = err as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    maybeAxios?.response?.data?.message ||
    maybeAxios?.response?.data?.error ||
    (err instanceof Error ? err.message : '') ||
    fallback
  );
}

export interface CareerProfileWorkspaceProps {
  onOpenResume: (resume: ResumeWithMeta) => void;
  onOpenPortfolio: (portfolio: IPortfolio) => void;
  user?: {
    name?: string;
    email?: string;
  } | null;
}

export const CareerProfileWorkspace: React.FC<CareerProfileWorkspaceProps> = ({
  onOpenResume,
  onOpenPortfolio,
  user,
}) => {
  const [profile, setProfile] = useState<ICareerProfile>(() =>
    createEmptyFrontendCareerProfile({
      name: user?.name,
      email: user?.email,
    })
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [extracting, setExtracting] = useState<boolean>(false);
  const [approvingImport, setApprovingImport] = useState<boolean>(false);
  const [seedingPortfolio, setSeedingPortfolio] = useState<boolean>(false);
  const [seedingResume, setSeedingResume] = useState<boolean>(false);

  const [activeSection, setActiveSection] =
    useState<ProfileSectionTab>('personal');
  const [importError, setImportError] = useState<string | null>(null);
  const [stagingData, setStagingData] =
    useState<ExtractedResumeStagingResponse | null>(null);

  const [skillDraftInputs, setSkillDraftInputs] = useState<
    Record<SkillCategoryKey, string>
  >({
    languages: '',
    backend: '',
    frontend: '',
    databases: '',
    cloud: '',
    devops: '',
    aiMl: '',
    messaging: '',
    tools: '',
    other: '',
  });

  // Tailored Grounded Resume Modal
  const [showSeedResumeModal, setShowSeedResumeModal] = useState<boolean>(false);
  const [seedResumeTitle, setSeedResumeTitle] = useState<string>('');
  const [seedTargetRole, setSeedTargetRole] = useState<string>('');
  const [seedJobDescription, setSeedJobDescription] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await careerProfileService.getProfile();
      setProfile(data);
    } catch {
      setProfile(
        createEmptyFrontendCareerProfile({
          name: user?.name,
          email: user?.email,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.name]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const saved = await careerProfileService.saveProfile(profile);
      setProfile(saved);
      toast.success('Career Profile saved');
    } catch (err) {
      toast.error(extractApiErrorMessage(err, 'Failed to save Career Profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleImportFileChange = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);

    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_IMPORT_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext)
    );
    if (!hasAllowedExt) {
      setImportError(
        'Unsupported file format. Only PDF (.pdf), Word (.docx), and plain text (.txt) files up to 5 MB are accepted.'
      );
      return;
    }

    if (file.size > MAX_IMPORT_BYTES) {
      setImportError(
        'Resume file exceeds the 5 MB limit. Please upload a PDF, DOCX, or TXT file up to 5 MB.'
      );
      return;
    }

    setExtracting(true);
    try {
      const extracted = await careerProfileService.extractImportFile(file);
      setStagingData(extracted);
      toast.success('Resume extracted for staging review');
    } catch (err) {
      const message = extractApiErrorMessage(
        err,
        'Failed to extract text from resume file.'
      );
      setImportError(message);
      toast.error(message);
    } finally {
      setExtracting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleApproveStagedImport = async (
    approvedPayload: Partial<ICareerProfile>,
    mode: 'merge' | 'replace',
    createResumeAfter?: boolean
  ) => {
    setApprovingImport(true);
    try {
      const savedProfile = await careerProfileService.approveImport(
        approvedPayload,
        mode
      );
      setProfile(savedProfile);
      setStagingData(null);
      setImportError(null);
      toast.success('Approved items saved to Career Profile');

      if (createResumeAfter) {
        const createdResume = await careerProfileService.seedResume();
        onOpenResume(createdResume);
      }
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err, 'Failed to save approved Career Profile items')
      );
    } finally {
      setApprovingImport(false);
    }
  };

  const handleSeedResume = async () => {
    setSeedingResume(true);
    try {
      await careerProfileService.saveProfile(profile);
      const created = await careerProfileService.seedResume({
        title: seedResumeTitle.trim() || undefined,
        targetRole: seedTargetRole.trim() || undefined,
        jobDescription: seedJobDescription.trim() || undefined,
      });
      toast.success('Standalone resume seeded from Career Profile');
      setShowSeedResumeModal(false);
      setSeedResumeTitle('');
      setSeedTargetRole('');
      setSeedJobDescription('');
      onOpenResume(created);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(
          err,
          'Save at least your name, experience, or skills before seeding a resume.'
        )
      );
    } finally {
      setSeedingResume(false);
    }
  };

  const handleSeedPortfolio = async () => {
    setSeedingPortfolio(true);
    try {
      await careerProfileService.saveProfile(profile);
      const created = await careerProfileService.seedPortfolio();
      toast.success('Web portfolio seeded from Career Profile');
      onOpenPortfolio(created);
    } catch (err) {
      toast.error(
        extractApiErrorMessage(err, 'Failed to seed portfolio from Career Profile')
      );
    } finally {
      setSeedingPortfolio(false);
    }
  };

  const addSkillToCategory = (category: SkillCategoryKey) => {
    const raw = skillDraftInputs[category]?.trim() || '';
    if (!raw) return;
    const names = splitComma(raw);
    if (names.length === 0) return;

    setProfile((prev) => {
      const existingLower = new Set(
        prev.skills[category].map((s) => s.name.toLowerCase())
      );
      const additions = names
        .filter((name) => !existingLower.has(name.toLowerCase()))
        .map((name) => ({
          id: createLocalFactId(`skill_${category}`),
          name,
        }));
      return {
        ...prev,
        skills: {
          ...prev.skills,
          [category]: [...prev.skills[category], ...additions],
        },
      };
    });

    setSkillDraftInputs((prev) => ({
      ...prev,
      [category]: '',
    }));
  };

  const removeSkillFromCategory = (category: SkillCategoryKey, id: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: {
        ...prev.skills,
        [category]: prev.skills[category].filter((s) => s.id !== id),
      },
    }));
  };

  const completeness = Math.max(0, Math.min(100, profile.completeness ?? 0));
  const totalSkillCount = SKILL_CATEGORY_META.reduce(
    (sum, { key }) => sum + (profile.skills[key]?.length || 0),
    0
  );

  if (loading) {
    return (
      <Container as="main" className="pt-24 sm:pt-28 pb-12 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-28 w-full rounded-card" />
        <Skeleton className="h-80 w-full rounded-card" />
      </Container>
    );
  }

  return (
    <Container
      as="main"
      data-testid="career-profile-workspace"
      className="pt-24 sm:pt-28 pb-14 space-y-6"
    >
      {/* Workspace Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
              Career Profile
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200">
              Verified Source of Truth
            </span>
          </div>
          <p className="mt-1.5 text-sm text-neutral-600 max-w-2xl">
            Store your complete work history, projects, metrics, and grouped skills once. Seed standalone resumes and portfolios or tailor with grounded AI without mutating your master profile.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <input
            ref={fileInputRef}
            id="career-profile-import-file-input"
            data-testid="career-profile-import-input"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              void handleImportFileChange(selected);
            }}
            className="sr-only"
          />
          <button
            type="button"
            data-testid="career-profile-import-btn"
            disabled={extracting}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-800 hover:bg-neutral-50 shadow-sm disabled:opacity-50 transition-colors focus-ring"
          >
            <ArrowUpTrayIcon className="h-4 w-4 mr-2 text-primary-600" aria-hidden="true" />
            <span>
              {extracting ? 'Extracting…' : 'Import Resume (PDF / DOCX / TXT)'}
            </span>
          </button>

          <button
            type="button"
            data-testid="seed-resume-open-modal-btn"
            onClick={() => setShowSeedResumeModal(true)}
            className="inline-flex items-center justify-center h-10 px-4 rounded-control bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium shadow-sm transition-colors focus-ring"
          >
            <DocumentPlusIcon className="h-4 w-4 mr-2" aria-hidden="true" />
            <span>Generate / Seed Resume</span>
          </button>

          <button
            type="button"
            data-testid="career-profile-seed-portfolio-btn"
            disabled={seedingPortfolio}
            onClick={() => void handleSeedPortfolio()}
            className="inline-flex items-center justify-center h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-800 hover:bg-neutral-50 shadow-sm disabled:opacity-50 transition-colors focus-ring"
          >
            <GlobeAltIcon className="h-4 w-4 mr-2 text-accent-600" aria-hidden="true" />
            <span>{seedingPortfolio ? 'Seeding…' : 'Seed Portfolio'}</span>
          </button>

          <button
            type="button"
            data-testid="save-career-profile-btn"
            disabled={saving}
            onClick={() => void handleSaveProfile()}
            className="inline-flex items-center justify-center h-10 px-5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors focus-ring"
          >
            <span>{saving ? 'Saving…' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Completeness & Fact Summary Bar */}
      <div className="bg-white rounded-card border border-neutral-200/90 shadow-card p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-700 mb-1.5">
            <span>Profile Completeness</span>
            <span data-testid="career-profile-completeness">{completeness}%</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 overflow-hidden ring-1 ring-inset ring-neutral-200/80">
            <div
              className="h-full rounded-full bg-primary-600 transition-all duration-300"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
          <span className="px-2.5 py-1 rounded-full bg-neutral-100 font-medium">
            {profile.experience.length} Roles
          </span>
          <span className="px-2.5 py-1 rounded-full bg-neutral-100 font-medium">
            {profile.projects.length} Projects
          </span>
          <span className="px-2.5 py-1 rounded-full bg-neutral-100 font-medium">
            {totalSkillCount} Verified Skills
          </span>
          <span className="px-2.5 py-1 rounded-full bg-neutral-100 font-medium">
            {profile.education.length} Degrees
          </span>
        </div>
      </div>

      {/* Import Error Alert (Encrypted / Scanned PDF / Size / Format) */}
      {importError && (
        <div
          role="alert"
          data-testid="career-profile-import-error"
          className="rounded-card border border-red-200 bg-red-50 p-4 flex items-start justify-between gap-3 text-sm text-red-800"
        >
          <div className="flex items-start gap-2.5">
            <ExclamationCircleIcon
              className="h-5 w-5 text-red-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold">Resume import could not be completed</p>
              <p className="mt-0.5 text-red-700">{importError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setImportError(null)}
            aria-label="Dismiss import error"
            className="text-red-500 hover:text-red-700"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Mandatory Import Staging Review */}
      {stagingData && (
        <ImportStagingReview
          staging={stagingData}
          submitting={approvingImport}
          allowCreateResumeOption
          onApprove={handleApproveStagedImport}
          onCancel={() => {
            setStagingData(null);
            toast('Discarded staged import — Career Profile unchanged');
          }}
        />
      )}

      {/* Section Navigation & Structured Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <nav
          aria-label="Career profile sections"
          className="lg:col-span-3 bg-white rounded-card border border-neutral-200/90 shadow-card p-2 flex lg:flex-col gap-1 overflow-x-auto"
        >
          {SECTION_TABS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                data-testid={`profile-tab-${id}`}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-control text-sm font-medium whitespace-nowrap transition-colors text-left ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold ring-1 ring-inset ring-primary-200'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="lg:col-span-9 bg-white rounded-card border border-neutral-200/90 shadow-card p-5 sm:p-6">
          {/* PERSONAL INFO */}
          {activeSection === 'personal' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Personal Information &amp; Profiles
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Used to populate contact headers across new resumes and portfolios.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cp-fullName"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Full Name
                  </label>
                  <input
                    id="cp-fullName"
                    type="text"
                    value={profile.personalInfo.fullName}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          fullName: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. Alex Rivera"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-email"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="cp-email"
                    type="email"
                    value={profile.personalInfo.email}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, email: e.target.value },
                      }))
                    }
                    placeholder="alex@example.com"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-phone"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    id="cp-phone"
                    type="text"
                    value={profile.personalInfo.phone}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: { ...prev.personalInfo, phone: e.target.value },
                      }))
                    }
                    placeholder="+1 (555) 123-4567"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-location"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Location
                  </label>
                  <input
                    id="cp-location"
                    type="text"
                    value={profile.personalInfo.location}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          location: e.target.value,
                        },
                      }))
                    }
                    placeholder="San Francisco, CA"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-linkedin"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    LinkedIn URL
                  </label>
                  <input
                    id="cp-linkedin"
                    type="text"
                    value={profile.personalInfo.linkedin}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          linkedin: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-github"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    GitHub URL
                  </label>
                  <input
                    id="cp-github"
                    type="text"
                    value={profile.personalInfo.github}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          github: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://github.com/..."
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-portfolio"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Portfolio URL
                  </label>
                  <input
                    id="cp-portfolio"
                    type="text"
                    value={profile.personalInfo.portfolio}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          portfolio: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://..."
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-website"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Personal Website
                  </label>
                  <input
                    id="cp-website"
                    type="text"
                    value={profile.personalInfo.website}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          website: e.target.value,
                        },
                      }))
                    }
                    placeholder="https://..."
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUMMARY */}
          {activeSection === 'summary' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Professional Summary
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Core headline, years of experience, and master summary facts.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cp-currentTitle"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Current / Primary Title
                  </label>
                  <input
                    id="cp-currentTitle"
                    type="text"
                    value={profile.summary.currentTitle}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        summary: { ...prev.summary, currentTitle: e.target.value },
                      }))
                    }
                    placeholder="e.g. Staff Backend Engineer"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cp-yearsExp"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Years of Experience
                  </label>
                  <input
                    id="cp-yearsExp"
                    type="text"
                    value={profile.summary.yearsOfExperience}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        summary: {
                          ...prev.summary,
                          yearsOfExperience: e.target.value,
                        },
                      }))
                    }
                    placeholder="e.g. 8+"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="cp-expertise"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Areas of Expertise (comma-separated)
                  </label>
                  <input
                    id="cp-expertise"
                    type="text"
                    value={profile.summary.areasOfExpertise.join(', ')}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        summary: {
                          ...prev.summary,
                          areasOfExpertise: splitComma(e.target.value),
                        },
                      }))
                    }
                    placeholder="Distributed Systems, API Platform, FinTech"
                    className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="cp-summaryText"
                    className="block text-sm font-medium text-neutral-700 mb-1"
                  >
                    Master Summary Bio
                  </label>
                  <textarea
                    id="cp-summaryText"
                    rows={4}
                    value={profile.summary.text}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        summary: { ...prev.summary, text: e.target.value },
                      }))
                    }
                    placeholder="Summarize your verified career history, technical focus, and leadership scope..."
                    className="w-full p-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                  />
                </div>
              </div>
            </div>
          )}

          {/* EXPERIENCE */}
          {activeSection === 'experience' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Work Experience
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Add verified roles, responsibilities, achievements, technologies, and measurable metrics.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="add-profile-experience-btn"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      experience: [
                        ...prev.experience,
                        {
                          id: createLocalFactId('exp'),
                          company: '',
                          role: '',
                          location: '',
                          startDate: '',
                          endDate: '',
                          current: false,
                          employmentType: '',
                          responsibilities: [],
                          achievements: [],
                          technologies: [],
                          metrics: [],
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Role
                </button>
              </div>

              {profile.experience.length === 0 ? (
                <div className="p-8 text-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-500">
                  No work experience entries yet. Import a resume or click Add Role.
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.experience.map((exp, idx) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600">
                          Role #{idx + 1} · Fact ID: <code className="font-mono">{exp.id}</code>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              experience: prev.experience.filter(
                                (item) => item.id !== exp.id
                              ),
                            }))
                          }
                          aria-label={`Remove role ${idx + 1}`}
                          className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Company
                          </label>
                          <input
                            type="text"
                            aria-label={`Profile experience company ${idx + 1}`}
                            value={exp.company}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? { ...item, company: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Acme Cloud"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Role / Title
                          </label>
                          <input
                            type="text"
                            aria-label={`Profile experience role ${idx + 1}`}
                            value={exp.role}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? { ...item, role: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Senior Software Engineer"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="text"
                            value={exp.startDate}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? { ...item, startDate: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Jan 2021"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            End Date
                          </label>
                          <input
                            type="text"
                            value={exp.current ? 'Present' : exp.endDate}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? {
                                        ...item,
                                        current: /^present|current$/i.test(
                                          e.target.value.trim()
                                        ),
                                        endDate: e.target.value,
                                      }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Present"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Responsibilities &amp; Achievements (one per line)
                          </label>
                          <textarea
                            rows={3}
                            aria-label={`Profile experience bullets ${idx + 1}`}
                            value={[
                              ...exp.responsibilities,
                              ...exp.achievements,
                            ].join('\n')}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? {
                                        ...item,
                                        responsibilities: splitLines(
                                          e.target.value
                                        ),
                                        achievements: [],
                                      }
                                    : item
                                ),
                              }))
                            }
                            placeholder="Architected distributed billing service processing 120K daily transactions..."
                            className="w-full p-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Technologies (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={exp.technologies.join(', ')}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? {
                                        ...item,
                                        technologies: splitComma(e.target.value),
                                      }
                                    : item
                                ),
                              }))
                            }
                            placeholder="TypeScript, Node.js, PostgreSQL"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Verified Metrics (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={exp.metrics.join(', ')}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                experience: prev.experience.map((item) =>
                                  item.id === exp.id
                                    ? { ...item, metrics: splitComma(e.target.value) }
                                    : item
                                ),
                              }))
                            }
                            placeholder="38% latency reduction, 120K daily txns"
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PROJECTS */}
          {activeSection === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Projects
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Reusable across both tailored resumes and web portfolios.
                  </p>
                </div>
                <button
                  type="button"
                  data-testid="add-profile-project-btn"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      projects: [
                        ...prev.projects,
                        {
                          id: createLocalFactId('proj'),
                          name: '',
                          description: '',
                          problem: '',
                          solution: '',
                          technologies: [],
                          impact: '',
                          metrics: [],
                          url: '',
                          links: [],
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Project
                </button>
              </div>

              {profile.projects.length === 0 ? (
                <div className="p-8 text-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-500">
                  No projects saved yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {profile.projects.map((proj, idx) => (
                    <div
                      key={proj.id}
                      className="p-4 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600">
                          Project #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              projects: prev.projects.filter(
                                (item) => item.id !== proj.id
                              ),
                            }))
                          }
                          className="text-xs text-red-600 hover:text-red-700 inline-flex items-center gap-1"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Project Name
                          </label>
                          <input
                            type="text"
                            aria-label={`Profile project name ${idx + 1}`}
                            value={proj.name}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                projects: prev.projects.map((item) =>
                                  item.id === proj.id
                                    ? { ...item, name: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Project URL
                          </label>
                          <input
                            type="text"
                            value={proj.url}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                projects: prev.projects.map((item) =>
                                  item.id === proj.id
                                    ? { ...item, url: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            placeholder="https://github.com/..."
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Technologies (comma-separated)
                          </label>
                          <input
                            type="text"
                            value={proj.technologies.join(', ')}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                projects: prev.projects.map((item) =>
                                  item.id === proj.id
                                    ? {
                                        ...item,
                                        technologies: splitComma(e.target.value),
                                      }
                                    : item
                                ),
                              }))
                            }
                            className="w-full h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium text-neutral-700 mb-1">
                            Description &amp; Impact
                          </label>
                          <textarea
                            rows={3}
                            aria-label={`Profile project description ${idx + 1}`}
                            value={proj.description}
                            onChange={(e) =>
                              setProfile((prev) => ({
                                ...prev,
                                projects: prev.projects.map((item) =>
                                  item.id === proj.id
                                    ? { ...item, description: e.target.value }
                                    : item
                                ),
                              }))
                            }
                            className="w-full p-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SKILLS */}
          {activeSection === 'skills' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900">
                  Grouped Verified Skills
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Powers verified one-click additions in Job Match and grounded AI keyword selection.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SKILL_CATEGORY_META.map(({ key, label, placeholder }) => (
                  <div
                    key={key}
                    className="p-3.5 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`skill-input-${key}`}
                        className="text-xs font-semibold uppercase tracking-wide text-neutral-700"
                      >
                        {label}
                      </label>
                      <span className="text-xs text-neutral-500">
                        {profile.skills[key]?.length || 0}
                      </span>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        id={`skill-input-${key}`}
                        type="text"
                        value={skillDraftInputs[key]}
                        onChange={(e) =>
                          setSkillDraftInputs((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkillToCategory(key);
                          }
                        }}
                        placeholder={placeholder}
                        className="flex-1 h-8 px-2.5 border border-neutral-300 rounded-control text-xs bg-white text-neutral-900"
                      />
                      <button
                        type="button"
                        onClick={() => addSkillToCategory(key)}
                        aria-label={`Add ${label} skill`}
                        className="h-8 px-2.5 rounded-control bg-primary-600 text-white text-xs font-medium hover:bg-primary-700"
                      >
                        Add
                      </button>
                    </div>

                    {profile.skills[key]?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {profile.skills[key].map((skill) => (
                          <span
                            key={skill.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-neutral-800 ring-1 ring-inset ring-neutral-200"
                          >
                            <span>{skill.name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                removeSkillFromCategory(key, skill.id)
                              }
                              aria-label={`Remove ${skill.name}`}
                              className="text-neutral-400 hover:text-red-600"
                            >
                              <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {activeSection === 'education' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Education
                </h2>
                <button
                  type="button"
                  data-testid="add-profile-education-btn"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      education: [
                        ...prev.education,
                        {
                          id: createLocalFactId('edu'),
                          degree: '',
                          field: '',
                          institution: '',
                          startYear: '',
                          endYear: '',
                          gpa: '',
                          location: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Education
                </button>
              </div>

              {profile.education.length === 0 ? (
                <div className="p-8 text-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-500">
                  No education records added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.education.map((edu, idx) => (
                    <div
                      key={edu.id}
                      className="p-4 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-neutral-600">
                          Education #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.filter(
                                (item) => item.id !== edu.id
                              ),
                            }))
                          }
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          placeholder="Institution"
                          value={edu.institution}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, institution: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="Degree (e.g. B.S.)"
                          value={edu.degree}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, degree: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="Field of Study"
                          value={edu.field}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, field: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="Start Year"
                          value={edu.startYear}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, startYear: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="End Year"
                          value={edu.endYear}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, endYear: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <input
                          type="text"
                          placeholder="GPA (optional)"
                          value={edu.gpa}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              education: prev.education.map((item) =>
                                item.id === edu.id
                                  ? { ...item, gpa: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CERTIFICATIONS */}
          {activeSection === 'certifications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Certifications
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      certifications: [
                        ...prev.certifications,
                        {
                          id: createLocalFactId('cert'),
                          name: '',
                          issuer: '',
                          date: '',
                          credentialUrl: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Certification
                </button>
              </div>
              {profile.certifications.length === 0 ? (
                <div className="p-8 text-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-500">
                  No certifications added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.certifications.map((cert) => (
                    <div
                      key={cert.id}
                      className="p-3.5 rounded-card border border-neutral-200 bg-neutral-50/40 grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-center"
                    >
                      <input
                        type="text"
                        placeholder="Certification Name"
                        value={cert.name}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((item) =>
                              item.id === cert.id
                                ? { ...item, name: e.target.value }
                                : item
                            ),
                          }))
                        }
                        className="sm:col-span-2 h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                      />
                      <input
                        type="text"
                        placeholder="Issuer"
                        value={cert.issuer}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            certifications: prev.certifications.map((item) =>
                              item.id === cert.id
                                ? { ...item, issuer: e.target.value }
                                : item
                            ),
                          }))
                        }
                        className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                      />
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Date"
                          value={cert.date}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              certifications: prev.certifications.map((item) =>
                                item.id === cert.id
                                  ? { ...item, date: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="flex-1 h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              certifications: prev.certifications.filter(
                                (item) => item.id !== cert.id
                              ),
                            }))
                          }
                          aria-label={`Remove certification ${cert.name}`}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACHIEVEMENTS */}
          {activeSection === 'achievements' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">
                  Achievements, Publications &amp; Leadership
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      achievements: [
                        ...prev.achievements,
                        {
                          id: createLocalFactId('ach'),
                          title: '',
                          category: 'award',
                          issuer: '',
                          date: '',
                          description: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-control bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Achievement
                </button>
              </div>
              {profile.achievements.length === 0 ? (
                <div className="p-8 text-center rounded-card border border-dashed border-neutral-300 text-sm text-neutral-500">
                  No achievements added yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.achievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="p-3.5 rounded-card border border-neutral-200 bg-neutral-50/40 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input
                          type="text"
                          placeholder="Title"
                          value={ach.title}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              achievements: prev.achievements.map((item) =>
                                item.id === ach.id
                                  ? { ...item, title: e.target.value }
                                  : item
                              ),
                            }))
                          }
                          className="flex-1 min-w-[180px] h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        />
                        <select
                          value={ach.category}
                          onChange={(e) =>
                            setProfile((prev) => ({
                              ...prev,
                              achievements: prev.achievements.map((item) =>
                                item.id === ach.id
                                  ? {
                                      ...item,
                                      category:
                                        e.target.value as AchievementCategory,
                                    }
                                  : item
                              ),
                            }))
                          }
                          className="h-9 px-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                        >
                          <option value="award">Award</option>
                          <option value="publication">Publication</option>
                          <option value="open-source">Open Source</option>
                          <option value="hackathon">Hackathon</option>
                          <option value="leadership">Leadership</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          type="button"
                          onClick={() =>
                            setProfile((prev) => ({
                              ...prev,
                              achievements: prev.achievements.filter(
                                (item) => item.id !== ach.id
                              ),
                            }))
                          }
                          aria-label={`Remove achievement ${ach.title}`}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Details or measurable recognition..."
                        value={ach.description}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            achievements: prev.achievements.map((item) =>
                              item.id === ach.id
                                ? { ...item, description: e.target.value }
                                : item
                            ),
                          }))
                        }
                        className="w-full p-2.5 border border-neutral-300 rounded-control text-sm bg-white text-neutral-900"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Seed / Grounded Tailored Resume Modal */}
      {showSeedResumeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="seed-resume-modal-title"
          data-testid="seed-resume-modal"
          className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-panel border border-neutral-200 shadow-modal w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-accent-50 text-accent-600">
                  <SparklesIcon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="seed-resume-modal-title"
                    className="text-lg font-semibold text-neutral-900"
                  >
                    Seed Grounded Resume
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Uses only approved facts from your Career Profile — never fabricates roles or metrics.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSeedResumeModal(false)}
                aria-label="Close seed resume modal"
                className="text-neutral-400 hover:text-neutral-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="seed-resume-title"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Resume Title (optional)
                </label>
                <input
                  id="seed-resume-title"
                  type="text"
                  value={seedResumeTitle}
                  onChange={(e) => setSeedResumeTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer — Stripe"
                  className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                />
              </div>
              <div>
                <label
                  htmlFor="seed-target-role"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Target Role (optional)
                </label>
                <input
                  id="seed-target-role"
                  type="text"
                  value={seedTargetRole}
                  onChange={(e) => setSeedTargetRole(e.target.value)}
                  placeholder="e.g. Staff Backend Engineer"
                  className="w-full h-10 px-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                />
              </div>
              <div>
                <label
                  htmlFor="seed-job-description"
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  Job Description for Tailored Ordering (optional)
                </label>
                <textarea
                  id="seed-job-description"
                  rows={4}
                  value={seedJobDescription}
                  onChange={(e) => setSeedJobDescription(e.target.value)}
                  placeholder="Paste a job posting to prioritize your matching verified roles, projects, and skills..."
                  className="w-full p-3 border border-neutral-300 rounded-control text-sm text-neutral-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowSeedResumeModal(false)}
                className="h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-seed-resume-btn"
                disabled={seedingResume}
                onClick={() => void handleSeedResume()}
                className="h-10 px-5 rounded-control bg-accent-600 hover:bg-accent-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50"
              >
                {seedingResume ? 'Creating…' : 'Create Standalone Resume'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default CareerProfileWorkspace;
