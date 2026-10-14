// 튜토리얼 단계 (순수 데이터, import 없음).
// type: info = 설명만, drill = 박자 없이 공격이 판정선에서 멈춰 기다림, play = 박자 연습 맵.

export const TUTORIAL = [
  {
    type: 'info',
    title: '리듬 나이트에 온 걸 환영해!',
    text: '기사는 화면 가운데에 서 있고, 공격은 위·아래·왼쪽·오른쪽 네 방향에서 날아와.\n공격이 기사 주위의 원(판정선)에 닿는 순간 알맞은 액션을 하면 돼.',
  },
  {
    type: 'info',
    title: '조작법',
    text: '십자키로 방향을 누른 채 A 또는 B 버튼을 누르면 그 방향으로 액션이 나가.\n4방향 × 버튼 2개 = 8가지 액션!\n\n키보드: 방향키(또는 WASD) + Z = A, X = B\n게임패드·터치 화면 버튼도 쓸 수 있어.',
  },
  {
    type: 'drill',
    title: 'A 버튼: 베기',
    text: '빨간 가시 몬스터(A)는 검으로 벤다.\n몬스터가 날아오는 방향 + A!\n(공격은 원에서 멈춰 기다려 줄게)',
    pattern: 'RA LA UA DA',
  },
  {
    type: 'drill',
    title: 'B 버튼: 막기',
    text: '파란 마법탄(B)은 방패로 막는다.\n마법탄이 날아오는 방향 + B!',
    pattern: 'RB LB UB DB',
  },
  {
    type: 'drill',
    title: '8가지 액션 섞기',
    text: '이번엔 베기와 막기가 섞여서 와.\n색과 모양을 보고 버튼을, 위치를 보고 방향을 골라!',
    pattern: 'UA RB DA LB RA UB LA DB',
  },
  {
    type: 'play',
    title: '박자에 맞춰!',
    text: '실전에서는 공격이 음악 박자에 맞춰 날아와.\n원에 닿는 순간 정확히 누를수록 PERFECT > GREAT > GOOD.\n놓치거나 틀리면 MISS, 체력이 줄어들어.\n(연습에서는 체력이 줄지 않아)',
    mapId: 'practice',
  },
  {
    type: 'info',
    title: '튜토리얼 완료!',
    text: '이제 쉬움 · 보통 · 어려움 맵에 도전해 봐!',
  },
];
