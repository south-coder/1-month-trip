import { Platform } from "react-native";
export async function copyPhrase(
  text: string,
  notify: (message: string) => void,
) {
  if (Platform.OS !== "web" || !navigator.clipboard) {
    notify("표현을 길게 눌러 복사해 주세요.");
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    notify("일본어 표현을 복사했어요.");
  } catch {
    notify("복사 권한이 없습니다. 표현을 직접 선택해 주세요.");
  }
}
