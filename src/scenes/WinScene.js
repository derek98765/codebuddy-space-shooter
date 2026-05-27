export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  preload() {
    this.load.image('play-again-btn', 'assets/play-again-btn.webp');
    this.load.image('you-win', 'assets/you-win.webp');
  }

  init(data) {
    this._score = data?.score ?? 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(0);

    // YOU WIN image — 1632×474 source, displayed at 55% screen width
    const titleW = Math.min(W * 0.55, 600);
    const titleH = titleW * (474 / 1632);
    const titleY = H / 2 - 80;
    this.add.image(W / 2, titleY, 'you-win')
      .setDisplaySize(titleW, titleH)
      .setOrigin(0.5, 0.5)
      .setDepth(2);

    // Final score
    const scoreY = titleY + titleH / 2 + 48;
    this.add.text(W / 2, scoreY, 'SCORE  ' + this._score, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#44ffaa',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Play Again button
    const btnW = Math.min(W * 0.28, 240) * 1.25;
    const btnH = btnW * (564 / 1586);
    const btnY  = scoreY + 64;
    const playBtn = this.add.image(W / 2, btnY, 'play-again-btn')
      .setDisplaySize(btnW, btnH)
      .setOrigin(0.5, 0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    playBtn.on('pointerover', () => playBtn.setScale(playBtn.scaleX * 1.08, playBtn.scaleY * 1.08));
    playBtn.on('pointerout',  () => playBtn.setDisplaySize(btnW, btnH));
    playBtn.on('pointerdown', () => {
      this.scene.start('StartScene');
      this.scene.stop();
    });

    // Keyboard: Space or Enter to play again
    const restart = () => { this.scene.start('StartScene'); this.scene.stop(); };
    this.input.keyboard.once('keydown-SPACE', restart);
    this.input.keyboard.once('keydown-ENTER', restart);

    // Hint text
    this.add.text(W / 2, btnY + btnH / 2 + 18, 'or press SPACE / ENTER', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#337755',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Star particles (simple twinkling rects)
    const gfx = this.add.graphics().setDepth(1);
    const stars = [];
    for (let i = 0; i < 60; i++) {
      stars.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        size: Phaser.Math.FloatBetween(1, 2.5),
        alpha: Phaser.Math.FloatBetween(0.3, 1.0),
        speed: Phaser.Math.FloatBetween(0.3, 1.2),
      });
    }
    this.events.on('update', () => {
      gfx.clear();
      for (const s of stars) {
        s.alpha = 0.4 + Math.sin(Date.now() / 400 + s.x) * 0.4;
        gfx.fillStyle(0x44ffaa, s.alpha);
        gfx.fillRect(s.x, s.y, s.size, s.size);
      }
    });

    // Flash-in animation
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 500,
      ease: 'Power1',
    });
  }
}
