// 맵(채보) 문자열을 노트 배열로 변환한다.
// 토큰: 방향 글자(U/D/L/R) + 버튼(A/B), 쉼표는 '.'.
// 한 마디(4/4)의 토큰 수가 곧 분할 수다. 4개 = 4분음표, 8개 = 8분음표, 16개 = 16분음표.

import { DIRS, BUTTONS } from './actions.js';

const LETTER_TO_DIR = Object.fromEntries(Object.values(DIRS).map((d) => [d.letter, d.key]));

export function parseToken(tok) {
  const dir = LETTER_TO_DIR[tok[0]];
  const button = tok[1];
  if (tok.length !== 2 || !dir || !BUTTONS[button]) throw new Error(`잘못된 노트 토큰: ${tok}`);
  return { dir, button };
}

// map: { bpm, leadIn(박), measures: string[] }
export function parseChart(map) {
  const spb = 60 / map.bpm;
  const notes = [];
  map.measures.forEach((measure, mi) => {
    const slots = measure.trim().split(/\s+/);
    slots.forEach((tok, si) => {
      if (tok === '.') return;
      const beat = map.leadIn + mi * 4 + (si * 4) / slots.length;
      notes.push({ ...parseToken(tok), beat, time: beat * spb });
    });
  });
  return notes;
}

// 튜토리얼 드릴용: 박자 없이 일정 간격(gap 초)으로 나열한다.
export function parseSequence(text, start, gap) {
  return text
    .trim()
    .split(/\s+/)
    .map((tok, i) => ({ ...parseToken(tok), beat: 0, time: start + i * gap }));
}

export function chartLength(map) {
  return map.leadIn + map.measures.length * 4; // 박
}
