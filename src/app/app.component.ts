import { Component, OnInit } from '@angular/core';

enum Color {
  NONE,
  RED,
  ORANGE,
  YELLOW,
  GREEN,
  BLUE,
  PURPLE,
}

interface PathNode {
  prev?: PathNode;
  curr: Array<number>;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private static readonly DEFAULT_GRID_SIZE = 9;
  private static readonly SCORE_LIMIT = 5;
  private static readonly SCORE_MULTIPLIER = 5;
  private static readonly BALL_MOVE_PAUSE = 75;
  private static readonly BALL_INITIAL = 5;
  private static readonly BALL_INCREMENT = 2;
  private static readonly DIRECTION = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
  ];
  private static readonly ALL_COLOR = [
    Color.RED, Color.ORANGE, Color.YELLOW, Color.GREEN,
    Color.BLUE, Color.PURPLE,
  ];
  private static readonly COLOR_MAP = [
    'none', 'red', 'orange', 'yellow', 'chartreuse',
    'aqua', 'blueviolet',
  ];

  score: number;
  size: number;
  board: Array<Color>;
  private moveBuffer: Array<number>;

  private static getRandomColor(): Color {
    return AppComponent.ALL_COLOR[Math.trunc(Math.random() * AppComponent.ALL_COLOR.length)];
  }

  ngOnInit(): void {
    this.reset();
  }

  reset(): void {
    this.score = 0;
    this.size = AppComponent.DEFAULT_GRID_SIZE;
    this.board = new Array<Color>(this.size * this.size).fill(Color.NONE);
    this.moveBuffer = new Array<number>(0);

    this.addBall(AppComponent.BALL_INITIAL);
  }

  async bufferMovePositionForOps(i: number): Promise<void> {
    this.moveBuffer.push(i);

    const l = this.moveBuffer.length;
    if (l < 2) {
      return;
    }

    const s = this.moveBuffer[l - 2];
    const e = this.moveBuffer[l - 1];
    if (!this.hasBallAt(s) || this.hasBallAt(e)) {
      return;
    }

    const p = this.findPath(this.getPos(s), this.getPos(e));
    if (p.length === 0) {
      return;
    }

    await this.moveBall(p);
    this.reduceBallsAndCountScore(e, true);

    this.addBall(1 + Math.trunc(Math.random() * AppComponent.BALL_INCREMENT));
  }

  getPos(i: number): Array<number> {
    return [Math.trunc(i / this.size), i % this.size];
  }

  getId(pos: Array<number>): number {
    return pos[0] * this.size + pos[1];
  }

  getColor(c: Color): string {
    return AppComponent.COLOR_MAP[c.valueOf()];
  }

  intendReset(): void {
    if (confirm('确定要重新开始吗？')) {
      this.reset();
    }
  }

  private hasBallAt(i: number): boolean {
    return this.board[i] !== Color.NONE;
  }

  private getSuccessor(pos: Array<number>): Array<Array<number>> {
    const [x, y] = pos;
    const r = new Array<Array<number>>(0);

    for (const [dx, dy] of AppComponent.DIRECTION) {
      const nPos = [x + dx, y + dy];
      const [nx, ny] = nPos;
      if (nx >= 0 && nx < this.size &&
        ny >= 0 && ny < this.size &&
        !this.hasBallAt(this.getId(nPos))) {
        r.push(nPos);
      }
    }

    return r;
  }

  private findPath(s: Array<number>, e: Array<number>): Array<number> {
    const eId = this.getId(e);
    const q = new Array<PathNode>();
    q.push({ curr: s });

    const visited = new Set<number>();

    while (q.length > 0) {
      let p = q.shift();
      const cId = this.getId(p.curr);
      if (visited.has(cId)) {
        continue;
      }

      visited.add(cId);
      for (const n of this.getSuccessor(p.curr)) {
        const nId = this.getId(n);
        if (visited.has(nId)) {
          continue;
        }

        if (nId !== eId) {
          q.push({ prev: p, curr: n });
          continue;
        }

        const r = new Array<number>();
        while (p) {
          r.push(this.getId(p.curr));
          p = p.prev;
        }
        return r.reverse().concat(eId);
      }
    }

    return new Array<number>(0);
  }

  private async moveBall(p: Array<number>): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, AppComponent.BALL_MOVE_PAUSE));

    if (p.length < 2) {
      return;
    }

    const h = p.shift();
    const n = p[0];
    this.board[n] = this.board[h];
    this.board[h] = Color.NONE;

    await this.moveBall(p);
  }

  private reduceBallsAndCountScore(i: number, countScore: boolean): void {
    const [x, y] = this.getPos(i);

    for (const g of [
      this.countRow(x, y),
      this.countCol(x, y),
      this.countBackSlash(x, y),
      this.countForwardSlash(x, y),
    ]) {
      const s = this.computeScore(g);
      if (s > 0) {
        if (countScore) {
          this.score += s * AppComponent.SCORE_MULTIPLIER;
        }

        for (const gi of g) {
          this.board[gi] = Color.NONE;
        }
      }
    }
  }

  private computeScore(g: Array<number>): number {
    return g.length < AppComponent.SCORE_LIMIT ? 0 : g.length * (1 + Math.trunc((g.length - AppComponent.SCORE_LIMIT) / 2));
  }

  private countRow(x: number, y: number): Array<number> {
    const c = this.board[this.getId([x, y])];
    while (x >= 0 && this.board[this.getId([x, y])] === c) {
      x -= 1;
    }

    x += 1;
    const r = new Array<number>();
    while (x < this.size && this.board[this.getId([x, y])] === c) {
      r.push(this.getId([x, y]));
      x += 1;
    }
    return r;
  }

  private countCol(x: number, y: number): Array<number> {
    const c = this.board[this.getId([x, y])];
    while (y >= 0 && this.board[this.getId([x, y])] === c) {
      y -= 1;
    }

    y += 1;
    const r = new Array<number>();
    while (y < this.size && this.board[this.getId([x, y])] === c) {
      r.push(this.getId([x, y]));
      y += 1;
    }
    return r;
  }

  private countBackSlash(x: number, y: number): Array<number> {
    const c = this.board[this.getId([x, y])];
    while (x >= 0 && y >= 0 && this.board[this.getId([x, y])] === c) {
      x -= 1;
      y -= 1;
    }

    x += 1;
    y += 1;
    const r = new Array<number>();
    while (x < this.size && y < this.size && this.board[this.getId([x, y])] === c) {
      r.push(this.getId([x, y]));
      x += 1;
      y += 1;
    }
    return r;
  }

  private countForwardSlash(x: number, y: number): Array<number> {
    const c = this.board[this.getId([x, y])];
    while (x >= 0 && y < this.size && this.board[this.getId([x, y])] === c) {
      x -= 1;
      y += 1;
    }

    x += 1;
    y -= 1;
    const r = new Array<number>();
    while (x < this.size && y >= 0 && this.board[this.getId([x, y])] === c) {
      r.push(this.getId([x, y]));
      x += 1;
      y -= 1;
    }
    return r;
  }

  private countAvailableSpotForNewBalls(): number {
    return this.board.filter((c) => c === Color.NONE).length;
  }

  private addBall(needBall: number): void {
    if (this.countAvailableSpotForNewBalls() <= needBall) {
      alert('老许，没地儿给你放新球了，再来一把吧 ；p ！');
      this.reset();
      return;
    }

    while (needBall > 0) {
      const i = Math.trunc(Math.random() * this.board.length);
      if (this.hasBallAt(i)) {
        continue;
      }

      this.board[i] = AppComponent.getRandomColor();
      this.reduceBallsAndCountScore(i, false);
      needBall--;
    }
  }
}
