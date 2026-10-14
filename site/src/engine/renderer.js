// 캔버스 렌더러. 논리 해상도 600×600에 그리고 화면 크기에 맞춰 확대한다.
// view 객체(PlayScene 또는 대기 화면)를 받아 그리기만 하며 게임 상태는 바꾸지 않는다.

import { DIRS, BUTTONS, actionOf } from '../core/actions.js';

const SIZE = 600;
const C = SIZE / 2;
const R_HIT = 82; // 판정선 반지름
const R_EDGE = 320; // 공격이 나타나는 거리
const LANE = 64;
const POSE_TIME = 0.22;

const frac = (x) => ((x % 1) + 1) % 1;
const angleOf = (d) => Math.atan2(d.dy, d.dx);

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.scale = 1;
  }

  resize(cssSize) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.style.width = `${cssSize}px`;
    this.canvas.style.height = `${cssSize}px`;
    this.canvas.width = this.canvas.height = Math.round(cssSize * dpr);
    this.scale = this.canvas.width / SIZE;
  }

  draw(v) {
    const g = this.g;
    g.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const hurt = v.hurtAt != null ? Math.max(0, 1 - (v.wall - v.hurtAt) / 0.3) : 0;
    const pulse = v.beat != null && v.beat >= 0 ? (1 - frac(v.beat)) ** 3 : 0;

    g.save();
    if (hurt) g.translate((Math.random() - 0.5) * 10 * hurt, (Math.random() - 0.5) * 10 * hurt);
    this.background(v, pulse);
    this.notes(v);
    this.knight(v, pulse);
    this.sparks(v);
    if (v.waiting) this.hint(v);
    g.restore();

    if (hurt) {
      g.fillStyle = `rgba(255, 40, 60, ${0.22 * hurt})`;
      g.fillRect(0, 0, SIZE, SIZE);
    }
    this.popup(v);
    if (v.score) this.hud(v);
    if (v.caption) this.caption(v.caption);
  }

  background(v, pulse) {
    const g = this.g;
    const bg = g.createRadialGradient(C, C, 40, C, C, 430);
    bg.addColorStop(0, `rgb(${34 + pulse * 14}, ${38 + pulse * 10}, ${78 + pulse * 20})`);
    bg.addColorStop(1, '#0b0d1c');
    g.fillStyle = bg;
    g.fillRect(-20, -20, SIZE + 40, SIZE + 40);

    const pose = v.pose && v.wall - v.pose.at < 0.15 ? v.pose : null;
    for (const d of Object.values(DIRS)) {
      g.save();
      g.translate(C, C);
      g.rotate(angleOf(d));
      const lit = pose?.dir === d.key;
      g.fillStyle = lit ? `${BUTTONS[pose.button].color}33` : 'rgba(255,255,255,0.045)';
      g.fillRect(R_HIT, -LANE / 2, R_EDGE, LANE);
      g.strokeStyle = 'rgba(255,255,255,0.08)';
      g.setLineDash([6, 10]);
      g.beginPath();
      g.moveTo(R_HIT + 20, 0);
      g.lineTo(R_EDGE, 0);
      g.stroke();
      g.setLineDash([]);
      // 판정 위치 표시
      g.strokeStyle = lit ? BUTTONS[pose.button].color : 'rgba(255,255,255,0.55)';
      g.lineWidth = 5;
      g.beginPath();
      g.arc(0, 0, R_HIT, -0.36, 0.36);
      g.stroke();
      g.restore();
    }

    g.strokeStyle = `rgba(255,255,255,${0.22 + pulse * 0.45})`;
    g.lineWidth = 2 + pulse * 3;
    g.beginPath();
    g.arc(C, C, R_HIT, 0, Math.PI * 2);
    g.stroke();
  }

  notes(v) {
    const g = this.g;
    for (const n of v.notes) {
      const dt = n.time - v.time;
      if (dt > v.approach) break; // 노트는 시간순 정렬
      if (n.result && n.result !== 'miss') continue;
      let alpha = 1;
      if (n.result === 'miss') {
        alpha = 1 - (v.wall - n.at) / 0.35;
        if (alpha <= 0) continue;
      }
      const dist = R_HIT + (dt / v.approach) * (R_EDGE - R_HIT);
      if (dist < 34) continue;
      const d = DIRS[n.dir];
      g.globalAlpha = alpha;
      if (n.button === 'A') this.monster(C + d.dx * dist, C + d.dy * dist, v.wall);
      else this.orb(C + d.dx * dist, C + d.dy * dist, v.wall);
      g.globalAlpha = 1;
    }
  }

  // A 공격: 빨간 가시 몬스터 (뾰족한 모양)
  monster(x, y, t) {
    const g = this.g;
    g.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 15 : 24;
      const a = (i * Math.PI) / 8 + t * 3;
      g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
    g.fillStyle = BUTTONS.A.color;
    g.fill();
    g.strokeStyle = '#ffd5da';
    g.lineWidth = 2;
    g.stroke();
    this.letter('A', x, y, '#fff');
  }

  // B 공격: 파란 마법탄 (둥근 모양)
  orb(x, y, t) {
    const g = this.g;
    const grad = g.createRadialGradient(x - 5, y - 5, 2, x, y, 21);
    grad.addColorStop(0, '#e6f6ff');
    grad.addColorStop(0.5, BUTTONS.B.color);
    grad.addColorStop(1, '#1d5fae');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, 19, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(160, 220, 255, 0.85)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(x, y, 24 + Math.sin(t * 10) * 2, 0, Math.PI * 2);
    g.stroke();
    this.letter('B', x, y, '#0b2a52');
  }

  letter(text, x, y, color) {
    const g = this.g;
    g.fillStyle = color;
    g.font = 'bold 17px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, x, y + 1);
  }

  knight(v, pulse) {
    const g = this.g;
    const pose = v.pose && v.wall - v.pose.at < POSE_TIME ? v.pose : null;
    const face = DIRS[v.pose?.dir ?? 'down'];
    const fa = angleOf(face);
    const s = 1 + pulse * 0.05;

    g.save();
    g.translate(C, C);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath();
    g.ellipse(0, 24, 26, 8, 0, 0, Math.PI * 2);
    g.fill();

    if (!pose) {
      // 대기 자세: 오른손 검, 왼손 방패
      g.strokeStyle = '#e8eef8';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(22, 6);
      g.lineTo(40, -22);
      g.stroke();
      g.fillStyle = BUTTONS.B.color;
      g.fillRect(-42, -12, 14, 24);
    }

    g.scale(s, s);
    const body = g.createRadialGradient(-8, -8, 4, 0, 0, 28);
    body.addColorStop(0, '#f4f7fc');
    body.addColorStop(1, '#8e9bb4');
    g.fillStyle = body;
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#5b6680';
    g.lineWidth = 3;
    g.stroke();
    // 깃털 장식(뒤쪽)과 투구 눈구멍(바라보는 방향)
    g.fillStyle = '#ff5d6c';
    g.beginPath();
    g.arc(-face.dx * 20, -face.dy * 20, 7, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.rotate(fa);
    g.fillStyle = '#1b2033';
    g.fillRect(8, -11, 8, 22);
    g.restore();
    g.restore();

    if (pose?.button === 'A') this.slash(fa, (v.wall - pose.at) / POSE_TIME);
    if (pose?.button === 'B') this.shield(fa, (v.wall - pose.at) / POSE_TIME);
  }

  // A 액션: 바라보는 방향으로 검을 휘두르는 궤적
  slash(fa, p) {
    const g = this.g;
    const from = fa - 1.1;
    const to = from + 2.2 * Math.min(1, p * 2.2);
    g.save();
    g.translate(C, C);
    g.strokeStyle = `rgba(255, 245, 210, ${1 - p})`;
    g.lineWidth = 12 * (1 - p) + 2;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, 0, R_HIT - 4, from, to);
    g.stroke();
    g.rotate(to);
    g.strokeStyle = '#ffffff';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(24, 0);
    g.lineTo(R_HIT + 8, 0);
    g.stroke();
    g.restore();
  }

  // B 액션: 바라보는 방향에 방패를 세운다
  shield(fa, p) {
    const g = this.g;
    g.save();
    g.translate(C, C);
    g.rotate(fa);
    g.globalAlpha = 1 - p * 0.6;
    g.shadowColor = BUTTONS.B.color;
    g.shadowBlur = 18;
    g.strokeStyle = BUTTONS.B.color;
    g.lineWidth = 14;
    g.beginPath();
    g.arc(0, 0, 50, -0.75, 0.75);
    g.stroke();
    g.shadowBlur = 0;
    g.strokeStyle = '#e6f6ff';
    g.lineWidth = 3;
    g.beginPath();
    g.arc(0, 0, R_HIT + p * 18, -0.5, 0.5);
    g.stroke();
    g.restore();
  }

  sparks(v) {
    const g = this.g;
    for (const sp of v.sparks) {
      const age = v.wall - sp.at;
      if (age > 0.4) continue;
      const d = DIRS[sp.dir];
      const x = C + d.dx * R_HIT;
      const y = C + d.dy * R_HIT;
      g.fillStyle = sp.color;
      for (let k = 0; k < 10; k++) {
        const a = (k * Math.PI) / 5 + sp.at;
        const r = 8 + age * 170;
        const size = 5 * (1 - age / 0.4);
        g.fillRect(x + Math.cos(a) * r - size / 2, y + Math.sin(a) * r - size / 2, size, size);
      }
    }
  }

  // 튜토리얼 드릴: 멈춰 있는 공격 옆에 눌러야 할 조합을 표시
  hint(v) {
    const g = this.g;
    const n = v.waiting;
    const d = DIRS[n.dir];
    const x = C + d.dx * R_HIT + (d.dx ? 0 : 74);
    const y = C + d.dy * R_HIT + (d.dx ? -52 : 0);
    const wrong = v.wrongAt != null && v.wall - v.wrongAt < 0.35;
    const shake = wrong ? Math.sin(v.wall * 60) * 4 : 0;
    const text = actionOf(n.dir, n.button).combo;
    g.font = 'bold 22px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const w = g.measureText(text).width + 24;
    g.fillStyle = wrong ? '#fff' : BUTTONS[n.button].color;
    this.pill(x - w / 2 + shake, y - 18, w, 36);
    g.fillStyle = wrong ? '#e0283c' : '#fff';
    g.fillText(text, x + shake, y + 1);
  }

  popup(v) {
    const p = v.popups.at(-1);
    if (!p) return;
    const age = v.wall - p.at;
    if (age > 0.6) return;
    const g = this.g;
    const s = 1 + 0.35 * Math.max(0, 1 - age / 0.1);
    g.save();
    g.translate(C + 128, C - 118);
    g.scale(s, s);
    g.globalAlpha = 1 - Math.max(0, (age - 0.4) / 0.2);
    g.font = 'bold 30px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(0,0,0,0.6)';
    g.strokeText(p.text, 0, 0);
    g.fillStyle = p.color;
    g.fillText(p.text, 0, 0);
    g.restore();
  }

  hud(v) {
    const g = this.g;
    const sc = v.score;
    g.textBaseline = 'alphabetic';
    g.textAlign = 'left';
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.font = '15px system-ui, sans-serif';
    g.fillText(v.title, 18, 28);
    g.fillStyle = '#fff';
    g.font = 'bold 30px system-ui, sans-serif';
    g.fillText(String(sc.value).padStart(7, '0'), 18, 62);

    const hp = sc.hp / 100;
    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(432, 22, 150, 14);
    g.fillStyle = hp > 0.5 ? '#7cf29a' : hp > 0.25 ? '#ffd34d' : '#ff5d6c';
    g.fillRect(432, 22, 150 * hp, 14);
    g.textAlign = 'right';
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.font = 'bold 13px system-ui, sans-serif';
    g.fillText(v.noFail ? 'HP (연습)' : 'HP', 582, 56);

    if (sc.combo >= 2) {
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.font = 'bold 46px system-ui, sans-serif';
      g.fillText(String(sc.combo), 120, 520);
      g.fillStyle = 'rgba(255,255,255,0.65)';
      g.font = 'bold 14px system-ui, sans-serif';
      g.fillText('COMBO', 120, 542);
    }

    g.fillStyle = 'rgba(255,255,255,0.15)';
    g.fillRect(0, SIZE - 5, SIZE, 5);
    g.fillStyle = '#ffd34d';
    g.fillRect(0, SIZE - 5, SIZE * Math.min(1, Math.max(0, v.progress)), 5);
  }

  pill(x, y, w, h) {
    const g = this.g;
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, w, h, h / 2);
    else g.rect(x, y, w, h);
    g.fill();
  }

  caption(text) {
    const g = this.g;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'bold 20px system-ui, sans-serif';
    const w = g.measureText(text).width + 32;
    g.fillStyle = 'rgba(10, 12, 30, 0.75)';
    this.pill(470 - w / 2, 500, w, 40);
    g.fillStyle = '#ffd34d';
    g.fillText(text, 470, 521);
  }
}
