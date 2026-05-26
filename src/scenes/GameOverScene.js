export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  preload() {
    this.load.image('play-again-btn', 'assets/play-again-btn.png');
    this.load.image('game-over',      'assets/game-over.png');
  }

  init(data) {
    this._score = data?.score ?? 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(0);

    // Game Over logo
    const logoW = Math.min(W * 0.6, 520);
    const logoH = logoW * (735 / 1313);
    const logoY = H / 2 - logoH / 2 - 20;
    this.add.image(W / 2, logoY, 'game-over')
      .setDisplaySize(logoW, logoH)
      .setOrigin(0.5, 0.5)
      .setDepth(2);

    // Final score
    const scoreY = logoY + logoH / 2 + 44;
    this.add.text(W / 2, scoreY, 'SCORE  ' + this._score, {
      fontSize: '36px',
      fontFamily: 'monospace',
      color: '#ff8888',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Restart button
    const btnW = Math.min(W * 0.28, 240) * 1.25;
    const btnH = btnW * (564 / 1586);
    const playBtn = this.add.image(W / 2, scoreY + 72, 'play-again-btn')
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

    // Hint text
    this.add.text(W / 2, scoreY + 72 + btnH / 2 + 24, 'or press SPACE / ENTER', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#883333',
    }).setOrigin(0.5, 0.5).setDepth(2);

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
