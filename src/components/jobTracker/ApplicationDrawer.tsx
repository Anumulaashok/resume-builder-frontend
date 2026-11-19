import React, { useEffect, useState } from 'react';
import {
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  APPLICATION_COLUMNS,
  ApplicationStatus,
  IApplicationContact,
  IJobApplication,
  UpsertApplicationPayload,
} from '../../types/application';
import { ResumeWithMeta } from '../../services/resume.service';

export interface CheckMatchPrefill {
  resumeId: string;
  jobDescription: string;
  jobTitle?: string;
}

interface ApplicationDrawerProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialStatus?: ApplicationStatus;
  application?: IJobApplication | null;
  resumes: ResumeWithMeta[];
  saving: boolean;
  deleting?: boolean;
  onClose: () => void;
  onSave: (payload: UpsertApplicationPayload, existingId?: string) => Promise<IJobApplication | void>;
  onDelete?: (id: string) => Promise<void>;
  onCheckMatch: (prefill: CheckMatchPrefill) => void;
}

function toDateInputValue(isoOrDate?: string | null): string {
  if (!isoOrDate) return '';
  const match = isoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function todayDateInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const ApplicationDrawer: React.FC<ApplicationDrawerProps> = ({
  isOpen,
  mode,
  initialStatus = 'wishlist',
  application,
  resumes,
  saving,
  deleting = false,
  onClose,
  onSave,
  onDelete,
  onCheckMatch,
}) => {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [url, setUrl] = useState('');
  const [appliedAt, setAppliedAt] = useState('');
  const [resumeId, setResumeId] = useState('');
  const [coverLetterId, setCoverLetterId] = useState('');
  const [nextActionAt, setNextActionAt] = useState('');
  const [nextActionNote, setNextActionNote] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [contacts, setContacts] = useState<IApplicationContact[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && application) {
      setCompany(application.company || '');
      setRole(application.role || '');
      setStatus(application.status || 'wishlist');
      setLocation(application.location || '');
      setSalary(application.salary || '');
      setUrl(application.url || '');
      setAppliedAt(toDateInputValue(application.appliedAt));
      setResumeId(application.resumeId || '');
      setCoverLetterId(application.coverLetterId || '');
      setNextActionAt(toDateInputValue(application.nextActionAt));
      setNextActionNote(application.nextActionNote || '');
      setJobDescription(application.jobDescription || '');
      setNotes(application.notes || '');
      setContacts(
        Array.isArray(application.contacts)
          ? application.contacts.map((c) => ({
              name: c.name || '',
              email: c.email || '',
              role: c.role || '',
            }))
          : []
      );
    } else {
      setCompany('');
      setRole('');
      setStatus(initialStatus);
      setLocation('');
      setSalary('');
      setUrl('');
      setAppliedAt(initialStatus === 'applied' ? todayDateInputValue() : '');
      setResumeId('');
      setCoverLetterId('');
      setNextActionAt('');
      setNextActionNote('');
      setJobDescription('');
      setNotes('');
      setContacts([]);
    }
  }, [isOpen, mode, application, initialStatus]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const buildPayload = (): UpsertApplicationPayload | null => {
    if (!company.trim()) {
      toast.error('Company name is required');
      return null;
    }
    if (!role.trim()) {
      toast.error('Role title is required');
      return null;
    }

    const cleanedContacts = contacts
      .map((c) => ({
        name: c.name.trim(),
        email: c.email.trim(),
        role: c.role.trim(),
      }))
      .filter((c) => c.name || c.email || c.role);

    for (const contact of cleanedContacts) {
      if (!contact.name) {
        toast.error('Each contact must include a name');
        return null;
      }
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        toast.error(`Invalid email for contact "${contact.name}"`);
        return null;
      }
    }

    const trimmedCoverLetter = coverLetterId.trim();
    if (trimmedCoverLetter && !/^[a-fA-F0-9]{24}$/.test(trimmedCoverLetter)) {
      toast.error('Cover letter ID must be a 24-character hex ID or left empty');
      return null;
    }

    return {
      company: company.trim(),
      role: role.trim(),
      status,
      location: location.trim(),
      salary: salary.trim(),
      url: url.trim(),
      appliedAt: appliedAt ? `${appliedAt}T00:00:00.000Z` : null,
      resumeId: resumeId || null,
      coverLetterId: trimmedCoverLetter || null,
      nextActionAt: nextActionAt ? `${nextActionAt}T00:00:00.000Z` : null,
      nextActionNote: nextActionNote.trim(),
      jobDescription,
      contacts: cleanedContacts,
      notes,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;
    await onSave(payload, mode === 'edit' ? application?.id || application?._id : undefined);
  };

  const handleCheckMatchClick = async () => {
    if (!resumeId) {
      toast.error('Please link a resume first to check match');
      return;
    }
    if (!jobDescription.trim()) {
      toast.error('Please paste a job description first to check match');
      return;
    }

    // Persist edits if editing an existing application with valid fields before switching tabs
    if (mode === 'edit' && application && company.trim() && role.trim()) {
      const payload = buildPayload();
      if (payload) {
        try {
          await onSave(payload, application.id || application._id);
        } catch {
          // Even if background save warns, still allow jumping to Job Match
        }
      }
    }

    onCheckMatch({
      resumeId,
      jobDescription,
      jobTitle: role.trim() || undefined,
    });
  };

  const handleStatusChange = (nextStatus: ApplicationStatus) => {
    setStatus(nextStatus);
    if (nextStatus === 'applied' && !appliedAt) {
      setAppliedAt(todayDateInputValue());
    }
  };

  const addContact = () => {
    setContacts((prev) => [...prev, { name: '', email: '', role: '' }]);
  };

  const updateContact = (index: number, field: keyof IApplicationContact, value: string) => {
    setContacts((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeContact = (index: number) => {
    setContacts((prev) => prev.filter((_, idx) => idx !== index));
  };

  const canCheckMatch = Boolean(resumeId) && Boolean(jobDescription.trim());

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="application-drawer-title"
      data-testid="application-detail-drawer"
      className="fixed inset-0 z-40 flex justify-end bg-neutral-900/45 backdrop-blur-[1px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full sm:max-w-xl bg-white h-full shadow-modal border-l border-neutral-200 flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-neutral-200 flex items-center justify-between gap-3 bg-neutral-50/80 shrink-0">
          <div className="min-w-0">
            <h2
              id="application-drawer-title"
              className="text-lg font-semibold text-neutral-900 truncate"
            >
              {mode === 'create'
                ? 'New Job Application'
                : `${company || application?.company || 'Application'} — Details`}
            </h2>
            <p className="text-xs text-neutral-500 truncate">
              {mode === 'create'
                ? 'Add a target opportunity to your board'
                : 'Update stage, linked resume, follow-up actions, and job match details'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close application drawer"
            className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-control text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 transition-colors focus-ring"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Drawer Scrollable Form Body */}
        <form
          id="application-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        >
          {/* Core Role Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="jt-company"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Company <span className="text-rose-600">*</span>
                </label>
                <input
                  id="jt-company"
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Stripe"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="jt-role"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Role <span className="text-rose-600">*</span>
                </label>
                <input
                  id="jt-role"
                  type="text"
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="jt-status"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Stage
                </label>
                <select
                  id="jt-status"
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-500 focus-ring"
                >
                  {APPLICATION_COLUMNS.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="jt-applied-at"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Applied date
                </label>
                <input
                  id="jt-applied-at"
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-500 focus-ring"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="jt-location"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Location
                </label>
                <input
                  id="jt-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA · Hybrid"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="jt-salary"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Salary / Range
                </label>
                <input
                  id="jt-salary"
                  type="text"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  placeholder="e.g. $170k – $200k"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label htmlFor="jt-url" className="block text-sm font-medium text-neutral-800">
                  Job posting URL
                </label>
                {url.trim() && /^https?:\/\//i.test(url.trim()) && (
                  <a
                    href={url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 rounded focus-ring"
                  >
                    <span>Open posting</span>
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
              <input
                id="jt-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://careers.example.com/jobs/..."
                className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
              />
            </div>
          </div>

          {/* Linked Documents & Job Match */}
          <div className="rounded-card border border-neutral-200 bg-neutral-50/70 p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="jt-resume"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Linked resume
                </label>
                <select
                  id="jt-resume"
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-500 focus-ring"
                >
                  <option value="">No resume linked</option>
                  {resumes.map((r) => {
                    const id = r.id || r._id || '';
                    return (
                      <option key={id} value={id}>
                        {r.title || r.content?.basics?.name || 'Untitled resume'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label
                  htmlFor="jt-cover-letter"
                  className="block text-sm font-medium text-neutral-800 mb-1.5"
                >
                  Cover letter ID <span className="text-xs font-normal text-neutral-500">(optional)</span>
                </label>
                <input
                  id="jt-cover-letter"
                  type="text"
                  value={coverLetterId}
                  onChange={(e) => setCoverLetterId(e.target.value)}
                  placeholder="Optional reference ID"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="jt-jd" className="block text-sm font-medium text-neutral-800">
                  Job description
                </label>
                <button
                  type="button"
                  onClick={handleCheckMatchClick}
                  data-testid="drawer-check-match-btn"
                  className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-control text-xs font-semibold transition-colors focus-ring ${
                    canCheckMatch
                      ? 'bg-accent-600 text-white hover:bg-accent-700 shadow-sm'
                      : 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-100'
                  }`}
                >
                  <SparklesIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Check match</span>
                </button>
              </div>
              <textarea
                id="jt-jd"
                rows={5}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the target job description here to compare keywords and tailor your linked resume…"
                className="w-full p-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 resize-y focus:border-primary-500 focus-ring"
              />
              {!canCheckMatch && (
                <p className="mt-1 text-xs text-neutral-500">
                  Select a linked resume and paste the job description to open ATS match analysis.
                </p>
              )}
            </div>
          </div>

          {/* Next Action Follow-up */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-neutral-900">Next action</h3>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label htmlFor="jt-next-action-at" className="block text-xs font-medium text-neutral-600 mb-1">
                  Due date
                </label>
                <input
                  id="jt-next-action-at"
                  type="date"
                  value={nextActionAt}
                  onChange={(e) => setNextActionAt(e.target.value)}
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 focus:border-primary-500 focus-ring"
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="jt-next-action-note" className="block text-xs font-medium text-neutral-600 mb-1">
                  Action note
                </label>
                <input
                  id="jt-next-action-note"
                  type="text"
                  value={nextActionNote}
                  onChange={(e) => setNextActionNote(e.target.value)}
                  placeholder="e.g. Send thank-you note after system design"
                  className="w-full h-10 px-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                />
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
                <UserGroupIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                <span>Contacts</span>
              </h3>
              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-control border border-neutral-300 bg-white text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
              >
                <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add contact</span>
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Keep track of recruiters, referrals, or interviewers for this opportunity.
              </p>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="rounded-control border border-neutral-200 bg-neutral-50/70 p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-neutral-600">
                        Contact #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        aria-label={`Remove contact ${idx + 1}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-ring"
                      >
                        <TrashIcon className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <input
                        type="text"
                        aria-label={`Contact ${idx + 1} name`}
                        value={contact.name}
                        onChange={(e) => updateContact(idx, 'name', e.target.value)}
                        placeholder="Name *"
                        className="h-9 px-2.5 rounded-control border border-neutral-300 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                      />
                      <input
                        type="email"
                        aria-label={`Contact ${idx + 1} email`}
                        value={contact.email}
                        onChange={(e) => updateContact(idx, 'email', e.target.value)}
                        placeholder="Email"
                        className="h-9 px-2.5 rounded-control border border-neutral-300 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                      />
                      <input
                        type="text"
                        aria-label={`Contact ${idx + 1} role`}
                        value={contact.role}
                        onChange={(e) => updateContact(idx, 'role', e.target.value)}
                        placeholder="Role (e.g. Recruiter)"
                        className="h-9 px-2.5 rounded-control border border-neutral-300 bg-white text-xs text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus-ring"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="jt-notes" className="block text-sm font-medium text-neutral-800 mb-1.5">
              Notes
            </label>
            <textarea
              id="jt-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Interview takeaways, compensation breakdown, team details…"
              className="w-full p-3 rounded-control border border-neutral-300 bg-white text-sm text-neutral-900 placeholder-neutral-400 resize-y focus:border-primary-500 focus-ring"
            />
          </div>
        </form>

        {/* Drawer Sticky Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-neutral-200 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {mode === 'edit' && application && onDelete && (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={() => onDelete(application.id || application._id || '')}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-control border border-rose-200 text-rose-700 bg-rose-50/60 hover:bg-rose-100/80 text-sm font-medium disabled:opacity-50 transition-colors focus-ring"
              >
                <TrashIcon className="h-4 w-4" aria-hidden="true" />
                <span>{deleting ? 'Deleting…' : 'Delete'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="h-10 px-4 rounded-control border border-neutral-300 bg-white text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors focus-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="application-drawer-form"
              disabled={saving || deleting}
              className="h-10 px-5 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold shadow-sm disabled:opacity-50 transition-colors focus-ring"
            >
              {saving
                ? 'Saving…'
                : mode === 'create'
                ? 'Create Application'
                : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
