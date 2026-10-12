import { describe, it, expect, vi } from "vitest";
import { checkHealth } from "./api";
describe("API connectivity", () => {
  it("accepts only successful health response", async () => {
    expect(
      await checkHealth(
        "http://api",
        vi
          .fn()
          .mockResolvedValue(new Response(JSON.stringify({ status: "ok" }))),
      ),
    ).toBe("online");
  });
  it("shows unavailable server", async () => {
    expect(
      await checkHealth(
        "http://api",
        vi.fn().mockRejectedValue(new Error("offline")),
      ),
    ).toBe("error");
  });
  it("rejects bad status or malformed data", async () => {
    expect(
      await checkHealth(
        "http://api",
        vi.fn().mockResolvedValue(new Response("{}", { status: 503 })),
      ),
    ).toBe("error");
  });
});
