import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";
import { initialJourney, journeyReducer, type Screen } from "../features/trip/journey";
import { useLesson } from "../features/learning/useLesson";
import { useConnection } from "../features/connection/useConnection";
import { usePhrases } from "../features/phrases/usePhrases";

function useAppState() {
  const [state, dispatch] = useReducer(journeyReducer, initialJourney);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const go = useCallback((screen: Screen) => {
    dispatch({ type: "go", screen });
    setError("");
    setNotice("");
  }, []);
  const lesson = useLesson(() => go("complete"));
  const startLesson = () => {
    lesson.reset();
    go("lesson");
  };
  const phrase = usePhrases(state.favorites);
  const { connection, connect } = useConnection();
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  return {
    state,
    dispatch,
    error,
    setError,
    notice,
    setNotice,
    go,
    startLesson,
    lesson,
    phrase,
    connection,
    connect,
  };
}
const AppContext = createContext<ReturnType<typeof useAppState> | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const value = useAppState();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw Error("AppProvider is required");
  return value;
}
