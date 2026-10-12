import { Pressable, type PressableProps } from "react-native";
import { createSoundPressHandler } from "../features/sound/clickPress";
import { useSound } from "../features/sound";

export interface AppPressableProps extends PressableProps {
  /** Use false for the sound toggle itself or other intentionally quiet controls. */
  sound?: boolean;
}

export function AppPressable({
  onPress,
  disabled,
  accessibilityState,
  sound = true,
  ...props
}: AppPressableProps) {
  const { playClick } = useSound();
  const effectiveDisabled =
    disabled ?? props["aria-disabled"] ?? accessibilityState?.disabled;
  const selected = props["aria-selected"] ?? accessibilityState?.selected;
  const checked = props["aria-checked"] ?? accessibilityState?.checked;
  const handlePress = createSoundPressHandler(
    onPress,
    sound ? playClick : () => undefined,
    effectiveDisabled,
  );
  return (
    <Pressable
      {...props}
      accessibilityState={{
        ...accessibilityState,
        disabled: effectiveDisabled,
        selected,
        checked,
      }}
      aria-disabled={effectiveDisabled}
      aria-selected={selected}
      aria-checked={checked}
      disabled={effectiveDisabled}
      onPress={handlePress}
    />
  );
}

export default AppPressable;
