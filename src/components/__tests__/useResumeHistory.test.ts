import React from 'react';
import { render, renderHook, screen, fireEvent, act } from '@testing-library/react';
import {
  useResumeHistory,
  historyReducer,
  HistoryState,
  MAX_HISTORY,
} from '../useResumeHistory';
import ResumeEditor from '../ResumeEditor';
import { IResume } from '../../types/resume';

jest.mock('react-resizable-panels', () => {
  const mockReact = require('react');
  return {
    PanelGroup: ({ children, className }: any) =>
      mockReact.createElement('div', { className }, children),
    Panel: ({ children, className }: any) =>
      mockReact.createElement('div', { className }, children),
    PanelResizeHandle: ({ children, ...props }: any) =>
      mockReact.createElement('div', { role: 'separator', ...props }, children),
  };
});

jest.mock('../../services/resume.service', () => ({
  resumeService: {
    updateResume: jest.fn(),
    createResume: jest.fn(),
    getShareSettings: jest.fn(),
    updateShareSettings: jest.fn(),
  },
}));

const createSnapshot = (step: number): IResume => ({
  _id: 'resume-history-test',
  title: `Resume Edit ${step}`,
  summary: `Summary at step ${step}`,
  content: {
    basics: {
      name: `Candidate ${step}`,
      label: 'Software Engineer',
      email: `candidate${step}@example.com`,
      phone: '555-0100',
      summary: `Summary at step ${step}`,
    },
    sections: [],
    sectionOrder: [],
  },
});

describe('useResumeHistory', () => {
  it('clamps index to 49 across 50 successive edit actions and never returns undefined', () => {
    const initial = createSnapshot(0);

    // Direct reducer verification across 50 successive edit actions (51 total snapshots -> capped at 50)
    let state: HistoryState = { history: [initial], index: 0 };
    for (let step = 1; step <= 50; step++) {
      state = historyReducer(state, {
        type: 'PUSH',
        payload: (prev) => ({
          ...prev,
          title: `Resume Edit ${step}`,
        }),
      });

      expect(state.history.length).toBeLessThanOrEqual(MAX_HISTORY);
      expect(state.index).toBe(state.history.length - 1);
      expect(state.index).toBeLessThan(MAX_HISTORY);
      expect(state.history[state.index]).toBeDefined();
      expect(state.history[state.index].title).toBe(`Resume Edit ${step}`);
    }

    expect(state.history).toHaveLength(50);
    expect(state.index).toBe(49);
    // Initial step 0 was shifted out on the 50th edit; oldest entry is step 1, newest is step 50
    expect(state.history[0].title).toBe('Resume Edit 1');
    expect(state.history[49].title).toBe('Resume Edit 50');

    // Hook verification across 50 successive edit actions and full 49-step undo walk
    const { result } = renderHook(() => useResumeHistory(initial));
    expect(result.current.resume).toEqual(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    for (let step = 1; step <= 50; step++) {
      act(() => {
        result.current.setResume((prev) => ({
          ...prev,
          title: `Resume Edit ${step}`,
        }));
      });
      expect(result.current.resume).toBeDefined();
      expect(result.current.resume.title).toBe(`Resume Edit ${step}`);
      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);
    }

    // Undo across all 49 retained prior entries back to step 1
    for (let expectedStep = 49; expectedStep >= 1; expectedStep--) {
      act(() => {
        result.current.undo();
      });
      expect(result.current.resume).toBeDefined();
      expect(result.current.resume.title).toBe(`Resume Edit ${expectedStep}`);
      expect(result.current.canRedo).toBe(true);
    }

    expect(result.current.canUndo).toBe(false);
  });

  it('handles rapid batched updates when history reaches and exceeds 50 items', () => {
    const initial = createSnapshot(0);
    const { result } = renderHook(() => useResumeHistory(initial));

    act(() => {
      for (let step = 1; step <= 55; step++) {
        result.current.setResume((prev) => ({
          ...prev,
          title: `Rapid ${step}`,
          summary: `${prev.summary} -> ${step}`,
        }));
      }
    });

    expect(result.current.resume).toBeDefined();
    expect(result.current.resume.title).toBe('Rapid 55');
    expect(result.current.resume.summary?.endsWith('-> 54 -> 55')).toBe(true);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('clamps undo at boundary zero without mutating state or returning undefined', () => {
    const initial = createSnapshot(0);
    const baseState: HistoryState = { history: [initial], index: 0 };

    const afterUndoAtZero = historyReducer(baseState, { type: 'UNDO' });
    expect(afterUndoAtZero).toBe(baseState);
    expect(afterUndoAtZero.index).toBe(0);

    const { result } = renderHook(() => useResumeHistory(initial));

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.resume).toBe(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.setResume(createSnapshot(1));
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.resume).toBe(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('clamps redo at the buffer cap (history.length - 1)', () => {
    const initial = createSnapshot(0);
    const { result } = renderHook(() => useResumeHistory(initial));

    // Fill history buffer to full 50-entry capacity
    act(() => {
      for (let step = 1; step <= 50; step++) {
        result.current.setResume(createSnapshot(step));
      }
    });

    const latestAtCap = result.current.resume;
    expect(latestAtCap.title).toBe('Resume Edit 50');
    expect(result.current.canRedo).toBe(false);

    // Redo at index 49 (buffer cap) is a no-op
    act(() => {
      result.current.redo();
      result.current.redo();
    });
    expect(result.current.resume).toBe(latestAtCap);
    expect(result.current.canRedo).toBe(false);

    // Undo twice, then redo back to buffer cap and attempt extra redo
    act(() => {
      result.current.undo();
      result.current.undo();
    });
    expect(result.current.resume.title).toBe('Resume Edit 48');
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
      result.current.redo();
      result.current.redo();
    });
    expect(result.current.resume).toBe(latestAtCap);
    expect(result.current.canRedo).toBe(false);
  });

  it('truncates forward redo history when pushing a new edit after undo', () => {
    const initial = createSnapshot(0);
    const { result } = renderHook(() => useResumeHistory(initial));

    act(() => {
      result.current.setResume(createSnapshot(1));
      result.current.setResume(createSnapshot(2));
      result.current.setResume(createSnapshot(3));
    });

    act(() => {
      result.current.undo();
      result.current.undo();
    });
    expect(result.current.resume.title).toBe('Resume Edit 1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    const branched = createSnapshot(99);
    act(() => {
      result.current.setResume(branched);
    });

    expect(result.current.resume).toBe(branched);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Forward entries (Edit 2 and Edit 3) were truncated
    act(() => {
      result.current.redo();
    });
    expect(result.current.resume).toBe(branched);

    act(() => {
      result.current.undo();
    });
    expect(result.current.resume.title).toBe('Resume Edit 1');
  });

  it('provides a safe fallback snapshot when state or inputs are out-of-bounds or nullish', () => {
    const initial = createSnapshot(0);

    // Reducer repairs out-of-bounds index (e.g., 50 on a 50-item array or empty history)
    const fiftyItems = Array.from({ length: 50 }, (_, i) => createSnapshot(i));
    const outOfBoundsState: HistoryState = { history: fiftyItems, index: 50 };

    const pushedFromOutOfBounds = historyReducer(outOfBoundsState, {
      type: 'PUSH',
      payload: (prev) => ({ ...prev, title: `${prev.title} + safe` }),
    });
    expect(pushedFromOutOfBounds.history).toHaveLength(50);
    expect(pushedFromOutOfBounds.index).toBe(49);
    expect(pushedFromOutOfBounds.history[49].title).toBe('Resume Edit 49 + safe');

    const emptyHistoryPush = historyReducer(
      { history: [], index: 5 },
      { type: 'PUSH', payload: (prev) => ({ ...prev, title: 'Recovered' }) }
    );
    expect(emptyHistoryPush.history).toHaveLength(1);
    expect(emptyHistoryPush.index).toBe(0);
    expect(emptyHistoryPush.history[0].title).toBe('Recovered');

    // Hook preserves initial snapshot when an updater unexpectedly returns undefined
    const { result: validResult } = renderHook(() => useResumeHistory(initial));
    act(() => {
      validResult.current.setResume(
        (() => undefined) as unknown as (prev: IResume) => IResume
      );
    });
    expect(validResult.current.resume).toEqual(initial);

    // Hook returns valid defaultResume fallback even if initialState is nullish at runtime
    const { result } = renderHook(() =>
      useResumeHistory(undefined as unknown as IResume)
    );
    expect(result.current.resume).toBeDefined();
    expect(result.current.resume.content.basics).toBeDefined();
  });

  it('keeps ResumeEditor stable without crashes across 52 consecutive field edits and undo/redo', () => {
    render(
      React.createElement(ResumeEditor, {
        initialResume: createSnapshot(0),
        onBack: jest.fn(),
      })
    );

    const fullNameInput = screen.getByLabelText('Full Name') as HTMLInputElement;
    for (let step = 1; step <= 52; step++) {
      fireEvent.change(fullNameInput, {
        target: { value: `Alex Rivera ${step}` },
      });
    }

    expect(fullNameInput.value).toBe('Alex Rivera 52');

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });
    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);
    expect(fullNameInput.value).toBe('Alex Rivera 51');
    expect(redoButton).not.toBeDisabled();

    fireEvent.click(redoButton);
    expect(fullNameInput.value).toBe('Alex Rivera 52');
    expect(redoButton).toBeDisabled();
  });
});
