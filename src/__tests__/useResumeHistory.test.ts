import { renderHook, act } from '@testing-library/react';
import {
  useResumeHistory,
  historyReducer,
  HistoryState,
  MAX_HISTORY,
} from '../components/useResumeHistory';
import { IResume } from '../types/resume';

const createMockResume = (title: string): IResume => ({
  title,
  content: {
    basics: {
      name: `Candidate ${title}`,
      email: 'candidate@example.com',
    },
    sections: [],
    sectionOrder: [],
  },
});

describe('useResumeHistory & historyReducer', () => {
  it('handles 60 consecutive pushes without undefined state and keeps index === 49', () => {
    const initialResume = createMockResume('Step 0');

    // Verify reducer state directly (history capped at 50, index === 49, no undefined entries)
    let state: HistoryState = { history: [initialResume], index: 0 };
    for (let i = 1; i <= 60; i++) {
      state = historyReducer(state, {
        type: 'PUSH',
        payload: (prev) => ({
          ...prev,
          title: `Step ${i}`,
        }),
      });
      expect(state.history[state.index]).toBeDefined();
      expect(state.history[state.index].title).toBe(`Step ${i}`);
    }

    expect(state.history).toHaveLength(MAX_HISTORY);
    expect(state.index).toBe(49);
    expect(state.history.every((entry) => entry !== undefined)).toBe(true);
    expect(state.history[0].title).toBe('Step 11');
    expect(state.history[49].title).toBe('Step 60');

    // Verify hook behavior across 60 consecutive pushes
    const { result } = renderHook(() => useResumeHistory(initialResume));

    for (let i = 1; i <= 60; i++) {
      act(() => {
        result.current.setResume((prev) => ({
          ...prev,
          title: `Step ${i}`,
        }));
      });
      expect(result.current.resume).toBeDefined();
      expect(result.current.resume.title).toBe(`Step ${i}`);
    }

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Walking back 49 steps confirms index === 49 and oldest retained entry is Step 11
    for (let step = 59; step >= 11; step--) {
      act(() => {
        result.current.undo();
      });
      expect(result.current.resume).toBeDefined();
      expect(result.current.resume.title).toBe(`Step ${step}`);
    }

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('discards the redo stack when pushing after undo', () => {
    const initialResume = createMockResume('Version 0');
    const { result } = renderHook(() => useResumeHistory(initialResume));

    act(() => {
      result.current.setResume(createMockResume('Version 1'));
      result.current.setResume(createMockResume('Version 2'));
      result.current.setResume(createMockResume('Version 3'));
    });

    expect(result.current.resume.title).toBe('Version 3');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Undo twice to Version 1
    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.resume.title).toBe('Version 1');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    // Push a new state; Version 2 and Version 3 redo entries must be discarded
    act(() => {
      result.current.setResume((prev) => ({
        ...prev,
        title: `${prev.title} -> Branch A`,
      }));
    });

    expect(result.current.resume.title).toBe('Version 1 -> Branch A');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Redo is a no-op since redo stack was discarded
    act(() => {
      result.current.redo();
    });
    expect(result.current.resume.title).toBe('Version 1 -> Branch A');
    expect(result.current.canRedo).toBe(false);

    // Undo returns to Version 1
    act(() => {
      result.current.undo();
    });
    expect(result.current.resume.title).toBe('Version 1');
  });

  it('treats undo at index 0 as a no-op', () => {
    const initialResume = createMockResume('Initial');

    // Reducer-level reference equality check at index 0
    const initialState: HistoryState = { history: [initialResume], index: 0 };
    const afterUndoState = historyReducer(initialState, { type: 'UNDO' });
    expect(afterUndoState).toBe(initialState);
    expect(afterUndoState.index).toBe(0);

    // Hook-level check at index 0 initially and after undoing back to 0
    const { result } = renderHook(() => useResumeHistory(initialResume));
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.undo();
    });

    expect(result.current.resume).toBe(initialResume);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    act(() => {
      result.current.setResume(createMockResume('Second'));
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.resume).toBe(initialResume);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('clamps redo at history.length - 1 and preserves rapid consecutive updates without stale index', () => {
    const initialResume = createMockResume('Start');
    const { result } = renderHook(() => useResumeHistory(initialResume));

    // Rapid synchronous updates in a single batch (simulating fast typing)
    act(() => {
      for (let i = 1; i <= 55; i++) {
        result.current.setResume((prev) => ({
          ...prev,
          title: `${prev.title}.${i}`,
        }));
      }
    });

    expect(result.current.resume).toBeDefined();
    expect(result.current.resume.title.endsWith('.54.55')).toBe(true);
    expect(result.current.canRedo).toBe(false);

    // Redo at end of history is a no-op
    const latestResume = result.current.resume;
    act(() => {
      result.current.redo();
    });
    expect(result.current.resume).toBe(latestResume);
    expect(result.current.canRedo).toBe(false);
  });

  it('replaces history with a single entry at index 0 on RESET and isolates Undo/Redo from prior _id states', () => {
    const originalResume: IResume = {
      ...createMockResume('Original Resume'),
      _id: 'res-original-1',
      id: 'res-original-1',
    };

    // Direct reducer check
    let state: HistoryState = { history: [originalResume], index: 0 };
    state = historyReducer(state, {
      type: 'PUSH',
      payload: (prev) => ({ ...prev, title: 'Original Edited 1' }),
    });
    state = historyReducer(state, {
      type: 'PUSH',
      payload: (prev) => ({ ...prev, title: 'Original Edited 2' }),
    });
    state = historyReducer(state, { type: 'UNDO' });
    expect(state.history).toHaveLength(3);
    expect(state.index).toBe(1);

    const clonedResume: IResume = {
      ...createMockResume('Original Edited 1 (Copy)'),
      _id: 'res-clone-2',
      id: 'res-clone-2',
    };
    const resetState = historyReducer(state, {
      type: 'RESET',
      payload: clonedResume,
    });
    expect(resetState.history).toEqual([clonedResume]);
    expect(resetState.index).toBe(0);

    // Hook-level check
    const { result } = renderHook(() => useResumeHistory(originalResume));

    act(() => {
      result.current.setResume((prev) => ({ ...prev, title: 'Edit Before Clone 1' }));
      result.current.setResume((prev) => ({ ...prev, title: 'Edit Before Clone 2' }));
    });
    act(() => {
      result.current.undo();
    });

    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
    expect(result.current.resume._id).toBe('res-original-1');

    act(() => {
      result.current.resetResume(clonedResume);
    });

    expect(result.current.resume).toBe(clonedResume);
    expect(result.current.resume._id).toBe('res-clone-2');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    // Attempting undo or redo after resetResume must not restore res-original-1
    act(() => {
      result.current.undo();
      result.current.redo();
    });

    expect(result.current.resume._id).toBe('res-clone-2');
    expect(result.current.resume.title).toBe('Original Edited 1 (Copy)');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);

    // New edits after resetResume push cleanly onto the cloned baseline
    act(() => {
      result.current.setResume((prev) => ({ ...prev, title: 'Cloned Edited' }));
    });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.resume._id).toBe('res-clone-2');

    act(() => {
      result.current.undo();
      result.current.undo();
    });
    expect(result.current.resume._id).toBe('res-clone-2');
    expect(result.current.resume.title).toBe('Original Edited 1 (Copy)');
    expect(result.current.canUndo).toBe(false);
  });
});
