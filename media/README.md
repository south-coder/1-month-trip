# 1 Month Trip · Instagram Reel

`1MonthTrip-Reel-1080x1920-40s.mp4`: 1080×1920, 40.000초, 30fps, H.264/AAC stereo, MP4 faststart. 한국어 소개·사용 자막이 영상에 포함됩니다. 별도 SRT도 제공됩니다.

실제 리팩터링된 웹 앱을 22단계로 조작한 녹화입니다. 여행 설정(오사카·14일) → 예제 커리큘럼 검토 → 결제 연결 대기/무료 예제 → 일본어 답안 선택/루모 피드백 → 복습 → 표현 저장/필터 → 홈. 사용자 입력과 학습 상태를 영상용으로 주입하거나 다른 기능 동작을 만들어내지 않았습니다. 프레젠테이션 확대·배경·자막은 편집 요소입니다.

음악은 외부 샘플이나 기존 곡을 사용하지 않고 새로 작곡·합성한 40초 연주곡입니다(96 BPM, D major). 13개의 클릭음은 실제 Web Audio 재생 시점에 앱과 동일한 로컬 파형을 배치했습니다. 로그인·진단 점수·실결제·AI 음성 기능을 완료된 기능으로 소개하지 않습니다.

원본 음악/녹화/편집의 재생성: `scripts/compose-reel-music.py`, `scripts/record-reel.cjs`, `scripts/render-reel.py`. Node/Playwright, Chromium, Python/Pillow, FFmpeg가 필요합니다. 영상과 오디오 스트림을 전체 디코딩 검증했고 실제 iOS 네이티브 앱 녹화가 아닌 웹 실행 화면입니다.

Instagram에는 사용자가 이 MP4를 업로드합니다. Instagram 게시 작업은 수행하지 않았습니다.
