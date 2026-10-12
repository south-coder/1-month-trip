import React from "react";
import { View, Text, TextInput } from "react-native";
import { Button, Chip, Note } from "../components/ui";
import { RumoGuide } from "../components/Rumo";
import { validateTrip } from "../features/trip/journey";
import { useApp } from "../app/AppProvider";
import { styles as s } from "../theme/styles";

export default function TripScreen() {
  const { state, dispatch, error, setError, go } = useApp();
  return (
    <>
      <Text style={s.eyebrow}>STEP 02 · YOUR JOURNEY</Text>
      <Text style={s.h1}>어떤 여행을{"\n"}떠나고 싶나요?</Text>
      <RumoGuide message="여행에 필요한 말부터 차근차근 준비해요." />
      <Text style={s.fieldLabel}>여행 지역</Text>
      <View style={s.row}>
        {["도쿄", "오사카", "교토"].map((x) => (
          <Chip
            key={x}
            text={x}
            active={state.destination === x}
            onPress={() =>
              dispatch({ type: "edit", field: "destination", value: x })
            }
          />
        ))}
      </View>
      <TextInput
        accessibilityLabel="여행 지역"
        value={state.destination}
        onChangeText={(value) =>
          dispatch({ type: "edit", field: "destination", value })
        }
        style={s.input}
        placeholder="여행 지역"
      />
      <Text style={s.fieldLabel}>출발일 · 선택</Text>
      <TextInput
        accessibilityLabel="출발일"
        value={state.departure}
        onChangeText={(value) =>
          dispatch({ type: "edit", field: "departure", value })
        }
        style={s.input}
        placeholder="예: 2026-11-15"
      />
      <View style={s.twoColumns}>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>학습 기간 · 1~30일</Text>
          <TextInput
            accessibilityLabel="학습 기간"
            keyboardType="number-pad"
            value={state.days}
            onChangeText={(value) =>
              dispatch({ type: "edit", field: "days", value })
            }
            style={s.input}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.fieldLabel}>여행 인원</Text>
          <TextInput
            accessibilityLabel="여행 인원"
            keyboardType="number-pad"
            value={state.people}
            onChangeText={(value) =>
              dispatch({ type: "edit", field: "people", value })
            }
            style={s.input}
          />
        </View>
      </View>
      <Text style={s.fieldLabel}>누구와 함께 가나요?</Text>
      <View style={s.row}>
        {["혼자", "친구", "가족", "연인"].map((x) => (
          <Chip
            key={x}
            text={x}
            active={state.companion === x}
            onPress={() =>
              dispatch({ type: "edit", field: "companion", value: x })
            }
          />
        ))}
      </View>
      <Text style={s.fieldLabel}>학습 기준 시간대</Text>
      <TextInput
        accessibilityLabel="학습 시간대"
        style={s.input}
        value={state.timezone}
        onChangeText={(value) =>
          dispatch({ type: "edit", field: "timezone", value })
        }
      />
      <Note>
        프로그램 생성 시 시간대가 고정됩니다. 동행자의 이름·연락처·민감정보는
        수집하지 않습니다.
      </Note>
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        label="학습 지도 미리보기"
        onPress={() => {
          const e = validateTrip(state);
          if (e) {
            setError(e);
            return;
          }
          go("curriculum");
        }}
      />
    </>
  );
}
