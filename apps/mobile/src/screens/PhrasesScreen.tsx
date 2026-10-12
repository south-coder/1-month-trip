import React from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import { useApp } from "../app/AppProvider";
import { Icon, Chip, Note } from "../components/ui";
import { RumoGuide } from "../components/Rumo";
import { copyPhrase } from "../features/phrases/clipboard";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";
import AppPressable from "../components/AppPressable";

export default function PhrasesScreen() {
  const { state, dispatch, setNotice, phrase } = useApp();
  const {
    category,
    setCategory,
    search,
    setSearch,
    onlyFavorites,
    setOnlyFavorites,
    filtered,
  } = phrase;
  return (
    <>
      <Text style={s.eyebrow}>WORDS FOR RIGHT NOW</Text>
      <Text style={s.h1}>필요한 순간,{"\n"}꺼내 쓰는 한마디.</Text>
      <RumoGuide message="지금 필요한 한마디를 같이 찾아봐요." />
      <View style={s.searchBox}>
        <Icon name="search-outline" size={19} />
        <TextInput
          accessibilityLabel="표현 검색"
          placeholder="예제 표현 검색"
          value={search}
          onChangeText={setSearch}
          style={s.searchInput}
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingVertical: 18 }}
      >
        {["전체", "식당", "호텔", "교통", "쇼핑", "도움"].map((x) => (
          <Chip
            key={x}
            text={x}
            active={category === x}
            onPress={() => setCategory(x)}
          />
        ))}
      </ScrollView>
      <AppPressable
        accessibilityRole="button"
        accessibilityLabel={
          onlyFavorites ? "전체 표현 보기" : "저장한 표현만 보기"
        }
        onPress={() => setOnlyFavorites(!onlyFavorites)}
        style={s.row}
      >
        <Icon
          name={onlyFavorites ? "bookmark" : "bookmark-outline"}
          size={17}
        />
        <Text style={s.smallLink}>
          {onlyFavorites ? "전체 표현 보기" : "저장한 표현만 보기"}
        </Text>
      </AppPressable>
      {filtered.length === 0 && (
        <Note>일치하는 표현이 없어요. 검색어나 상황을 바꿔 주세요.</Note>
      )}
      {filtered.map((p) => (
        <View key={p.id} style={s.phraseCard}>
          <View style={s.rowBetween}>
            <Chip text={p.category} />
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`${p.ko} ${state.favorites.includes(p.id) ? "저장 해제" : "저장"}`}
              onPress={() => dispatch({ type: "favorite", id: p.id })}
            >
              <Icon
                name={
                  state.favorites.includes(p.id)
                    ? "bookmark"
                    : "bookmark-outline"
                }
                color={C.orange}
              />
            </AppPressable>
          </View>
          <Text style={s.phraseKo}>{p.ko}</Text>
          <Text selectable style={s.japanese}>
            {p.ja}
          </Text>
          <Text style={s.reading}>{p.reading}</Text>
          <Text style={s.word}>{p.word}</Text>
          <View style={s.rowBetween}>
            <AppPressable
              accessibilityRole="button"
              style={s.audioButton}
              onPress={() =>
                setNotice(
                  "음성 공급자 연결 전입니다. 녹음하거나 외부로 전송하지 않습니다.",
                )
              }
            >
              <Icon name="volume-medium-outline" size={18} />
              <Text style={s.smallLink}>발음 듣기 · 준비 중</Text>
            </AppPressable>
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel={`${p.ko} 복사`}
              onPress={() => {
                void copyPhrase(p.ja, setNotice);
              }}
            >
              <Icon name="copy-outline" size={19} />
            </AppPressable>
          </View>
        </View>
      ))}
      <Note>
        현재는 고정된 예제 표현입니다. 자유 입력 AI 번역과 의료·긴급 표현은 검증
        및 공급자 연결 후 제공합니다.
      </Note>
    </>
  );
}
