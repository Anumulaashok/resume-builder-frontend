import { useReducer, useCallback, useRef } from 'react';
import { defaultResume } from '../constants/editorConstants';
import { IResume } from '../types/resume';

export const MAX_HISTORY = 50;
export const THEME_COALESCE_MS = 400;

export interface HistoryState {
  history: IResume[];
  index: number;
}

export type ResumeUpdateAction = IResume | ((prev: IResume) => IResume);

export interface SetResumeOptions {
  replace?: boolean;
}

export type HistoryAction =
  | { type: 'PUSH'; payload: ResumeUpdateAction }
  | { type: 'REPLACE'; payload: ResumeUpdateAction }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const clampIndex = (index: number, length: number): number => {
  if (length <= 0) {
    return 0;
  }
  const normalizedIndex = Number.isFinite(index) ? Math.trunc(index) : 0;
  return Math.min(Math.max(normalizedIndex, 0), length - 1);
};

const findLastValidSnapshot = (history: IResume[]): IResume | undefined => {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i] !== undefined && history[i] !== null) {
      return history[i];
    }
  }
  return undefined;
};

const KNOWN_RESUME_KEYS = new Set([
  '_id',
  'id',
  'title',
  'summary',
  'templateId',
  'template',
  'themeConfig',
  'sharing',
  'content',
]);

function areBasicsUnchanged(
  prevBasics?: IResume['content']['basics'],
  nextBasics?: IResume['content']['basics']
): boolean {
  if (prevBasics === nextBasics) {
    return true;
  }
  const a = (prevBasics || {}) as Record<string, unknown>;
  const b = (nextBasics || {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of Array.from(keys)) {
    if (key === 'summary') {
      if ((a.summary ?? '') !== (b.summary ?? '')) {
        return false;
      }
      continue;
    }
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function getThemeBurstKey(prev: IResume, next: IResume): string | null {
  if (!prev || !next) {
    return null;
  }
  if (
    prev._id !== next._id ||
    prev.id !== next.id ||
    prev.title !== next.title ||
    (prev.summary ?? '') !== (next.summary ?? '') ||
    prev.templateId !== next.templateId ||
    (prev as unknown as Record<string, unknown>).template !==
      (next as unknown as Record<string, unknown>).template ||
    prev.sharing !== next.sharing ||
    prev.content?.sections !== next.content?.sections ||
    prev.content?.sectionOrder !== next.content?.sectionOrder ||
    !areBasicsUnchanged(prev.content?.basics, next.content?.basics)
  ) {
    return null;
  }

  const prevRecord = prev as unknown as Record<string, unknown>;
  const nextRecord = next as unknown as Record<string, unknown>;
  const extraKeys = new Set([
    ...Object.keys(prevRecord),
    ...Object.keys(nextRecord),
  ]);
  for (const key of Array.from(extraKeys)) {
    if (!KNOWN_RESUME_KEYS.has(key) && prevRecord[key] !== nextRecord[key]) {
      return null;
    }
  }

  if (prev.themeConfig === next.themeConfig) {
    return null;
  }

  const prevTheme = (prev.themeConfig || {}) as Record<string, unknown>;
  const nextTheme = (next.themeConfig || {}) as Record<string, unknown>;
  const themeKeys = new Set([
    ...Object.keys(prevTheme),
    ...Object.keys(nextTheme),
  ]);
  const changedKeys: string[] = [];
  for (const key of Array.from(themeKeys)) {
    if (prevTheme[key] !== nextTheme[key]) {
      changedKeys.push(key);
    }
  }

  if (changedKeys.length === 0) {
    return '';
  }

  if (
    changedKeys.every((key) => key === 'primaryColor' || key === 'headingColor')
  ) {
    return 'primaryColor';
  }

  return changedKeys.sort().join(',');
}

export function historyReducer(
  state: HistoryState,
  action: HistoryAction
): HistoryState {
  switch (action.type) {
    case 'PUSH': {
      const safeCurrentIndex = clampIndex(state.index, state.history.length);
      const currentState =
        state.history[safeCurrentIndex] ??
        findLastValidSnapshot(state.history) ??
        defaultResume;
      const resolvedNext =
        typeof action.payload === 'function'
          ? action.payload(currentState)
          : action.payload;
      const nextState = resolvedNext ?? currentState;

      const truncatedHistory =
        state.history.length > 0
          ? state.history
              .slice(0, safeCurrentIndex + 1)
              .filter((entry): entry is IResume => entry !== undefined && entry !== null)
          : [];
      const appendedHistory = [...truncatedHistory, nextState];
      const cappedHistory =
        appendedHistory.length > MAX_HISTORY
          ? appendedHistory.slice(appendedHistory.length - MAX_HISTORY)
          : appendedHistory;

      return {
        history: cappedHistory,
        index: clampIndex(cappedHistory.length - 1, cappedHistory.length),
      };
    }
    case 'REPLACE': {
      const safeCurrentIndex = clampIndex(state.index, state.history.length);
      const currentState =
        state.history[safeCurrentIndex] ??
        findLastValidSnapshot(state.history) ??
        defaultResume;
      const resolvedNext =
        typeof action.payload === 'function'
          ? action.payload(currentState)
          : action.payload;
      const nextState = resolvedNext ?? currentState;

      const precedingHistory =
        state.history.length > 0
          ? state.history
              .slice(0, safeCurrentIndex)
              .filter((entry): entry is IResume => entry !== undefined && entry !== null)
          : [];
      const replacedHistory = [...precedingHistory, nextState];
      const cappedHistory =
        replacedHistory.length > MAX_HISTORY
          ? replacedHistory.slice(replacedHistory.length - MAX_HISTORY)
          : replacedHistory;

      return {
        history: cappedHistory,
        index: clampIndex(cappedHistory.length - 1, cappedHistory.length),
      };
    }
    case 'UNDO': {
      const safeCurrentIndex = clampIndex(state.index, state.history.length);
      const nextIndex = clampIndex(safeCurrentIndex - 1, state.history.length);
      if (nextIndex === state.index) {
        return state;
      }
      return {
        ...state,
        index: nextIndex,
      };
    }
    case 'REDO': {
      const safeCurrentIndex = clampIndex(state.index, state.history.length);
      const nextIndex = clampIndex(safeCurrentIndex + 1, state.history.length);
      if (nextIndex === state.index) {
        return state;
      }
      return {
        ...state,
        index: nextIndex,
      };
    }
    default:
      return state;
  }
}

export function useResumeHistory(initialState: IResume) {
  const fallbackRef = useRef<IResume>(initialState ?? defaultResume);
  const shadowStateRef = useRef<HistoryState>({
    history: [initialState ?? defaultResume],
    index: 0,
  });
  const burstRef = useRef<{ key: string; timestamp: number } | null>(null);

  const [state, dispatch] = useReducer(
    historyReducer,
    initialState,
    (init): HistoryState => ({
      history: [init ?? defaultResume],
      index: 0,
    })
  );

  const setResume = useCallback(
    (action: ResumeUpdateAction, options?: SetResumeOptions) => {
      const currentHistoryState = shadowStateRef.current;
      const safeCurrentIndex = clampIndex(
        currentHistoryState.index,
        currentHistoryState.history.length
      );
      const currentResume =
        currentHistoryState.history[safeCurrentIndex] ??
        findLastValidSnapshot(currentHistoryState.history) ??
        fallbackRef.current;
      const resolvedNext =
        typeof action === 'function' ? action(currentResume) : action;
      const nextResume = resolvedNext ?? currentResume;
      const now = Date.now();

      let shouldReplace = false;

      if (options?.replace) {
        shouldReplace = safeCurrentIndex > 0;
        burstRef.current = null;
      } else {
        const themeKey = getThemeBurstKey(currentResume, nextResume);
        if (themeKey !== null) {
          if (themeKey === '') {
            if (
              burstRef.current !== null &&
              now - burstRef.current.timestamp <= THEME_COALESCE_MS &&
              safeCurrentIndex > 0
            ) {
              shouldReplace = true;
              burstRef.current = {
                key: burstRef.current.key,
                timestamp: now,
              };
            } else {
              burstRef.current = null;
            }
          } else if (
            burstRef.current !== null &&
            burstRef.current.key === themeKey &&
            now - burstRef.current.timestamp <= THEME_COALESCE_MS &&
            safeCurrentIndex > 0
          ) {
            shouldReplace = true;
            burstRef.current = { key: themeKey, timestamp: now };
          } else {
            burstRef.current = { key: themeKey, timestamp: now };
          }
        } else {
          burstRef.current = null;
        }
      }

      const historyAction: HistoryAction = {
        type: shouldReplace ? 'REPLACE' : 'PUSH',
        payload: nextResume,
      };
      shadowStateRef.current = historyReducer(currentHistoryState, historyAction);
      dispatch(historyAction);
    },
    []
  );

  const undo = useCallback(() => {
    burstRef.current = null;
    shadowStateRef.current = historyReducer(shadowStateRef.current, {
      type: 'UNDO',
    });
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
    burstRef.current = null;
    shadowStateRef.current = historyReducer(shadowStateRef.current, {
      type: 'REDO',
    });
    dispatch({ type: 'REDO' });
  }, []);

  const safeIndex = clampIndex(state.index, state.history.length);
  const resume: IResume =
    state.history[safeIndex] ??
    findLastValidSnapshot(state.history) ??
    initialState ??
    fallbackRef.current;

  return {
    resume,
    setResume,
    undo,
    redo,
    canUndo: safeIndex > 0,
    canRedo: safeIndex < state.history.length - 1,
  };
}
