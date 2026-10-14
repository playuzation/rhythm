# rhythm

**리듬 나이트** — 십자키와 A·B 버튼으로 사방에서 날아오는 공격을 박자에 맞춰 베고 막는 브라우저 리듬 게임.

플레이: <https://playuzation.github.io/rhythm/> (설치 없이 링크만 열면 됩니다)

## 플레이 방법

기사는 화면 가운데에 있고, 공격은 위·아래·왼쪽·오른쪽에서 박자에 맞춰 날아옵니다.
공격이 원(판정선)에 닿는 순간 **공격이 오는 방향 + 버튼**을 누릅니다.

| 방향 | A (베기) · 빨간 가시 몬스터 | B (막기) · 파란 마법탄 |
| --- | --- | --- |
| ↑ | 위 베기 | 위 막기 |
| ↓ | 아래 베기 | 아래 막기 |
| ← | 왼쪽 베기 | 왼쪽 막기 |
| → | 오른쪽 베기 | 오른쪽 막기 |

- 판정: PERFECT(±50ms) > GREAT(±90ms) > GOOD(±135ms), 틀린 조합이나 놓친 공격은 MISS
- MISS 시 체력 감소, 체력이 0이 되면 실패 (튜토리얼 연습은 실패 없음)
- 맵: 튜토리얼 / 쉬움(96 BPM) / 보통(120 BPM) / 어려움(144 BPM)

| 입력 장치 | 방향 | A | B | 일시정지 |
| --- | --- | --- | --- | --- |
| 키보드 | 방향키 / WASD | Z / J | X / K | Esc / P |
| 게임패드 | 십자키 / 왼쪽 스틱 | 아래 버튼 | 오른쪽 버튼 | Start |
| 터치 | 화면 십자키 | A | B | II |

## 구조

빌드 과정 없는 정적 사이트(ES 모듈)이며 음악·효과음은 Web Audio로 합성합니다.

```
site/
├── index.html, style.css
└── src/
    ├── main.js            루트: 화면 전환·게임 루프 조립 (하위 모듈 간 연결은 여기서만)
    ├── scenes/play.js     노트 진행·판정·드릴 모드        → core/judge
    ├── engine/
    │   ├── renderer.js    캔버스 그리기                   → core/actions
    │   ├── audio.js       곡 시계·합성 음악·효과음 (leaf)
    │   └── input.js       키보드·터치·게임패드 → 방향+버튼 (leaf)
    ├── core/
    │   ├── chart.js       채보 문자열 → 노트              → core/actions
    │   ├── judge.js       판정 범위·점수 (leaf)
    │   └── actions.js     8가지 액션 정의 (leaf)
    └── data/
        ├── maps.js        맵 3종 + 튜토리얼 연습 (leaf)
        └── tutorial.js    튜토리얼 단계 (leaf)
```

의존은 위에서 아래로만 흐르며 순환이 없습니다. 단, `core/actions.js`는 `chart.js`와 `renderer.js` 두 곳에서 공유하는 상수 모듈입니다.

### 채보 형식 (`site/src/data/maps.js`)

한 줄이 한 마디(4/4)이며 토큰 수가 분할 수입니다(4 = 4분, 8 = 8분, 16 = 16분음표).
토큰은 `방향(U/D/L/R) + 버튼(A/B)`, 쉼표는 `.` 입니다.

```js
'RA . LB .'                 // 오른쪽 베기, 쉼, 왼쪽 막기, 쉼
'RA LA RA LA UB DB UB DB'   // 8분음표
```

## 배포

`main` 브랜치에 push되면 `.github/workflows/pages.yml`이 `site/` 폴더를 GitHub Pages로 배포합니다
(Settings → Pages → Source: GitHub Actions). Actions 탭에서 수동 실행도 가능합니다.

로컬 실행: `python3 -m http.server -d site` 후 <http://localhost:8000> 접속 (ES 모듈이라 파일을 직접 열면 동작하지 않습니다).
