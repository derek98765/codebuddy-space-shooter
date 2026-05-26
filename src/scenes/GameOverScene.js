export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(0);

    // Scanline effect strip
    this.add.rectangle(W / 2, H / 2 - 60, W, 120, 0x110000, 0.6).setDepth(1);

    // Title
    this.add.text(W / 2, H / 2 - 60, 'GAME OVER', {
      fontSize: '52px',
      fontFamily: 'monospace',
      color: '#ff3333',
      stroke: '#880000',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Subtitle
    this.add.text(W / 2, H / 2 + 10, 'Your ship was destroyed.', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#cc8888',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Restart button
    const btnBg = this.add.rectangle(W / 2, H / 2 + 80, 180, 44, 0x330000)
      .setDepth(2).setInteractive({ useHandCursor: true });
    const btnBorder = this.add.rectangle(W / 2, H / 2 + 80, 184, 48, 0xff3333, 0)
      .setDepth(2).setStrokeStyle(2, 0xff3333);
    const btnText = this.add.text(W / 2, H / 2 + 80, '[ RESTART ]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ff3333',
    }).setOrigin(0.5, 0.5).setDepth(3);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x660000);
      btnText.setColor('#ffffff');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x330000);
      btnText.setColor('#ff3333');
    });
    btnBg.on('pointerdown', () => {
      this.scene.start('GameScene');
      this.scene.stop();
    });

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
