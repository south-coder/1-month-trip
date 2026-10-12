import { describe, expect, it, vi } from "vitest";
import { createClickSoundController } from "./clickController";
import { createSoundPressHandler } from "./clickPress";
import { createClickSoundEngine, type BrowserSoundContext } from "./engine.web";
import { createNativeClickSoundEngine } from "./nativePlayback";
import { CLICK_DURATION_SECONDS, clickSample } from "./waveform";

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function mockEngine() {
  return { play: vi.fn(), stop: vi.fn(), dispose: vi.fn() };
}

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("button sound feedback", () => {
  it("does not attach sound handlers to decorative or disabled controls", () => {
    const sound = vi.fn();
    const action = vi.fn();
    expect(createSoundPressHandler(undefined, sound)).toBeUndefined();
    expect(createSoundPressHandler(action, sound, true)).toBeUndefined();
    expect(sound).not.toHaveBeenCalled();
    expect(action).not.toHaveBeenCalled();
  });

  it("plays before the action and preserves the original press event", () => {
    const order: string[] = [];
    const event = { target: "answer" };
    const action = vi.fn(() => order.push("answer"));
    const handler = createSoundPressHandler(action, () => order.push("sound"));
    handler?.(event);
    expect(order).toEqual(["sound", "answer"]);
    expect(action).toHaveBeenCalledWith(event);
  });

  it("audio failures never swallow the action", () => {
    const action = vi.fn();
    createSoundPressHandler(action, () => {
      throw new Error("audio unavailable");
    })?.({});
    expect(action).toHaveBeenCalledOnce();
  });
});

describe("click sound controller", () => {
  it("muting stops playback and suppresses future clicks until re-enabled", async () => {
    const engine = mockEngine();
    let time = 100;
    const controller = createClickSoundController(engine, () => time);
    controller.play();
    await flush();
    controller.setEnabled(false);
    time += 100;
    controller.play();
    expect(engine.stop).toHaveBeenCalledOnce();
    expect(engine.play).toHaveBeenCalledOnce();
    controller.setEnabled(true);
    controller.play();
    expect(engine.play).toHaveBeenCalledTimes(2);
  });

  it("bounds rapid taps and pending audio activation without building a queue", async () => {
    const activation = deferred();
    const engine = mockEngine();
    engine.play.mockReturnValueOnce(activation.promise);
    let time = 0;
    const controller = createClickSoundController(engine, () => time);
    for (let index = 0; index < 50; index += 1) {
      time += 100;
      controller.play();
    }
    expect(engine.play).toHaveBeenCalledOnce();
    activation.resolve();
    await flush();
    time += 100;
    controller.play();
    await flush();
    time += 20;
    controller.play();
    expect(engine.play).toHaveBeenCalledTimes(2);
  });

  it("recovers from both synchronous and asynchronous playback failures", async () => {
    const engine = mockEngine();
    engine.play
      .mockImplementationOnce(() => {
        throw new Error("missing device");
      })
      .mockRejectedValueOnce(new Error("autoplay denied"));
    let time = 0;
    const controller = createClickSoundController(engine, () => time);
    expect(() => controller.play()).not.toThrow();
    time += 100;
    controller.play();
    await flush();
    time += 100;
    controller.play();
    expect(engine.play).toHaveBeenCalledTimes(3);
  });

  it("releases resources once and ignores clicks after unmount", () => {
    const engine = mockEngine();
    const controller = createClickSoundController(engine);
    controller.dispose();
    controller.dispose();
    controller.play();
    expect(engine.dispose).toHaveBeenCalledOnce();
    expect(engine.play).not.toHaveBeenCalled();
  });
});

function browserContext(state = "running") {
  const samples = new Float32Array(2880);
  const sources: ReturnType<typeof source>[] = [];
  function source() {
    return {
      buffer: null,
      onended: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  const context: BrowserSoundContext = {
    state,
    sampleRate: 48000,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      context.state = "running";
    }),
    close: vi.fn(async () => {
      context.state = "closed";
    }),
    createBuffer: vi.fn(() => ({ getChannelData: () => samples })),
    createBufferSource: vi.fn(() => {
      const created = source();
      sources.push(created);
      return created;
    }),
  };
  return { context, sources, samples };
}

describe("browser click playback", () => {
  it("creates audio only after a gesture, plays a short quiet local buffer, and bounds sources", async () => {
    const { context, sources, samples } = browserContext();
    const createContext = vi.fn(() => context);
    const engine = createClickSoundEngine(createContext);
    expect(createContext).not.toHaveBeenCalled();
    await engine.play();
    expect(sources[0].start).toHaveBeenCalledOnce();
    expect(samples.some((sample) => sample !== 0)).toBe(true);
    expect(Math.max(...samples.map(Math.abs))).toBeLessThan(0.12);
    await engine.play();
    expect(createContext).toHaveBeenCalledOnce();
    expect(sources[0].stop).toHaveBeenCalledOnce();
    expect(sources[1].start).toHaveBeenCalledOnce();
    await engine.dispose();
    expect(sources[1].stop).toHaveBeenCalledOnce();
    expect(context.close).toHaveBeenCalledOnce();
  });

  it("does not play a stale click after muting during Safari audio resume", async () => {
    const { context, sources } = browserContext("suspended");
    const resume = deferred();
    context.resume = vi.fn(() => resume.promise);
    const engine = createClickSoundEngine(() => context);
    const playback = engine.play();
    expect(context.resume).toHaveBeenCalledOnce();
    engine.stop();
    context.state = "running";
    resume.resolve();
    await playback;
    expect(sources).toHaveLength(0);
  });

  it("has a silent fallback when Web Audio is unavailable", async () => {
    const engine = createClickSoundEngine(() => null);
    await expect(engine.play()).resolves.toBeUndefined();
    await expect(engine.dispose()).resolves.toBeUndefined();
  });
});

describe("native click playback", () => {
  function player() {
    return {
      volume: 1,
      play: vi.fn(),
      pause: vi.fn(),
      seekTo: vi.fn(async (): Promise<void> => undefined),
      remove: vi.fn(),
    };
  }

  it("reuses the local player, rewinds each click, and releases it on unmount", async () => {
    const audio = player();
    const factory = vi.fn(() => audio);
    const prepare = vi.fn(async () => undefined);
    const engine = createNativeClickSoundEngine(factory, prepare);
    await engine.play();
    await engine.play();
    expect(factory).toHaveBeenCalledOnce();
    expect(prepare).toHaveBeenCalledOnce();
    expect(audio.seekTo).toHaveBeenNthCalledWith(2, 0);
    expect(audio.play).toHaveBeenCalledTimes(2);
    engine.dispose();
    engine.dispose();
    expect(audio.remove).toHaveBeenCalledOnce();
    await engine.play();
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it("cancels a pending native seek when the user mutes the sound", async () => {
    const audio = player();
    const seek = deferred();
    audio.seekTo.mockReturnValueOnce(seek.promise);
    const engine = createNativeClickSoundEngine(
      () => audio,
      async () => undefined,
    );
    const playback = engine.play();
    await flush();
    engine.stop();
    seek.resolve();
    await playback;
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.play).not.toHaveBeenCalled();
  });

  it("allows a new gesture to retry a failed audio session setup", async () => {
    const audio = player();
    const prepare = vi
      .fn()
      .mockRejectedValueOnce(new Error("session unavailable"))
      .mockResolvedValueOnce(undefined);
    const engine = createNativeClickSoundEngine(() => audio, prepare);
    await expect(engine.play()).rejects.toThrow("session unavailable");
    await engine.play();
    expect(prepare).toHaveBeenCalledTimes(2);
    expect(audio.play).toHaveBeenCalledOnce();
  });
});

describe("original click waveform", () => {
  it("has silent boundaries and finite samples within a quiet amplitude", () => {
    expect(clickSample(0)).toBe(0);
    expect(clickSample(CLICK_DURATION_SECONDS)).toBe(0);
    for (let index = 0; index < 1323; index += 1) {
      const sample = clickSample(index / 22050);
      expect(Number.isFinite(sample)).toBe(true);
      expect(Math.abs(sample)).toBeLessThan(0.12);
    }
  });
});
