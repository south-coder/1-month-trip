import React from "react";
import { useSound } from "../features/sound";
import AppPressable from "./AppPressable";
import { Icon } from "./ui";
import { styles as s } from "../theme/styles";
export default function SoundToggle() {
  const { enabled, toggle } = useSound();
  return (
    <AppPressable
      sound={false}
      accessibilityRole="button"
      accessibilityLabel={enabled ? "클릭 소리 끄기" : "클릭 소리 켜기"}
      accessibilityState={{ selected: enabled }}
      onPress={toggle}
      style={s.round}
    >
      <Icon
        name={enabled ? "volume-medium-outline" : "volume-mute-outline"}
        size={20}
      />
    </AppPressable>
  );
}
