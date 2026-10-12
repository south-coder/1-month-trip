const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

// Record genuine preview interactions. Web Audio instrumentation observes the
// app's existing output without substituting playback or application state.
(async () => {
  const destination = path.resolve("artifacts/reel");
  fs.mkdirSync(destination, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 860, height: 1640 },
    deviceScaleFactor: 1,
  });
  const report = {
    passed: false,
    viewport: { width: 860, height: 1640 },
    presentationZoom: 2,
    durationTargetSeconds: 40,
    baseUrl: process.env.PREVIEW_BASE_URL || "http://127.0.0.1:8081",
    phases: [
      { from: 0, to: 4, screen: "home", topic: "루모와 여행 준비" },
      { from: 4, to: 11, screen: "trip", topic: "오사카 · 14일 여행 설정" },
      { from: 11, to: 17, screen: "curriculum/payment", topic: "학습 지도 검토" },
      { from: 17, to: 27, screen: "lesson", topic: "문제 풀이와 루모 피드백" },
      { from: 27, to: 33, screen: "profile/review", topic: "첫 시도 복습" },
      { from: 33, to: 38, screen: "phrases", topic: "표현 저장과 즐겨찾기" },
      { from: 38, to: 40, screen: "home", topic: "여행 준비 계속하기" },
    ],
    steps: [],
    taps: [],
    checks: [],
    audioStarts: [],
    pageErrors: [],
  };
  let page;
  let cdp;
  const frames=[];
  const frameDirectory=path.join(destination,"frames");
  fs.mkdirSync(frameDirectory,{recursive:true});
  let captureClock;
  let pageCreationBefore;
  let pageCreationAfter;
  let closeBefore;

  try {
    pageCreationBefore = performance.now();
    page = await context.newPage();
    pageCreationAfter = performance.now();

    page.setDefaultTimeout(8000);
    page.on("pageerror", (error) => report.pageErrors.push(error.message));

    await page.addInitScript(() => {
      window.__reelAudioStarts = [];
      const originalStart = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function (...args) {
        const startedAt = performance.now();
        const result = originalStart.apply(this, args);
        const buffer = this.buffer;
        let peak = 0;
        let finite = true;
        if (buffer) {
          for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
            for (const sample of buffer.getChannelData(channel)) {
              peak = Math.max(peak, Math.abs(sample));
              finite = finite && Number.isFinite(sample);
            }
          }
        }
        window.__reelAudioStarts.push({
          performanceMilliseconds: startedAt,
          scheduledContextSeconds: args[0] || this.context.currentTime,
          contextState: this.context.state,
          durationSeconds: buffer?.duration || 0,
          sampleRate: buffer?.sampleRate || 0,
          channels: buffer?.numberOfChannels || 0,
          peak,
          finite,
          loop: this.loop,
        });
        return result;
      };
    });

    await page.goto(report.baseUrl);
    await page
      .getByRole("button", { name: "예제 학습 시작하기", exact: true })
      .waitFor();
    await page.evaluate(async () => {
      document.documentElement.style.zoom = "2";
      await document.fonts.ready;
    });
    // Wait for font/layout paint before timing the actual presentation.
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(destination, "capture-home.png") });
    const navBounds = await page
      .getByRole("button", { name: "오늘", exact: true })
      .boundingBox();
    assert.ok(navBounds && navBounds.y + navBounds.height <= 1640);
    assert.equal(await page.getByText("LIVE PREVIEW", { exact: true }).count(), 0);

    cdp=await context.newCDPSession(page);
    cdp.on('Page.screencastFrame',event=>{
      const file=path.join(frameDirectory,`frame-${String(frames.length).padStart(6,'0')}.jpg`);
      fs.writeFileSync(file,Buffer.from(event.data,'base64'));
      frames.push({file,timestamp:event.metadata.timestamp});
      void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
    });
    await cdp.send('Page.startScreencast',{format:'jpeg',quality:95,maxWidth:860,maxHeight:1640,everyNthFrame:1});
    report.captureStartEpochSeconds=await page.evaluate(()=>Date.now()/1000);
    const clockBefore = performance.now();
    report.browserCaptureStartMilliseconds = await page.evaluate(
      () => performance.now(),
    );
    const clockAfter = performance.now();
    captureClock = (clockBefore + clockAfter) / 2;
    report.clockSamplingUncertaintyMilliseconds = (clockAfter - clockBefore) / 2;
    report.captureStartOffsetSeconds = (captureClock - pageCreationAfter) / 1000;
    report.captureStartOffsetRangeSeconds = {
      lower: (captureClock - pageCreationAfter) / 1000,
      upper: (captureClock - pageCreationBefore) / 1000,
    };

    const elapsed = () => (performance.now() - captureClock) / 1000;
    const waitUntil = async (targetSeconds) => {
      while (elapsed() < targetSeconds) {
        await page.waitForTimeout(
          Math.min(1000, Math.max(1, (targetSeconds - elapsed()) * 1000)),
        );
      }
    };
    const button = (name) => page.getByRole("button", { name, exact: true });
    const input = (name) => page.getByRole("textbox", { name, exact: true });
    const step = async (scheduledSeconds, label, action) => {
      await waitUntil(scheduledSeconds);
      const startedSeconds = elapsed();
      await action();
      report.steps.push({
        scheduledSeconds,
        startedSeconds,
        finishedSeconds: elapsed(),
        label,
      });
    };
    const click = async (name) => {
      const locator = button(name);
      await locator.scrollIntoViewIfNeeded();
      const bounds = await locator.boundingBox();
      assert.ok(bounds, `button bounds available: ${name}`);
      const tap = {
        name,
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        relativeSeconds: elapsed(),
      };
      await locator.click();
      tap.finishedSeconds = elapsed();
      report.taps.push(tap);
    };

    await step(4, "여행 카드 열기", () => click("여행 정보 수정"));
    await step(5.2, "오사카 선택", () => click("오사카"));
    await step(6.3, "학습 기간 보기", () => input("학습 기간").scrollIntoViewIfNeeded());
    await step(7.2, "학습 기간 14일 입력", async () => {
      await input("학습 기간").fill("14");
      assert.equal(await input("여행 지역").inputValue(), "오사카");
      assert.equal(await input("학습 기간").inputValue(), "14");
      report.checks.push("오사카 · 14일을 실제 여행 폼에 입력");
    });
    await step(8.5, "학습 지도 버튼 보기", () => button("학습 지도 미리보기").scrollIntoViewIfNeeded());
    await step(10.3, "학습 지도 생성", async () => {
      await click("학습 지도 미리보기");
      await page.getByText("14일 학습", { exact: true }).waitFor();
      await page.getByText("오사카에서 만날 순간,", { exact: false }).waitFor();
      report.checks.push("입력한 오사카 · 14일이 학습 지도에 연결");
    });
    await step(12, "커리큘럼 검토 완료 버튼 보기", () => button("예제 커리큘럼 검토 완료").scrollIntoViewIfNeeded());
    await step(13.2, "예제 커리큘럼 승인", async () => {
      await click("예제 커리큘럼 검토 완료");
      await page.getByText("미리보기 검토 완료", { exact: true }).waitFor();
      assert.equal(await button("실제 결제 · 연결 준비 중").isDisabled(), true);
      report.checks.push("커리큘럼 승인은 반영되고 실제 결제 버튼은 비활성화");
    });
    await step(14.5, "무료 체험 버튼 보기", () => button("무료 예제 화면 체험하기").scrollIntoViewIfNeeded());
    await step(16.2, "무료 예제 시작", async () => {
      await click("무료 예제 화면 체험하기");
      await page.getByText("문제 1 / 3", { exact: true }).waitFor();
    });
    await step(19.1, "일본어 답변 보기", () => button("二人です。").scrollIntoViewIfNeeded());
    await step(20, "二人です。 답변 선택", async () => {
      await click("二人です。");
      assert.equal(await button("二人です。").getAttribute("aria-selected"), "true");
    });
    await step(21.2, "답변 확인", async () => {
      await click("답변 확인하기");
      await page.getByText("잘했어요!", { exact: false }).waitFor();
      assert.equal(await button("二人です。").isDisabled(), true);
      report.checks.push("실제 답변 제출 후 정답 피드백 및 답변 잠금");
    });
    await step(22.5, "루모 정답 피드백 보기", async () => {
      await page.getByText("잘했어요!", { exact: false }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(destination, "capture-feedback.png") });
    });
    await step(27, "마이 트립 열기", () => click("마이 트립"));
    await step(28.3, "첫 시도 복습 노트", async () => {
      await click("나의 복습 노트");
      await page.getByText("최근 예제 학습", { exact: true }).waitFor();
      await page.getByText("二人です。", { exact: true }).waitFor();
      await page.getByText("정답", { exact: true }).waitFor();
      report.checks.push("완료 전 첫 시도도 복습 노트에 보존");
    });
    await step(30, "복습 표현 보기", async () => {
      await page.getByText("二人です。", { exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(destination, "capture-review.png") });
    });
    await step(33, "즉시 표현 열기", () => click("즉시 표현"));
    await step(34, "메뉴 표현 보기", () => button("메뉴를 보여 주세요. 저장").scrollIntoViewIfNeeded());
    await step(35.1, "메뉴 표현 저장", async () => {
      await click("메뉴를 보여 주세요. 저장");
      await button("메뉴를 보여 주세요. 저장 해제").waitFor();
    });
    await step(36.3, "저장한 표현 필터", async () => {
      await click("저장한 표현만 보기");
      await button("전체 표현 보기").waitFor();
      await page.getByText("メニューを見せてください。", { exact: true }).waitFor();
      assert.equal(await page.getByText("チェックインをお願いします。", { exact: true }).count(), 0);
      report.checks.push("메뉴 표현 저장 및 즐겨찾기 필터 실제 적용");
      await page.screenshot({ path: path.join(destination, "capture-favorites.png") });
    });
    await step(38, "오늘 화면으로 돌아가기", async () => {
      await click("오늘");
      await page.getByText("일본, 오사카", { exact: false }).waitFor();
    });
    await waitUntil(40);
    report.actualCaptureDurationSeconds = elapsed();
    report.audioStarts = await page.evaluate((baseline) =>
      window.__reelAudioStarts.map((start) => ({
        ...start,
        relativeSeconds: (start.performanceMilliseconds - baseline) / 1000,
      })),
    report.browserCaptureStartMilliseconds);
    assert.ok(report.audioStarts.length === report.taps.length, "each recorded button tap must start Web Audio");
    for (const start of report.audioStarts) {
      assert.equal(start.contextState, "running");
      assert.ok(start.durationSeconds > 0 && start.peak > 0);
      assert.equal(start.finite, true);
      assert.equal(start.loop, false);
    }
    assert.deepEqual(report.pageErrors, []);
    report.checks.push(`${report.audioStarts.length}회 실제 Web Audio 클릭음 재생 시작 검증`);
    report.passed = true;
  } catch (error) {
    report.error = error instanceof Error ? error.stack : String(error);
    process.exitCode = 1;
  } finally {
    closeBefore = performance.now();
    if(cdp){await cdp.send('Page.stopScreencast').catch(()=>{});}
    if (page && !page.isClosed()) await page.close();
    await context.close();
    await browser.close();
    if(frames.length>0){
      const first=frames[0].timestamp;
      const end=report.captureStartEpochSeconds+(closeBefore-captureClock)/1000+.25;
      const lines=['ffconcat version 1.0'];
      for(let i=0;i<frames.length;i++){
        lines.push(`file '${frames[i].file}'`);
        lines.push('option framerate 1000');
        lines.push(`duration ${Math.max(.001,(frames[i+1]?.timestamp??end)-frames[i].timestamp).toFixed(6)}`);
      }
      lines.push(`file '${frames[frames.length-1].file}'`);
      lines.push('option framerate 1000');
      const concat=path.join(destination,'capture-frames.ffconcat');
      fs.writeFileSync(concat,lines.join('\n')+'\n');
      const raw=path.join(destination,'raw.webm');
      execFileSync('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','concat','-safe','0','-i',concat,'-c:v','libvpx-vp9','-row-mt','1','-threads','4','-crf','18','-b:v','0','-r','30','-pix_fmt','yuv420p',raw],{stdio:'inherit'});
      report.rawVideo='artifacts/reel/raw.webm';
      report.rawStartOffsetSeconds=report.captureStartEpochSeconds-first;
      report.audioClicks=report.audioStarts.map(a=>({...a,t:a.relativeSeconds}));
      report.rawVideoDurationSeconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',raw],{encoding:'utf8'}).trim());
      report.recordedFrames=frames.length;
      fs.writeFileSync(path.join(destination,'capture.json'),JSON.stringify(report,null,2));
    }
    fs.writeFileSync(path.join(destination, "recording.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      passed: report.passed,
      rawVideo: report.rawVideo,
      durationSeconds: report.actualCaptureDurationSeconds,
      captureStartOffsetSeconds: report.captureStartOffsetSeconds,
      durationInferredStartOffsetSeconds: report.durationInferredStartOffsetSeconds,
      clicks: report.audioStarts.length,
      error: report.error,
    }, null, 2));
  }
})();
