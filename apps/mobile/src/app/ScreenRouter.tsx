import React from "react";
import { useApp } from "./AppProvider";
import HomeScreen from "../screens/HomeScreen";
import WelcomeScreen from "../screens/WelcomeScreen";
import DiagnosisScreen from "../screens/DiagnosisScreen";
import TripScreen from "../screens/TripScreen";
import CurriculumScreen from "../screens/CurriculumScreen";
import PaymentScreen from "../screens/PaymentScreen";
import LessonScreen from "../screens/LessonScreen";
import CompleteScreen from "../screens/CompleteScreen";
import ReviewScreen from "../screens/ReviewScreen";
import PhrasesScreen from "../screens/PhrasesScreen";
import ProfileScreen from "../screens/ProfileScreen";
const screens = {
  home: HomeScreen,
  welcome: WelcomeScreen,
  diagnosis: DiagnosisScreen,
  trip: TripScreen,
  curriculum: CurriculumScreen,
  payment: PaymentScreen,
  lesson: LessonScreen,
  complete: CompleteScreen,
  review: ReviewScreen,
  phrases: PhrasesScreen,
  profile: ProfileScreen,
};
export default function ScreenRouter() {
  const { state } = useApp();
  const Component = screens[state.screen];
  return <Component />;
}
