// WebAudio 기반 곡 시계 + 합성 음악 + 효과음. 외부 음원 파일 없이 동작한다.
// leaf 모듈: 맵 객체의 bpm / leadIn / music 필드만 읽는다.

const DRUMS = {
  light: { kick: [0, 8], snare: [], hat: [0, 4, 8, 12] },
  basic: { kick: [0, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  drive: { kick: [0, 6, 8], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] },
  fast: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
};
const ARP = [0, 1, 2, 1];
const midiHz = (m) => 440 * 2 ** ((m - 69) / 12);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.song = null;
    this.timer = 0;
    this.perfZero = 0;
    this.latency = 0;
    this.pausedAt = null;
  }

  // 사용자 입력(클릭·키) 핸들러 안에서 호출해야 모바일에서도 소리가 난다.
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, len);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state !== 'running') this.ctx.resume();
  }

  // 곡 시작. 곡 시간 0초 = 0박. totalBeats 이후 음악이 멈춘다.
  start(map, totalBeats) {
    this.stop();
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.connect(this.master);
    const startAt = ctx.currentTime + 0.5;
    this.song = { map, bus, startAt, step: 0, totalSteps: totalBeats * 4, stepDur: 60 / map.bpm / 4 };
    this.latency = (ctx.outputLatency || 0) + (ctx.baseLatency || 0);
    this.perfZero = performance.now() + (startAt - ctx.currentTime + this.latency) * 1000;
    this.pausedAt = null;
    this.timer = setInterval(() => this.schedule(), 25);
    this.schedule();
  }

  stop() {
    clearInterval(this.timer);
    if (this.song) this.song.bus.disconnect();
    this.song = null;
  }

  pause() {
    this.pausedAt = performance.now();
    this.ctx?.suspend();
  }

  resume() {
    if (this.pausedAt != null) this.perfZero += performance.now() - this.pausedAt;
    this.pausedAt = null;
    this.ctx?.resume();
  }

  // performance.now() 기준 시각(ms)의 곡 시간(초). 소리가 실제로 들리는 시점 기준.
  time(perfMs = performance.now()) {
    return (perfMs - this.perfZero) / 1000;
  }

  // 매 프레임 호출: performance 시계가 오디오 시계와 어긋나면(일시정지·드리프트) 맞춘다.
  // 오디오가 막혀 멈춰 있으면 맞추지 않고 performance 시계로 계속 진행한다.
  sync() {
    if (!this.song || this.ctx.state !== 'running') return;
    const audioT = this.ctx.currentTime - this.song.startAt - this.latency;
    const drift = this.time() - audioT;
    // 큰 차이(시작 지연·재개)는 즉시, 작은 차이는 오디오 시계의 계단형 갱신을 고려해 천천히 맞춘다.
    this.perfZero += drift * 1000 * (Math.abs(drift) > 0.1 ? 1 : 0.05);
  }

  schedule() {
    const s = this.song;
    if (!s) return;
    const horizon = this.ctx.currentTime + 0.15;
    while (s.step < s.totalSteps && s.startAt + s.step * s.stepDur < horizon) {
      this.playStep(s, s.step, s.startAt + s.step * s.stepDur);
      s.step++;
    }
  }

  playStep(s, step, when) {
    const { music, leadIn } = s.map;
    const out = s.bus;
    const leadSteps = leadIn * 4;
    if (step < leadSteps) {
      if (step % 4 === 0) this.tone(out, when, { freq: step === 0 ? 1760 : 1320, dur: 0.05, type: 'square', vol: 0.08 });
      return;
    }
    const local = step - leadSteps;
    const pos = local % 16;
    const bar = Math.floor(local / 16);
    const lastBar = (s.totalSteps - leadSteps) / 16 - 1;
    const chord = music.chords[bar % music.chords.length];
    if (bar >= lastBar) {
      if (pos === 0) {
        this.kick(out, when);
        this.noise(out, when, { dur: 1.2, vol: 0.12, type: 'highpass', freq: 5000 });
        chord.forEach((c) => this.tone(out, when, { freq: midiHz(music.key + 12 + c), dur: 1.6, type: 'triangle', vol: 0.08 }));
      }
      return;
    }
    const drums = DRUMS[music.drums];
    if (drums.kick.includes(pos)) this.kick(out, when);
    if (drums.snare.includes(pos)) this.snare(out, when);
    if (drums.hat.includes(pos)) this.noise(out, when, { dur: 0.035, vol: 0.08, type: 'highpass', freq: 7000 });
    if (pos === 0) {
      chord.forEach((c) => this.tone(out, when, { freq: midiHz(music.key + 12 + c), dur: s.stepDur * 15, type: 'sine', vol: 0.025 }));
    }
    if (pos % 2 === 0) {
      const note = music.key - 12 + chord[0] + (pos % 4 === 2 ? 12 : 0);
      this.tone(out, when, { freq: midiHz(note), dur: s.stepDur * 1.8, type: 'square', vol: 0.09, lp: 700 });
    }
    if (pos % music.arp === 0) {
      const note = music.key + 12 + chord[ARP[(pos / music.arp) % ARP.length]];
      this.tone(out, when, { freq: midiHz(note), dur: s.stepDur * music.arp * 0.9, type: music.wave, vol: 0.045 });
    }
  }

  sfx(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const out = this.master;
    switch (name) {
      case 'slash':
        this.noise(out, t, { dur: 0.12, vol: 0.35, type: 'bandpass', freq: 900, to: 4500, q: 1.5 });
        break;
      case 'guard':
        this.tone(out, t, { freq: midiHz(84), dur: 0.1, type: 'square', vol: 0.05 });
        this.tone(out, t, { freq: midiHz(91), dur: 0.22, type: 'sine', vol: 0.14 });
        break;
      case 'hit':
        this.tone(out, t, { freq: midiHz(88), dur: 0.08, type: 'triangle', vol: 0.16 });
        this.tone(out, t + 0.04, { freq: midiHz(95), dur: 0.1, type: 'triangle', vol: 0.1 });
        break;
      case 'miss':
        this.tone(out, t, { freq: 160, to: 60, dur: 0.25, type: 'sawtooth', vol: 0.12 });
        break;
      case 'move':
        this.tone(out, t, { freq: midiHz(76), dur: 0.05, type: 'square', vol: 0.04 });
        break;
      case 'ok':
        this.tone(out, t, { freq: midiHz(79), dur: 0.06, type: 'square', vol: 0.05 });
        this.tone(out, t + 0.06, { freq: midiHz(86), dur: 0.1, type: 'square', vol: 0.05 });
        break;
    }
  }

  // --- 합성 악기 ---

  kick(out, when) {
    this.tone(out, when, { freq: 150, to: 45, dur: 0.3, type: 'sine', vol: 0.8 });
  }

  snare(out, when) {
    this.noise(out, when, { dur: 0.14, vol: 0.25, type: 'bandpass', freq: 1800, q: 0.8 });
    this.tone(out, when, { freq: 200, to: 120, dur: 0.08, type: 'triangle', vol: 0.2 });
  }

  tone(out, when, { freq, to, dur, type, vol, lp }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (to) o.frequency.exponentialRampToValueAtTime(to, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    let node = o;
    if (lp) {
      node = ctx.createBiquadFilter();
      node.frequency.value = lp;
      o.connect(node);
    }
    node.connect(g).connect(out);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  noise(out, when, { dur, vol, type, freq, to, q = 1 }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, when);
    if (to) f.frequency.exponentialRampToValueAtTime(to, when + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(out);
    src.start(when);
    src.stop(when + dur + 0.05);
  }
}
