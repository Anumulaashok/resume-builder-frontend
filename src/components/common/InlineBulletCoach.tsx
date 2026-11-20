import React, { useEffect, useMemo, useState } from "react";
import { IResume } from "../../types/resume";
import { resumeService } from "../../services/resume.service";
import {
  analyzeBulletText,
  BulletCoachAction,
  BulletCoachResult,
  coachBulletLocally,
  insertUserMetricIntoBullet,
  XYZ_IMPACT_PROMPTS,
  XyzPromptLabel,
} from "../../utils/bulletCoach";

interface HistoryEntry {
  text: string;
  sourceFactIds?: string[];
}

export interface InlineBulletCoachProps {
  value: string;
  onChange: (nextValue: string, sourceFactIds?: string[]) => void;
  isFocused?: boolean;
  resumeId?: string;
  resumeContext?: Partial<IResume> | null;
  sectionType?: string;
  fieldKey?: string;
  itemContext?: Record<string, any>;
  existingSourceFactIds?: string[];
  idPrefix?: string;
}

export const InlineBulletCoach: React.FC<InlineBulletCoachProps> = ({
  value,
  onChange,
  isFocused = false,
  resumeId,
  resumeContext,
  sectionType,
  fieldKey,
  itemContext,
  existingSourceFactIds,
  idPrefix = "bullet-coach",
}) => {
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [activeAction, setActiveAction] = useState<BulletCoachAction | null>(
    null
  );
  const [previewResult, setPreviewResult] = useState<BulletCoachResult | null>(
    null
  );
  const [coachError, setCoachError] = useState<string | null>(null);
  const [isXyzOpen, setIsXyzOpen] = useState<boolean>(false);
  const [selectedPrompt, setSelectedPrompt] =
    useState<XyzPromptLabel>("Reduced latency");
  const [metricValue, setMetricValue] = useState<string>("");
  const [metricError, setMetricError] = useState<string | null>(null);

  const analysis = useMemo(() => analyzeBulletText(value), [value]);

  useEffect(() => {
    if (isFocused && !analysis.hasMetrics) {
      setIsXyzOpen(true);
    }
  }, [isFocused, analysis.hasMetrics]);

  const activePromptDef =
    XYZ_IMPACT_PROMPTS.find((p) => p.label === selectedPrompt) ||
    XYZ_IMPACT_PROMPTS[0];

  const hasText = Boolean(value && value.trim().length > 0);
  const isBusy = activeAction !== null;

  const handleAction = async (action: BulletCoachAction) => {
    if (!hasText || isBusy) return;
    setCoachError(null);
    setActiveAction(action);

    const priorEntry: HistoryEntry = {
      text: value,
      sourceFactIds: existingSourceFactIds,
    };

    const userMetricPayload =
      metricValue.trim() && /\d/.test(metricValue)
        ? { category: selectedPrompt, value: metricValue.trim() }
        : undefined;

    try {
      let result: BulletCoachResult | undefined;
      if (typeof (resumeService as any)?.coachBullet === "function") {
        try {
          result = await resumeService.coachBullet({
            resumeId,
            text: value,
            action,
            sectionType,
            fieldKey,
            itemContext,
            resumeContext: resumeId ? undefined : resumeContext || undefined,
            userMetric: userMetricPayload,
          });
        } catch {
          result = coachBulletLocally({
            text: value,
            action,
            sectionType,
            fieldKey,
            itemContext,
            resume: resumeContext,
            userMetric: userMetricPayload,
          });
        }
      } else {
        result = coachBulletLocally({
          text: value,
          action,
          sectionType,
          fieldKey,
          itemContext,
          resume: resumeContext,
          userMetric: userMetricPayload,
        });
      }

      if (!result || !result.rewrittenText) {
        setCoachError("Could not generate a grounded rewrite.");
        return;
      }

      setUndoStack((prev) => [...prev, priorEntry]);
      setPreviewResult(result);
      if (userMetricPayload) {
        setMetricValue("");
        setIsXyzOpen(false);
      }
      onChange(result.rewrittenText, result.source_fact_ids);
    } finally {
      setActiveAction(null);
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isBusy) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setPreviewResult(null);
    setCoachError(null);
    onChange(previous.text, previous.sourceFactIds);
  };

  const handleInsertMetric = () => {
    setMetricError(null);
    const trimmedMetric = metricValue.trim();
    if (!trimmedMetric || !/\d/.test(trimmedMetric)) {
      setMetricError("Enter a real number (e.g. 35%, 120ms, or $12K).");
      return;
    }

    const applied = insertUserMetricIntoBullet(
      value,
      selectedPrompt,
      trimmedMetric
    );
    if (!applied) {
      setMetricError("Enter a real number (e.g. 35%, 120ms, or $12K).");
      return;
    }

    setUndoStack((prev) => [
      ...prev,
      { text: value, sourceFactIds: existingSourceFactIds },
    ]);
    const nextFacts = Array.from(
      new Set([...(existingSourceFactIds || []), applied.sourceFactId])
    );
    onChange(applied.updatedText, nextFacts);
    setMetricValue("");
    setIsXyzOpen(false);
  };

  return (
    <div
      data-testid={`${idPrefix}-bar`}
      className="mt-2 space-y-2 text-xs text-gray-700"
    >
      {/* Compact inline action row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            data-testid={`${idPrefix}-rewrite-btn`}
            disabled={!hasText || isBusy}
            onClick={() => {
              void handleAction("rewrite");
            }}
            className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-neutral-50 font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-45 disabled:pointer-events-none transition-colors"
          >
            {activeAction === "rewrite" ? "Rewriting…" : "Rewrite"}
          </button>

          <button
            type="button"
            data-testid={`${idPrefix}-shorten-btn`}
            disabled={!hasText || isBusy}
            onClick={() => {
              void handleAction("shorten");
            }}
            className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-neutral-50 font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-45 disabled:pointer-events-none transition-colors"
          >
            {activeAction === "shorten" ? "Shortening…" : "Shorten"}
          </button>

          <button
            type="button"
            data-testid={`${idPrefix}-improve-btn`}
            disabled={!hasText || isBusy}
            onClick={() => {
              void handleAction("improve");
            }}
            className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-neutral-50 font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-45 disabled:pointer-events-none transition-colors"
          >
            {activeAction === "improve" ? "Improving…" : "Improve"}
          </button>

          <button
            type="button"
            aria-label="Undo bullet edit"
            data-testid={`${idPrefix}-undo-btn`}
            disabled={undoStack.length === 0 || isBusy}
            onClick={handleUndo}
            className="inline-flex items-center px-2.5 py-1 rounded-md border border-gray-200 bg-white font-medium text-gray-600 hover:bg-neutral-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            Undo
          </button>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1.5">
          {!analysis.hasMetrics ? (
            <button
              type="button"
              data-testid={`${idPrefix}-missing-metric-flag`}
              onClick={() => setIsXyzOpen((prev) => !prev)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium transition-colors"
            >
              <span>Needs metric · X-Y-Z</span>
            </button>
          ) : (
            <span
              data-testid={`${idPrefix}-verified-metric-badge`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium"
            >
              Quantified
            </span>
          )}

          {!analysis.isConcise && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {analysis.wordCount} words · Try Shorten
            </span>
          )}
        </div>
      </div>

      {/* X-Y-Z metric prompt panel when bullet lacks numbers */}
      {isXyzOpen && !analysis.hasMetrics && (
        <div
          data-testid={`${idPrefix}-xyz-panel`}
          className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="font-medium text-amber-900">
              Add measurable impact (X-Y-Z) — enter a real number, never fabricated:
            </span>
            <button
              type="button"
              onClick={() => setIsXyzOpen(false)}
              className="text-amber-700 hover:text-amber-900 px-1 font-medium"
            >
              Dismiss
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {XYZ_IMPACT_PROMPTS.map((prompt) => {
              const isSelected = selectedPrompt === prompt.label;
              return (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => {
                    setSelectedPrompt(prompt.label);
                    setMetricError(null);
                  }}
                  className={`px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    isSelected
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-amber-900 border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  {prompt.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              aria-label={`Enter real metric for ${selectedPrompt}`}
              data-testid={`${idPrefix}-xyz-input`}
              value={metricValue}
              onChange={(e) => {
                setMetricValue(e.target.value);
                if (metricError) setMetricError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.stopPropagation();
                  handleInsertMetric();
                }
              }}
              placeholder={activePromptDef.placeholder}
              className="flex-1 min-w-[150px] px-2.5 py-1 text-xs text-gray-900 bg-white border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              data-testid={`${idPrefix}-xyz-apply-btn`}
              onClick={handleInsertMetric}
              className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
            >
              Insert metric
            </button>
          </div>

          {metricError && (
            <p className="text-red-600 font-medium" role="alert">
              {metricError}
            </p>
          )}
        </div>
      )}

      {/* Grounded rewrite preview & source_fact_ids provenance banner */}
      {previewResult && (
        <div
          data-testid={`${idPrefix}-preview`}
          className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 space-y-1.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-blue-900 capitalize">
              Grounded {previewResult.action} applied
            </span>
            <button
              type="button"
              onClick={() => setPreviewResult(null)}
              className="text-blue-700 hover:text-blue-900 font-medium"
            >
              Keep rewrite
            </button>
          </div>

          <p className="text-gray-800 leading-relaxed">
            {previewResult.rewrittenText}
          </p>

          {Array.isArray(previewResult.source_fact_ids) &&
            previewResult.source_fact_ids.length > 0 && (
              <div
                data-testid={`${idPrefix}-source-facts`}
                className="flex flex-wrap items-center gap-1 pt-0.5"
              >
                <span className="text-[11px] font-medium text-blue-800">
                  Verified facts:
                </span>
                {previewResult.source_fact_ids.map((factId) => (
                  <span
                    key={factId}
                    className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-blue-200 text-[11px] font-mono text-blue-700"
                  >
                    {factId}
                  </span>
                ))}
              </div>
            )}
        </div>
      )}

      {coachError && (
        <p className="text-red-600 font-medium" role="alert">
          {coachError}
        </p>
      )}
    </div>
  );
};

export default InlineBulletCoach;
