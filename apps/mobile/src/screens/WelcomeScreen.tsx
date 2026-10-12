import React from "react";
import { View, Text } from "react-native";
import { Button } from "../components/ui";
import { Rumo } from "../components/Rumo";
import { useApp } from "../app/AppProvider";
import { styles as s } from "../theme/styles";

export default function WelcomeScreen() {
  const { go } = useApp();
  return (
    <>
      <View style={s.welcomeArt}>
        <Rumo size={210} />
      </View>
      <Text style={s.eyebrow}>HELLO, TRAVELER</Text>
      <Text style={s.h1}>
        안녕! 나는 루모야.{"\n"}이번 여행, 같이 준비하자.
      </Text>
      <Text style={s.body}>
        내 실력과 여행 일정에 맞춘 일본어.{"\n"}외우는 공부를 넘어, 여행에서
        직접 쓰는 말로.
      </Text>
      {[
        "내 실력 알아보기",
        "여행과 학습 일정 정하기",
        "커리큘럼 검토 후 시작하기",
      ].map((x, i) => (
        <View key={x} style={s.stepRow}>
          <View style={s.stepCircle}>
            <Text style={s.smallLink}>{i + 1}</Text>
          </View>
          <Text style={s.cardTitle}>{x}</Text>
        </View>
      ))}
      <Button label="나에게 맞는 학습 찾기" onPress={() => go("diagnosis")} />
    </>
  );
}
