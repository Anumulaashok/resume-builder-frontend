import { useEffect, useMemo, useRef, useState } from 'react';
import type { IResume } from '../types/resume';
import {
  checkResume,
  ResumeCheckResult,
  ResumeCheckThemeInput,
} from '../utils/resumeChecker';

function buildCheckCacheKey(
  resume: IResume,
  theme?: ResumeCheckThemeInput
): string {
  return JSON.stringify({
    summary: resume?.summary ?? '',
    templateId: theme?.templateId ?? resume?.templateId ?? '',
    themeConfig: resume?.themeConfig ?? null,
    content: resume?.content ?? null,
    atsMode: theme?.atsMode ?? false,
    pageCount: theme?.pageCount ?? null,
    templateLayout: theme?.templateLayout ?? null,
    hasTables: theme?.hasTables ?? null,
    hasIcons: theme?.hasIcons ?? null,
  });
}

/**
 * Memoised, live-recomputing resume quality / ATS check hook.
 * Computes synchronously on initial mount so toolbar badges never flash empty,
 * and debounces subsequent edits by `debounceMs` (default 300ms).
 */
export function useResumeCheck(
  resume: IResume,
  theme?: ResumeCheckThemeInput,
  debounceMs = 300
): ResumeCheckResult {
  const cacheKey = useMemo(
    () => buildCheckCacheKey(resume, theme),
    [resume, theme]
  );

  const lastComputedRef = useRef<{
    key: string;
    result: ResumeCheckResult;
  } | null>(null);

  const initialResult = useMemo(() => {
    if (lastComputedRef.current && lastComputedRef.current.key === cacheKey) {
      return lastComputedRef.current.result;
    }
    if (!lastComputedRef.current) {
      const computed = checkResume(resume, theme);
      lastComputedRef.current = { key: cacheKey, result: computed };
      return computed;
    }
    return lastComputedRef.current.result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [result, setResult] = useState<ResumeCheckResult>(initialResult);
  const latestInputsRef = useRef<{
    resume: IResume;
    theme?: ResumeCheckThemeInput;
    key: string;
  }>({ resume, theme, key: cacheKey });
  latestInputsRef.current = { resume, theme, key: cacheKey };

  useEffect(() => {
    if (lastComputedRef.current && lastComputedRef.current.key === cacheKey) {
      return;
    }

    const timer = setTimeout(() => {
      const current = latestInputsRef.current;
      if (
        lastComputedRef.current &&
        lastComputedRef.current.key === current.key
      ) {
        return;
      }
      const next = checkResume(current.resume, current.theme);
      lastComputedRef.current = { key: current.key, result: next };
      setResult(next);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [cacheKey, debounceMs]);

  return result;
}
