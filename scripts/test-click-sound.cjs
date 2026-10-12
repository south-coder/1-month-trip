const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    headless: true,
    args: ["--no-sandbox"],
  });
  const report = {
    passed: false,
    checks: [],
    audio: null,
    mediaRequests: [],
    pageErrors: [],
    limitation:
      "Verifies real Web Audio playback starts, not speaker hardware.",
  };
  let page;

  try {
    page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    page.on("pageerror", (error) => report.pageErrors.push(error.message));
    page.on("request", (request) => {
      if (request.resourceType() === "media") {
        report.mediaRequests.push(request.url());
      }
    });

    await page.addInitScript(() => {
      const probe = { contexts: [], starts: [] };
      window.__clickAudioProbe = probe;

      // Instrument the real constructors; the browser's output remains intact.
      for (const name of ["AudioContext", "webkitAudioContext"]) {
        const OriginalContext = window[name];
        if (!OriginalContext) continue;
        window[name] = new Proxy(OriginalContext, {
          construct(target, args, newTarget) {
            const context = Reflect.construct(target, args, newTarget);
            probe.contexts.push(context);
            return context;
          },
        });
      }

      const originalStart = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        const result = originalStart.apply(this, args);
        const buffer = this.buffer;
        let peak = 0;
        let finite = true;
        if (buffer) {
          for (
            let channel = 0;
            channel < buffer.numberOfChannels;
            channel += 1
          ) {
            for (const sample of buffer.getChannelData(channel)) {
              peak = Math.max(peak, Math.abs(sample));
              finite = finite && Number.isFinite(sample);
            }
          }
        }
        probe.starts.push({
          timestamp: performance.now(),
          contextState: this.context.state,
          duration: buffer?.duration ?? 0,
          channels: buffer?.numberOfChannels ?? 0,
          sampleRate: buffer?.sampleRate ?? 0,
          peak,
          finite,
          loop: this.loop,
        });
        return result;
      };
    });

    const snapshot = () =>
      page.evaluate(() => {
        const probe = window.__clickAudioProbe;
        return {
          contexts: probe.contexts.map((context) => ({
            state: context.state,
            sampleRate: context.sampleRate,
          })),
          starts: [...probe.starts],
        };
      });

    const countStarts = () =>
      page.evaluate(() => window.__clickAudioProbe.starts.length);

    async function clickWithSound(name, check) {
      // Wait only for the existing 45 ms click throttle; no long fixed sleeps.
      await page.waitForFunction(() => {
        const starts = window.__clickAudioProbe.starts;
        return (
          starts.length === 0 ||
          performance.now() - starts[starts.length - 1].timestamp >= 65
        );
      });
      const before = await countStarts();
      await page.getByRole("button", { name, exact: true }).click();
      await page.waitForFunction(
        (previous) => window.__clickAudioProbe.starts.length > previous,
        before,
        { timeout: 5000 },
      );
      assert.equal(await countStarts(), before + 1, `${check}: one sound`);
      report.checks.push(check);
    }

    async function clickWithoutSound(name, check) {
      const before = await countStarts();
      await page.getByRole("button", { name, exact: true }).click();
      // Audio starts synchronously after the gesture; allow React to settle too.
      await page.waitForTimeout(80);
      assert.equal(await countStarts(), before, `${check}: no sound`);
      report.checks.push(check);
    }

    await page.goto(process.env.PREVIEW_BASE_URL || "http://127.0.0.1:8081");
    await page
      .getByRole("button", { name: "예제 학습 시작하기", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    report.audio = await snapshot();
    assert.deepEqual(
      report.audio.contexts,
      [],
      "no AudioContext before a gesture",
    );
    assert.deepEqual(report.audio.starts, [], "no autoplay before a gesture");
    report.checks.push("no audio context or autoplay before user interaction");

    await clickWithSound(
      "예제 학습 시작하기",
      "first button starts local audio",
    );
    await page
      .getByRole("button", { name: "답변 확인하기", exact: true })
      .waitFor();
    report.checks.push("first button still navigates to the lesson");

    await clickWithSound("二人です。", "answer choice starts local audio");
    assert.equal(
      await page
        .getByRole("button", { name: "二人です。", exact: true })
        .getAttribute("aria-selected"),
      "true",
      "answer state updates alongside sound",
    );

    await clickWithoutSound("클릭 소리 끄기", "header mute toggle stays quiet");
    await page
      .getByRole("button", { name: "클릭 소리 켜기", exact: true })
      .waitFor();
    await clickWithoutSound("一人です。", "muted answer has no audio");
    assert.equal(
      await page
        .getByRole("button", { name: "一人です。", exact: true })
        .getAttribute("aria-selected"),
      "true",
      "muting preserves answer selection",
    );

    await clickWithoutSound("즉시 표현", "muted navigation has no audio");
    await page.getByText("여행 중 바로 쓰기", { exact: true }).waitFor();
    await clickWithoutSound("오늘", "muted navigation returns home");
    await page
      .getByRole("button", { name: "예제 학습 시작하기", exact: true })
      .waitFor();
    await clickWithoutSound(
      "예제 학습 시작하기",
      "mute survives screen changes",
    );
    await page
      .getByRole("button", { name: "답변 확인하기", exact: true })
      .waitFor();
    await clickWithoutSound(
      "二人です。",
      "muted lesson answers remain interactive",
    );

    await clickWithoutSound(
      "클릭 소리 켜기",
      "header unmute toggle stays quiet",
    );
    await page
      .getByRole("button", { name: "클릭 소리 끄기", exact: true })
      .waitFor();
    await clickWithSound("一人です。", "unmute restores answer audio");
    await clickWithSound("즉시 표현", "unmute restores navigation audio");
    await page.getByText("여행 중 바로 쓰기", { exact: true }).waitFor();

    report.audio = await snapshot();
    assert.equal(report.audio.contexts.length, 1, "one reusable audio context");
    assert.equal(
      report.audio.starts.length,
      4,
      "only enabled actions play audio",
    );
    for (const start of report.audio.starts) {
      assert.equal(start.contextState, "running", "audio context is running");
      assert.ok(
        start.duration >= 0.055 && start.duration <= 0.065,
        "60 ms tone",
      );
      assert.equal(start.channels, 1, "single channel click");
      assert.ok(
        start.peak > 0.02 && start.peak < 0.12,
        "quiet nonzero amplitude",
      );
      assert.equal(start.finite, true, "valid audio samples");
      assert.equal(start.loop, false, "effect never loops");
    }
    report.checks.push(
      "real playback uses a short, quiet, non-looping local buffer",
    );
    assert.deepEqual(report.mediaRequests, [], "no media downloads needed");
    assert.deepEqual(report.pageErrors, [], "no runtime errors");
    report.passed = true;
    console.log(
      "Click sound browser checks passed; 4 real audio buffer starts.",
    );
  } catch (error) {
    report.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (page) {
      try {
        report.audio = await page.evaluate(() => {
          const probe = window.__clickAudioProbe;
          return probe
            ? {
                contexts: probe.contexts.map((context) => ({
                  state: context.state,
                  sampleRate: context.sampleRate,
                })),
                starts: [...probe.starts],
              }
            : null;
        });
      } catch {
        // Preserve any earlier evidence if the page failed to load.
      }
    }
    fs.mkdirSync("artifacts", { recursive: true });
    fs.writeFileSync(
      "artifacts/sound-browser-test.json",
      JSON.stringify(report, null, 2),
    );
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
