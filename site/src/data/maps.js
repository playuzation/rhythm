// 맵 데이터 (순수 데이터, import 없음).
// measures: 한 줄 = 한 마디. 토큰 수 4 = 4분, 8 = 8분, 16 = 16분음표.
// 토큰: U/D/L/R(방향) + A(베기: 빨간 가시 몬스터) / B(막기: 파란 마법탄), '.' = 쉼표.
// music.chords: 마디마다 순환하는 화음(키 기준 반음 간격).

const MAJ = { I: [0, 4, 7], IV: [5, 9, 12], V: [7, 11, 14], vi: [9, 12, 16] };
const MIN = { i: [0, 3, 7], III: [3, 7, 10], V: [7, 11, 14], VI: [8, 12, 15], VII: [10, 14, 17] };

export const MAPS = {
  practice: {
    id: 'practice',
    name: '튜토리얼 연습',
    bpm: 90,
    leadIn: 4,
    approach: 1.8,
    hpLoss: 0,
    music: { key: 48, chords: [MAJ.I, MAJ.V, MAJ.vi, MAJ.IV], drums: 'light', arp: 4, wave: 'triangle' },
    measures: [
      'RA . . .', 'RA . . .', 'LA . . .', 'LA . . .',
      'UB . . .', 'DB . . .', 'UB . . .', 'DB . . .',
      'RA . LB .', 'UA . DB .', 'LA . RB .', 'DA . UB .',
      '. . . .',
    ],
  },

  easy: {
    id: 'easy',
    name: '쉬움',
    bpm: 96,
    leadIn: 4,
    approach: 1.7,
    hpLoss: 8,
    music: { key: 53, chords: [MAJ.I, MAJ.vi, MAJ.IV, MAJ.V], drums: 'basic', arp: 2, wave: 'triangle' },
    measures: [
      '. . . .',
      'RA . . .', 'LA . . .', 'RA . . .', 'LA . . .',
      'UB . . .', 'DB . . .', 'UB . . .', 'DB . . .',
      'RA . LA .', 'UB . DB .', 'RA . UB .', 'LA . DB .',
      'RA . RA .', 'LB . LB .', 'UA . DA .', 'RB . LB .',
      'RA . . .', 'UB . . .', 'LA . . .', 'DB . . .',
      'RA . LB .', 'UA . DB .', 'LA . RB .', 'DA . UB .',
      'RA LA RA .', 'UB DB UB .', 'RA . LB .', 'UA . . .',
      '. . . .',
    ],
  },

  normal: {
    id: 'normal',
    name: '보통',
    bpm: 120,
    leadIn: 4,
    approach: 1.35,
    hpLoss: 10,
    music: { key: 45, chords: [MIN.i, MIN.VI, MIN.III, MIN.VII], drums: 'drive', arp: 2, wave: 'square' },
    measures: [
      '. . . .',
      // A: 4분음표
      'RA LA RA LA', 'UB DB UB DB', 'RA UB LA DB', 'RB . LB .',
      'UA DA UA DA', 'RB LB RB LB', 'RA DB LA UB', 'UA . DA .',
      // B: 8분음표 섞기
      'RA . RA RA LA . . .', 'UB . UB UB DB . . .',
      'RA . LB . RA . LB .', 'UA . DB . UA DB . .',
      'RA RA . . LA LA . .', 'UB UB . . DB DB . .',
      'RA . UB . LA . DB .', 'RB . LA . UB . DA .',
      // C: 엇박
      'RA . . LA . . RA .', 'UB . . DB . . UB .',
      'RA . . LB . . UA .', 'DB . . RA . . LB .',
      'RA . LA . RA LA RA .', 'UB . DB . UB DB UB .',
      'RA . UB . LA DB . .', 'UA . . . DB . . .',
      // D: 피날레
      'RA LA RA LA', 'UB DB UB DB',
      'RA . LB . UA . DB .', 'RB . LA . UB . DA .',
      'RA RA LA LA UB UB DB DB', 'RA LB RA LB',
      'UA DB UA DB', 'RA . . .',
      '. . . .',
    ],
  },

  hard: {
    id: 'hard',
    name: '어려움',
    bpm: 144,
    leadIn: 4,
    approach: 1.05,
    hpLoss: 12,
    music: { key: 50, chords: [MIN.i, MIN.VI, MIN.VII, MIN.V], drums: 'fast', arp: 1, wave: 'square' },
    measures: [
      '. . . .',
      // A: 8분 연타
      'RA LA RA LA UB DB UB DB', 'RA UB LA DB RA UB LA DB',
      'RB LB RB LB UA DA UA DA', 'RA . RA LA . LA UB .',
      'DB . DB UA . UA RB .', 'LA RB LA RB UA DB UA DB',
      'RA RA LB LB UA UA DB DB', 'RA . . . LB . . .',
      // B: 16분 버스트
      'RA RA . . LA LA . . UB UB . . DB DB . .',
      'RA . LA . RA . LA . UB . DB . UB . DB .',
      'RA RA RA . LB . LB . UA UA UA . DB . DB .',
      'RB . . . LA . . . UB . UB . DA . DA .',
      'RA LA RA LA RA . . . UB DB UB DB UB . . .',
      'LA RA LA RA LA . . . DB UB DB UB DB . . .',
      'RA . UB . LA . DB . RA UB LA DB . . . .',
      'UA . . . . . . . DB . . . . . . .',
      // C: 엇박
      'RA . . LA . . RA .', 'UB . . DB . . UB .',
      'RA . . LB . . UA DB', 'LA . . RB . . DA UB',
      'RA LA . RA LA . RA LA', 'UB DB . UB DB . UB DB',
      'RA UB LA DB RB UA LB DA', 'RA . . . . . . .',
      // D: 피날레
      'RA RA LA LA RA RA LA LA UB UB DB DB UB UB DB DB',
      'RA LB RA LB UA DB UA DB', 'RB LA RB LA UB DA UB DA',
      'RA RA RA RA LA LA LA LA UB UB UB UB DB DB DB DB',
      'RA UB LA DB RA UB LA DB', 'RB UA LB DA RB UA LB DA',
      'RA LA RA LA UB DB UB DB RA LB RA LB UA DB UA DB',
      'RA . . . . . . .',
      '. . . .',
    ],
  },
};
