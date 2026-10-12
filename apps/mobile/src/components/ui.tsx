import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";
import AppPressable from "./AppPressable";
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 22,
  color = C.green,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <AppPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        disabled && { opacity: 0.4 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: C.green }]}>
        {label}
      </Text>
      <Icon
        name="arrow-forward"
        size={18}
        color={secondary ? C.green : C.white}
      />
    </AppPressable>
  );
}
export function Chip({
  text,
  active = false,
  onPress,
}: {
  text: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <AppPressable
      accessibilityRole={onPress ? "button" : undefined}
      onPress={onPress}
      style={[
        s.chip,
        active && { backgroundColor: C.green, borderColor: C.green },
      ]}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? C.white : C.green,
        }}
      >
        {text}
      </Text>
    </AppPressable>
  );
}
export function Section({
  title,
  link,
  onPress,
}: {
  title: string;
  link?: string;
  onPress?: () => void;
}) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {link && (
        <AppPressable accessibilityRole="button" onPress={onPress}>
          <Text style={s.smallLink}>{link} ›</Text>
        </AppPressable>
      )}
    </View>
  );
}
export function Note({ children }: { children: React.ReactNode }) {
  return (
    <View style={s.note}>
      <Icon name="information-circle-outline" size={18} />
      <Text style={s.noteText}>{children}</Text>
    </View>
  );
}
