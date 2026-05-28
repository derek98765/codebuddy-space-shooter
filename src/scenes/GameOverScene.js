export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  preload() {
    this.load.image('play-again-btn', 'assets/play-again-btn.webp');
    this.load.image('game-over',      'assets/game-over.webp');
  }

  init(data) {
    this._score = data?.score ?? 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(0);

    // Stack all elements vertically centered in H
    const logoW   = Math.min(W * 0.6, 520);
    const logoH   = Math.min(logoW * (735 / 1313), H * 0.38);
    const scoreFs = Math.max(Math.min(Math.round(H * 0.055), 36), 18);
    const btnW    = Math.min(W * 0.5, 300);
    const btnH    = btnW * (564 / 1586);
    const gap1    = Math.max(H * 0.045, 16);
    const gap2    = Math.max(H * 0.045, 16);
    const totalH  = logoH + gap1 + scoreFs + gap2 + btnH;
    const top     = (H - totalH) / 2;

    const logoY  = top + logoH / 2;
    const scoreY = top + logoH + gap1 + scoreFs / 2;
    const btnY   = top + logoH + gap1 + scoreFs + gap2 + btnH / 2;

    this.add.image(W / 2, logoY, 'game-over')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5, 0.5)
      .setDepth(2);

    // Final score
    this.add.text(W / 2, scoreY, 'SCORE  ' + this._score, {
      fontSize: scoreFs + 'px',
      fontFamily: 'monospace',
      color: '#ff8888',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Restart button
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

    // Keyboard: Space or Enter to restart
    const restart = () => { this.scene.start('StartScene'); this.scene.stop(); };
    this.input.keyboard.once('keydown-SPACE', restart);
    this.input.keyboard.once('keydown-ENTER', restart);

    // Flash-in animation
    this.cameras.main.setAlpha(0);
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 1,
      duration: 400,
      ease: 'Power1',
    });
  }
}
