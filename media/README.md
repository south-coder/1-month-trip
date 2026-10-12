# 1 Month Trip · Instagram Reel

`1MonthTrip-Reel-1080x1920-40s.mp4`: 1080×1920, 40.000초, 30fps, H.264/AAC stereo, MP4 faststart. 한국어 소개·사용 자막이 영상에 포함됩니다. 별도 SRT도 제공됩니다.

실제 리팩터링된 웹 앱을 22단계로 조작한 녹화입니다. 여행 설정(오사카·14일) → 예제 커리큘럼 검토 → 결제 연결 대기/무료 예제 → 일본어 답안 선택/루모 피드백 → 복습 → 표현 저장/필터 → 홈. 사용자 입력과 학습 상태를 영상용으로 주입하거나 다른 기능 동작을 만들어내지 않았습니다. 프레젠테이션 확대·배경·자막은 편집 요소입니다.

음악은 외부 샘플이나 기존 곡을 사용하지 않고 새로 작곡·합성한 40초 연주곡입니다(96 BPM, D major). 13개의 클릭음은 실제 Web Audio 재생 시점에 앱과 동일한 로컬 파형을 배치했습니다. 로그인·진단 점수·실결제·AI 음성 기능을 완료된 기능으로 소개하지 않습니다.

원본 음악/녹화/편집의 재생성: `scripts/compose-reel-music.py`, `scripts/record-reel.cjs`, `scripts/render-reel.py`. Node/Playwright, Chromium, Python/Pillow, FFmpeg가 필요합니다. 영상과 오디오 스트림을 전체 디코딩 검증했고 실제 iOS 네이티브 앱 녹화가 아닌 웹 실행 화면입니다.

Instagram에는 사용자가 이 MP4를 업로드합니다. Instagram 게시 작업은 수행하지 않았습니다.

## Cinematic 수정본

`1MonthTrip-Cinematic-Reel-1080x1920-40s.mp4`는 동일1080×1920/40초/30fps 규격의 새 연출본입니다. 휴대폰 등장·회전·원근 카메라 이동, 새틴/유리 재질, 상단 설명자막(y235/317),34초 이후 흰 배경의 루모·모자 추격과 중앙 워드마크 페이드인을 추가했습니다.

앱 화면은 원본 브라우저 프레임의 기하학적 투영과 일정한 재생속도 조정만 적용했습니다. 실제 기능 상태/점수/결제/AI동작을 새로 만들지 않습니다. 애니메이션 엔딩은 앱 기능 화면과 분리된 브랜드 장면입니다. 루모6프레임 달리기/모자3프레임은 제공된 루모 레퍼런스를 따라 생성한 투명 애니메이션 에셋입니다.

새 카메라 연출에 맞춘 원본 음악, 실제 클릭12회, 부드러운 카메라/모자 바람/집게발 효과음을 사용합니다. Instagram 게시 작업은 수행하지 않습니다. 이전 기본 시연영상도 보존했습니다.

재현: `retime-captured-source.py` → `render-cinematic-reel.py` → `compose-cinematic-audio.py` → `finish-cinematic-reel.py`. `scripts/requirements-video.txt`의 의존성을 준비하고, 이전 녹화의 CDP JPEG/metadata를 입력으로 사용합니다.
