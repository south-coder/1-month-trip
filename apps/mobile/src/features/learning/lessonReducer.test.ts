import { describe, expect, it, vi } from "vitest";
import { questions } from "./questions";
import {
  createLessonState,
  currentLessonSession,
  currentLessonTarget,
  lessonReducer,
} from "./lessonReducer";
import { createLessonStore } from "./lessonStore";

describe("demo lesson records", () => {
  it("keeps the first incorrect answer and hint use when returning to a question", () => {
    const initial = createLessonState();
    const target = currentLessonTarget(initial);
    let state = lessonReducer(initial, {
      type: "hint",
      visible: true,
      ...target,
    });
    state = lessonReducer(state, { type: "hint", visible: false, ...target });
    state = lessonReducer(state, { type: "choice", choice: 1, ...target });
    state = lessonReducer(state, { type: "answer", ...target });
    const recorded = currentLessonSession(state);

    state = lessonReducer(state, { type: "choice", choice: 0, ...target });
    state = lessonReducer(state, { type: "answer", ...target });
    state = lessonReducer(state, { type: "next", skip: true, ...target });

    expect(state.choice).toBe(1);
    expect(state.question).toBe(0);
    expect(currentLessonSession(state)).toBe(recorded);
    expect(recorded.attempts).toEqual([
      expect.objectContaining({
        id: questions[0].id,
        correct: false,
        skipped: false,
        hint: true,
        selectedChoice: 1,
      }),
    ]);
    expect(currentLessonSession(initial).attempts).toEqual([]);
  });

  it("records a skip separately and clears the next question's transient fields", () => {
    let state = createLessonState();
    const target = currentLessonTarget(state);
    state = lessonReducer(state, { type: "hint", visible: true, ...target });
    state = lessonReducer(state, { type: "choice", choice: 0, ...target });
    state = lessonReducer(state, { type: "next", skip: true, ...target });

    expect(currentLessonSession(state).attempts[0]).toMatchObject({
      correct: false,
      skipped: true,
      hint: true,
      selectedChoice: null,
    });
    expect(state).toMatchObject({
      question: 1,
      choice: null,
      checked: false,
      hint: false,
      hintUsed: false,
      error: "",
    });
  });

  it("does not save blank or invalid selections as attempts", () => {
    let state = createLessonState();
    const target = currentLessonTarget(state);
    state = lessonReducer(state, { type: "answer", ...target });
    expect(state.error).toBe("답변을 선택해 주세요.");
    state = lessonReducer(state, { type: "next", ...target });
    expect(state.question).toBe(0);
    expect(state.error).not.toBe("");
    for (const choice of [-1, 0.5, questions[0].options.length, Number.NaN]) {
      state = lessonReducer(state, { type: "choice", choice, ...target });
      state = lessonReducer(state, { type: "answer", ...target });
    }
    expect(currentLessonSession(state).attempts).toEqual([]);
    expect(state.checked).toBe(false);
  });

  it("starts a new session while preserving an unfinished session's first attempt", () => {
    let state = createLessonState();
    const target = currentLessonTarget(state);
    state = lessonReducer(state, { type: "choice", choice: 1, ...target });
    state = lessonReducer(state, { type: "answer", ...target });
    const previous = currentLessonSession(state);
    state = lessonReducer(state, { type: "reset" });
    expect(state.sessionHistory).toHaveLength(2);
    expect(state.sessionHistory[0]).toBe(previous);
    expect(previous.attempts[0].correct).toBe(false);
    expect(currentLessonSession(state).attempts).toEqual([]);

    // A delayed submit from the first session cannot answer the new session.
    expect(lessonReducer(state, { type: "answer", ...target })).toBe(state);
    const nextTarget = currentLessonTarget(state);
    state = lessonReducer(state, { type: "choice", choice: 0, ...nextTarget });
    state = lessonReducer(state, { type: "answer", ...nextTarget });
    expect(currentLessonSession(state).attempts[0].correct).toBe(true);
    expect(state.sessionHistory[0]).toBe(previous);
  });

  it("does not collect blank sessions when repeatedly starting before an answer", () => {
    let state = createLessonState();
    state = lessonReducer(state, { type: "reset" });
    state = lessonReducer(state, { type: "reset" });
    expect(state.sessionHistory).toHaveLength(1);
  });
});

describe("rapid lesson interactions", () => {
  it("deduplicates answers before React renders and ignores a stale next press", () => {
    const store = createLessonStore();
    const target = currentLessonTarget(store.getState());
    store.dispatch({ type: "choice", choice: 0, ...target });
    store.dispatch({ type: "answer", ...target });
    const afterFirst = store.getState();
    store.dispatch({ type: "answer", ...target });
    expect(store.getState()).toBe(afterFirst);
    expect(currentLessonSession(store.getState()).attempts).toHaveLength(1);

    store.dispatch({ type: "next", ...target });
    const afterNext = store.getState();
    store.dispatch({ type: "next", ...target });
    store.dispatch({ type: "next", skip: true, ...target });
    expect(store.getState()).toBe(afterNext);
    expect(store.getState().question).toBe(1);
    expect(currentLessonSession(store.getState()).attempts).toHaveLength(1);
  });

  it("completes the final question exactly once and retains completed history after reset", () => {
    const complete = vi.fn();
    const store = createLessonStore(complete);
    for (const question of questions) {
      const target = currentLessonTarget(store.getState());
      store.dispatch({ type: "choice", choice: question.answer, ...target });
      store.dispatch({ type: "answer", ...target });
      store.dispatch({ type: "next", ...target });
    }
    const final = store.getState();
    const target = currentLessonTarget(final);
    store.dispatch({ type: "next", ...target });
    store.dispatch({ type: "next", skip: true, ...target });
    store.dispatch({ type: "answer", ...target });
    expect(store.getState()).toBe(final);
    expect(final.question).toBe(questions.length - 1);
    expect(final.completed).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(complete).toHaveBeenCalledWith(currentLessonSession(final));

    store.dispatch({ type: "reset" });
    const restarted = store.getState();
    expect(restarted.completed).toBe(false);
    expect(restarted.sessionHistory[0]).toBe(currentLessonSession(final));
    expect(restarted.sessionHistory[0].status).toBe("completed");
    expect(restarted.sessionHistory[0].attempts).toHaveLength(questions.length);
    expect(currentLessonSession(restarted).attempts).toEqual([]);
  });

  it("can complete by skipping the final question without duplicating its attempt", () => {
    const complete = vi.fn();
    const store = createLessonStore(complete);
    let lastTarget = currentLessonTarget(store.getState());
    for (let i = 0; i < questions.length; i += 1) {
      lastTarget = currentLessonTarget(store.getState());
      store.dispatch({ type: "next", skip: true, ...lastTarget });
    }
    store.dispatch({ type: "next", skip: true, ...lastTarget });
    expect(currentLessonSession(store.getState()).attempts).toHaveLength(
      questions.length,
    );
    expect(
      currentLessonSession(store.getState()).attempts.every(
        (attempt) => attempt.skipped,
      ),
    ).toBe(true);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
