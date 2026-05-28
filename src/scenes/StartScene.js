export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    this.load.image('sky-background',    'assets/sky-background.webp');
    this.load.image('clouds-foreground', 'assets/clouds-foreground.webp');
    this.load.image('logo',              'assets/logo.webp');
    this.load.image('play-now-btn',      'assets/play-now-btn.webp');
    this.load.image('key-wasd',          'assets/key-wasd.webp');
    this.load.image('key-j',             'assets/key-j.webp');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Detect mobile
    const isMobile = /Mobi|Android|iPhone|iPad|iPod|Touch/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && window.innerWidth <= 1024);

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
    const logoW = Math.min(W * 0.5, 690);
    const logoH = logoW * (668 / 1536);
    this.add.image(W / 2, H / 2 - 130, 'logo')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    const logoBottom = H / 2 - 130 + logoH / 2;

    // ── Control hint ──────────────────────────────────────────────────────────
    const keysY = logoBottom + 68;

    if (isMobile) {
      // Mobile: show simple text hints
      const hintStyle = {
        fontSize: '16px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3, align: 'center',
      };
      this.add.text(W / 2, keysY - 8, 'HOLD & DRAG  —  MOVE\nAUTO FIRE', hintStyle)
        .setOrigin(0.5, 0.5).setDepth(10).setLineSpacing(10);
    } else {
      // Desktop: show key images
      const keyH = 56;
      const wasdW = keyH * (1149 / 315);
      const jW    = keyH * (285  / 315);
      const gap   = 48;
      const totalW = wasdW + gap + jW;
      const keysX  = W / 2 - totalW / 2;

      this.add.image(keysX + wasdW / 2, keysY, 'key-wasd')
        .setDisplaySize(wasdW, keyH).setOrigin(0.5, 0.5).setDepth(10);
      this.add.text(keysX + wasdW / 2, keysY - keyH / 2 - 14, 'MOVE', {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(10);

      this.add.image(keysX + wasdW + gap + jW / 2, keysY, 'key-j')
        .setDisplaySize(jW, keyH).setOrigin(0.5, 0.5).setDepth(10);
      this.add.text(keysX + wasdW + gap + jW / 2, keysY - keyH / 2 - 14, 'FIRE', {
        fontSize: '18px', fontFamily: 'monospace', color: '#ffffff',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5, 1).setDepth(10);
    }

    // ── Play Now button ───────────────────────────────────────────────────────
    const btnW = Math.min(W * 0.28, 240) * 1.25;
    const btnH = btnW * (567 / 1568);
    const btnX  = W / 2;
    const btnY  = logoBottom + 196;

    const playBtn = this.add.image(btnX, btnY, 'play-now-btn')
      .setDisplaySize(btnW, btnH)
      .setOrigin(0.5, 0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });

    // Phaser FX glow — starts at 0 strength, animates on hover
    const glow = playBtn.preFX.addGlow(0xffd966, 0, 0, false, 0.1, 16);

    playBtn.on('pointerover', () => {
      playBtn.setDisplaySize(btnW * 1.05, btnH * 1.05);
      this.tweens.add({ targets: glow, outerStrength: 10, duration: 150, ease: 'Power2' });
    });
    playBtn.on('pointerout', () => {
      playBtn.setDisplaySize(btnW, btnH);
      this.tweens.add({ targets: glow, outerStrength: 0, duration: 200, ease: 'Power1' });
    });
    playBtn.on('pointerdown', () => this._startGame());

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
