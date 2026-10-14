// 플레이 장면: 노트 진행, 입력 판정, 점수·이펙트 상태를 관리한다. (렌더러가 읽는 view 객체이기도 하다)
//  - 리듬 모드: main 이 넘겨주는 곡 시간(오디오 시계)으로 진행한다.
//  - 드릴 모드(튜토리얼): 자체 시계로 진행하고, 공격이 판정선에서 멈춰 올바른 입력을 기다린다.

import { WINDOWS, GRADES, grade, Score } from '../core/judge.js';

export class PlayScene {
  constructor({ notes, approach, endTime, hpLoss = 0, bpm = null, drill = false, title = '', caption = null, onEvent = () => {} }) {
    this.notes = notes.map((n) => ({ ...n, result: null, at: 0 }));
    this.approach = approach;
    this.endTime = endTime;
    this.bpm = bpm;
    this.drill = drill;
    this.title = title;
    this.caption = caption;
    this.onEvent = onEvent;
    this.noFail = hpLoss === 0;
    this.score = drill ? null : new Score(this.notes.length, hpLoss);
    this.time = drill ? 0 : -1;
    this.wall = 0;
    this.lastWall = null;
    this.cursor = 0; // 이 인덱스 앞의 노트는 모두 판정 완료
    this.pose = null;
    this.popups = [];
    this.sparks = [];
    this.hurtAt = null;
    this.wrongAt = null;
    this.waiting = null;
    this.done = false;
    this.failed = false;
  }

  get beat() {
    return this.bpm ? (this.time * this.bpm) / 60 : null;
  }

  get progress() {
    return this.time / this.endTime;
  }

  // songTime: 리듬 모드의 곡 시간(초, 드릴 모드에서는 무시), wall: 실제 시각(초, 이펙트용)
  update(songTime, wall) {
    const dt = this.lastWall == null ? 0 : Math.min(wall - this.lastWall, 0.1);
    this.lastWall = wall;
    this.wall = wall;

    if (this.drill) {
      const next = this.notes[this.cursor];
      this.time += dt;
      this.waiting = next && this.time >= next.time ? next : null;
      if (this.waiting) this.time = next.time;
      if (!next && this.time >= this.endTime) this.done = true;
    } else {
      this.time = songTime;
      for (let i = this.cursor; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (n.time + WINDOWS.good >= songTime) break;
        if (!n.result) this.judge(n, 'miss');
      }
      this.failed = !this.noFail && this.score.failed;
      if (this.failed || songTime >= this.endTime) this.done = true;
    }

    while (this.cursor < this.notes.length && this.notes[this.cursor].result) this.cursor++;
    this.popups = this.popups.filter((p) => wall - p.at < 1);
    this.sparks = this.sparks.filter((s) => wall - s.at < 1);
  }

  // 방향 + 버튼 액션 입력. t: 입력 시점의 곡 시간(리듬 모드)
  input(dir, button, t) {
    this.pose = { dir, button, at: this.wall };
    const matches = (n) => n.dir === dir && n.button === button;

    if (this.drill) {
      const n = this.waiting;
      if (!n) return;
      if (matches(n)) this.judge(n, 'perfect', '좋아!');
      else {
        this.wrongAt = this.wall;
        this.onEvent('wrong');
      }
      return;
    }

    // 판정 범위 안에서 맞는 액션의 노트를 친다. GREAT 범위 안이면 가장 이른 노트를,
    // 아니면 가장 가까운 노트를 고른다(같은 액션 연타에서 다음 노트를 가로채지 않도록).
    // 맞는 노트가 없으면 가장 가까운 노트를 틀린 것(MISS)으로 처리한다.
    let hit = null;
    let wrong = null;
    const dist = (n) => Math.abs(n.time - t);
    for (let i = this.cursor; i < this.notes.length; i++) {
      const n = this.notes[i];
      if (n.time - t > WINDOWS.good) break;
      if (n.result || dist(n) > WINDOWS.good) continue;
      if (matches(n)) {
        if (!hit || (dist(hit) > WINDOWS.great && dist(n) < dist(hit))) hit = n;
      } else if (!wrong || dist(n) < dist(wrong)) wrong = n;
    }
    if (hit) this.judge(hit, grade(hit.time - t));
    else if (wrong) this.judge(wrong, 'miss');
  }

  judge(n, g, label) {
    n.result = g;
    n.at = this.wall;
    this.score?.add(g);
    const info = GRADES[g];
    this.popups.push({ text: label ?? info.label, color: info.color, at: this.wall });
    if (g === 'miss') {
      this.hurtAt = this.wall;
      this.onEvent('miss');
    } else {
      this.sparks.push({ dir: n.dir, color: info.color, at: this.wall });
      this.onEvent('hit');
    }
  }
}
