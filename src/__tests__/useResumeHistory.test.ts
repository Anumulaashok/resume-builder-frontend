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

  it('supports REPLACE action in historyReducer without growing history length and truncates redo entries', () => {
    const step0 = createMockResume('Step 0');
    const step1 = createMockResume('Step 1');
    const step2 = createMockResume('Step 2');

    let state: HistoryState = {
      history: [step0, step1, step2],
      index: 1,
    };

    state = historyReducer(state, {
      type: 'REPLACE',
      payload: (prev) => ({
        ...prev,
        title: `${prev.title} (replaced)`,
      }),
    });

    expect(state.history).toHaveLength(2);
    expect(state.index).toBe(1);
    expect(state.history[0]).toBe(step0);
    expect(state.history[1].title).toBe('Step 1 (replaced)');
  });

  it('coalesces rapid consecutive themeConfig updates within THEME_COALESCE_MS into a single undo entry while keeping MAX_HISTORY cap', () => {
    const nowSpy = jest.spyOn(Date, 'now');
    let currentTime = 1_000_000;
    nowSpy.mockImplementation(() => currentTime);

    try {
      const initialResume: IResume = {
        ...createMockResume('Theme Burst Resume'),
        themeConfig: {
          primaryColor: '#1e293b',
          headingColor: '#111827',
          textColor: '#374151',
          fontScale: 1,
        },
      };

      const { result } = renderHook(() => useResumeHistory(initialResume));

      // Simulate 15 rapid slider events 25ms apart (well within 400ms burst window)
      for (let i = 1; i <= 15; i++) {
        currentTime += 25;
        const nextScale = Number((0.85 + i * 0.02).toFixed(2));
        act(() => {
          result.current.setResume((prev) => ({
            ...prev,
            themeConfig: {
              ...prev.themeConfig,
              fontScale: nextScale,
            },
          }));
        });
        // Immediate preview state must reflect every intermediate drag event
        expect(result.current.resume.themeConfig?.fontScale).toBe(nextScale);
      }

      expect(result.current.resume.themeConfig?.fontScale).toBe(1.15);
      expect(result.current.canUndo).toBe(true);

      // A single undo reverts the entire 15-event drag back to initial fontScale: 1
      act(() => {
        result.current.undo();
      });
      expect(result.current.resume.themeConfig?.fontScale).toBe(1);
      expect(result.current.canUndo).toBe(false);

      // Redo restores the final coalesced value (1.15)
      act(() => {
        result.current.redo();
      });
      expect(result.current.resume.themeConfig?.fontScale).toBe(1.15);

      // Advance past THEME_COALESCE_MS (e.g. +600ms) and perform a second burst
      currentTime += 600;
      act(() => {
        result.current.setResume((prev) => ({
          ...prev,
          themeConfig: { ...prev.themeConfig, fontScale: 0.95 },
        }));
      });
      currentTime += 30;
      act(() => {
        result.current.setResume((prev) => ({
          ...prev,
          themeConfig: { ...prev.themeConfig, fontScale: 0.9 },
        }));
      });

      expect(result.current.resume.themeConfig?.fontScale).toBe(0.9);

      // First undo reverts second burst (0.9 -> 1.15), second undo reverts first burst (1.15 -> 1)
      act(() => {
        result.current.undo();
      });
      expect(result.current.resume.themeConfig?.fontScale).toBe(1.15);

      act(() => {
        result.current.undo();
      });
      expect(result.current.resume.themeConfig?.fontScale).toBe(1);
      expect(result.current.canUndo).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
