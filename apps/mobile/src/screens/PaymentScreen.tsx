import React from "react";
import { View, Text } from "react-native";
import { Button, Note } from "../components/ui";
import { RumoGuide } from "../components/Rumo";
import { useApp } from "../app/AppProvider";
import { styles as s } from "../theme/styles";

export default function PaymentScreen() {
  const { state, startLesson } = useApp();
  return (
    <>
      <Text style={s.eyebrow}>STEP 03 · READY WHEN YOU ARE</Text>
      <Text style={s.h1}>학습 시작 전,{"\n"}이용권을 확인해요.</Text>
      <RumoGuide message="결제와 관련된 내용은 정확하게 확인해볼게요." />
      <View style={s.whiteCard}>
        <Text style={s.cardTitle}>
          일본어 · {state.destination} 여행 프로그램
        </Text>
        <Text style={s.body}>
          {state.days}일 / {state.timezone}
        </Text>
        <View style={s.listRow}>
          <Text style={s.dim}>커리큘럼 검토</Text>
          <Text style={s.smallLink}>
            {state.approved ? "미리보기 검토 완료" : "승인 전"}
          </Text>
        </View>
        <View style={s.listRow}>
          <Text style={s.dim}>상품 가격</Text>
          <Text style={s.smallLink}>확정 전</Text>
        </View>
        <View style={s.listRow}>
          <Text style={s.dim}>이용권 상태</Text>
          <Text style={s.smallLink}>결제 연결 전</Text>
        </View>
      </View>
      <Note>
        결제·토큰 가격과 스토어 연동이 확정되기 전에는 구매하거나 학습을
        활성화할 수 없습니다.
      </Note>
      <Button label="실제 결제 · 연결 준비 중" disabled onPress={() => {}} />
      <Button secondary label="무료 예제 화면 체험하기" onPress={startLesson} />
    </>
  );
}
