import React, { useEffect, useMemo, useState } from "react";
import {
  SparklesIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { IResume, ISection, SectionType } from "../types/resume";
import { resumeService } from "../services/resume.service";
import { MAX_PROMPT_LENGTH, PersonalIdentifiers } from "../utils/piiMasker";

export type AssistantTab = "summary" | "bullets";

export interface BulletTarget {
  key: string;
  sectionId: string;
  sectionTitle: string;
  itemId: string;
  itemTitle: string;
  role?: string;
  company?: string;
  sourceField: "description" | "highlights";
  lineIndex: number;
  rawLine: string;
  cleanText: string;
  prefix: string;
}

export interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resume: IResume;
  initialTab?: AssistantTab;
  selectedBulletKey?: string | null;
  onSelectBulletKey?: (key: string | null) => void;
  onApplySummary: (summary: string) => void;
  onApplyBullet: (
    target: BulletTarget | null,
    newBulletText: string
  ) => void;
}

const BULLET_PREFIX_REGEX = /^(\s*(?:[•\-*]|\d+\.)\s*)/;

export function extractResumeBullets(resume: IResume): BulletTarget[] {
  const sections: ISection[] = Array.isArray(resume.content?.sections)
    ? resume.content.sections
    : [];
  const targets: BulletTarget[] = [];

  for (const section of sections) {
    if (!Array.isArray(section.content)) continue;

    for (const item of section.content as Record<string, any>[]) {
      if (!item || !item.id) continue;

      const company = (item.company || item.name || item.organization || "").trim();
      const role = (item.position || item.role || item.title || "").trim();
      const itemTitle =
        [role, company].filter(Boolean).join(" at ") ||
        item.name ||
        item.title ||
        section.title;

      if (Array.isArray(item.highlights) && item.highlights.length > 0) {
        item.highlights.forEach((hl: unknown, idx: number) => {
          if (typeof hl !== "string" || !hl.trim()) return;
          const match = hl.match(BULLET_PREFIX_REGEX);
          const prefix = match ? match[1] : "";
          const cleanText = hl.slice(prefix.length).trim();
          if (!cleanText) return;
          targets.push({
            key: `${section.id}::${item.id}::highlights::${idx}`,
            sectionId: section.id,
            sectionTitle: section.title,
            itemId: item.id,
            itemTitle,
            role: role || undefined,
            company: company || undefined,
            sourceField: "highlights",
            lineIndex: idx,
            rawLine: hl,
            cleanText,
            prefix,
          });
        });
      }

      if (typeof item.description === "string" && item.description.trim()) {
        const lines = item.description.split(/\r?\n/);
        lines.forEach((line: string, idx: number) => {
          if (!line.trim()) return;
          const match = line.match(BULLET_PREFIX_REGEX);
          const prefix = match ? match[1] : "";
          const cleanText = line.slice(prefix.length).trim();
          if (!cleanText) return;
          targets.push({
            key: `${section.id}::${item.id}::description::${idx}`,
            sectionId: section.id,
            sectionTitle: section.title,
            itemId: item.id,
            itemTitle,
            role: role || undefined,
            company: company || undefined,
            sourceField: "description",
            lineIndex: idx,
            rawLine: line,
            cleanText,
            prefix,
          });
        });
      }
    }
  }

  return targets;
}

function buildNonPIIExperienceContext(resume: IResume): string {
  const parts: string[] = [];
  const label = resume.content?.basics?.label?.trim();
  if (label) {
    parts.push(`Current Role: ${label}`);
  }

  const sections = resume.content?.sections || [];
  const workItems = sections
    .filter((s) => s.type === SectionType.WORK)
    .flatMap((s) => s.content || [])
    .slice(0, 3);
  if (workItems.length > 0) {
    const roles = workItems
      .map((w: any) => [w.position, w.company || w.name].filter(Boolean).join(" at "))
      .filter(Boolean);
    if (roles.length > 0) {
      parts.push(`Experience: ${roles.join("; ")}`);
    }
  }

  const skillItems = sections
    .filter(
      (s) =>
        s.type === SectionType.SKILLS ||
        s.type === SectionType.TECK_SKILLS ||
        s.type === SectionType.SOFTSKILSS
    )
    .flatMap((s) => s.content || [])
    .map((sk: any) => sk?.name)
    .filter(Boolean)
    .slice(0, 12);
  if (skillItems.length > 0) {
    parts.push(`Skills: ${skillItems.join(", ")}`);
  }

  return parts.join("\n").slice(0, 600);
}

const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  resume,
  initialTab = "summary",
  selectedBulletKey,
  onSelectBulletKey,
  onApplySummary,
  onApplyBullet,
}) => {
  const [activeTab, setActiveTab] = useState<AssistantTab>(initialTab);

  // Summary Generation State
  const defaultRole =
    resume.content?.basics?.label?.trim() ||
    (resume.title &&
    resume.title !== "Untitled Resume" &&
    resume.title !== "AI Draft"
      ? resume.title
      : "");
  const [targetRole, setTargetRole] = useState<string>(defaultRole);
  const [summaryPrompt, setSummaryPrompt] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summarySuggestions, setSummarySuggestions] = useState<string[]>([]);
  const [selectedSummaryIndex, setSelectedSummaryIndex] = useState<number>(0);

  // Bullet Optimization State
  const bulletTargets = useMemo(() => extractResumeBullets(resume), [resume]);
  const [activeBulletKey, setActiveBulletKey] = useState<string>("");
  const [bulletInput, setBulletInput] = useState<string>("");
  const [bulletFocus, setBulletFocus] = useState<string>("");
  const [bulletLoading, setBulletLoading] = useState<boolean>(false);
  const [bulletError, setBulletError] = useState<string | null>(null);
  const [bulletSuggestions, setBulletSuggestions] = useState<string[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!targetRole && defaultRole) {
      setTargetRole(defaultRole);
    }
  }, [defaultRole, targetRole]);

  useEffect(() => {
    if (selectedBulletKey) {
      const found = bulletTargets.find((b) => b.key === selectedBulletKey);
      if (found) {
        setActiveBulletKey(found.key);
        setBulletInput(found.cleanText);
        setBulletSuggestions([]);
        setBulletError(null);
        return;
      }
    }
    if (!activeBulletKey && bulletTargets.length > 0) {
      setActiveBulletKey(bulletTargets[0].key);
      setBulletInput(bulletTargets[0].cleanText);
    }
  }, [selectedBulletKey, bulletTargets, activeBulletKey]);

  const personalIdentifiers: PersonalIdentifiers = useMemo(
    () => ({
      name: resume.content?.basics?.name,
      email: resume.content?.basics?.email,
      phone: resume.content?.basics?.phone,
      address: resume.content?.basics?.location?.address,
    }),
    [resume.content?.basics]
  );

  const selectedBulletTarget = useMemo(
    () => bulletTargets.find((b) => b.key === activeBulletKey) || null,
    [bulletTargets, activeBulletKey]
  );

  const currentSummary =
    resume.content?.basics?.summary ?? resume.summary ?? "";

  const handleSelectBulletDropdown = (nextKey: string) => {
    setActiveBulletKey(nextKey);
    onSelectBulletKey?.(nextKey || null);
    setBulletSuggestions([]);
    setBulletError(null);
    const target = bulletTargets.find((b) => b.key === nextKey);
    if (target) {
      setBulletInput(target.cleanText);
    }
  };

  const handleGenerateSummary = async () => {
    setSummaryError(null);
    const trimmedPrompt = summaryPrompt.trim();
    const trimmedRole = targetRole.trim();
    const experienceContext = buildNonPIIExperienceContext(resume);

    if (!trimmedPrompt && !trimmedRole && !experienceContext) {
      const msg = "Please enter a target role or career highlights to generate a summary.";
      setSummaryError(msg);
      toast.error(msg);
      return;
    }

    if (summaryPrompt.length > MAX_PROMPT_LENGTH) {
      const msg = `Prompt cannot exceed ${MAX_PROMPT_LENGTH} characters.`;
      setSummaryError(msg);
      toast.error(msg);
      return;
    }

    setSummaryLoading(true);
    try {
      const result = await resumeService.generateSummary(
        {
          prompt: trimmedPrompt || undefined,
          targetRole: trimmedRole || undefined,
          experienceContext: experienceContext || undefined,
          currentSummary: currentSummary ? currentSummary.slice(0, 400) : undefined,
        },
        personalIdentifiers
      );

      const options =
        result.suggestions && result.suggestions.length > 0
          ? result.suggestions
          : result.summary
          ? [result.summary]
          : [];

      if (options.length === 0) {
        throw new Error("AI service returned no summary suggestions.");
      }

      setSummarySuggestions(options);
      setSelectedSummaryIndex(0);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI service is temporarily unavailable. Please try again.";
      setSummaryError(msg);
      toast.error(msg);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleApplySummaryClick = () => {
    const chosen = summarySuggestions[selectedSummaryIndex];
    if (!chosen) return;
    onApplySummary(chosen);
    setSummarySuggestions([]);
    toast.success("Summary inserted into active resume!");
  };

  const handleDiscardSummaryClick = () => {
    setSummarySuggestions([]);
    setSummaryError(null);
  };

  const handleOptimizeBullet = async () => {
    setBulletError(null);
    const trimmedBullet = bulletInput.trim();

    if (!trimmedBullet) {
      const msg = "Please select or enter a bullet point to optimize.";
      setBulletError(msg);
      toast.error(msg);
      return;
    }

    if (bulletInput.length + bulletFocus.length > MAX_PROMPT_LENGTH) {
      const msg = `Input cannot exceed ${MAX_PROMPT_LENGTH} characters.`;
      setBulletError(msg);
      toast.error(msg);
      return;
    }

    setBulletLoading(true);
    try {
      const result = await resumeService.optimizeBullet(
        {
          bullet: trimmedBullet,
          role: selectedBulletTarget?.role || targetRole.trim() || undefined,
          company: selectedBulletTarget?.company,
          targetRole: targetRole.trim() || undefined,
          context: bulletFocus.trim() || undefined,
        },
        personalIdentifiers
      );

      if (!result.suggestions || result.suggestions.length === 0) {
        throw new Error("AI service returned no bullet recommendations.");
      }

      setBulletSuggestions(result.suggestions.slice(0, 3));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "AI service is temporarily unavailable. Please try again.";
      setBulletError(msg);
      toast.error(msg);
    } finally {
      setBulletLoading(false);
    }
  };

  const handleApplyBulletSuggestion = (suggestion: string) => {
    onApplyBullet(selectedBulletTarget, suggestion);
    setBulletInput(suggestion);
    setBulletSuggestions([]);
    toast.success("Bullet point updated!");
  };

  const handleDiscardBulletSuggestion = (index?: number) => {
    if (typeof index === "number") {
      setBulletSuggestions((prev) => prev.filter((_, idx) => idx !== index));
    } else {
      setBulletSuggestions([]);
      setBulletError(null);
    }
  };

  if (!isOpen) {
    return null;
  }

  const activeSuggestedSummary = summarySuggestions[selectedSummaryIndex] || "";

  return (
    <aside
      aria-label="AI Assistant"
      data-testid="ai-assistant-drawer"
      className="fixed inset-y-0 right-0 top-16 z-40 w-full sm:w-[420px] md:w-[460px] bg-white border-l border-gray-200 shadow-2xl flex flex-col print:hidden"
    >
      {/* Drawer Header */}
      <div className="px-5 py-4 bg-gradient-to-r from-indigo-50/90 via-white to-blue-50/80 border-b border-gray-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-600 text-white shadow-sm">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              AI Resume Assistant
            </h2>
            <p className="text-xs text-gray-500">
              Generate tailored summaries &amp; impact bullets
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Assistant"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="AI Assistant tools"
        className="grid grid-cols-2 border-b border-gray-200 bg-neutral-50/80 px-3 pt-2 gap-2 shrink-0"
      >
        <button
          type="button"
          role="tab"
          id="ai-tab-summary"
          aria-selected={activeTab === "summary"}
          aria-controls="ai-panel-summary"
          onClick={() => setActiveTab("summary")}
          className={`py-2.5 px-3 text-xs sm:text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-indigo-600 text-indigo-700 bg-white shadow-sm"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          Summary Generation
        </button>
        <button
          type="button"
          role="tab"
          id="ai-tab-bullets"
          aria-selected={activeTab === "bullets"}
          aria-controls="ai-panel-bullets"
          onClick={() => setActiveTab("bullets")}
          className={`py-2.5 px-3 text-xs sm:text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
            activeTab === "bullets"
              ? "border-indigo-600 text-indigo-700 bg-white shadow-sm"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          Bullet Optimization
        </button>
      </div>

      {/* Privacy Notice Banner */}
      <div className="px-5 py-2 bg-emerald-50/70 border-b border-emerald-100 flex items-center gap-2 text-[11px] text-emerald-800 shrink-0">
        <ShieldCheckIcon className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
        <span>
          Personal identifiers (name, email, phone, SSN) are masked before AI processing.
        </span>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
        {activeTab === "summary" ? (
          <div
            role="tabpanel"
            id="ai-panel-summary"
            aria-labelledby="ai-tab-summary"
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="ai-summary-role"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5"
              >
                Target Role
              </label>
              <input
                id="ai-summary-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="ai-summary-prompt"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Career Highlights &amp; Focus
                </label>
                <span
                  data-testid="summary-char-count"
                  className={`text-xs tabular-nums ${
                    summaryPrompt.length > MAX_PROMPT_LENGTH
                      ? "text-red-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {summaryPrompt.length} / {MAX_PROMPT_LENGTH}
                </span>
              </div>
              <textarea
                id="ai-summary-prompt"
                rows={4}
                value={summaryPrompt}
                onChange={(e) => setSummaryPrompt(e.target.value)}
                placeholder="Describe years of experience, core technologies, domain strengths, or leadership scope..."
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {summaryError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700"
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{summaryError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={summaryLoading || summaryPrompt.length > MAX_PROMPT_LENGTH}
              data-testid="generate-summary-btn"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {summaryLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Generating Summary...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>Generate Summary</span>
                </>
              )}
            </button>

            {/* Preview & Apply / Discard */}
            {summarySuggestions.length > 0 && (
              <div
                data-testid="summary-preview-card"
                className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                    Preview Suggested Change
                  </span>
                  {summarySuggestions.length > 1 && (
                    <div className="flex items-center gap-1">
                      {summarySuggestions.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedSummaryIndex(idx)}
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            selectedSummaryIndex === idx
                              ? "bg-indigo-600 text-white"
                              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          Option {idx + 1}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentSummary && (
                  <div className="rounded-lg bg-white/80 border border-gray-200 p-2.5">
                    <p className="text-[11px] font-semibold uppercase text-gray-400 mb-1">
                      Current Summary
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-3">
                      {currentSummary}
                    </p>
                  </div>
                )}

                <div className="rounded-lg bg-white border border-indigo-200 p-3 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase text-indigo-600 mb-1">
                    Suggested Summary
                  </p>
                  <p
                    data-testid="suggested-summary-text"
                    className="text-sm text-gray-900 leading-relaxed"
                  >
                    {activeSuggestedSummary}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={handleApplySummaryClick}
                    data-testid="apply-summary-btn"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Apply Summary</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardSummaryClick}
                    data-testid="discard-summary-btn"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4 text-gray-500" />
                    <span>Discard</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            role="tabpanel"
            id="ai-panel-bullets"
            aria-labelledby="ai-tab-bullets"
            className="space-y-4"
          >
            {bulletTargets.length > 0 && (
              <div>
                <label
                  htmlFor="ai-bullet-selector"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5"
                >
                  Select Resume Bullet Point
                </label>
                <select
                  id="ai-bullet-selector"
                  value={activeBulletKey}
                  onChange={(e) => handleSelectBulletDropdown(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {bulletTargets.map((target) => (
                    <option key={target.key} value={target.key}>
                      [{target.itemTitle}]{" "}
                      {target.cleanText.length > 55
                        ? `${target.cleanText.slice(0, 55)}...`
                        : target.cleanText}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="ai-bullet-input"
                  className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
                >
                  Bullet Point to Refine
                </label>
                <span
                  data-testid="bullet-char-count"
                  className={`text-xs tabular-nums ${
                    bulletInput.length + bulletFocus.length > MAX_PROMPT_LENGTH
                      ? "text-red-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  {bulletInput.length + bulletFocus.length} / {MAX_PROMPT_LENGTH}
                </span>
              </div>
              <textarea
                id="ai-bullet-input"
                rows={3}
                value={bulletInput}
                onChange={(e) => setBulletInput(e.target.value)}
                placeholder="e.g. Built REST APIs and improved database performance for customer dashboard"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label
                htmlFor="ai-bullet-focus"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1.5"
              >
                Optimization Focus (Optional)
              </label>
              <input
                id="ai-bullet-focus"
                type="text"
                value={bulletFocus}
                onChange={(e) => setBulletFocus(e.target.value)}
                placeholder="e.g. Emphasize latency metrics, scale, or leadership"
                className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {bulletError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-700"
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{bulletError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleOptimizeBullet}
              disabled={
                bulletLoading ||
                bulletInput.length + bulletFocus.length > MAX_PROMPT_LENGTH
              }
              data-testid="optimize-bullet-btn"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {bulletLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Optimizing Bullet...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  <span>Optimize Bullet</span>
                </>
              )}
            </button>

            {/* 3 Refined Versions Preview */}
            {bulletSuggestions.length > 0 && (
              <div
                data-testid="bullet-suggestions-list"
                className="space-y-3 pt-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                    Refined Recommendations ({bulletSuggestions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDiscardBulletSuggestion()}
                    data-testid="discard-all-bullets-btn"
                    className="text-xs font-medium text-gray-500 hover:text-gray-800 underline"
                  >
                    Discard all
                  </button>
                </div>

                <div className="rounded-lg bg-neutral-50 border border-gray-200 p-2.5">
                  <p className="text-[11px] font-semibold uppercase text-gray-400 mb-0.5">
                    Original Bullet
                  </p>
                  <p className="text-xs text-gray-600">{bulletInput}</p>
                </div>

                {bulletSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    data-testid={`bullet-suggestion-card-${idx}`}
                    className="rounded-xl border border-indigo-200 bg-white p-3.5 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700">
                        Version {idx + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {suggestion}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyBulletSuggestion(suggestion)}
                        data-testid={`apply-bullet-btn-${idx}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        <span>Apply</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardBulletSuggestion(idx)}
                        data-testid={`discard-bullet-btn-${idx}`}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5 text-gray-400" />
                        <span>Discard</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export default AIAssistantDrawer;
