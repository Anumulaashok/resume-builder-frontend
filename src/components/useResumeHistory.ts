import { useReducer, useCallback, useRef } from 'react';
import { defaultResume } from '../constants/editorConstants';
import { IResume } from '../types/resume';

export const MAX_HISTORY = 50;

export interface HistoryState {
  history: IResume[];
  index: number;
}

export type ResumeUpdateAction = IResume | ((prev: IResume) => IResume);

export type HistoryAction =
  | { type: 'PUSH'; payload: ResumeUpdateAction }
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

  const [state, dispatch] = useReducer(
    historyReducer,
    initialState,
    (init): HistoryState => ({
      history: [init ?? defaultResume],
      index: 0,
    })
  );

  const setResume = useCallback((action: ResumeUpdateAction) => {
    dispatch({ type: 'PUSH', payload: action });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  const redo = useCallback(() => {
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
