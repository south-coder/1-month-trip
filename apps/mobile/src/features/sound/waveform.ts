/** A quiet, 60 ms original tone. No network request or recording permission. */
export const CLICK_DURATION_SECONDS = 0.06;

export function clickSample(timeSeconds: number): number {
  if (timeSeconds <= 0 || timeSeconds >= CLICK_DURATION_SECONDS) return 0;
  const envelope =
    Math.min(timeSeconds / 0.003, 1) *
    Math.pow(1 - timeSeconds / CLICK_DURATION_SECONDS, 2);
  return (
    0.1 *
    envelope *
    (Math.sin(2 * Math.PI * 1046.5 * timeSeconds) +
      0.18 * Math.sin(2 * Math.PI * 1568 * timeSeconds))
  );
}
