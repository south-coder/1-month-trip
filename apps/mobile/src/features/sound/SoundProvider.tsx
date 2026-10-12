import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createClickSoundController,
  type ClickSoundController,
} from "./clickController";
import { createClickSoundEngine } from "./engine";

interface SoundPreferences {
  enabled: boolean;
  toggle(): void;
  playClick(): void;
}

const SoundContext = createContext<SoundPreferences | null>(null);

export function SoundProvider({ children }: PropsWithChildren) {
  const [enabled, setEnabled] = useState(true);
  const enabledRef = useRef(true);
  const controllerRef = useRef<ClickSoundController | null>(null);

  const playClick = useCallback(() => {
    if (!enabledRef.current) return;
    try {
      controllerRef.current ??= createClickSoundController(
        createClickSoundEngine(),
      );
      controllerRef.current.play();
    } catch {
      // Browsers without audio support still have fully usable controls.
    }
  }, []);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    controllerRef.current?.setEnabled(next);
    setEnabled(next);
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.dispose();
      controllerRef.current = null;
    },
    [],
  );

  const value = useMemo(
    () => ({ enabled, toggle, playClick }),
    [enabled, toggle, playClick],
  );
  return (
    <SoundContext.Provider value={value}>{children}</SoundContext.Provider>
  );
}

export function useSound(): SoundPreferences {
  const preferences = useContext(SoundContext);
  if (!preferences) throw new Error("useSound requires SoundProvider");
  return preferences;
}
