import type { ClickSoundEngine } from "./types";

export interface NativeClickPlayer {
  volume: number;
  play(): void;
  pause(): void;
  seekTo(seconds: number): Promise<void>;
  remove(): void;
}

export function createNativeClickSoundEngine(
  createPlayer: () => NativeClickPlayer,
  prepareSession: () => Promise<void>,
): ClickSoundEngine {
  let player: NativeClickPlayer | null = null;
  let preparation: Promise<void> | null = null;
  let generation = 0;
  let disposed = false;

  return {
    async play() {
      if (disposed) return;
      const token = generation;
      player ??= createPlayer();
      // The WAV already contains the quiet amplitude; don't amplify it.
      player.volume = 1;
      const target = player;
      preparation ??= prepareSession().catch((error: unknown) => {
        preparation = null;
        throw error;
      });
      await preparation;
      if (disposed || token !== generation) return;
      await target.seekTo(0);
      if (!disposed && token === generation) target.play();
    },
    stop() {
      generation += 1;
      player?.pause();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      generation += 1;
      const target = player;
      player = null;
      target?.remove();
    },
  };
}
