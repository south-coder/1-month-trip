import { questions } from "./questions";

export type LessonQuestion = (typeof questions)[number];

/** Local demo records only. The production attempt ledger belongs to the API. */
export type LessonAttempt = Readonly<{
  id: string;
  attemptId: string;
  sessionId: string;
  selectedChoice: number | null;
  correct: boolean;
  skipped: boolean;
  hint: boolean;
}>;

export type LessonSession = Readonly<{
  id: string;
  status: "started" | "completed";
  attempts: readonly LessonAttempt[];
}>;

export type LessonState = Readonly<{
  currentSessionId: string;
  sessionHistory: readonly LessonSession[];
  question: number;
  choice: number | null;
  checked: boolean;
  hint: boolean;
  hintUsed: boolean;
  completed: boolean;
  error: string;
}>;

export type LessonTarget = Readonly<{
  sessionId: string;
  questionId: string;
}>;

export type LessonAction =
  | ({ type: "choice"; choice: number | null } & LessonTarget)
  | ({ type: "hint"; visible: boolean } & LessonTarget)
  | ({ type: "error"; error: string } & LessonTarget)
  | ({ type: "answer" } & LessonTarget)
  | ({ type: "next"; skip?: boolean } & LessonTarget)
  | { type: "reset" };

export function createLessonState(): LessonState {
  return {
    currentSessionId: "demo-session-1",
    sessionHistory: [{ id: "demo-session-1", status: "started", attempts: [] }],
    question: 0,
    choice: null,
    checked: false,
    hint: false,
    hintUsed: false,
    completed: false,
    error: "",
  };
}

export function currentLessonSession(state: LessonState): LessonSession {
  return state.sessionHistory[state.sessionHistory.length - 1];
}

export function currentLessonTarget(state: LessonState): LessonTarget {
  return {
    sessionId: state.currentSessionId,
    questionId: questions[state.question].id,
  };
}

function updateCurrentSession(
  state: LessonState,
  session: LessonSession,
): readonly LessonSession[] {
  return [...state.sessionHistory.slice(0, -1), session];
}

function recordAttempt(state: LessonState, skipped: boolean): LessonState {
  const question = questions[state.question];
  const session = currentLessonSession(state);
  const attempt: LessonAttempt = {
    id: question.id,
    attemptId: `${session.id}/${question.id}`,
    sessionId: session.id,
    selectedChoice: skipped ? null : state.choice,
    correct: !skipped && state.choice === question.answer,
    skipped,
    hint: state.hintUsed,
  };
  return {
    ...state,
    checked: true,
    error: "",
    sessionHistory: updateCurrentSession(state, {
      ...session,
      attempts: [...session.attempts, attempt],
    }),
  };
}

export function lessonReducer(
  state: LessonState,
  action: LessonAction,
): LessonState {
  if (action.type === "reset") {
    const session = currentLessonSession(state);
    // Reuse the initial untouched session instead of collecting empty records.
    if (session.status === "started" && session.attempts.length === 0) {
      return {
        ...state,
        question: 0,
        choice: null,
        checked: false,
        hint: false,
        hintUsed: false,
        completed: false,
        error: "",
      };
    }
    const id = `demo-session-${state.sessionHistory.length + 1}`;
    return {
      ...createLessonState(),
      currentSessionId: id,
      sessionHistory: [
        ...state.sessionHistory,
        { id, status: "started", attempts: [] },
      ],
    };
  }

  // A click captured on the previous question/session must not affect the next.
  if (
    state.completed ||
    action.sessionId !== state.currentSessionId ||
    action.questionId !== questions[state.question].id
  ) {
    return state;
  }

  switch (action.type) {
    case "choice": {
      if (state.checked) return state;
      if (
        action.choice !== null &&
        (!Number.isInteger(action.choice) ||
          action.choice < 0 ||
          action.choice >= questions[state.question].options.length)
      ) {
        return {
          ...state,
          choice: null,
          error: "선택 가능한 답변을 골라 주세요.",
        };
      }
      return { ...state, choice: action.choice, error: "" };
    }
    case "hint":
      return state.checked
        ? state
        : {
            ...state,
            hint: action.visible,
            hintUsed: state.hintUsed || action.visible,
          };
    case "error":
      return { ...state, error: action.error };
    case "answer":
      if (state.checked) return state;
      if (state.choice === null) {
        return { ...state, error: "답변을 선택해 주세요." };
      }
      return recordAttempt(state, false);
    case "next": {
      if (action.skip && state.checked) return state;
      if (!action.skip && !state.checked) {
        return {
          ...state,
          error: "답변을 확인하거나 건너뛰기를 선택해 주세요.",
        };
      }
      const answered = action.skip ? recordAttempt(state, true) : state;
      if (state.question === questions.length - 1) {
        return {
          ...answered,
          completed: true,
          error: "",
          sessionHistory: updateCurrentSession(answered, {
            ...currentLessonSession(answered),
            status: "completed",
          }),
        };
      }
      return {
        ...answered,
        question: state.question + 1,
        choice: null,
        checked: false,
        hint: false,
        hintUsed: false,
        error: "",
      };
    }
  }
}
