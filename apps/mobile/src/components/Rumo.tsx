import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "react-native";
import rumoAsset from "../../assets/rumo.png";
import { colors as C } from "../theme/tokens";
export function Rumo({ size = 130 }: { size?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        overflow: "hidden",
        borderRadius: 22,
      }}
    >
      <Image
        accessibilityLabel="여행 가방을 멘 루모"
        source={rumoAsset}
        style={{
          width: size * 3.16,
          height: size * 2.37,
          position: "absolute",
          left: -size * 0.01,
          top: -size * 0.01,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export function RumoGuide({
  message,
  size = 64,
}: {
  message: string;
  size?: number;
}) {
  return (
    <View style={guide.row}>
      <Rumo size={size} />
      <View style={guide.bubble}>
        <Text style={guide.name}>루모</Text>
        <Text style={guide.message}>{message}</Text>
      </View>
    </View>
  );
}
const guide = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 16,
  },
  bubble: {
    flex: 1,
    backgroundColor: "#EDF1E6",
    borderRadius: 16,
    padding: 13,
  },
  name: { color: C.orange, fontSize: 10, fontWeight: "700", marginBottom: 4 },
  message: { color: C.green, fontSize: 12, lineHeight: 20 },
});
