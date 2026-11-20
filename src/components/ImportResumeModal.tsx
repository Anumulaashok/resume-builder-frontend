import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { IResume, ISection, SectionType } from '../types/resume';
import { ResumeWithMeta, resumeService } from '../services/resume.service';
import { careerProfileService } from '../services/careerProfile.service';
import {
  ExtractedResumeStagingResponse,
  ICareerProfile,
} from '../types/careerProfile';
import ImportStagingReview from './careerProfile/ImportStagingReview';
import { getStoredUser } from '../utils/token';
import {
  hasRecognizedJsonResumeFields,
  importJsonResume,
  parseDateToDateFields,
  parseJsonResumeString,
  parseResumeText,
} from '../utils/importers';
import { formatResumeDate } from '../utils/date';

export interface ImportResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: (createdResume: ResumeWithMeta) => void;
  initialMode?: 'json' | 'text' | 'file';
  user?: {
    name?: string;
    email?: string;
  } | null;
}

type ImportMode = 'json' | 'text' | 'file';
type TextStep = 'paste' | 'review';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const EMAIL_CHECK_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  [SectionType.WORK]: 'Experience',
  [SectionType.EDUCATION]: 'Education',
  [SectionType.SKILLS]: 'Skills',
  [SectionType.PROJECTS]: 'Projects',
  [SectionType.CERTIFICATES]: 'Certifications',
  [SectionType.LANGUAGES]: 'Languages',
  [SectionType.AWARDS]: 'Awards',
  [SectionType.PUBLICATIONS]: 'Publications',
  [SectionType.ORGANIZATIONS]: 'Organizations',
  [SectionType.INTERESTS]: 'Interests',
  [SectionType.REFERENCES]: 'References',
  [SectionType.COURSES]: 'Courses',
  [SectionType.SOFTSKILSS]: 'Soft Skills',
  [SectionType.ACHIVEMENTS]: 'Achievements',
  [SectionType.TECK_SKILLS]: 'Technical Skills',
  [SectionType.CUSTOM]: 'Custom',
};

const ADDABLE_REVIEW_SECTIONS: Array<{ type: SectionType; title: string }> = [
  { type: SectionType.WORK, title: 'Professional Experience' },
  { type: SectionType.EDUCATION, title: 'Education' },
  { type: SectionType.SKILLS, title: 'Skills' },
  { type: SectionType.PROJECTS, title: 'Projects' },
  { type: SectionType.CERTIFICATES, title: 'Certifications' },
  { type: SectionType.LANGUAGES, title: 'Languages' },
  { type: SectionType.AWARDS, title: 'Awards' },
  { type: SectionType.PUBLICATIONS, title: 'Publications' },
  { type: SectionType.ORGANIZATIONS, title: 'Organizations' },
  { type: SectionType.INTERESTS, title: 'Interests' },
  { type: SectionType.REFERENCES, title: 'References' },
];

function createDefaultItemForType(type: SectionType): Record<string, any> {
  const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  switch (type) {
    case SectionType.WORK:
      return {
        id,
        enabled: true,
        name: '',
        company: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        location: '',
        description: '',
        highlights: [],
      };
    case SectionType.EDUCATION:
      return {
        id,
        enabled: true,
        institution: '',
        degree: '',
        field: '',
        startDate: { month: '', year: '' },
        endDate: { month: '', year: '' },
        current: false,
        location: '',
        description: '',
      };
    case SectionType.SKILLS:
      return { id, enabled: true, name: '', level: '', subSkills: [] };
    case SectionType.PROJECTS:
      return {
        id,
        enabled: true,
        name: '',
        url: '',
        startDate: '',
        endDate: '',
        technologies: [],
        description: '',
        highlights: [],
      };
    case SectionType.CERTIFICATES:
      return { id, enabled: true, name: '', issuer: '', date: '', url: '' };
    case SectionType.LANGUAGES:
      return { id, enabled: true, name: '', language: '', level: '', fluency: '' };
    case SectionType.AWARDS:
      return {
        id,
        enabled: true,
        name: '',
        title: '',
        issuer: '',
        awarder: '',
        date: '',
        description: '',
      };
    case SectionType.PUBLICATIONS:
      return { id, enabled: true, title: '', publisher: '', date: '', url: '', description: '' };
    case SectionType.ORGANIZATIONS:
      return {
        id,
        enabled: true,
        name: '',
        organization: '',
        position: '',
        startDate: '',
        endDate: '',
        current: false,
        description: '',
        highlights: [],
      };
    case SectionType.INTERESTS:
      return { id, enabled: true, name: '', description: '' };
    case SectionType.REFERENCES:
      return { id, enabled: true, name: '', position: '', company: '', contact: '', description: '' };
    default:
      return { id, enabled: true, name: '', description: '' };
  }
}

export function prepareImportedResumePayload(
  draft: IResume,
  fallbackUser?: { name?: string; email?: string } | null
): Partial<IResume> {
  const storedUser = getStoredUser();
  const rawBasics = draft.content?.basics || {};

  const resolvedName =
    rawBasics.name?.trim() ||
    fallbackUser?.name?.trim() ||
    storedUser?.name?.trim() ||
    'Your Name';

  const candidateEmail = rawBasics.email?.trim() || '';
  const fallbackEmail =
    fallbackUser?.email?.trim() || storedUser?.email?.trim() || 'you@example.com';
  const resolvedEmail = EMAIL_CHECK_REGEX.test(candidateEmail)
    ? candidateEmail
    : EMAIL_CHECK_REGEX.test(fallbackEmail)
    ? fallbackEmail
    : 'you@example.com';

  const resolvedSummary =
    rawBasics.summary?.trim() || draft.summary?.trim() || '';

  const sections: ISection[] = (draft.content?.sections || []).map((section) => ({
    ...section,
    enabled: section.enabled !== false,
    content: Array.isArray(section.content)
      ? section.content.map((item: any) => ({
          ...item,
          enabled: item?.enabled !== false,
        }))
      : [],
  }));

  const sectionOrder = sections.map((s) => s.id);

  const resolvedTitle =
    draft.title?.trim() ||
    (rawBasics.name?.trim() ? `${rawBasics.name.trim()}'s Resume` : 'Imported Resume');

  return {
    title: resolvedTitle,
    summary: resolvedSummary,
    ...(draft.templateId ? { templateId: draft.templateId } : {}),
    content: {
      basics: {
        ...rawBasics,
        name: resolvedName,
        email: resolvedEmail,
        summary: resolvedSummary,
      },
      sections,
      sectionOrder,
    },
  };
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Failed to read selected file.'));
    reader.readAsText(file);
  });
}

export const ImportResumeModal: React.FC<ImportResumeModalProps> = ({
  isOpen,
  onClose,
  onImported,
  initialMode = 'json',
  user,
}) => {
  const [mode, setMode] = useState<ImportMode>(initialMode);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // JSON Upload state
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [jsonMappedResume, setJsonMappedResume] = useState<IResume | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // PDF / DOCX / TXT Staging state
  const [extractingDocFile, setExtractingDocFile] = useState<boolean>(false);
  const [docStaging, setDocStaging] = useState<ExtractedResumeStagingResponse | null>(null);

  // Paste Text state
  const [rawText, setRawText] = useState<string>('');
  const [textStep, setTextStep] = useState<TextStep>('paste');
  const [reviewResume, setReviewResume] = useState<IResume | null>(null);
  const [newSectionType, setNewSectionType] = useState<SectionType>(SectionType.WORK);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(submitting);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!isOpen) {
      setMode('json');
      setSubmitting(false);
      setErrorMessage(null);
      setSelectedFileName('');
      setJsonMappedResume(null);
      setIsDragOver(false);
      setExtractingDocFile(false);
      setDocStaging(null);
      setRawText('');
      setTextStep('paste');
      setReviewResume(null);
      return;
    }
    setMode(initialMode);

    const previousActive = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (submittingRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) {
          event.preventDefault();
          dialog.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousActive && typeof previousActive.focus === 'function') {
        previousActive.focus();
      }
    };
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleSelectDocFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    const lowerName = file.name.toLowerCase();
    if (
      !lowerName.endsWith('.pdf') &&
      !lowerName.endsWith('.docx') &&
      !lowerName.endsWith('.txt')
    ) {
      setErrorMessage(
        'Unsupported file format. Only PDF (.pdf), Word (.docx), and plain text (.txt) files up to 5 MB are accepted.'
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage(
        'Resume file exceeds the 5 MB limit. Please upload a PDF, DOCX, or TXT file up to 5 MB.'
      );
      return;
    }

    setExtractingDocFile(true);
    try {
      const staged = await careerProfileService.extractImportFile(file);
      setDocStaging(staged);
    } catch (err: unknown) {
      const maybeAxios = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      setDocStaging(null);
      setErrorMessage(
        maybeAxios?.response?.data?.message ||
          maybeAxios?.response?.data?.error ||
          (err instanceof Error ? err.message : 'Failed to extract resume file.')
      );
    } finally {
      setExtractingDocFile(false);
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

  const handleApproveDocStaging = async (
    approvedProfile: Partial<ICareerProfile>,
    approveMode: 'merge' | 'replace',
    createResumeAfter?: boolean
  ) => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await careerProfileService.approveImport(approvedProfile, approveMode);
      toast.success('Approved facts saved to Career Profile');
      if (createResumeAfter) {
        const seeded = await careerProfileService.seedResume();
        onImported(seeded);
      } else {
        setDocStaging(null);
        onClose();
      }
    } catch (err: unknown) {
      const maybeAxios = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorMessage(
        maybeAxios?.response?.data?.message ||
          (err instanceof Error ? err.message : 'Failed to save approved Career Profile.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectFile = async (file: File | null | undefined) => {
    if (!file) return;
    setErrorMessage(null);
    setSelectedFileName(file.name);

    try {
      const text = await readFileAsText(file);
      const parsed = parseJsonResumeString(text);
      if (!hasRecognizedJsonResumeFields(parsed)) {
        setJsonMappedResume(null);
        setErrorMessage(
          'This JSON file does not contain recognized JSON Resume v1 fields (e.g. basics, work, education, skills).'
        );
        return;
      }
      const mapped = importJsonResume(parsed);
      setJsonMappedResume(mapped);
    } catch (err) {
      setJsonMappedResume(null);
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to parse JSON Resume file.'
      );
    }
  };

  const handleConfirmJsonImport = async () => {
    if (!jsonMappedResume) {
      setErrorMessage('Please select a valid JSON Resume file first.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = prepareImportedResumePayload(jsonMappedResume, user);
      const created = await resumeService.createResume(payload);
      toast.success('Resume imported successfully!');
      onImported(created);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create imported resume.';
      setErrorMessage(message);
      toast.error('Failed to import resume');
    } finally {
      setSubmitting(false);
    }
  };

  const handleParseTextToReview = () => {
    setErrorMessage(null);
    if (!rawText.trim()) {
      setErrorMessage('Please paste your resume or profile text before continuing.');
      return;
    }

    try {
      const parsed = parseResumeText(rawText);
      const storedUser = getStoredUser();
      const hydrated: IResume = {
        ...parsed,
        content: {
          ...parsed.content,
          basics: {
            ...parsed.content.basics,
            email:
              parsed.content.basics.email ||
              user?.email?.trim() ||
              storedUser?.email?.trim() ||
              '',
          },
        },
      };
      setReviewResume(hydrated);
      setTextStep('review');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to parse pasted text.'
      );
    }
  };

  const handleCreateFromReview = async () => {
    if (!reviewResume) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const payload = prepareImportedResumePayload(reviewResume, user);
      const created = await resumeService.createResume(payload);
      toast.success('Resume imported successfully!');
      onImported(created);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create resume.';
      setErrorMessage(message);
      toast.error('Failed to import resume');
    } finally {
      setSubmitting(false);
    }
  };

  const updateReviewBasics = (field: string, value: any) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      const nextBasics = {
        ...prev.content.basics,
        [field]: value,
      };
      return {
        ...prev,
        ...(field === 'summary' ? { summary: value } : {}),
        content: {
          ...prev.content,
          basics: nextBasics,
        },
      };
    });
  };

  const updateReviewLocation = (field: 'city' | 'region', value: string) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          basics: {
            ...prev.content.basics,
            location: {
              ...(prev.content.basics.location || {}),
              [field]: value,
            },
          },
        },
      };
    });
  };

  const updateReviewSectionTitle = (sectionId: string, title: string) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: prev.content.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, title } : sec
          ),
        },
      };
    });
  };

  const removeReviewSection = (sectionId: string) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: prev.content.sections.filter((sec) => sec.id !== sectionId),
          sectionOrder: prev.content.sectionOrder.filter((id) => id !== sectionId),
        },
      };
    });
  };

  const addReviewSection = () => {
    const template =
      ADDABLE_REVIEW_SECTIONS.find((s) => s.type === newSectionType) ||
      ADDABLE_REVIEW_SECTIONS[0];
    const id = `section-${template.type.toLowerCase()}-${Date.now()}`;
    const nextSection: ISection = {
      id,
      type: template.type,
      title: template.title,
      enabled: true,
      content: [createDefaultItemForType(template.type) as any],
    };

    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: [...prev.content.sections, nextSection],
          sectionOrder: [...prev.content.sectionOrder, id],
        },
      };
    });
  };

  const updateReviewItem = (
    sectionId: string,
    itemId: string,
    updater: (item: Record<string, any>) => Record<string, any>
  ) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: prev.content.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              content: sec.content.map((it: any) =>
                it.id === itemId ? (updater({ ...it }) as any) : it
              ),
            };
          }),
        },
      };
    });
  };

  const addReviewItem = (section: ISection) => {
    const newItem = createDefaultItemForType(section.type);
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: prev.content.sections.map((sec) =>
            sec.id === section.id
              ? { ...sec, content: [...sec.content, newItem as any] }
              : sec
          ),
        },
      };
    });
  };

  const removeReviewItem = (sectionId: string, itemId: string) => {
    setReviewResume((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          sections: prev.content.sections.map((sec) =>
            sec.id === sectionId
              ? {
                  ...sec,
                  content: sec.content.filter((it: any) => it.id !== itemId),
                }
              : sec
          ),
        },
      };
    });
  };

  const renderReviewItemEditor = (section: ISection, item: Record<string, any>) => {
    const sectionId = section.id;
    const itemId = item.id;

    if (section.type === SectionType.WORK || section.type === SectionType.ORGANIZATIONS) {
      const isOrg = section.type === SectionType.ORGANIZATIONS;
      const bulletsValue = Array.isArray(item.highlights)
        ? item.highlights.join('\n')
        : '';

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              {isOrg ? 'Organization' : 'Company'}
            </label>
            <input
              type="text"
              aria-label={`${isOrg ? 'Organization' : 'Company'} for ${item.name || 'entry'}`}
              value={item.name || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  name: e.target.value,
                  ...(isOrg
                    ? { organization: e.target.value }
                    : { company: e.target.value }),
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Role / Position
            </label>
            <input
              type="text"
              aria-label={`Role for ${item.name || 'entry'}`}
              value={item.position || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  position: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Start Date
            </label>
            <input
              type="text"
              aria-label={`Start date for ${item.name || 'entry'}`}
              placeholder="e.g. Jan 2020"
              value={formatResumeDate(item.startDate)}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  startDate: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              End Date
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                aria-label={`End date for ${item.name || 'entry'}`}
                placeholder="Present"
                disabled={Boolean(item.current)}
                value={item.current ? 'Present' : formatResumeDate(item.endDate)}
                onChange={(e) =>
                  updateReviewItem(sectionId, itemId, (curr) => ({
                    ...curr,
                    endDate: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 disabled:bg-neutral-100 disabled:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-neutral-600 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(item.current)}
                  onChange={(e) =>
                    updateReviewItem(sectionId, itemId, (curr) => ({
                      ...curr,
                      current: e.target.checked,
                      ...(e.target.checked ? { endDate: '' } : {}),
                    }))
                  }
                  className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                Current
              </label>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Bullets (one per line)
            </label>
            <textarea
              rows={3}
              aria-label={`Bullets for ${item.name || 'entry'}`}
              value={bulletsValue}
              placeholder="Led platform architecture..."
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  highlights: e.target.value
                    .split('\n')
                    .map((line) => line.replace(/^\s*[•*-]\s*/, '').trim())
                    .filter(Boolean),
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {item.description !== undefined && item.description !== '' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Summary
              </label>
              <textarea
                rows={2}
                value={item.description || ''}
                onChange={(e) =>
                  updateReviewItem(sectionId, itemId, (curr) => ({
                    ...curr,
                    description: e.target.value,
                  }))
                }
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
        </div>
      );
    }

    if (section.type === SectionType.EDUCATION) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Institution
            </label>
            <input
              type="text"
              aria-label={`Institution for ${item.institution || item.degree || 'entry'}`}
              value={item.institution || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  institution: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Degree
            </label>
            <input
              type="text"
              aria-label={`Degree for ${item.institution || item.degree || 'entry'}`}
              value={item.degree || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  degree: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Field of Study
            </label>
            <input
              type="text"
              value={item.field || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  field: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                Start
              </label>
              <input
                type="text"
                placeholder="Sep 2018"
                value={formatResumeDate(item.startDate)}
                onChange={(e) =>
                  updateReviewItem(sectionId, itemId, (curr) => ({
                    ...curr,
                    startDate: parseDateToDateFields(e.target.value),
                  }))
                }
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                End
              </label>
              <input
                type="text"
                placeholder="May 2022"
                value={formatResumeDate(item.endDate)}
                onChange={(e) =>
                  updateReviewItem(sectionId, itemId, (curr) => ({
                    ...curr,
                    endDate: parseDateToDateFields(e.target.value),
                  }))
                }
                className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      );
    }

    if (section.type === SectionType.SKILLS) {
      const keywordsVal = Array.isArray(item.subSkills)
        ? item.subSkills.join(', ')
        : '';
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Skill / Category
            </label>
            <input
              type="text"
              aria-label={`Skill name for ${item.name || 'skill'}`}
              value={item.name || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  name: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              placeholder="Optional sub-skills"
              value={keywordsVal}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  subSkills: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }

    if (section.type === SectionType.PROJECTS) {
      const techsVal = Array.isArray(item.technologies)
        ? item.technologies.join(', ')
        : '';
      const bulletsVal = Array.isArray(item.highlights)
        ? item.highlights.join('\n')
        : '';
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Project Name
            </label>
            <input
              type="text"
              aria-label={`Project name for ${item.name || 'project'}`}
              value={item.name || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  name: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Project URL
            </label>
            <input
              type="text"
              value={item.url || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  url: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Technologies (comma-separated)
            </label>
            <input
              type="text"
              value={techsVal}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  technologies: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Description / Bullets
            </label>
            <textarea
              rows={2}
              value={bulletsVal || item.description || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  description: e.target.value,
                  highlights: [],
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }

    if (section.type === SectionType.CERTIFICATES) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Certificate Name
            </label>
            <input
              type="text"
              value={item.name || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  name: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Issuer
            </label>
            <input
              type="text"
              value={item.issuer || ''}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  issuer: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              Date
            </label>
            <input
              type="text"
              value={formatResumeDate(item.date)}
              onChange={(e) =>
                updateReviewItem(sectionId, itemId, (curr) => ({
                  ...curr,
                  date: e.target.value,
                }))
              }
              className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      );
    }

    const primaryKey = section.type === SectionType.PUBLICATIONS ? 'title' : 'name';
    const secondaryKey =
      section.type === SectionType.LANGUAGES
        ? 'level'
        : section.type === SectionType.AWARDS
        ? 'issuer'
        : section.type === SectionType.PUBLICATIONS
        ? 'publisher'
        : 'description';

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Name / Title
          </label>
          <input
            type="text"
            value={item[primaryKey] || ''}
            onChange={(e) =>
              updateReviewItem(sectionId, itemId, (curr) => ({
                ...curr,
                [primaryKey]: e.target.value,
                ...(section.type === SectionType.LANGUAGES
                  ? { language: e.target.value }
                  : {}),
                ...(section.type === SectionType.AWARDS
                  ? { title: e.target.value }
                  : {}),
              }))
            }
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">
            Details
          </label>
          <input
            type="text"
            value={item[secondaryKey] || ''}
            onChange={(e) =>
              updateReviewItem(sectionId, itemId, (curr) => ({
                ...curr,
                [secondaryKey]: e.target.value,
                ...(section.type === SectionType.LANGUAGES
                  ? { fluency: e.target.value }
                  : {}),
                ...(section.type === SectionType.AWARDS
                  ? { awarder: e.target.value }
                  : {}),
              }))
            }
            className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    );
  };

  const totalParsedItems = reviewResume
    ? reviewResume.content.sections.reduce(
        (acc, sec) => acc + (Array.isArray(sec.content) ? sec.content.length : 0),
        0
      )
    : 0;

  return (
    <div
      data-testid="import-resume-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/50 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-resume-modal-title"
        aria-describedby="import-resume-modal-desc"
        tabIndex={-1}
        className="bg-white rounded-panel border border-neutral-200 shadow-modal w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden focus:outline-none"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <ArrowUpTrayIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2
                id="import-resume-modal-title"
                className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
              >
                Import Resume
              </h2>
              <p
                id="import-resume-modal-desc"
                className="text-xs text-neutral-500 truncate"
              >
                Upload a JSON Resume, import a PDF/DOCX/TXT into your Career Profile, or paste text
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close import modal"
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-control text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors focus-ring disabled:opacity-50"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Two-Option Mode Switcher */}
        <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-neutral-200 bg-neutral-50/70 shrink-0">
          <div
            role="tablist"
            aria-label="Import source options"
            className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
          >
            <button
              type="button"
              role="tab"
              id="import-tab-json"
              aria-selected={mode === 'json'}
              aria-controls="import-panel-json"
              onClick={() => {
                setMode('json');
                setErrorMessage(null);
              }}
              className={`flex items-start gap-3 p-3 rounded-card border text-left transition-all focus-ring ${
                mode === 'json'
                  ? 'border-primary-600 bg-white ring-1 ring-primary-600 shadow-sm'
                  : 'border-neutral-200 bg-white/70 hover:border-neutral-300 hover:bg-white'
              }`}
            >
              <DocumentArrowUpIcon
                className={`h-5 w-5 mt-0.5 shrink-0 ${
                  mode === 'json' ? 'text-primary-600' : 'text-neutral-400'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  Upload JSON Resume
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Import a standard jsonresume.org schema v1 file
                </p>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              id="import-tab-text"
              aria-selected={mode === 'text'}
              aria-controls="import-panel-text"
              onClick={() => {
                setMode('text');
                setErrorMessage(null);
              }}
              className={`flex items-start gap-3 p-3 rounded-card border text-left transition-all focus-ring ${
                mode === 'text'
                  ? 'border-primary-600 bg-white ring-1 ring-primary-600 shadow-sm'
                  : 'border-neutral-200 bg-white/70 hover:border-neutral-300 hover:bg-white'
              }`}
            >
              <ClipboardDocumentListIcon
                className={`h-5 w-5 mt-0.5 shrink-0 ${
                  mode === 'text' ? 'text-primary-600' : 'text-neutral-400'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  Paste Text
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Parse LinkedIn profile text or an old resume with review
                </p>
              </div>
            </button>

            <button
              type="button"
              role="tab"
              id="import-tab-file"
              aria-selected={mode === 'file'}
              aria-controls="import-panel-file"
              onClick={() => {
                setMode('file');
                setErrorMessage(null);
              }}
              className={`flex items-start gap-3 p-3 rounded-card border text-left transition-all focus-ring ${
                mode === 'file'
                  ? 'border-primary-600 bg-white ring-1 ring-primary-600 shadow-sm'
                  : 'border-neutral-200 bg-white/70 hover:border-neutral-300 hover:bg-white'
              }`}
            >
              <DocumentTextIcon
                className={`h-5 w-5 mt-0.5 shrink-0 ${
                  mode === 'file' ? 'text-primary-600' : 'text-neutral-400'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  Upload PDF / DOCX / TXT
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Stage &amp; approve facts into your Career Profile (max 5 MB)
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              data-testid="import-resume-error"
              className="flex items-start gap-2.5 p-3.5 rounded-card bg-red-50 border border-red-200 text-sm text-red-700"
            >
              <ExclamationCircleIcon
                className="h-5 w-5 text-red-600 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Option A: Upload JSON Resume */}
          {mode === 'json' && (
            <div
              id="import-panel-json"
              role="tabpanel"
              aria-labelledby="import-tab-json"
              className="space-y-4"
            >
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const droppedFile = e.dataTransfer?.files?.[0];
                  void handleSelectFile(droppedFile);
                }}
                className={`rounded-panel border-2 border-dashed px-6 py-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-primary-500 bg-primary-50/50'
                    : 'border-neutral-300 bg-neutral-50/60 hover:border-primary-400'
                }`}
              >
                <DocumentArrowUpIcon
                  className="h-10 w-10 text-primary-600 mx-auto mb-3"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-neutral-900">
                  Select a JSON Resume (.json) file
                </p>
                <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                  Supports jsonresume.org v1 schema including basics, work, education,
                  skills, projects, languages, certificates, awards, publications,
                  volunteer, interests, and references.
                </p>
                <div className="mt-4">
                  <input
                    ref={fileInputRef}
                    id="json-resume-file-input"
                    data-testid="json-resume-file-input"
                    type="file"
                    accept=".json,application/json"
                    onChange={(e) => {
                      const chosen = e.target.files?.[0];
                      void handleSelectFile(chosen);
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="json-resume-file-input"
                    className="inline-flex items-center justify-center h-9 px-4 rounded-control bg-white border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary-500"
                  >
                    Choose JSON File
                  </label>
                </div>
                {selectedFileName && (
                  <p className="mt-3 text-xs font-medium text-neutral-600">
                    Selected: <span className="text-neutral-900">{selectedFileName}</span>
                  </p>
                )}
              </div>

              {jsonMappedResume && (
                <div
                  data-testid="json-import-preview"
                  className="rounded-card border border-primary-200 bg-primary-50/40 p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <CheckCircleIcon
                      className="h-5 w-5 text-emerald-600 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Ready to import: {jsonMappedResume.title}</span>
                  </div>
                  <div className="text-xs text-neutral-600 flex flex-wrap gap-x-4 gap-y-1">
                    {jsonMappedResume.content.basics.name && (
                      <span>Name: {jsonMappedResume.content.basics.name}</span>
                    )}
                    {jsonMappedResume.content.basics.email && (
                      <span>Email: {jsonMappedResume.content.basics.email}</span>
                    )}
                    <span>
                      Sections: {jsonMappedResume.content.sections.length}
                    </span>
                  </div>
                  {jsonMappedResume.content.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {jsonMappedResume.content.sections.map((sec) => (
                        <span
                          key={sec.id}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-primary-700 ring-1 ring-inset ring-primary-200"
                        >
                          {sec.title} ({sec.content.length})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Option B: Paste Text */}
          {mode === 'text' && (
            <div
              id="import-panel-text"
              role="tabpanel"
              aria-labelledby="import-tab-text"
              className="space-y-4"
            >
              {textStep === 'paste' && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="paste-resume-textarea"
                      className="block text-sm font-medium text-neutral-800 mb-1.5"
                    >
                      Paste LinkedIn profile or resume text
                    </label>
                    <textarea
                      id="paste-resume-textarea"
                      data-testid="paste-resume-textarea"
                      rows={11}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder={`Jane Doe\nStaff Software Engineer\njane@example.com | (415) 555-0192 | linkedin.com/in/janedoe\n\nExperience\nAcme Cloud\nSenior Software Engineer\nJan 2020 - Present\n• Architected multi-region API gateway serving 50M daily requests`}
                      className="w-full p-3.5 border border-neutral-300 rounded-control text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      Automatically detects contact info, section headings, date ranges,
                      roles, and bullet points.
                    </span>
                    {rawText.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRawText('')}
                        className="text-neutral-600 hover:text-neutral-900 font-medium underline shrink-0 ml-3"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {textStep === 'review' && reviewResume && (
                <div data-testid="paste-review-step" className="space-y-5">
                  {/* Review Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-card bg-primary-50/70 border border-primary-200/80">
                    <div className="text-xs sm:text-sm text-neutral-800">
                      <span className="font-semibold">Review parsed resume:</span>{' '}
                      {reviewResume.content.sections.length} section
                      {reviewResume.content.sections.length === 1 ? '' : 's'} ·{' '}
                      {totalParsedItems} item{totalParsedItems === 1 ? '' : 's'} detected.
                      Edit any field below before creating.
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTextStep('paste');
                        setErrorMessage(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800 focus-ring rounded px-1.5 py-0.5"
                    >
                      <ArrowLeftIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      Back to Text
                    </button>
                  </div>

                  {/* Basics Card */}
                  <div className="rounded-card border border-neutral-200 bg-white p-4 space-y-3.5">
                    <h3 className="text-sm font-semibold text-neutral-900">
                      Resume Title & Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="sm:col-span-2">
                        <label
                          htmlFor="review-resume-title"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Resume Title
                        </label>
                        <input
                          id="review-resume-title"
                          type="text"
                          value={reviewResume.title || ''}
                          onChange={(e) =>
                            setReviewResume((prev) =>
                              prev ? { ...prev, title: e.target.value } : prev
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-name"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Full Name
                        </label>
                        <input
                          id="review-basics-name"
                          type="text"
                          value={reviewResume.content.basics.name || ''}
                          onChange={(e) => updateReviewBasics('name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-label"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Professional Headline
                        </label>
                        <input
                          id="review-basics-label"
                          type="text"
                          value={reviewResume.content.basics.label || ''}
                          onChange={(e) => updateReviewBasics('label', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-email"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Email
                        </label>
                        <input
                          id="review-basics-email"
                          type="email"
                          value={reviewResume.content.basics.email || ''}
                          onChange={(e) => updateReviewBasics('email', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-phone"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Phone
                        </label>
                        <input
                          id="review-basics-phone"
                          type="text"
                          value={reviewResume.content.basics.phone || ''}
                          onChange={(e) => updateReviewBasics('phone', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-city"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          City / Location
                        </label>
                        <input
                          id="review-basics-city"
                          type="text"
                          value={reviewResume.content.basics.location?.city || ''}
                          onChange={(e) => updateReviewLocation('city', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="review-basics-url"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Website
                        </label>
                        <input
                          id="review-basics-url"
                          type="text"
                          value={reviewResume.content.basics.url || ''}
                          onChange={(e) => updateReviewBasics('url', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {reviewResume.content.basics.profiles &&
                        reviewResume.content.basics.profiles.length > 0 && (
                          <div className="sm:col-span-2">
                            <span className="block text-xs font-medium text-neutral-600 mb-1">
                              Detected Profiles
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {reviewResume.content.basics.profiles.map((prof, idx) => (
                                <span
                                  key={`${prof.url}-${idx}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                                >
                                  <span>
                                    {prof.network ? `${prof.network}: ` : ''}
                                    {prof.url}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Remove profile ${prof.url}`}
                                    onClick={() =>
                                      updateReviewBasics(
                                        'profiles',
                                        reviewResume.content.basics.profiles?.filter(
                                          (_, pIdx) => pIdx !== idx
                                        )
                                      )
                                    }
                                    className="text-neutral-400 hover:text-red-600"
                                  >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="review-basics-summary"
                          className="block text-xs font-medium text-neutral-600 mb-1"
                        >
                          Professional Summary
                        </label>
                        <textarea
                          id="review-basics-summary"
                          rows={3}
                          value={reviewResume.content.basics.summary || ''}
                          onChange={(e) => updateReviewBasics('summary', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-sm border border-neutral-300 rounded-control text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Parsed Sections Editable List */}
                  <div className="space-y-3" data-testid="parsed-sections-list">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-neutral-900">
                        Parsed Sections ({reviewResume.content.sections.length})
                      </h3>
                    </div>

                    {reviewResume.content.sections.length === 0 ? (
                      <div className="rounded-card border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-600">
                        No structured sections were detected. You can add sections below or
                        continue with contact details and edit inside the resume builder.
                      </div>
                    ) : (
                      reviewResume.content.sections.map((section) => (
                        <div
                          key={section.id}
                          data-testid={`review-section-${section.type}`}
                          className="rounded-card border border-neutral-200 bg-white overflow-hidden"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200 shrink-0">
                                {SECTION_TYPE_LABELS[section.type] || section.type}
                              </span>
                              <input
                                type="text"
                                aria-label={`Section title for ${section.title}`}
                                value={section.title}
                                onChange={(e) =>
                                  updateReviewSectionTitle(section.id, e.target.value)
                                }
                                className="px-2 py-1 text-sm font-semibold text-neutral-900 bg-white border border-neutral-200 rounded-control focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-0 flex-1 max-w-xs"
                              />
                              <span className="text-xs text-neutral-500 shrink-0">
                                ({section.content.length})
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => addReviewItem(section)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-control transition-colors focus-ring"
                              >
                                <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                                Add Item
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove ${section.title} section`}
                                onClick={() => removeReviewSection(section.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-control transition-colors focus-ring"
                              >
                                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            {section.content.map((item: any, idx: number) => (
                              <div
                                key={item.id || idx}
                                className="p-3 rounded-control border border-neutral-200 bg-neutral-50/50 space-y-2.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-neutral-500">
                                    Entry #{idx + 1}
                                  </span>
                                  <button
                                    type="button"
                                    aria-label={`Remove entry ${idx + 1} from ${section.title}`}
                                    onClick={() => removeReviewItem(section.id, item.id)}
                                    className="text-xs text-neutral-400 hover:text-red-600 inline-flex items-center gap-1"
                                  >
                                    <TrashIcon className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                </div>
                                {renderReviewItemEditor(section, item)}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}

                    {/* Add missing section inline */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <select
                        aria-label="Select section type to add"
                        value={newSectionType}
                        onChange={(e) => setNewSectionType(e.target.value as SectionType)}
                        className="h-9 px-3 text-sm border border-neutral-300 rounded-control bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {ADDABLE_REVIEW_SECTIONS.map((opt) => (
                          <option key={opt.type} value={opt.type}>
                            {opt.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={addReviewSection}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
                      >
                        <PlusIcon className="h-4 w-4" aria-hidden="true" />
                        Add Section
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Option C: Upload PDF / DOCX / TXT into Staged Career Profile */}
          {mode === 'file' && (
            <div
              id="import-panel-file"
              role="tabpanel"
              aria-labelledby="import-tab-file"
              className="space-y-4"
            >
              {!docStaging ? (
                <div className="rounded-panel border-2 border-dashed border-neutral-300 bg-neutral-50/60 hover:border-primary-400 px-6 py-8 text-center transition-colors">
                  <DocumentTextIcon
                    className="h-10 w-10 text-primary-600 mx-auto mb-3"
                    aria-hidden="true"
                  />
                  <p className="text-sm font-semibold text-neutral-900">
                    Upload a PDF, DOCX, or TXT resume (up to 5 MB)
                  </p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                    Parsed strictly in memory. Every extracted role, skill, project, and degree is staged for your review before saving to your Career Profile.
                  </p>
                  <div className="mt-4">
                    <input
                      ref={docFileInputRef}
                      id="doc-resume-file-input"
                      data-testid="doc-resume-file-input"
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(e) => {
                        const chosen = e.target.files?.[0];
                        void handleSelectDocFile(chosen);
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="doc-resume-file-input"
                      className="inline-flex items-center justify-center h-9 px-4 rounded-control bg-white border border-neutral-300 text-sm font-medium text-neutral-700 hover:bg-neutral-50 shadow-sm cursor-pointer transition-colors"
                    >
                      {extractingDocFile ? 'Extracting…' : 'Choose PDF / DOCX / TXT File'}
                    </label>
                  </div>
                </div>
              ) : (
                <ImportStagingReview
                  staging={docStaging}
                  submitting={submitting}
                  allowCreateResumeOption
                  onApprove={handleApproveDocStaging}
                  onCancel={() => {
                    setDocStaging(null);
                    setErrorMessage(null);
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!(mode === 'file' && docStaging) && (
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 px-5 sm:px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-4 border border-neutral-300 bg-white rounded-control text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring disabled:opacity-50"
          >
            Cancel
          </button>

          {mode === 'json' && (
            <button
              type="button"
              data-testid="confirm-json-import-btn"
              disabled={!jsonMappedResume || submitting}
              onClick={handleConfirmJsonImport}
              className="w-full sm:w-auto h-10 px-5 rounded-control text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-ring"
            >
              {submitting ? 'Importing…' : 'Import Resume'}
            </button>
          )}

          {mode === 'text' && textStep === 'paste' && (
            <button
              type="button"
              data-testid="parse-text-review-btn"
              disabled={!rawText.trim() || submitting}
              onClick={handleParseTextToReview}
              className="w-full sm:w-auto h-10 px-5 rounded-control text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-ring"
            >
              Parse & Review
            </button>
          )}

          {mode === 'text' && textStep === 'review' && (
            <button
              type="button"
              data-testid="create-from-review-btn"
              disabled={submitting}
              onClick={handleCreateFromReview}
              className="w-full sm:w-auto h-10 px-5 rounded-control text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors focus-ring"
            >
              {submitting ? 'Creating…' : 'Create Resume'}
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
};

export default ImportResumeModal;
