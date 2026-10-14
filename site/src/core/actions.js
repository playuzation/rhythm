// 8가지 액션 = 십자키 4방향 × 버튼 2개.
// 공격 종류(버튼)와 날아오는 방향이 곧 눌러야 할 조합이 된다.
// 이 모듈은 다른 모듈을 import 하지 않는 최하위(leaf) 상수 모듈이다.

export const DIRS = {
  up: { key: 'up', letter: 'U', dx: 0, dy: -1, arrow: '↑', label: '위' },
  down: { key: 'down', letter: 'D', dx: 0, dy: 1, arrow: '↓', label: '아래' },
  left: { key: 'left', letter: 'L', dx: -1, dy: 0, arrow: '←', label: '왼쪽' },
  right: { key: 'right', letter: 'R', dx: 1, dy: 0, arrow: '→', label: '오른쪽' },
};

export const BUTTONS = {
  A: { key: 'A', verb: '베기', attack: '가시 몬스터', color: '#ff5d6c' },
  B: { key: 'B', verb: '막기', attack: '마법탄', color: '#4db8ff' },
};

export const ACTIONS = Object.values(DIRS).flatMap((d) =>
  Object.values(BUTTONS).map((b) => ({
    id: d.letter + b.key,
    dir: d.key,
    button: b.key,
    name: `${d.label} ${b.verb}`,
    combo: `${d.arrow} + ${b.key}`,
  })),
);

export function actionOf(dir, button) {
  return ACTIONS.find((a) => a.dir === dir && a.button === button) ?? null;
}
