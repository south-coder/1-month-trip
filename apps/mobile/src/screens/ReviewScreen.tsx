import React from "react";
import { Text, View } from "react-native";
import { questions } from "../features/learning/questions";
import { useApp } from "../app/AppProvider";
import { RumoGuide } from "../components/Rumo";
import { Button, Chip } from "../components/ui";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";

export default function ReviewScreen() {
  const { startLesson, lesson } = useApp();
  const sessions = lesson.sessionHistory.filter(
    (session) => session.attempts.length > 0,
  );

  return (
    <>
      <Text style={s.eyebrow}>SMALL STEPS, LASTING WORDS</Text>
      <Text style={s.h1}>다시 만나면,{"\n"}조금 더 익숙해져요.</Text>
      <RumoGuide
        message={
          sessions.length === 0
            ? "아직 예제 학습 기록이 없어요. 오늘의 예제 문제부터 함께 시작해 볼까요?"
            : "전에 배운 표현도 함께 모아 두었어요. 소리 내어 한 번 더 말해 보세요."
        }
      />
      {[...sessions].reverse().map((session, index) => (
        <View key={session.id} style={s.whiteCard}>
          <View style={s.rowBetween}>
            <Text style={s.cardTitle}>
              {index === 0
                ? "최근 예제 학습"
                : `이전 예제 학습 ${sessions.length - index}`}
            </Text>
            <Text style={s.dim}>
              {session.status === "completed" ? "학습 완료" : "학습 중"}
            </Text>
          </View>
          {session.attempts.map((attempt, attemptIndex) => {
            const item = questions.find(
              (question) => question.id === attempt.id,
            );
            if (!item) return null;

            return (
              <View
                key={attempt.attemptId}
                style={{
                  marginTop: 18,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: C.line,
                }}
              >
                <View style={s.rowBetween}>
                  <Chip
                    text={
                      attempt.skipped
                        ? "건너뛰기"
                        : attempt.correct
                          ? "정답"
                          : "다시 연습"
                    }
                  />
                  <Text style={s.dim}>문제 {attemptIndex + 1}</Text>
                </View>
                <Text style={s.japanese}>{item.options[item.answer]}</Text>
                <Text style={s.reading}>{item.pronunciation}</Text>
                <Text style={[s.body, { marginBottom: 0 }]}>
                  {item.meaning}
                  {attempt.hint ? " · 힌트 사용" : ""}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
      <Button label="예제 다시 연습하기" onPress={startLesson} />
    </>
  );
}
