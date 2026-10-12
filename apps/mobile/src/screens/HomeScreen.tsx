import React from "react";
import { View, Text } from "react-native";
import { useApp } from "../app/AppProvider";
import { Icon, Button, Section } from "../components/ui";
import { Rumo } from "../components/Rumo";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";
import AppPressable from "../components/AppPressable";

export default function HomeScreen() {
  const { state, go, startLesson } = useApp();
  return (
    <>
      <View style={s.greeting}>
        <Text style={s.dim}>나의 다음 여행을 위한 준비</Text>
        <Text style={s.h1}>
          오늘도 한 걸음,{"\n"}여행에 가까워져요{" "}
          <Text style={{ color: C.orange }}>✦</Text>
        </Text>
      </View>
      <AppPressable
        style={s.tripCard}
        accessibilityRole="button"
        accessibilityLabel="여행 정보 수정"
        onPress={() => go("trip")}
      >
        <View style={s.tripLeft}>
          <Text style={s.eyebrow}>MY NEXT TRIP</Text>
          <Text style={s.tripTitle}>
            일본, {state.destination} <Text style={{ fontSize: 18 }}>🇯🇵</Text>
          </Text>
          <View style={s.row}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={s.dim}>
              {state.departure || "출발일을 설정해 주세요"}
            </Text>
          </View>
        </View>
        <View style={s.tripStamp}>
          <Icon name="airplane-outline" size={25} />
          <Text style={s.stampText}>LET’S GO</Text>
        </View>
      </AppPressable>
      <View style={s.hero}>
        <View style={s.row}>
          <View style={s.dayTag}>
            <Text style={s.tagText}>DAY 01</Text>
          </View>
          <Text style={s.heroTag}>예제 학습 · 식당</Text>
        </View>
        <Text style={s.heroTitle}>첫 주문도,{"\n"}자신 있게.</Text>
        <Text style={s.heroCopy}>
          루모와 함께 배우는{"\n"}일본 식당에서의 첫 한마디
        </Text>
        <View style={s.rumoHome}>
          <Rumo size={148} />
        </View>
        <View style={s.heroBottom}>
          <View style={s.row}>
            <Icon name="time-outline" size={15} />
            <Text style={s.heroMinutes}>3개의 예제 문제</Text>
          </View>
          <Text style={s.heroMinutes}>시작 전</Text>
        </View>
        <View style={s.progress}>
          <View style={[s.progressFill, { width: "4%" }]} />
        </View>
        <Button label="예제 학습 시작하기" onPress={startLesson} />
      </View>
      <Section
        title="나의 여행 준비"
        link="전체 보기"
        onPress={() => go("curriculum")}
      />
      <View style={s.stats}>
        <View style={s.stat}>
          <View style={s.statIcon}>
            <Icon name="compass-outline" />
          </View>
          <Text style={s.statValue}>
            {state.days}
            <Text style={s.statUnit}>일</Text>
          </Text>
          <Text style={s.dim}>학습 기간</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <View style={s.statIcon}>
            <Icon name="ribbon-outline" />
          </View>
          <Text style={s.statValue}>—</Text>
          <Text style={s.dim}>진단 전 랭크</Text>
        </View>
        <View style={s.statDivider} />
        <View style={s.stat}>
          <View style={s.statIcon}>
            <Icon name="bookmark-outline" />
          </View>
          <Text style={s.statValue}>
            {state.favorites.length}
            <Text style={s.statUnit}>개</Text>
          </Text>
          <Text style={s.dim}>저장한 표현</Text>
        </View>
      </View>
      <Section title="여행지에서 바로 꺼내 쓰세요" />
      <AppPressable
        accessibilityRole="button"
        style={s.quickCard}
        onPress={() => go("phrases")}
      >
        <View style={s.quickIcon}>
          <Icon name="chatbubble-ellipses-outline" size={24} color={C.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.cardTitle}>지금 필요한 한마디</Text>
          <Text style={s.dim}>식당, 호텔, 교통 · 상황별 일본어</Text>
        </View>
        <Icon name="arrow-forward" size={20} />
      </AppPressable>
      <AppPressable
        onPress={() => go("welcome")}
        accessibilityRole="button"
        style={s.startLink}
      >
        <Text style={s.smallLink}>처음이라면? 나만의 여행 학습 만들기 →</Text>
      </AppPressable>
      <Text style={s.disclaimer}>
        개발 미리보기 · 예제 콘텐츠이며 실제 학습 기록이 아닙니다.
      </Text>
    </>
  );
}
