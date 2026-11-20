import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUturnLeftIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { resumeService } from '../../services/resume.service';
import {
  BulletRewriteAction,
  BulletRewriteResponse,
} from '../../types/careerProfile';
import { IResume, ISection, SectionType } from '../../types/resume';

export interface BulletTarget {
  key: string;
  sectionId: string;
  sectionTitle: string;
  sectionType: SectionType;
  itemId: string;
  itemLabel: string;
  company?: string;
  role?: string;
  projectName?: string;
  technologies?: string[];
  bulletIndex: number;
  bulletText: string;
  source: 'highlights' | 'description';
}

const METRIC_OUTCOME_CHIPS = [
  'Reduced latency',
  'Increased throughput',
  'Reduced cost',
  'Saved engineering time',
  'Scaled active users / volume',
];

export function splitDescriptionBullets(description: string): string[] {
  if (!description || !description.trim()) return [];
  const rawLines = description
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•●▪◦]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);
  return rawLines;
}

export function extractBulletsFromResume(resume: IResume): BulletTarget[] {
  const targets: BulletTarget[] = [];
  const sections = resume?.content?.sections || [];

  for (const section of sections) {
    if (
      section.type !== SectionType.WORK &&
      section.type !== SectionType.PROJECTS
    ) {
      continue;
    }

    const items = (
      Array.isArray(section.content) ? section.content : []
    ) as Array<Record<string, any>>;
    for (const item of items) {
      const itemId = String(item.id || '');
      const company =
        section.type === SectionType.WORK
          ? String(item.company || item.name || '').trim()
          : undefined;
      const role =
        section.type === SectionType.WORK
          ? String(item.position || '').trim()
          : undefined;
      const projectName =
        section.type === SectionType.PROJECTS
          ? String(item.name || item.title || '').trim()
          : undefined;
      const itemLabel =
        section.type === SectionType.WORK
          ? [role, company].filter(Boolean).join(' at ') || 'Work Experience'
          : projectName || 'Project';
      const technologies = Array.isArray(item.technologies)
        ? item.technologies.map(String)
        : undefined;

      if (Array.isArray(item.highlights) && item.highlights.length > 0) {
        item.highlights.forEach((hl: unknown, idx: number) => {
          const text = String(hl || '').trim();
          if (!text) return;
          targets.push({
            key: `${section.id}::${itemId}::highlights::${idx}`,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionType: section.type,
            itemId,
            itemLabel,
            company,
            role,
            projectName,
            technologies,
            bulletIndex: idx,
            bulletText: text,
            source: 'highlights',
          });
        });
      } else {
        const lines = splitDescriptionBullets(String(item.description || ''));
        lines.forEach((line, idx) => {
          targets.push({
            key: `${section.id}::${itemId}::description::${idx}`,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionType: section.type,
            itemId,
            itemLabel,
            company,
            role,
            projectName,
            technologies,
            bulletIndex: idx,
            bulletText: line,
            source: 'description',
          });
        });
      }
    }
  }

  return targets;
}

export function applyBulletUpdateToResume(
  resume: IResume,
  target: BulletTarget,
  nextBulletText: string,
  provenanceUpdate?: {
    source_fact_ids: string[];
    userEnteredMetric?: string;
  }
): IResume {
  const updatedSections: ISection[] = (resume.content?.sections || []).map(
    (section) => {
      if (section.id !== target.sectionId) return section;
      const updatedItems = (section.content || []).map((item: any) => {
        if (String(item.id || '') !== target.itemId) return item;

        const mergedSourceIds = provenanceUpdate?.source_fact_ids?.length
          ? Array.from(
              new Set([
                ...(Array.isArray(item.source_fact_ids)
                  ? item.source_fact_ids
                  : []),
                ...provenanceUpdate.source_fact_ids,
              ])
            )
          : item.source_fact_ids;

        if (target.source === 'highlights' && Array.isArray(item.highlights)) {
          const nextHighlights = [...item.highlights];
          nextHighlights[target.bulletIndex] = nextBulletText;
          // Also keep description synced if description was populated
          const nextDescription =
            typeof item.description === 'string' && item.description.trim()
              ? nextHighlights.map((line) => `• ${line}`).join('\n')
              : item.description;
          return {
            ...item,
            highlights: nextHighlights,
            description: nextDescription,
            ...(mergedSourceIds ? { source_fact_ids: mergedSourceIds } : {}),
          };
        }

        const lines = splitDescriptionBullets(String(item.description || ''));
        if (lines.length === 0) {
          lines.push(nextBulletText);
        } else {
          lines[target.bulletIndex] = nextBulletText;
        }
        const hadBulletPrefix = /^\s*[-*•●▪◦]/.test(
          String(item.description || '')
        );
        const formatted =
          lines.length > 1 || hadBulletPrefix
            ? lines.map((line) => `• ${line}`).join('\n')
            : lines[0];
        return {
          ...item,
          description: formatted,
          ...(mergedSourceIds ? { source_fact_ids: mergedSourceIds } : {}),
        };
      });

      return {
        ...section,
        content: updatedItems,
      };
    }
  );

  const existingClaims = resume.provenance?.claims || [];
  const nextClaims = provenanceUpdate
    ? [
        ...existingClaims.filter((claim) => claim.targetPath !== target.key),
        {
          targetPath: target.key,
          text: nextBulletText,
          source_fact_ids: provenanceUpdate.source_fact_ids,
          ...(provenanceUpdate.userEnteredMetric
            ? { userEnteredMetric: provenanceUpdate.userEnteredMetric }
            : {}),
        },
      ]
    : existingClaims;

  return {
    ...resume,
    ...(provenanceUpdate
      ? {
          provenance: {
            ...resume.provenance,
            claims: nextClaims,
          },
        }
      : {}),
    content: {
      ...resume.content,
      sections: updatedSections,
    },
  };
}

export interface BulletAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  resume: IResume;
  resumeId?: string;
  focusItemId?: string | null;
  onApplyResumeUpdate: (updatedResume: IResume) => void;
}

export const BulletAssistantDrawer: React.FC<BulletAssistantDrawerProps> = ({
  isOpen,
  onClose,
  resume,
  resumeId,
  focusItemId,
  onApplyResumeUpdate,
}) => {
  const bullets = useMemo(() => extractBulletsFromResume(resume), [resume]);
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>(
    resume.provenance?.targetRole || resume.content?.basics?.label || ''
  );
  const [metricCategory, setMetricCategory] = useState<string>(
    METRIC_OUTCOME_CHIPS[0]
  );
  const [userMetric, setUserMetric] = useState<string>('');

  const [rewritingAction, setRewritingAction] =
    useState<BulletRewriteAction | null>(null);
  const [result, setResult] = useState<BulletRewriteResponse | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Per-bullet undo stack storing previous bullet strings
  const [bulletUndoStack, setBulletUndoStack] = useState<
    Record<string, string[]>
  >({});

  useEffect(() => {
    if (!isOpen) return;
    if (focusItemId) {
      const match = bullets.find((b) => b.itemId === focusItemId);
      if (match) {
        setSelectedKey(match.key);
        setResult(null);
        setErrorBanner(null);
        return;
      }
    }
    if (!selectedKey || !bullets.some((b) => b.key === selectedKey)) {
      setSelectedKey(bullets[0]?.key || '');
    }
  }, [bullets, focusItemId, isOpen, selectedKey]);

  if (!isOpen) return null;

  const selectedBullet =
    bullets.find((b) => b.key === selectedKey) || bullets[0] || null;
  const undoHistoryForSelected = selectedBullet
    ? bulletUndoStack[selectedBullet.key] || []
    : [];
  const bulletLacksNumbers = selectedBullet
    ? !/\d/.test(selectedBullet.bulletText)
    : false;
  const shouldPromptForMetrics = Boolean(
    selectedBullet && (result?.needsMetrics || bulletLacksNumbers)
  );

  const runRewrite = async (
    action: BulletRewriteAction,
    includeMetric = false
  ) => {
    if (!selectedBullet) return;
    setRewritingAction(action);
    setErrorBanner(null);
    try {
      const response = await resumeService.rewriteBullet(
        {
          bullet: selectedBullet.bulletText,
          action,
          sectionType: selectedBullet.sectionType,
          itemId: selectedBullet.itemId,
          company: selectedBullet.company,
          role: selectedBullet.role,
          projectName: selectedBullet.projectName,
          technologies: selectedBullet.technologies,
          targetRole: targetRole.trim() || undefined,
          ...(includeMetric && userMetric.trim()
            ? {
                metricCategory,
                userMetric: userMetric.trim(),
              }
            : {}),
        },
        resumeId
      );
      setResult(response);
    } catch (err: unknown) {
      const maybeAxios = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message =
        maybeAxios?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to rewrite bullet');
      setErrorBanner(message);
    } finally {
      setRewritingAction(null);
    }
  };

  const handleApplySuggestion = () => {
    if (!selectedBullet || !result?.rewrittenBullet) return;
    const previousText = selectedBullet.bulletText;
    const nextResume = applyBulletUpdateToResume(
      resume,
      selectedBullet,
      result.rewrittenBullet,
      {
        source_fact_ids: result.provenance.source_fact_ids,
        userEnteredMetric: result.provenance.userEnteredMetric,
      }
    );
    setBulletUndoStack((prev) => ({
      ...prev,
      [selectedBullet.key]: [...(prev[selectedBullet.key] || []), previousText],
    }));
    onApplyResumeUpdate(nextResume);
    toast.success('Grounded bullet applied');
  };

  const handleUndoBullet = () => {
    if (!selectedBullet) return;
    const stack = bulletUndoStack[selectedBullet.key] || [];
    if (stack.length === 0) return;
    const previousText = stack[stack.length - 1];
    const nextResume = applyBulletUpdateToResume(
      resume,
      selectedBullet,
      previousText
    );
    setBulletUndoStack((prev) => ({
      ...prev,
      [selectedBullet.key]: stack.slice(0, -1),
    }));
    setResult(null);
    onApplyResumeUpdate(nextResume);
    toast.success('Reverted bullet change');
  };

  return (
    <aside
      aria-label="Grounded AI Bullet Assistant"
      data-testid="bullet-assistant-drawer"
      className="w-full lg:w-96 shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden print:hidden shadow-lg"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-accent-50/80 to-primary-50/60 border-b border-gray-200 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-accent-600 text-white shrink-0">
            <SparklesIcon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 truncate">
              Grounded Bullet Assistant
            </h2>
            <p className="text-[11px] text-gray-600 truncate">
              Zero invented facts · Source provenance tracked
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Collapse AI Bullet Assistant"
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-white/80"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-gray-900">
        {bullets.length === 0 ? (
          <div className="p-5 rounded-xl border border-dashed border-gray-300 bg-neutral-50 text-center text-xs text-gray-600 space-y-1.5">
            <p className="font-semibold text-gray-800">
              No experience or project bullets yet
            </p>
            <p>
              Add a Professional Experience or Project entry with description bullets to refine, shorten, or add real metrics.
            </p>
          </div>
        ) : (
          <>
            {/* Bullet Selector */}
            <div>
              <label
                htmlFor="assistant-bullet-select"
                className="block text-xs font-semibold text-gray-700 mb-1"
              >
                Select Bullet to Refine ({bullets.length})
              </label>
              <select
                id="assistant-bullet-select"
                data-testid="assistant-bullet-select"
                value={selectedBullet?.key || ''}
                onChange={(e) => {
                  setSelectedKey(e.target.value);
                  setResult(null);
                  setErrorBanner(null);
                }}
                className="w-full px-2.5 py-2 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
              >
                {bullets.map((b, idx) => (
                  <option key={b.key} value={b.key}>
                    #{idx + 1} [{b.itemLabel}] {b.bulletText.slice(0, 62)}
                    {b.bulletText.length > 62 ? '…' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Current Bullet Card */}
            {selectedBullet && (
              <div className="p-3 rounded-xl border border-gray-200 bg-neutral-50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-primary-700 truncate">
                    {selectedBullet.itemLabel}
                  </span>
                  {undoHistoryForSelected.length > 0 && (
                    <button
                      type="button"
                      data-testid="undo-bullet-change-btn"
                      onClick={handleUndoBullet}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100"
                    >
                      <ArrowUturnLeftIcon className="h-3 w-3" />
                      Undo ({undoHistoryForSelected.length})
                    </button>
                  )}
                </div>
                <p
                  data-testid="assistant-current-bullet-text"
                  className="text-xs text-gray-800 leading-relaxed"
                >
                  {selectedBullet.bulletText}
                </p>
              </div>
            )}

            {/* Optional Target Role for ATS Optimization */}
            <div>
              <label
                htmlFor="assistant-target-role"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Target Role Alignment (optional)
              </label>
              <input
                id="assistant-target-role"
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-900"
              />
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-testid="bullet-action-rewrite"
                disabled={rewritingAction !== null}
                onClick={() => void runRewrite('rewrite')}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-gray-800 disabled:opacity-50"
              >
                {rewritingAction === 'rewrite' ? 'Rewriting…' : 'Rewrite Clearly'}
              </button>
              <button
                type="button"
                data-testid="bullet-action-shorten"
                disabled={rewritingAction !== null}
                onClick={() => void runRewrite('shorten')}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-gray-800 disabled:opacity-50"
              >
                {rewritingAction === 'shorten' ? 'Shortening…' : 'Shorten'}
              </button>
              <button
                type="button"
                data-testid="bullet-action-improve"
                disabled={rewritingAction !== null}
                onClick={() => void runRewrite('improve')}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-neutral-50 text-xs font-semibold text-gray-800 disabled:opacity-50"
              >
                {rewritingAction === 'improve' ? 'Improving…' : 'Improve Impact'}
              </button>
              <button
                type="button"
                data-testid="bullet-action-ats"
                disabled={rewritingAction !== null}
                onClick={() => void runRewrite('ats')}
                className="px-3 py-2 rounded-lg border border-accent-200 bg-accent-50 hover:bg-accent-100 text-xs font-semibold text-accent-800 disabled:opacity-50"
              >
                {rewritingAction === 'ats' ? 'Optimizing…' : 'ATS Optimize'}
              </button>
            </div>

            {/* Anti-fabrication / API Error */}
            {errorBanner && (
              <div
                role="alert"
                data-testid="bullet-assistant-error"
                className="p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2"
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Suggested Grounded Rewrite + Provenance */}
            {result && (
              <div
                data-testid="bullet-rewrite-suggestion-card"
                className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                    <CheckBadgeIcon className="h-4 w-4 text-emerald-600" />
                    {result.provenance.groundedInCareerProfile
                      ? 'Grounded in Career Profile'
                      : 'Grounded in Verified Bullet'}
                  </span>
                  {result.provenance.source_fact_ids.length > 0 && (
                    <span
                      data-testid="bullet-provenance-ids"
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-gray-700 border border-emerald-200"
                    >
                      Source: {result.provenance.source_fact_ids.join(', ')}
                    </span>
                  )}
                </div>

                <p
                  data-testid="bullet-rewritten-text"
                  className="text-xs text-gray-900 font-medium leading-relaxed bg-white p-2.5 rounded-lg border border-emerald-200/80"
                >
                  {result.rewrittenBullet}
                </p>

                {result.provenance.userEnteredMetric && (
                  <p className="text-[11px] text-emerald-800">
                    Includes user-verified metric:{' '}
                    <strong>{result.provenance.userEnteredMetric}</strong>
                  </p>
                )}

                <button
                  type="button"
                  data-testid="apply-rewritten-bullet-btn"
                  onClick={handleApplySuggestion}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <CheckIcon className="h-4 w-4" />
                  Apply to Resume
                </button>
              </div>
            )}

            {/* Real Metrics Prompt when numbers are missing */}
            {shouldPromptForMetrics && (
              <div
                data-testid="bullet-metrics-prompt"
                className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 space-y-2.5"
              >
                <div className="flex items-start gap-2">
                  <ChartBarIcon className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-amber-900">
                      Add real measurable impact (never invented)
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      {result?.metricPrompts?.[0] ||
                        'This bullet has no numeric metrics yet. Enter a real metric you achieved to strengthen impact.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {METRIC_OUTCOME_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setMetricCategory(chip)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                        metricCategory === chip
                          ? 'bg-amber-700 text-white border-amber-700'
                          : 'bg-white text-amber-900 border-amber-300 hover:bg-amber-100'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    data-testid="bullet-user-metric-input"
                    aria-label="Enter real metric"
                    value={userMetric}
                    onChange={(e) => setUserMetric(e.target.value)}
                    placeholder="e.g. 38% or 120K daily requests"
                    className="flex-1 px-2.5 py-1.5 text-xs border border-amber-300 rounded-lg bg-white text-gray-900"
                  />
                  <button
                    type="button"
                    data-testid="apply-metric-rewrite-btn"
                    disabled={!userMetric.trim() || rewritingAction !== null}
                    onClick={() => void runRewrite('improve', true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold disabled:opacity-50 shrink-0"
                  >
                    Incorporate
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default BulletAssistantDrawer;
