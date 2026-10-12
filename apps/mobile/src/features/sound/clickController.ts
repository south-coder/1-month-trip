import type { ClickSoundEngine } from "./types";

export interface ClickSoundController {
  play(): void;
  setEnabled(enabled: boolean): void;
  dispose(): void;
}

function ignoreFailure(action: () => void | Promise<void>) {
  try {
    void Promise.resolve(action()).catch(() => undefined);
  } catch {
    // An unavailable audio device must never prevent navigation or answers.
  }
}

/** One short effect at a time; rapid gestures cannot build a playback queue. */
export function createClickSoundController(
  engine: ClickSoundEngine,
  now: () => number = Date.now,
): ClickSoundController {
  let enabled = true;
  let disposed = false;
  let pending = false;
  let lastTap = -Infinity;

  return {
    play() {
      const timestamp = now();
      if (!enabled || disposed || pending || timestamp - lastTap < 45) return;
      lastTap = timestamp;
      pending = true;
      try {
        void Promise.resolve(engine.play())
          .catch(() => undefined)
          .then(() => {
            pending = false;
          });
      } catch {
        pending = false;
      }
    },
    setEnabled(value) {
      enabled = value;
      if (!value) ignoreFailure(() => engine.stop());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      enabled = false;
      ignoreFailure(() => engine.dispose());
    },
  };
}
