import React from "react";
import { View, Text } from "react-native";
import { Icon, Button, Chip, Note, IconName } from "../components/ui";
import { RumoGuide } from "../components/Rumo";
import { colors as C } from "../theme/tokens";
import { useApp } from "../app/AppProvider";
import { styles as s } from "../theme/styles";

export default function CurriculumScreen() {
  const { state, dispatch, go } = useApp();
  return (
    <>
      <Text style={s.eyebrow}>YOUR LEARNING MAP</Text>
      <Text style={s.h1}>
        {state.destination}에서 만날 순간,{"\n"}미리 연습해요.
      </Text>
      <RumoGuide message="필요한 말만 딱 집어드릴게요. 여행에서 만날 순간을 함께 준비해요." />
      <View style={s.row}>
        <Chip text={`${state.days}일 학습`} />
        <Chip text="일본어" />
        <Chip text="예제 커리큘럼" />
      </View>
      <View style={s.mapCard}>
        {[
          {
            icon: "airplane-outline",
            title: "도착과 이동",
            sub: "공항 · 교통 · 길 찾기",
          },
          {
            icon: "restaurant-outline",
            title: "맛있는 여행",
            sub: "식당 · 주문 · 계산",
          },
          {
            icon: "bed-outline",
            title: "편안한 머무름",
            sub: "호텔 · 체크인 · 요청",
          },
          {
            icon: "bag-handle-outline",
            title: "나만의 발견",
            sub: "쇼핑 · 관광 · 도움 요청",
          },
        ].map((x, i) => (
          <View key={x.title} style={s.mapRow}>
            <View style={s.mapRail}>
              <View
                style={[s.mapCircle, i === 1 && { backgroundColor: C.green }]}
              >
                <Icon
                  name={x.icon as IconName}
                  color={i === 1 ? "white" : C.green}
                />
              </View>
              {i < 3 && <View style={s.mapLine} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 28 }}>
              <Text style={s.mapIndex}>CHAPTER 0{i + 1}</Text>
              <Text style={s.cardTitle}>{x.title}</Text>
              <Text style={s.dim}>{x.sub}</Text>
            </View>
            {i === 1 && <Chip text="체험 가능" />}
          </View>
        ))}
      </View>
      <Note>
        실제 개인화는 진단·문제은행·AI 제안 검증 후 제공됩니다. 검토 승인만으로
        유료 학습이 활성화되지 않습니다.
      </Note>
      <Button secondary label="여행 정보 수정하기" onPress={() => go("trip")} />
      <Button
        label={
          state.approved
            ? "승인됨 · 이용권 확인하기"
            : "예제 커리큘럼 검토 완료"
        }
        onPress={() => {
          dispatch({ type: "approve" });
          go("payment");
        }}
      />
    </>
  );
}
