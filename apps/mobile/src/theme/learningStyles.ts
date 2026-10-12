import { StyleSheet } from "react-native";
import { colors as C } from "./tokens";
export const learningStyles = StyleSheet.create({
  sceneCard: {
    backgroundColor: "#EBEFD9",
    alignItems: "center",
    justifyContent: "center",
    height: 135,
    borderRadius: 18,
    marginVertical: 18,
  },
  sceneCaption: {
    fontSize: 9,
    letterSpacing: 2,
    color: C.green,
    marginTop: 15,
  },
  question: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: "600",
    color: C.ink,
    marginBottom: 18,
  },
  option: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  selected: { borderColor: C.green, backgroundColor: "#EEF2E7" },
  correct: { borderColor: C.green, borderWidth: 2 },
  optionCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: { fontSize: 15, color: C.ink, flex: 1 },
  feedback: {
    backgroundColor: "#E7EDDA",
    padding: 16,
    borderRadius: 13,
    marginVertical: 10,
  },
  tip: { fontSize: 11, lineHeight: 20, color: "#88916C", marginVertical: 13 },
});
