import { useReducer, useCallback } from 'react';
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
  return Math.min(Math.max(index, 0), length - 1);
};

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'PUSH': {
      const safeCurrentIndex = clampIndex(state.index, state.history.length);
      const currentState = state.history[safeCurrentIndex];
      const nextState =
        typeof action.payload === 'function' ? action.payload(currentState) : action.payload;

      const truncatedHistory = state.history.slice(0, safeCurrentIndex + 1);
      const appendedHistory = [...truncatedHistory, nextState];
      const cappedHistory =
        appendedHistory.length > MAX_HISTORY
          ? appendedHistory.slice(appendedHistory.length - MAX_HISTORY)
          : appendedHistory;

      return {
        history: cappedHistory,
        index: cappedHistory.length - 1,
      };
    }
    case 'UNDO': {
      const nextIndex = clampIndex(state.index - 1, state.history.length);
      if (nextIndex === state.index) {
        return state;
      }
      return {
        ...state,
        index: nextIndex,
      };
    }
    case 'REDO': {
      const nextIndex = clampIndex(state.index + 1, state.history.length);
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
  const [state, dispatch] = useReducer(
    historyReducer,
    initialState,
    (init): HistoryState => ({
      history: [init],
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

  return {
    resume: state.history[state.index],
    setResume,
    undo,
    redo,
    canUndo: state.index > 0,
    canRedo: state.index < state.history.length - 1,
  };
}
