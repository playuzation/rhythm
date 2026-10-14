// 판정 범위와 점수 계산. 다른 모듈에 의존하지 않는 leaf 모듈.

export const WINDOWS = { perfect: 0.05, great: 0.09, good: 0.135 }; // 초

export const GRADES = {
  perfect: { label: 'PERFECT', weight: 1, hp: 2, color: '#ffe066' },
  great: { label: 'GREAT', weight: 0.7, hp: 1, color: '#7cf29a' },
  good: { label: 'GOOD', weight: 0.4, hp: 0, color: '#7cc8ff' },
  miss: { label: 'MISS', weight: 0, hp: 0, color: '#ff6b6b' },
};

export function grade(offset) {
  const d = Math.abs(offset);
  if (d <= WINDOWS.perfect) return 'perfect';
  if (d <= WINDOWS.great) return 'great';
  if (d <= WINDOWS.good) return 'good';
  return null;
}

export class Score {
  constructor(total, hpLoss) {
    this.total = Math.max(total, 1);
    this.hpLoss = hpLoss;
    this.counts = { perfect: 0, great: 0, good: 0, miss: 0 };
    this.points = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.hp = 100;
  }

  add(g) {
    this.counts[g]++;
    this.points += GRADES[g].weight;
    if (g === 'miss') {
      this.combo = 0;
      this.hp = Math.max(0, this.hp - this.hpLoss);
    } else {
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.hp = Math.min(100, this.hp + GRADES[g].hp);
    }
  }

  get failed() {
    return this.hp <= 0;
  }

  get value() {
    return Math.round((1e6 * this.points) / this.total);
  }

  get accuracy() {
    return this.points / this.total;
  }

  get rank() {
    if (this.failed) return 'F';
    const a = this.accuracy;
    if (a >= 0.95) return 'S';
    if (a >= 0.88) return 'A';
    if (a >= 0.78) return 'B';
    if (a >= 0.65) return 'C';
    return 'D';
  }
}
