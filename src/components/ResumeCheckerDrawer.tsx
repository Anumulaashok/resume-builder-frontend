import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type {
  CategoryId,
  IssueSeverity,
  ResumeCheckCategory,
  ResumeCheckIssue,
  ResumeCheckResult,
  ResumeGrade,
} from '../utils/resumeChecker';

export interface GradeTone {
  stroke: string;
  badgeClass: string;
  pillClass: string;
  barClass: string;
  ringBg: string;
  label: string;
}

export function getGradeTone(grade: ResumeGrade): GradeTone {
  switch (grade) {
    case 'A':
      return {
        stroke: '#059669',
        badgeClass:
          'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300',
        pillClass:
          'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        barClass: 'bg-emerald-500',
        ringBg: 'from-emerald-50/70 to-white',
        label: 'Excellent',
      };
    case 'B':
      return {
        stroke: '#2563eb',
        badgeClass:
          'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-300',
        pillClass:
          'bg-primary-50 text-primary-700 ring-1 ring-inset ring-primary-200',
        barClass: 'bg-primary-600',
        ringBg: 'from-primary-50/70 to-white',
        label: 'Strong',
      };
    case 'C':
      return {
        stroke: '#d97706',
        badgeClass:
          'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300',
        pillClass:
          'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
        barClass: 'bg-amber-500',
        ringBg: 'from-amber-50/70 to-white',
        label: 'Fair',
      };
    case 'D':
      return {
        stroke: '#ea580c',
        badgeClass:
          'bg-orange-100 text-orange-900 ring-1 ring-inset ring-orange-300',
        pillClass:
          'bg-orange-50 text-orange-800 ring-1 ring-inset ring-orange-200',
        barClass: 'bg-orange-500',
        ringBg: 'from-orange-50/70 to-white',
        label: 'Needs work',
      };
    case 'F':
    default:
      return {
        stroke: '#dc2626',
        badgeClass:
          'bg-red-100 text-red-800 ring-1 ring-inset ring-red-300',
        pillClass: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200',
        barClass: 'bg-red-500',
        ringBg: 'from-red-50/70 to-white',
        label: 'Critical gaps',
      };
  }
}

function getCategoryBarColor(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-primary-600';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

const SEVERITY_CONFIG: Array<{
  severity: IssueSeverity;
  title: string;
  subtitle: string;
  headerBg: string;
  badgeBg: string;
  borderClass: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  iconColor: string;
}> = [
  {
    severity: 'critical',
    title: 'Critical',
    subtitle: 'High-impact blockers for ATS parsing or screening',
    headerBg: 'bg-red-50/70 hover:bg-red-50',
    badgeBg: 'bg-red-100 text-red-800 ring-1 ring-inset ring-red-200',
    borderClass: 'border-red-200/90',
    Icon: ExclamationCircleIcon,
    iconColor: 'text-red-600',
  },
  {
    severity: 'warning',
    title: 'Warnings',
    subtitle: 'Important content, metric, or formatting improvements',
    headerBg: 'bg-amber-50/70 hover:bg-amber-50',
    badgeBg: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200',
    borderClass: 'border-amber-200/90',
    Icon: ExclamationTriangleIcon,
    iconColor: 'text-amber-600',
  },
  {
    severity: 'tip',
    title: 'Tips',
    subtitle: 'Optional polish & regional best practices',
    headerBg: 'bg-blue-50/60 hover:bg-blue-50',
    badgeBg: 'bg-blue-100 text-blue-800 ring-1 ring-inset ring-blue-200',
    borderClass: 'border-blue-200/80',
    Icon: LightBulbIcon,
    iconColor: 'text-blue-600',
  },
];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface EnrichedIssue extends ResumeCheckIssue {
  categoryId: CategoryId;
  categoryLabel: string;
}

export interface ResumeCheckerDrawerProps {
  isOpen: boolean;
  result: ResumeCheckResult;
  onClose: () => void;
  onSelectIssue?: (issue: ResumeCheckIssue) => void;
  onEditIssueInForm?: (issue: ResumeCheckIssue) => void;
}

function OverallScoreRing({
  score,
  grade,
}: {
  score: number;
  grade: ResumeGrade;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const tone = getGradeTone(grade);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full p-2 bg-gradient-to-b ${tone.ringBg} ring-1 ring-inset ring-neutral-200/80 shrink-0`}
    >
      <svg
        viewBox="0 0 116 116"
        className="w-28 h-28"
        role="img"
        data-testid="ats-overall-score-ring"
        aria-label={`Overall ATS score ${clamped} out of 100, grade ${grade}`}
      >
        <circle
          cx="58"
          cy="58"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="9"
        />
        <circle
          cx="58"
          cy="58"
          r={radius}
          fill="none"
          stroke={tone.stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
          transform="rotate(-90 58 58)"
          style={{ transition: 'stroke-dashoffset 450ms ease' }}
        />
        <text
          x="58"
          y="55"
          textAnchor="middle"
          className="fill-neutral-900"
          style={{
            fontSize: 26,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {clamped}
        </text>
        <text
          x="58"
          y="73"
          textAnchor="middle"
          className="fill-neutral-500"
          style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1 }}
        >
          GRADE {grade}
        </text>
      </svg>
    </div>
  );
}

export const ResumeCheckerDrawer: React.FC<ResumeCheckerDrawerProps> = ({
  isOpen,
  result,
  onClose,
  onSelectIssue,
  onEditIssueInForm,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const skipRestoreFocusRef = useRef(false);

  const [expandedGroups, setExpandedGroups] = useState<
    Record<IssueSeverity, boolean>
  >({
    critical: true,
    warning: true,
    tip: true,
  });

  const [expandedIssueIds, setExpandedIssueIds] = useState<
    Record<string, boolean>
  >({});

  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<CategoryId | null>(null);

  // Capture focus on open, focus close button, and restore focus on close
  useEffect(() => {
    if (isOpen) {
      skipRestoreFocusRef.current = false;
      if (
        typeof document !== 'undefined' &&
        document.activeElement instanceof HTMLElement
      ) {
        previousActiveElementRef.current = document.activeElement;
      }
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    }

    if (
      !skipRestoreFocusRef.current &&
      previousActiveElementRef.current &&
      typeof document !== 'undefined' &&
      document.body.contains(previousActiveElementRef.current)
    ) {
      previousActiveElementRef.current.focus();
    }
    previousActiveElementRef.current = null;
    return undefined;
  }, [isOpen]);

  // Escape key & Tab / Shift+Tab focus trap
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab' && drawerRef.current) {
        const nodes = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(
          (el) =>
            !el.hasAttribute('disabled') &&
            el.getAttribute('aria-hidden') !== 'true'
        );

        if (nodes.length === 0) {
          event.preventDefault();
          return;
        }

        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        const insideDrawer = active ? drawerRef.current.contains(active) : false;

        if (event.shiftKey) {
          if (!insideDrawer || active === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (!insideDrawer || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const enrichedIssues = useMemo<EnrichedIssue[]>(() => {
    const list: EnrichedIssue[] = [];
    result.categories.forEach((cat) => {
      if (selectedCategoryFilter && cat.id !== selectedCategoryFilter) {
        return;
      }
      cat.issues.forEach((issue) => {
        list.push({
          ...issue,
          categoryId: cat.id,
          categoryLabel: cat.label,
        });
      });
    });
    return list;
  }, [result.categories, selectedCategoryFilter]);

  const groupedBySeverity = useMemo(() => {
    const groups: Record<IssueSeverity, EnrichedIssue[]> = {
      critical: [],
      warning: [],
      tip: [],
    };
    enrichedIssues.forEach((issue) => {
      groups[issue.severity].push(issue);
    });
    return groups;
  }, [enrichedIssues]);

  const totalCounts = useMemo(() => {
    let critical = 0;
    let warning = 0;
    let tip = 0;
    result.categories.forEach((cat) => {
      cat.issues.forEach((iss) => {
        if (iss.severity === 'critical') critical += 1;
        else if (iss.severity === 'warning') warning += 1;
        else tip += 1;
      });
    });
    return {
      critical,
      warning,
      tip,
      total: critical + warning + tip,
    };
  }, [result.categories]);

  if (!isOpen) {
    return null;
  }

  const gradeTone = getGradeTone(result.grade);

  const toggleGroup = (severity: IssueSeverity) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [severity]: !prev[severity],
    }));
  };

  const handleIssueClick = (issue: EnrichedIssue) => {
    setExpandedIssueIds((prev) => ({
      ...prev,
      [issue.id]: !prev[issue.id],
    }));
    if ((issue.sectionId || issue.itemId) && onSelectIssue) {
      onSelectIssue(issue);
    }
  };

  const handleEditInFormClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    issue: EnrichedIssue
  ) => {
    e.stopPropagation();
    skipRestoreFocusRef.current = true;
    if (onEditIssueInForm) {
      onEditIssueInForm(issue);
    } else if (onSelectIssue) {
      onSelectIssue(issue);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end print:hidden"
      data-testid="ats-checker-drawer-root"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        data-testid="ats-checker-backdrop"
        onClick={onClose}
      />

      {/* Right-Side Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ats-checker-drawer-title"
        data-testid="ats-checker-drawer"
        className="relative z-10 w-full max-w-xl h-full bg-white shadow-modal border-l border-neutral-200 flex flex-col overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="shrink-0 px-4 sm:px-6 py-3.5 border-b border-neutral-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-600 ring-1 ring-inset ring-primary-100">
              <ShieldCheckIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="ats-checker-drawer-title"
                  className="text-base sm:text-lg font-semibold text-neutral-900 truncate"
                >
                  ATS &amp; Resume Quality Check
                </h2>
                <span
                  data-testid="ats-drawer-grade-pill"
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${gradeTone.pillClass}`}
                >
                  Grade {result.grade}
                </span>
              </div>
              <p className="text-xs text-neutral-500 truncate">
                Rule-based audit · updates live as you edit
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close ATS check drawer"
            data-testid="close-ats-checker-btn"
            className="p-2 rounded-control text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors focus-ring shrink-0"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Drawer Content */}
        <div className="flex-1 min-h-0 overflow-y-auto bg-neutral-50/70 p-4 sm:p-6 space-y-5">
          {/* Overall Score Card */}
          <section
            aria-label="Overall ATS score summary"
            className="bg-white rounded-card border border-neutral-200 shadow-card p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-5"
          >
            <OverallScoreRing score={result.score} grade={result.grade} />

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="text-base font-semibold text-neutral-900">
                  {gradeTone.label}
                </span>
                <span className="text-xs text-neutral-500 tabular-nums">
                  ({result.score}/100 weighted)
                </span>
              </div>

              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                {totalCounts.total === 0
                  ? 'Every contact, content, metric, language, and ATS formatting check passed.'
                  : `${totalCounts.total} actionable item${
                      totalCounts.total === 1 ? '' : 's'
                    } found. Click any linked issue to highlight it in the editor.`}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-inset ring-red-200">
                  {totalCounts.critical} critical
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200">
                  {totalCounts.warning} warning{totalCounts.warning === 1 ? '' : 's'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200">
                  {totalCounts.tip} tip{totalCounts.tip === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </section>

          {/* Category Breakdown List */}
          <section
            aria-label="Category scores"
            data-testid="ats-category-list"
            className="bg-white rounded-card border border-neutral-200 shadow-card p-4 sm:p-5 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Categories
              </h3>
              {selectedCategoryFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 focus-ring rounded px-1"
                >
                  Show all categories
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {result.categories.map((cat: ResumeCheckCategory) => {
                const isActive = selectedCategoryFilter === cat.id;
                const issueCount = cat.issues.length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    data-testid={`ats-category-card-${cat.id}`}
                    aria-pressed={isActive}
                    onClick={() =>
                      setSelectedCategoryFilter((prev) =>
                        prev === cat.id ? null : cat.id
                      )
                    }
                    className={`text-left p-3 rounded-control border transition-colors focus-ring ${
                      isActive
                        ? 'bg-primary-50/70 border-primary-300 ring-1 ring-inset ring-primary-200'
                        : 'bg-neutral-50/50 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-neutral-900 truncate">
                        {cat.label}
                      </span>
                      <span
                        data-testid={`ats-category-score-${cat.id}`}
                        className="text-xs font-bold tabular-nums text-neutral-800 shrink-0"
                      >
                        {cat.score}/100
                      </span>
                    </div>

                    <div
                      role="progressbar"
                      aria-label={`${cat.label} score`}
                      aria-valuenow={cat.score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      className="h-1.5 rounded-full bg-neutral-200/80 overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full ${getCategoryBarColor(
                          cat.score
                        )}`}
                        style={{
                          width: `${cat.score}%`,
                          transition: 'width 350ms ease',
                        }}
                      />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-neutral-500">
                      <span>Weight {Math.round(cat.weight * 100)}%</span>
                      {issueCount === 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 font-medium">
                          <CheckCircleIcon
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Passed
                        </span>
                      ) : (
                        <span>
                          {issueCount} issue{issueCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Issues Grouped by Severity */}
          <section
            aria-label="Issues grouped by severity"
            data-testid="ats-issues-by-severity"
            className="space-y-3"
          >
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 px-0.5">
              Actionable Issues
              {selectedCategoryFilter ? ' (Filtered)' : ''}
            </h3>

            {enrichedIssues.length === 0 ? (
              <div
                data-testid="ats-zero-issues-state"
                className="bg-white rounded-card border border-emerald-200 p-6 text-center shadow-card"
              >
                <CheckCircleIcon
                  className="h-9 w-9 text-emerald-600 mx-auto mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold text-neutral-900">
                  No issues found!
                </p>
                <p className="text-xs text-neutral-600 mt-1">
                  {selectedCategoryFilter
                    ? 'This category passes all ATS and content quality checks.'
                    : 'Your resume meets every rule in our ATS & content checklist.'}
                </p>
              </div>
            ) : (
              SEVERITY_CONFIG.map((cfg) => {
                const groupIssues = groupedBySeverity[cfg.severity];
                if (groupIssues.length === 0) {
                  return null;
                }
                const isGroupOpen = expandedGroups[cfg.severity];
                const IconComponent = cfg.Icon;

                return (
                  <div
                    key={cfg.severity}
                    data-testid={`ats-severity-group-${cfg.severity}`}
                    className={`bg-white rounded-card border ${cfg.borderClass} shadow-card overflow-hidden`}
                  >
                    <button
                      type="button"
                      aria-expanded={isGroupOpen}
                      data-testid={`ats-severity-toggle-${cfg.severity}`}
                      onClick={() => toggleGroup(cfg.severity)}
                      className={`w-full px-4 py-3 flex items-center justify-between gap-3 text-left transition-colors focus-ring ${cfg.headerBg}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <IconComponent
                          className={`h-5 w-5 shrink-0 ${cfg.iconColor}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-neutral-900">
                              {cfg.title}
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeBg}`}
                            >
                              {groupIssues.length}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate">
                            {cfg.subtitle}
                          </p>
                        </div>
                      </div>

                      <ChevronDownIcon
                        className={`h-4 w-4 text-neutral-500 shrink-0 transition-transform ${
                          isGroupOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isGroupOpen && (
                      <div className="divide-y divide-neutral-100">
                        {groupIssues.map((issue) => {
                          const isExpanded = Boolean(
                            expandedIssueIds[issue.id]
                          );
                          const hasLocation = Boolean(
                            issue.sectionId || issue.itemId
                          );

                          return (
                            <div
                              key={issue.id}
                              data-testid={`ats-issue-${issue.id}`}
                              className="p-3.5 sm:p-4 hover:bg-neutral-50/70 transition-colors"
                            >
                              <button
                                type="button"
                                aria-expanded={isExpanded}
                                data-testid={`ats-issue-btn-${issue.id}`}
                                onClick={() => handleIssueClick(issue)}
                                className="w-full text-left flex items-start justify-between gap-3 focus-ring rounded"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700">
                                      {issue.categoryLabel}
                                    </span>
                                    {hasLocation && (
                                      <span className="text-[11px] font-medium text-primary-600 inline-flex items-center gap-0.5">
                                        <span>Highlight in form</span>
                                        <ArrowRightIcon
                                          className="h-3 w-3"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs sm:text-sm font-medium text-neutral-900 leading-snug">
                                    {issue.message}
                                  </p>
                                </div>

                                {issue.fix && (
                                  <ChevronDownIcon
                                    className={`h-4 w-4 text-neutral-400 shrink-0 mt-1 transition-transform ${
                                      isExpanded ? 'rotate-180' : ''
                                    }`}
                                    aria-hidden="true"
                                  />
                                )}
                              </button>

                              {isExpanded && issue.fix && (
                                <div
                                  data-testid={`ats-issue-fix-${issue.id}`}
                                  className="mt-2.5 pl-3 border-l-2 border-primary-300 bg-primary-50/40 rounded-r py-2 pr-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <p className="text-xs text-neutral-700 leading-relaxed">
                                    <strong className="font-semibold text-neutral-900">
                                      How to fix:{' '}
                                    </strong>
                                    {issue.fix}
                                  </p>

                                  {hasLocation && onEditIssueInForm && (
                                    <button
                                      type="button"
                                      data-testid={`ats-issue-edit-btn-${issue.id}`}
                                      onClick={(e) =>
                                        handleEditInFormClick(e, issue)
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-control bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium shrink-0 transition-colors focus-ring"
                                    >
                                      <span>Edit field</span>
                                      <ArrowRightIcon
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ResumeCheckerDrawer;
