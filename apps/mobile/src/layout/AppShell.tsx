import React from "react";
import {
  View,
  Text,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { useApp } from "../app/AppProvider";
import {
  screenTitles as titles,
  navigationItems as nav,
} from "../app/navigation";
import ScreenRouter from "../app/ScreenRouter";
import AppPressable from "../components/AppPressable";
import { Icon } from "../components/ui";
import SoundToggle from "../components/SoundToggle";
import { styles as s } from "../theme/styles";
import { colors as C } from "../theme/tokens";
export default function AppShell() {
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 1050;
  const { state, dispatch, go, connection, connect, setNotice, notice } =
    useApp();
  const home = state.screen === "home";
  return (
    <View style={s.canvas}>
      {desktop && (
        <View style={s.previewPanel}>
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <Icon name="airplane" color="white" size={22} />
            </View>
            <Text style={s.brandName}>
              1 Month Trip<Text style={{ color: C.orange }}>.</Text>
            </Text>
          </View>
          <Text style={s.eyebrow}>YOUR NEXT JOURNEY STARTS HERE</Text>
          <Text style={s.previewTitle}>
            여행의 설렘에,{"\n"}말할 수 있는 자신감.
          </Text>
          <Text style={s.previewCopy}>
            하루의 작은 배움이 모여{"\n"}낯선 여행을 나의 여행으로 바꿔요.
          </Text>
          <View style={s.deviceLabel}>
            <Icon name="phone-portrait-outline" size={17} />
            <Text style={s.smallLink}>iOS 화면 미리보기</Text>
            <View style={s.dot} />
            <Text style={s.dim}>인터랙티브</Text>
          </View>
          <View style={s.previewList}>
            {nav.map((n, i) => (
              <AppPressable
                key={n.screen}
                onPress={() => go(n.screen)}
                accessibilityRole="button"
                style={[
                  s.previewRow,
                  state.screen === n.screen && s.previewRowActive,
                ]}
              >
                <Text style={s.number}>0{i + 1}</Text>
                <Icon name={n.icon} />
                <Text style={s.previewRowText}>{n.label}</Text>
                <Icon name="arrow-forward" size={18} />
              </AppPressable>
            ))}
          </View>
          <Text style={s.previewFooter}>
            JAPANESE FOR YOUR JOURNEY{"\n"}Expo · React Native · 개발 미리보기
          </Text>
        </View>
      )}
      <View style={[s.phone, desktop && s.phoneDesktop]}>
        <View style={s.statusBar}>
          <Text style={s.time}>9:41</Text>
          {desktop && <View style={s.island} />}
          <View style={s.row}>
            <Icon name="cellular" size={15} color={C.ink} />
            <Icon name="wifi" size={15} color={C.ink} />
            <Icon name="battery-full" size={22} color={C.ink} />
          </View>
        </View>
        <View style={s.header}>
          {home ? (
            <View style={s.brand}>
              <View style={s.miniBrand}>
                <Icon name="airplane" color="white" size={16} />
              </View>
              <Text style={s.mobileBrand}>
                1 Month Trip<Text style={{ color: C.orange }}>.</Text>
              </Text>
            </View>
          ) : (
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel="뒤로 가기"
              onPress={() => dispatch({ type: "back" })}
              style={s.back}
            >
              <Icon name="chevron-back" />
            </AppPressable>
          )}
          {!home && <Text style={s.headerTitle}>{titles[state.screen]}</Text>}
          <View style={s.row}>
            <SoundToggle />
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel="연결 상태 확인"
              onPress={() => {
                void connect();
                setNotice("개발 서버 연결을 다시 확인합니다.");
              }}
              style={s.round}
            >
              <Icon
                name={
                  connection === "online"
                    ? "cloud-done-outline"
                    : "cloud-offline-outline"
                }
                size={20}
              />
            </AppPressable>
          </View>
        </View>
        <ScrollView
          key={state.screen}
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          <ScreenRouter />
        </ScrollView>
        {notice !== "" && (
          <View accessibilityRole="alert" style={s.toast}>
            <Text style={{ color: "white", fontSize: 13, lineHeight: 20 }}>
              {notice}
            </Text>
          </View>
        )}
        <View style={s.nav}>
          {nav.map((n) => (
            <AppPressable
              key={n.screen}
              accessibilityRole="button"
              accessibilityLabel={n.label}
              onPress={() => go(n.screen)}
              style={s.navItem}
            >
              <View
                style={[s.navIcon, state.screen === n.screen && s.navActive]}
              >
                <Icon
                  name={n.icon}
                  size={22}
                  color={state.screen === n.screen ? C.green : C.muted}
                />
              </View>
              <Text
                style={[
                  s.navText,
                  state.screen === n.screen && {
                    color: C.green,
                    fontWeight: "700",
                  },
                ]}
              >
                {n.label}
              </Text>
            </AppPressable>
          ))}
        </View>
        <View style={s.homeIndicator}>
          <View style={s.homeBar} />
        </View>
      </View>
      {desktop && (
        <View style={s.rightPanel}>
          <View style={s.previewBadge}>
            <View style={s.dot} />
            <Text style={s.smallLink}>LIVE PREVIEW</Text>
          </View>
          <Text style={s.sideTitle}>작은 배움.{"\n"}더 넓은 여행.</Text>
          <Text style={s.sideCopy}>
            화면 속 버튼을 눌러{"\n"}여행 학습의 흐름을 체험하세요.
          </Text>
          <View style={s.sideRule} />
          <Text style={s.sideCaption}>
            여행 전에는 차근차근,{"\n"}여행 중에는 바로바로.
          </Text>
          <Text style={s.disclaimer}>
            예제 데이터 기반 개발 미리보기{"\n"}실결제 · AI 음성 평가 연결 전
          </Text>
        </View>
      )}
    </View>
  );
}
