// 키보드·터치·게임패드 입력을 하나로 모아
//  - onAction(dir, button, timeMs): 십자키 방향 + A/B 버튼 조합 (게임 액션)
//  - onNav(key): 개별 키 입력 (메뉴 조작용: up/down/left/right/A/B/confirm/start)
// 으로 전달한다. leaf 모듈.

const KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyZ: 'A', KeyJ: 'A',
  KeyX: 'B', KeyK: 'B',
  Enter: 'confirm', Space: 'confirm',
  Escape: 'start', KeyP: 'start',
};
const DIR_KEYS = ['up', 'down', 'left', 'right'];
const COMBO_MS = 80; // 버튼을 방향보다 살짝 먼저 눌러도 조합으로 인정하는 시간

export class Input {
  constructor({ onAction, onNav }) {
    this.onAction = onAction;
    this.onNav = onNav;
    this.down = new Set(); // `${입력원}:${키}`
    this.held = []; // 눌린 방향 [{ id, dir }], 마지막이 가장 최근
    this.pending = null; // 방향 없이 먼저 눌린 버튼
  }

  press(src, key, ts) {
    const id = `${src}:${key}`;
    if (this.down.has(id)) return;
    this.down.add(id);
    if (DIR_KEYS.includes(key)) {
      this.held.push({ id, dir: key });
      if (this.pending && ts - this.pending.ts <= COMBO_MS) this.onAction(key, this.pending.button, this.pending.ts);
      this.pending = null;
    } else if (key === 'A' || key === 'B') {
      const dir = this.held.at(-1)?.dir;
      if (dir) this.onAction(dir, key, ts);
      else this.pending = { button: key, ts };
    }
    this.onNav(key);
  }

  release(src, key) {
    const id = `${src}:${key}`;
    this.down.delete(id);
    this.held = this.held.filter((h) => h.id !== id);
  }

  reset() {
    this.down.clear();
    this.held = [];
    this.pending = null;
  }

  attach(pad) {
    addEventListener('keydown', (e) => {
      const key = KEYS[e.code];
      if (!key || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      if (!e.repeat) this.press('k', key, e.timeStamp);
    });
    addEventListener('keyup', (e) => {
      const key = KEYS[e.code];
      if (!key) return;
      e.preventDefault();
      this.release('k', key);
    });
    addEventListener('blur', () => this.reset());
    if (pad) this.attachPad(pad);
  }

  // 터치 십자키: 누른 위치의 방향을 판단하고, 손가락을 미끄러뜨리면 방향이 바뀐다.
  attachPad(pad) {
    const dpad = pad.querySelector('[data-dpad]');
    const dirOf = (e) => {
      const r = dpad.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < r.width * 0.12) return null;
      if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
      return dy < 0 ? 'up' : 'down';
    };
    const current = new Map(); // pointerId -> dir
    const setDir = (e, dir) => {
      const src = `p${e.pointerId}`;
      const prev = current.get(e.pointerId);
      if (prev === dir) return;
      if (prev) this.release(src, prev);
      current.set(e.pointerId, dir);
      if (dir) this.press(src, dir, e.timeStamp);
      dpad.dataset.dir = dir ?? '';
    };
    dpad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dpad.setPointerCapture(e.pointerId);
      setDir(e, dirOf(e));
    });
    dpad.addEventListener('pointermove', (e) => {
      if (current.has(e.pointerId)) setDir(e, dirOf(e));
    });
    for (const type of ['pointerup', 'pointercancel']) {
      dpad.addEventListener(type, (e) => {
        setDir(e, null);
        current.delete(e.pointerId);
      });
    }

    for (const btn of pad.querySelectorAll('[data-key]')) {
      const key = btn.dataset.key;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        btn.classList.add('on');
        this.press(`p${e.pointerId}`, key, e.timeStamp);
      });
      for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
        btn.addEventListener(type, (e) => {
          btn.classList.remove('on');
          this.release(`p${e.pointerId}`, key);
        });
      }
    }
  }

  // 게임패드(표준 매핑)는 이벤트가 없어 매 프레임 상태를 읽는다.
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const ts = performance.now();
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      const b = (i) => !!gp.buttons[i]?.pressed;
      const [ax = 0, ay = 0] = gp.axes;
      const state = {
        up: b(12) || ay < -0.5,
        down: b(13) || ay > 0.5,
        left: b(14) || ax < -0.5,
        right: b(15) || ax > 0.5,
        A: b(0),
        B: b(1),
        start: b(9),
      };
      const src = `g${gp.index}`;
      for (const [key, on] of Object.entries(state)) {
        const isDown = this.down.has(`${src}:${key}`);
        if (on && !isDown) this.press(src, key, ts);
        else if (!on && isDown) this.release(src, key);
      }
    }
  }
}
