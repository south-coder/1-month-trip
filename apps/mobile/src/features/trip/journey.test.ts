import { describe, it, expect } from "vitest";
import { initialJourney, journeyReducer, validateTrip } from "./journey";
describe("preview journey", () => {
  it("retains form when navigating back", () => {
    let s = journeyReducer(initialJourney, {
      type: "edit",
      field: "destination",
      value: "오사카",
    });
    s = journeyReducer(s, { type: "go", screen: "trip" });
    s = journeyReducer(s, { type: "go", screen: "curriculum" });
    s = journeyReducer(s, { type: "back" });
    expect(s.screen).toBe("trip");
    expect(s.destination).toBe("오사카");
  });
  it("invalidates approval after changes", () => {
    const s = journeyReducer(
      journeyReducer(initialJourney, { type: "approve" }),
      { type: "edit", field: "days", value: "14" },
    );
    expect(s.approved).toBe(false);
  });
  it("rejects missing and invalid inputs", () => {
    for (const days of ["0", "31", "1.5", "abc"])
      expect(validateTrip({ ...initialJourney, days })).not.toBeNull();
    expect(validateTrip({ ...initialJourney, destination: "" })).not.toBeNull();
    expect(validateTrip({ ...initialJourney, timezone: "bad" })).not.toBeNull();
  });
  it("allows supported duration boundaries", () => {
    for (const days of ["1", "30"])
      expect(validateTrip({ ...initialJourney, days })).toBeNull();
  });
  it("toggles favorites without duplicates", () => {
    let s = journeyReducer(initialJourney, { type: "favorite", id: "food" });
    expect(s.favorites).toEqual(["food"]);
    s = journeyReducer(s, { type: "favorite", id: "food" });
    expect(s.favorites).toEqual([]);
  });
  it("navigates all planned screens", () => {
    let s = initialJourney;
    for (const screen of [
      "welcome",
      "diagnosis",
      "trip",
      "curriculum",
      "payment",
      "lesson",
      "complete",
      "review",
      "phrases",
      "profile",
    ] as const) {
      s = journeyReducer(s, { type: "go", screen });
      expect(s.screen).toBe(screen);
    }
  });
});
