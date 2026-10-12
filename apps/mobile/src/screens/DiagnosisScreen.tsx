import React from "react";
import { View, Text } from "react-native";
import { Icon, Button, Note, IconName } from "../components/ui";
import { RumoGuide } from "../components/Rumo";
import { useApp } from "../app/AppProvider";
import { styles as s } from "../theme/styles";

export default function DiagnosisScreen() {
  const { go, startLesson } = useApp();
  return (
    <>
      <Text style={s.eyebrow}>STEP 01 · DISCOVER</Text>
      <Text style={s.h1}>지금의 실력에서{"\n"}시작하면 돼요.</Text>
      <RumoGuide message="문장·단어·듣기·말하기로 출발점을 알아봐요. 실제 진단 결과는 서버 평가 후 표시됩니다." />
      <View style={s.whiteCard}>
        {["문장 이해", "단어", "듣기", "말하기"].map((x, i) => (
          <View key={x} style={s.listRow}>
            <Icon
              name={
                (
                  [
                    "reader-outline",
                    "book-outline",
                    "headset-outline",
                    "mic-outline",
                  ] as IconName[]
                )[i]
              }
            />
            <Text style={s.cardTitle}>{x}</Text>
            <Text style={s.dim}>진단 준비 중</Text>
          </View>
        ))}
      </View>
      <Note>
        진단 배점과 음성 평가 공급자는 아직 확정되지 않았어요. 미리보기에서는
        점수와 랭크를 만들지 않습니다.
      </Note>
      <Button label="여행 정보 먼저 설정하기" onPress={() => go("trip")} />
      <Button secondary label="예제 문제 체험하기" onPress={startLesson} />
    </>
  );
}
