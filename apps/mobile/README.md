# 1 Month Trip 모바일 앱

Expo / React Native / TypeScript 기반 개발 미리보기. 실제 AI·로그인·결제·영속 저장 연결 전이며 예제 학습과 표현을 제공합니다.

## 모듈 구조

- `App.tsx`: 공급자와 앱 셸 연결만 담당.
- `src/app/`: 화면 라우터, 탐색 목록, 앱 상태 연결.
- `src/screens/`: 오늘·온보딩·진단 안내·여행 설정·커리큘럼·이용권·학습·완료·복습·표현·마이 트립의 11개 화면.
- `src/components/`: 버튼·칩·안내, 루모와 말풍선, 소리 설정, 클릭음이 연결된 공통 Pressable.
- `src/features/trip/`: 여행 입력·기간 검증·탐색·즐겨찾기 상태.
- `src/features/learning/`: 예제 문제, 학습 세션·시도 원장·중복 제출 보호.
- `src/features/phrases/`: 예제 표현·검색·즐겨찾기 필터·복사.
- `src/features/connection/`: health API 클라이언트·연결 훅.
- `src/features/sound/`: 60 ms 원본 클릭음, 사용자 클릭 후 Web Audio 시작, native expo-audio, 음소거·중복 재생 제어.
- `src/theme/`: 공통 색상과 레이아웃·각 기능별 스타일.

새 학습을 시작해도 이전 세션의 시도 이력을 메모리에서 유지합니다. 새로고침 시 초기화되며, 실제 사용자 학습 원장은 서버 연결 후 구현합니다. 루모는 짧고 정중한 안내/정답/복습 피드백으로 등장합니다. 소리는 상단 스피커 버튼 또는 마이 트립의 클릭 소리 스위치에서 켜고 끕니다. 마이크나 녹음 권한을 요청하지 않습니다.

## 실행

저장소 루트에서:

```sh
npm ci
BROWSER=none EXPO_OFFLINE=1 npm run web
npm run typecheck
npm run lint
npm test
EXPO_OFFLINE=1 CI=1 npm run build
```

서버 주소는 공개 설정 `EXPO_PUBLIC_API_URL`로 지정합니다. 다운로드 HTML에서는 서버가 없어도 예제 기능을 체험할 수 있습니다. 실제 기기 네이티브 사운드/오디오 세션은 별도 실기기 검증 대상입니다.
