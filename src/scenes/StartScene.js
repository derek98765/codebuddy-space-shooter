export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    this.load.image('sky-background',    'assets/sky-background.png');
    this.load.image('clouds-foreground', 'assets/clouds-foreground.png');
    this.load.image('logo',              'assets/logo.png');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Background ────────────────────────────────────────────────────────────
    this._bg = this.add.tileSprite(0, 0, W, H, 'sky-background')
      .setOrigin(0, 0)
      .setDepth(0);
    const bgTexH = this.textures.get('sky-background').getSourceImage().height;
    this._bg.setTileScale(H / bgTexH, H / bgTexH);
    this.add.rectangle(0, 0, W, H, 0x000000, 0.2).setOrigin(0, 0).setDepth(1);

    // ── Mid clouds ────────────────────────────────────────────────────────────
    const cloudTexH = this.textures.get('clouds-foreground').getSourceImage().height;
    const midScale = H * 0.245 * 0.75 / cloudTexH;
    const midH = cloudTexH * midScale;
    this._cloudsMid = this.add.tileSprite(0, H - midH * 0.3, W, midH, 'clouds-foreground')
      .setOrigin(0, 1)
      .setTileScale(midScale, midScale)
      .setAlpha(0.7)
      .setDepth(1.5);

    // ── Foreground clouds ─────────────────────────────────────────────────────
    const fgScale = H * 0.245 / cloudTexH;
    const fgH = cloudTexH * fgScale;
    this._clouds = this.add.tileSprite(0, H, W, fgH, 'clouds-foreground')
      .setOrigin(0, 1)
      .setTileScale(fgScale, fgScale)
      .setDepth(2);

    // ── Logo ──────────────────────────────────────────────────────────────────
    const logoW = Math.min(W * 0.5, 600);
    const logoH = logoW * (668 / 1536);
    this.add.image(W / 2, H / 2 - 130, 'logo')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    // ── Subtitle ──────────────────────────────────────────────────────────────
    this.add.text(W / 2, H / 2 - 130 + logoH / 2 + 24, 'Survive the onslaught. Defeat the boss.', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(10);

    // ── Start prompt (blinking) ───────────────────────────────────────────────
    const prompt = this.add.text(W / 2, H / 2 + 60, '[ PRESS ENTER OR CLICK TO START ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(10);

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
      color: '#ccddee',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5).setDepth(10);

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
    this._bg.tilePositionX        += delta * 0.05;
    this._cloudsMid.tilePositionX += delta * 0.2;
    this._clouds.tilePositionX    += delta * 0.3;
  }

  _startGame() {
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.scene.start('GameScene');
    });
  }
}
