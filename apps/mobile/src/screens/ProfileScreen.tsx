import React from "react";
import { View, Text } from "react-native";
import type { Screen } from "../features/trip/journey";
import { useApp } from "../app/AppProvider";
import { Icon, Note, type IconName } from "../components/ui";
import { Rumo } from "../components/Rumo";
import SoundSettings from "../components/SoundSettings";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";
import AppPressable from "../components/AppPressable";

export default function ProfileScreen() {
  const { state, go, connection, connect, phrase } = useApp();
  const { setOnlyFavorites } = phrase;
  return (
    <>
      <View style={s.profileCard}>
        <Rumo size={82} />
        <Text style={s.h2}>여행을 준비하는 당신</Text>
        <Text style={s.dim}>로그인 연결 전 · 미리보기 세션</Text>
      </View>
      <View style={s.whiteCard}>
        <View style={s.listRow}>
          <Text style={s.cardTitle}>검증된 랭크</Text>
          <Text style={s.dim}>진단 전</Text>
        </View>
        <View style={s.listRow}>
          <Text style={s.cardTitle}>학습 과정 난이도</Text>
          <Text style={s.dim}>제안 전</Text>
        </View>
        <View style={s.listRow}>
          <Text style={s.cardTitle}>학습 기준 시간대</Text>
          <Text style={s.dim}>{state.timezone}</Text>
        </View>
      </View>
      {[
        {
          title: "여행 정보 수정",
          icon: "airplane-outline",
          screen: "trip",
        },
        {
          title: "나의 복습 노트",
          icon: "book-outline",
          screen: "review",
        },
        {
          title: "저장한 여행 표현",
          icon: "bookmark-outline",
          screen: "phrases",
        },
      ].map((x) => (
        <AppPressable
          key={x.title}
          accessibilityLabel={x.title}
          accessibilityRole="button"
          style={s.quickCard}
          onPress={() => {
            if (x.screen === "phrases") setOnlyFavorites(true);
            go(x.screen as Screen);
          }}
        >
          <Icon name={x.icon as IconName} />
          <Text style={[s.cardTitle, { flex: 1 }]}>{x.title}</Text>
          <Icon name="chevron-forward" size={18} />
        </AppPressable>
      ))}
      <SoundSettings />
      <Note>
        현재 입력 정보는 기기 메모리에만 유지됩니다. 계정·결제·학습 기록의 서버
        저장은 연결 전입니다.
      </Note>
      <View style={s.row}>
        <View
          style={[
            s.dot,
            {
              backgroundColor: connection === "online" ? C.green : C.orange,
            },
          ]}
        />
        <Text style={s.dim}>
          개발 API:{" "}
          {connection === "loading"
            ? "연결 중"
            : connection === "online"
              ? "연결 정상"
              : "연결 실패"}
        </Text>
        <AppPressable onPress={() => void connect()} accessibilityRole="button">
          <Text style={s.smallLink}>다시 확인</Text>
        </AppPressable>
      </View>
    </>
  );
}
