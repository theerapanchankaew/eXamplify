import { useState, useEffect, useCallback } from 'react';

interface ExamState {
  answers: Record<string, string>;
  flaggedQuestions: string[];
  currentQuestionIndex: number;
  startTime: number;
  isFinished: boolean;
}

interface UseExamStateProps {
  examId: string;
  userId: string;
  totalQuestions: number;
}

export function useExamState({ examId, userId, totalQuestions }: UseExamStateProps) {
  const storageKey = `exam_progress_${userId}_${examId}`;

  // Initialize state from localStorage or defaults
  const [state, setState] = useState<ExamState>(() => {
    if (typeof window === 'undefined') {
      return {
        answers: {},
        flaggedQuestions: [],
        currentQuestionIndex: 0,
        startTime: Date.now(),
        isFinished: false,
      };
    }

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validate parsed data structure slightly to avoid crashes
        if (parsed && typeof parsed === 'object') {
          return {
            answers: parsed.answers || {},
            flaggedQuestions: parsed.flaggedQuestions || [],
            currentQuestionIndex: typeof parsed.currentQuestionIndex === 'number' ? parsed.currentQuestionIndex : 0,
            startTime: parsed.startTime || Date.now(),
            isFinished: parsed.isFinished || false,
          };
        }
      }
    } catch (error) {
      console.error('Error loading exam state:', error);
    }

    return {
      answers: {},
      flaggedQuestions: [],
      currentQuestionIndex: 0,
      startTime: Date.now(),
      isFinished: false,
    };
  });

  // Persist state changes
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving exam state:', error);
    }
  }, [state, storageKey]);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: answer
      }
    }));
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    setState(prev => {
      const isFlagged = prev.flaggedQuestions.includes(questionId);
      return {
        ...prev,
        flaggedQuestions: isFlagged
          ? prev.flaggedQuestions.filter(id => id !== questionId)
          : [...prev.flaggedQuestions, questionId]
      };
    });
  }, []);

  const setCurrentQuestionIndex = useCallback((index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: index
      }));
    }
  }, [totalQuestions]);

  const clearState = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
      setState({
        answers: {},
        flaggedQuestions: [],
        currentQuestionIndex: 0,
        startTime: Date.now(),
        isFinished: false,
      });
    } catch (error) {
      console.error('Error clearing exam state:', error);
    }
  }, [storageKey]);

  const finishExam = useCallback(() => {
    setState(prev => ({ ...prev, isFinished: true }));
  }, []);

  return {
    state,
    setAnswer,
    toggleFlag,
    setCurrentQuestionIndex,
    clearState,
    finishExam
  };
}
