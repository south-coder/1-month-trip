export type Screen =
  | "home"
  | "welcome"
  | "diagnosis"
  | "trip"
  | "curriculum"
  | "payment"
  | "lesson"
  | "review"
  | "phrases"
  | "profile"
  | "complete";
export type Journey = {
  screen: Screen;
  history: Screen[];
  destination: string;
  days: string;
  departure: string;
  timezone: string;
  companion: string;
  people: string;
  approved: boolean;
  favorites: string[];
};
export const initialJourney: Journey = {
  screen: "home",
  history: [],
  destination: "도쿄",
  days: "30",
  departure: "",
  timezone: "Asia/Seoul",
  companion: "친구",
  people: "2",
  approved: false,
  favorites: [],
};
export type Action =
  | { type: "go"; screen: Screen }
  | { type: "back" }
  | {
      type: "edit";
      field:
        | "destination"
        | "days"
        | "departure"
        | "timezone"
        | "companion"
        | "people";
      value: string;
    }
  | { type: "approve" }
  | { type: "favorite"; id: string };
export function journeyReducer(s: Journey, a: Action): Journey {
  switch (a.type) {
    case "go":
      return { ...s, screen: a.screen, history: [...s.history, s.screen] };
    case "back":
      return s.history.length
        ? {
            ...s,
            screen: s.history[s.history.length - 1],
            history: s.history.slice(0, -1),
          }
        : s;
    case "edit":
      return { ...s, [a.field]: a.value, approved: false };
    case "approve":
      return { ...s, approved: true };
    case "favorite":
      return {
        ...s,
        favorites: s.favorites.includes(a.id)
          ? s.favorites.filter((x) => x !== a.id)
          : [...s.favorites, a.id],
      };
  }
}
export function validateTrip(s: Journey): string | null {
  if (!s.destination.trim()) return "여행 지역을 입력해 주세요.";
  if (!/^\d+$/.test(s.days) || Number(s.days) < 1 || Number(s.days) > 30)
    return "학습 기간은 1~30일로 입력해 주세요.";
  if (!/^\d+$/.test(s.people) || Number(s.people) < 1 || Number(s.people) > 100)
    return "여행 인원을 1~100명으로 입력해 주세요.";
  try {
    new Intl.DateTimeFormat("ko", { timeZone: s.timezone });
  } catch {
    return "올바른 IANA 시간대를 입력해 주세요.";
  }
  return null;
}
