import type { ClickSoundEngine } from "./types";
import { CLICK_DURATION_SECONDS, clickSample } from "./waveform";

interface SoundBuffer {
  getChannelData(channel: number): Float32Array;
}

interface SoundSource {
  buffer: SoundBuffer | null;
  onended: (() => void) | null;
  connect(destination: unknown): void;
  disconnect(): void;
  start(when?: number): void;
  stop(): void;
}

export interface BrowserSoundContext {
  state: string;
  sampleRate: number;
  currentTime: number;
  destination: unknown;
  resume(): Promise<void>;
  close(): Promise<void>;
  createBuffer(
    channels: number,
    length: number,
    sampleRate: number,
  ): SoundBuffer;
  createBufferSource(): SoundSource;
}

function createBrowserContext(): BrowserSoundContext | null {
  const browser = globalThis as unknown as {
    AudioContext?: new () => BrowserSoundContext;
    webkitAudioContext?: new () => BrowserSoundContext;
  };
  const Constructor = browser.AudioContext ?? browser.webkitAudioContext;
  return Constructor ? new Constructor() : null;
}

export function createClickSoundEngine(
  createContext: () => BrowserSoundContext | null = createBrowserContext,
): ClickSoundEngine {
  let context: BrowserSoundContext | null = null;
  let buffer: SoundBuffer | null = null;
  let activeSource: SoundSource | null = null;
  let generation = 0;
  let disposed = false;

  function stop() {
    generation += 1;
    if (!activeSource) return;
    try {
      activeSource.stop();
    } finally {
      activeSource.disconnect();
      activeSource = null;
    }
  }

  return {
    async play() {
      if (disposed) return;
      // Creation and resume happen in the press gesture, as Safari requires.
      context ??= createContext();
      if (!context || context.state === "closed") return;
      const token = generation;
      if (context.state !== "running") await context.resume();
      if (disposed || token !== generation || context.state !== "running")
        return;
      if (!buffer) {
        buffer = context.createBuffer(
          1,
          Math.ceil(CLICK_DURATION_SECONDS * context.sampleRate),
          context.sampleRate,
        );
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index += 1) {
          samples[index] = clickSample(index / context.sampleRate);
        }
      }
      stop();
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        if (activeSource === source) activeSource = null;
      };
      activeSource = source;
      source.start(context.currentTime);
    },
    stop,
    async dispose() {
      disposed = true;
      stop();
      if (context && context.state !== "closed") await context.close();
      context = null;
      buffer = null;
    },
  };
}
