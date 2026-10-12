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
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:8081");
    await page
      .getByRole("button", { name: "예제 학습 시작하기", exact: true })
      .waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: "artifacts/ios-home.png" });
    await page
      .getByRole("button", { name: "예제 학습 시작하기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "답변 확인하기", exact: true })
      .click();
    await page.getByText("답변을 선택해 주세요.").waitFor();
    await page.getByRole("button", { name: "二人です。", exact: true }).click();
    await page
      .getByRole("button", { name: "답변 확인하기", exact: true })
      .click();
    await page.getByText("잘했어요!").waitFor();
    await page.screenshot({ path: "artifacts/ios-lesson.png" });
    await page.getByRole("button", { name: "다음 문제", exact: true }).click();
    await page.getByRole("button", { name: "힌트 보기", exact: false }).click();
    await page
      .getByRole("button", { name: "これをください。", exact: true })
      .click();
    await page
      .getByRole("button", { name: "답변 확인하기", exact: true })
      .click();
    await page.getByRole("button", { name: "다음 문제", exact: true }).click();
    await page.getByRole("button", { name: "건너뛰기", exact: false }).click();
    await page.getByText("시도 3개 · 정답 2개", { exact: false }).waitFor();
    await page
      .getByRole("button", { name: "복습 노트 보기", exact: true })
      .click();
    await page.getByText("건너뛰기", { exact: true }).waitFor();
    await page.getByRole("button", { name: "즉시 표현", exact: true }).click();
    await page
      .getByRole("button", { name: "메뉴를 보여 주세요. 저장", exact: true })
      .click();
    await page
      .getByRole("button", { name: "저장한 표현만 보기", exact: true })
      .click();
    assert.equal(
      await page
        .getByText("チェックインをお願いします。", { exact: true })
        .count(),
      0,
    );
    await page.screenshot({ path: "artifacts/ios-phrases.png" });
    await page.getByRole("button", { name: "마이 트립", exact: true }).click();
    await page.getByText("개발 API: 연결 정상", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "여행 정보 수정", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "학습 기간", exact: true })
      .fill("31");
    await page
      .getByRole("button", { name: "학습 지도 미리보기", exact: true })
      .click();
    await page.getByText("학습 기간은 1~30일로 입력해 주세요.").waitFor();
    await page
      .getByRole("textbox", { name: "학습 기간", exact: true })
      .fill("14");
    await page
      .getByRole("textbox", { name: "여행 지역", exact: true })
      .fill("오사카");
    await page
      .getByRole("button", { name: "학습 지도 미리보기", exact: true })
      .click();
    await page
      .getByRole("button", { name: "여행 정보 수정하기", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("textbox", { name: "여행 지역", exact: true })
        .inputValue(),
      "오사카",
    );
    await page
      .getByRole("button", { name: "학습 지도 미리보기", exact: true })
      .click();
    await page.screenshot({ path: "artifacts/ios-curriculum.png" });
    await page
      .getByRole("button", { name: "예제 커리큘럼 검토 완료", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "실제 결제 · 연결 준비 중", exact: true })
        .isDisabled(),
      true,
    );
    await page.getByRole("button", { name: "오늘", exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const previewButton = page.getByRole("button", {
      name: "예제 학습 시작하기",
      exact: true,
    });
    const bounds = await previewButton.boundingBox();
    assert.ok(
      bounds && bounds.width > 250,
      "desktop phone content must retain its width",
    );
    await page.screenshot({ path: "artifacts/ios-desktop-preview.png" });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "artifacts/preview-test.json",
      JSON.stringify(
        {
          passed: true,
          checks: [
            "lesson validation, answers, hint, skip, summary",
            "review preserves first attempt",
            "favorite filter",
            "live API health",
            "duration validation",
            "form preservation",
            "purchase disabled",
          ],
          pageErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log("Preview functional checks passed; 5 screenshots saved.");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
