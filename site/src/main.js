// 루트 모듈: 화면 전환(메뉴·튜토리얼·플레이·일시정지·결과)과 게임 루프를 조립한다.
// 하위 모듈끼리는 서로 모르며, 연결은 모두 여기서만 한다.

import { AudioEngine } from './engine/audio.js';
import { Input } from './engine/input.js';
import { Renderer } from './engine/renderer.js';
import { PlayScene } from './scenes/play.js';
import { parseChart, parseSequence, chartLength } from './core/chart.js';
import { MAPS } from './data/maps.js';
import { TUTORIAL } from './data/tutorial.js';

const DRILL_APPROACH = 1.6;
const DRILL_GAP = 1.4;

const $ = (sel, root = document) => root.querySelector(sel);
const stage = $('#stage');
const screens = { menu: $('#menu'), dialog: $('#dialog'), pause: $('#pause'), result: $('#result') };

const audio = new AudioEngine();
const renderer = new Renderer($('#game'));
const input = new Input({ onAction, onNav });

let screen = 'menu'; // 보이는 오버레이 화면 이름, 플레이 중이면 null
let scene = null; // 진행 중인 PlayScene
let current = null; // 다시하기용: { mapId } 또는 { step }
let tutorial = null; // 튜토리얼 진행 상태: { index, accuracy }

const store = {
  get(id) {
    try {
      return JSON.parse(localStorage.getItem(`rhythm-knight:${id}`));
    } catch {
      return null;
    }
  },
  set(id, value) {
    try {
      localStorage.setItem(`rhythm-knight:${id}`, JSON.stringify(value));
    } catch {
      // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)에서는 기록만 생략한다.
    }
  },
};

// --- 화면 ---

function show(name) {
  screen = name;
  for (const [key, el] of Object.entries(screens)) el.classList.toggle('hidden', key !== name);
  if (name) screens[name].querySelector('button')?.focus({ preventScroll: true });
  else document.activeElement?.blur();
}

function refreshBest() {
  for (const el of document.querySelectorAll('[data-best]')) {
    const best = store.get(el.dataset.best);
    el.textContent = !best ? '' : best.done ? '완료' : `${best.rank} · ${best.score.toLocaleString()}`;
  }
}

function backToMenu() {
  audio.stop();
  scene = null;
  tutorial = null;
  refreshBest();
  show('menu');
}

// --- 플레이 시작 ---

function startMap(mapId) {
  const map = MAPS[mapId];
  const beats = chartLength(map);
  audio.ensure();
  scene = new PlayScene({
    notes: parseChart(map),
    approach: map.approach,
    endTime: (beats * 60) / map.bpm,
    hpLoss: map.hpLoss,
    bpm: map.bpm,
    title: map.name,
    onEvent,
  });
  current = { mapId };
  audio.start(map, beats);
  show(null);
}

function startDrill(step) {
  const notes = parseSequence(step.pattern, DRILL_APPROACH + 0.3, DRILL_GAP);
  audio.ensure();
  scene = new PlayScene({
    notes,
    approach: DRILL_APPROACH,
    endTime: notes.at(-1).time + 0.8,
    drill: true,
    caption: step.title,
    onEvent,
  });
  current = { step };
  show(null);
}

function retry() {
  if (current.step) startDrill(current.step);
  else startMap(current.mapId);
}

function finish() {
  const done = scene;
  audio.stop();
  if (tutorial) {
    if (done.score) tutorial.accuracy = done.score.accuracy;
    nextTutorial();
    return;
  }
  showResult(done, current.mapId);
}

function showResult(done, mapId) {
  const sc = done.score;
  const root = screens.result;
  $('[data-title]', root).textContent = `${done.title} ${done.failed ? '실패…' : '클리어!'}`;
  $('[data-rank]', root).textContent = sc.rank;
  const stats = {
    score: sc.value.toLocaleString(),
    accuracy: `${(sc.accuracy * 100).toFixed(1)}%`,
    maxCombo: sc.maxCombo,
    ...sc.counts,
  };
  for (const [key, value] of Object.entries(stats)) $(`[data-stat="${key}"]`, root).textContent = value;

  const best = store.get(mapId);
  const isNew = !done.failed && (!best || sc.value > best.score);
  if (isNew) store.set(mapId, { score: sc.value, rank: sc.rank });
  $('[data-newbest]', root).hidden = !isNew;
  show('result');
}

// --- 튜토리얼 ---

function startTutorial() {
  tutorial = { index: -1, accuracy: null };
  nextTutorial();
}

function nextTutorial() {
  tutorial.index++;
  const step = TUTORIAL[tutorial.index];
  if (!step) {
    store.set('tutorial', { done: true });
    backToMenu();
    return;
  }
  const last = tutorial.index === TUTORIAL.length - 1;
  let text = step.text;
  if (last && tutorial.accuracy != null) text = `연습 정확도: ${Math.round(tutorial.accuracy * 100)}%\n\n${text}`;
  const root = screens.dialog;
  $('[data-title]', root).textContent = step.title;
  $('[data-text]', root).textContent = text;
  $('[data-label]', root).textContent = step.type === 'info' ? (last ? '메뉴로' : '계속') : '시작';
  show('dialog');
}

function dialogNext() {
  const step = TUTORIAL[tutorial.index];
  if (step.type === 'drill') startDrill(step);
  else if (step.type === 'play') startMap(step.mapId);
  else nextTutorial();
}

// --- 일시정지 ---

function pause() {
  if (!scene || screen) return;
  audio.pause();
  show('pause');
}

function resume() {
  audio.resume();
  show(null);
}

// --- 입력 ---

function onAction(dir, button, timeMs) {
  if (!scene || screen || scene.done) return;
  audio.sfx(button === 'A' ? 'slash' : 'guard');
  scene.input(dir, button, scene.drill ? null : audio.time(timeMs));
}

function onEvent(type) {
  audio.sfx(type === 'hit' ? 'hit' : 'miss');
}

function onNav(key) {
  if (!screen) {
    if (key === 'start') pause();
    return;
  }
  audio.ensure();
  const buttons = [...screens[screen].querySelectorAll('button')];
  const i = buttons.indexOf(document.activeElement);
  if (key === 'up' || key === 'left' || key === 'down' || key === 'right') {
    const step = key === 'up' || key === 'left' ? -1 : 1;
    buttons[(i + step + buttons.length) % buttons.length].focus({ preventScroll: true });
    audio.sfx('move');
  } else if (key === 'A' || key === 'confirm') {
    (buttons[i] ?? buttons[0]).click();
  } else if (key === 'B' || key === 'start') {
    if (screen === 'pause') resume();
    else if (screen === 'result') backToMenu();
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn || btn.dataset.key) return;
  audio.ensure();
  audio.sfx('ok');
  const { start, act } = btn.dataset;
  if (start === 'tutorial') startTutorial();
  else if (start) startMap(start);
  else if (act === 'next') dialogNext();
  else if (act === 'menu') backToMenu();
  else if (act === 'resume') resume();
  else if (act === 'retry') retry();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// --- 화면 크기 · 루프 ---

function resize() {
  const r = stage.getBoundingClientRect();
  renderer.resize(Math.max(100, Math.floor(Math.min(r.width, r.height))));
}

const idle = { time: 0, wall: 0, beat: null, notes: [], approach: 1, pose: null, popups: [], sparks: [], score: null };

function frame(ms) {
  requestAnimationFrame(frame);
  input.poll();
  const wall = ms / 1000;
  if (scene && !screen && !scene.done) {
    if (!scene.drill) audio.sync();
    scene.update(audio.time(), wall);
    if (scene.done) finish();
  }
  idle.wall = wall;
  renderer.draw(scene ?? idle);
}

input.attach($('#pad'));
new ResizeObserver(resize).observe(stage);
resize();
refreshBest();
show('menu');
requestAnimationFrame(frame);
