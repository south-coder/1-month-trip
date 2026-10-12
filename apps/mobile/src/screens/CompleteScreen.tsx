import React from "react";
import { Text, View } from "react-native";
import { useApp } from "../app/AppProvider";
import { Rumo } from "../components/Rumo";
import { Button, Note } from "../components/ui";
import { styles as s } from "../theme/styles";

export default function CompleteScreen() {
  const { go, lesson } = useApp();
  const { attempts } = lesson;

  return (
    <>
      <View style={s.welcomeArt}>
        <Rumo size={185} />
      </View>
      <Text style={s.eyebrow}>ONE STEP CLOSER</Text>
      <Text style={s.h1}>오늘의 작은 용기,{"\n"}여행에서 빛날 거예요.</Text>
      <View style={s.whiteCard}>
        <Text style={s.cardTitle}>예제 학습 결과</Text>
        <Text style={s.body}>
          시도 {attempts.length}개 · 정답{" "}
          {attempts.filter((attempt) => attempt.correct).length}개{"\n"}
          건너뛰기 {attempts.filter((attempt) => attempt.skipped).length}개
        </Text>
      </View>
      <Note>
        루모가 복습 노트에 오늘 배운 표현을 모아 두었어요. 예제 기록은 현재
        미리보기 세션에만 남으며, 검증된 랭크에는 반영되지 않습니다.
      </Note>
      <Button label="복습 노트 보기" onPress={() => go("review")} />
      <Button secondary label="오늘 화면으로" onPress={() => go("home")} />
    </>
  );
}
