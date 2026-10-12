import {
  createLessonState,
  currentLessonSession,
  lessonReducer,
  type LessonAction,
  type LessonSession,
} from "./lessonReducer";

/** Synchronous dispatch also guards repeated presses before React rerenders. */
export function createLessonStore(
  onComplete?: (session: LessonSession) => void,
) {
  let state = createLessonState();
  const listeners = new Set<() => void>();

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action: LessonAction) => {
      const previous = state;
      state = lessonReducer(state, action);
      if (state === previous) return state;
      const completedSession =
        !previous.completed && state.completed
          ? currentLessonSession(state)
          : null;
      for (const listener of listeners) listener();
      if (completedSession) onComplete?.(completedSession);
      return state;
    },
  };
}
