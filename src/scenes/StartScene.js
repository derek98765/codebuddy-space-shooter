export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Starfield background ──────────────────────────────────────────────────
    const NUM_STARS = 160;
    this._stars = [];
    for (let i = 0; i < NUM_STARS; i++) {
      this._stars.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        size: Phaser.Math.FloatBetween(0.8, 2.2),
        speed: Phaser.Math.FloatBetween(0.4, 1.8),
        alpha: Phaser.Math.FloatBetween(0.4, 1.0),
      });
    }
    this._starGfx = this.add.graphics().setDepth(0);

    // ── Title ─────────────────────────────────────────────────────────────────
    this.add.text(W / 2, H / 2 - 120, 'SPACE SHOOTER', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#0088ff',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5).setDepth(1);

    // ── Subtitle ──────────────────────────────────────────────────────────────
    this.add.text(W / 2, H / 2 - 50, 'Survive the onslaught. Defeat the boss.', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#7799cc',
    }).setOrigin(0.5, 0.5).setDepth(1);

    // ── Start prompt (blinking) ───────────────────────────────────────────────
    const prompt = this.add.text(W / 2, H / 2 + 60, '[ PRESS ENTER OR CLICK TO START ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#00ffcc',
    }).setOrigin(0.5, 0.5).setDepth(1);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ── Controls hint ─────────────────────────────────────────────────────────
    this.add.text(W / 2, H / 2 + 130, 'WASD / Arrow Keys — Move      Z — Fire      X — Charged Shot', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#556677',
    }).setOrigin(0.5, 0.5).setDepth(1);

    // ── Input: keyboard ───────────────────────────────────────────────────────
    this.input.keyboard.once('keydown-ENTER', () => this._startGame());
    this.input.keyboard.once('keydown-SPACE', () => this._startGame());

    // ── Input: click / tap ────────────────────────────────────────────────────
    this.input.once('pointerdown', () => this._startGame());

    // ── Fade in ───────────────────────────────────────────────────────────────
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 500,
      ease: 'Power1',
    });
  }

  update(_time, delta) {
    const W = this.scale.width;
    const H = this.scale.height;
    const g = this._starGfx;
    g.clear();
    for (const s of this._stars) {
      s.x -= s.speed;
      if (s.x < 0) { s.x = W + s.size; s.y = Phaser.Math.Between(0, H); }
      g.fillStyle(0xffffff, s.alpha);
      g.fillRect(s.x, s.y, s.size, s.size);
    }
  }

  _startGame() {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('GameScene');
    });
  }
}
