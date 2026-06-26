import { useState, useCallback } from 'react';
import { IResume } from '../types/resume';

export function useResumeHistory(initialState: IResume) {
  const [history, setHistory] = useState<IResume[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const setResume = useCallback((action: IResume | ((prev: IResume) => IResume)) => {
    setHistory((prevHistory) => {
      const currentState = prevHistory[currentIndex];
      const nextState = typeof action === 'function' ? action(currentState) : action;
      
      const newHistory = prevHistory.slice(0, currentIndex + 1);
      newHistory.push(nextState);
      
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      return newHistory;
    });
    
    setCurrentIndex((prev) => Math.min(prev + 1, 50));
  }, [currentIndex]);

  const undo = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const redo = useCallback(() => {
    setHistory((prevHistory) => {
      setCurrentIndex((prev) => Math.min(prev + 1, prevHistory.length - 1));
      return prevHistory;
    });
  }, []);

  return {
    resume: history[currentIndex],
    setResume,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
  };
}
