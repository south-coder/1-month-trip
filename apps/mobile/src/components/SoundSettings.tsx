import React from "react";
import { View, Text } from "react-native";
import { useSound } from "../features/sound";
import AppPressable from "./AppPressable";
import { Icon } from "./ui";
import { styles as s } from "../theme/styles";
export default function SoundSettings() {
  const { enabled, toggle } = useSound();
  return (
    <AppPressable
      sound={false}
      accessibilityRole="switch"
      accessibilityLabel="클릭 소리"
      accessibilityState={{ checked: enabled }}
      onPress={toggle}
      style={s.quickCard}
    >
      <Icon name={enabled ? "volume-medium-outline" : "volume-mute-outline"} />
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>클릭 소리</Text>
        <Text style={s.dim}>버튼과 답안을 누를 때 짧게 들려요</Text>
      </View>
      <Text style={s.smallLink}>{enabled ? "켜짐" : "꺼짐"}</Text>
    </AppPressable>
  );
}
