import React from "react";
import { Text, View } from "react-native";
import { questions } from "../features/learning/questions";
import { useApp } from "../app/AppProvider";
import { AppPressable } from "../components/AppPressable";
import { RumoGuide } from "../components/Rumo";
import { Button, Chip, Icon, Note } from "../components/ui";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";

export default function LessonScreen() {
  const { lesson } = useApp();
  const {
    q,
    question,
    choice,
    setChoice,
    checked,
    hint,
    setHint,
    error,
    setError,
    answer,
    next,
  } = lesson;

  return (
    <>
      <View style={s.rowBetween}>
        <Chip text={q.scene} />
        <Text style={s.dim}>
          문제 {question + 1} / {questions.length}
        </Text>
      </View>
      <View style={[s.progress, { marginTop: 16, marginBottom: 22 }]}>
        <View
          style={[
            s.progressFill,
            { width: `${((question + 1) / questions.length) * 100}%` },
          ]}
        />
      </View>
      <Text style={s.eyebrow}>LET’S TRY IT</Text>
      <Text style={s.h2}>{q.title}</Text>
      <RumoGuide
        message={
          checked
            ? `${choice === q.answer ? "잘했어요!" : "괜찮아요, 함께 다시 배워요."}\n${q.pronunciation}\n${q.meaning}`
            : "여행지에서 써 볼 한마디예요. 천천히 답을 골라 주세요."
        }
      />
      <Text style={[s.question, { marginTop: 20 }]}>{q.prompt}</Text>
      {q.options.map((option, index) => (
        <AppPressable
          key={option}
          accessibilityRole="button"
          accessibilityLabel={option}
          accessibilityState={{ selected: choice === index, disabled: checked }}
          disabled={checked}
          onPress={() => {
            setChoice(index);
            setError("");
          }}
          style={[
            s.option,
            choice === index && s.selected,
            checked && index === q.answer && s.correct,
          ]}
        >
          <View
            style={[
              s.optionCircle,
              choice === index && { backgroundColor: C.green },
            ]}
          >
            <Text style={{ color: choice === index ? C.white : C.muted }}>
              {index + 1}
            </Text>
          </View>
          <Text style={s.optionText}>{option}</Text>
          {checked && index === q.answer && <Icon name="checkmark-circle" />}
        </AppPressable>
      ))}
      {hint && <Note>{q.hint}</Note>}
      <Text style={s.tip}>TRAVEL TIP · {q.tip}</Text>
      {error !== "" && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
      <Button
        label={
          checked
            ? question === questions.length - 1
              ? "예제 학습 마치기"
              : "다음 문제"
            : "답변 확인하기"
        }
        onPress={() => (checked ? next() : answer())}
      />
      {!checked && (
        <View style={[s.rowBetween, { marginTop: 14 }]}>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="힌트 보기"
            onPress={() => setHint(true)}
          >
            <Text style={s.smallLink}>♡ 힌트 보기</Text>
          </AppPressable>
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="건너뛰기"
            onPress={() => next(true)}
          >
            <Text style={s.dim}>건너뛰기 →</Text>
          </AppPressable>
        </View>
      )}
      <Text style={s.disclaimer}>
        예제 문제 · 실제 진단 점수와 숙련도에는 반영되지 않습니다.
      </Text>
    </>
  );
}
