import { StyleSheet } from "react-native";
import { colors as C } from "./tokens";
export const phrasesStyles = StyleSheet.create({
  phraseCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.line,
    marginTop: 16,
  },
  phraseKo: { fontSize: 14, color: C.ink, marginTop: 20 },
  japanese: {
    fontSize: 20,
    lineHeight: 31,
    fontWeight: "600",
    color: C.ink,
    marginVertical: 12,
  },
  reading: { fontSize: 12, color: C.orange, lineHeight: 20 },
  word: {
    fontSize: 11,
    color: C.muted,
    marginVertical: 16,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  audioButton: { flexDirection: "row", gap: 6, alignItems: "center" },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "white",
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
  },
  searchInput: { flex: 1, fontSize: 13, color: C.ink },
});
