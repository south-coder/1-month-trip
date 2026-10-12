import { useRef, useState, useSyncExternalStore } from "react";
import { questions } from "./questions";
import {
  currentLessonSession,
  currentLessonTarget,
  type LessonSession,
} from "./lessonReducer";
import { createLessonStore } from "./lessonStore";

export function useLesson(onComplete: (session: LessonSession) => void) {
  const completionRef = useRef(onComplete);
  completionRef.current = onComplete;
  const [store] = useState(() =>
    createLessonStore((session) => completionRef.current(session)),
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  const target = currentLessonTarget(state);

  return {
    question: state.question,
    q: questions[state.question],
    choice: state.choice,
    checked: state.checked,
    hint: state.hint,
    attempts: currentLessonSession(state).attempts,
    sessionHistory: state.sessionHistory,
    error: state.error,
    completed: state.completed,
    setChoice: (choice: number | null) => {
      store.dispatch({ type: "choice", choice, ...target });
    },
    setHint: (visible: boolean) => {
      store.dispatch({ type: "hint", visible, ...target });
    },
    setError: (error: string) => {
      store.dispatch({ type: "error", error, ...target });
    },
    answer: () => {
      store.dispatch({ type: "answer", ...target });
    },
    next: (skip = false) => {
      store.dispatch({ type: "next", skip, ...target });
    },
    reset: () => {
      store.dispatch({ type: "reset" });
    },
  };
}

export type LessonController = ReturnType<typeof useLesson>;
