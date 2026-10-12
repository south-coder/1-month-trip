import type { Screen } from "../features/trip/journey";
export const screenTitles: Record<Screen, string> = {
  home: "오늘",
  welcome: "여행을 위한 작은 시작",
  diagnosis: "내 실력 알아보기",
  trip: "나의 여행 만들기",
  curriculum: "나만의 학습 지도",
  payment: "프로그램 이용권",
  lesson: "오늘의 학습",
  complete: "오늘도 한 걸음",
  review: "복습 노트",
  phrases: "여행 중 바로 쓰기",
  profile: "마이 트립",
};
export const navigationItems = [
  { screen: "home", label: "오늘", icon: "home-outline" },
  { screen: "curriculum", label: "학습 지도", icon: "map-outline" },
  { screen: "phrases", label: "즉시 표현", icon: "chatbubbles-outline" },
  { screen: "profile", label: "마이 트립", icon: "person-outline" },
] as const;
