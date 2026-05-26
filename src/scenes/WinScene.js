export class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  init(data) {
    this._score = data?.score ?? 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.85).setDepth(0);

    // Glow strip
    this.add.rectangle(W / 2, H / 2 - 60, W, 120, 0x001122, 0.7).setDepth(1);

    // Title
    this.add.text(W / 2, H / 2 - 60, 'YOU WIN', {
      fontSize: '56px',
      fontFamily: 'monospace',
      color: '#44ffaa',
      stroke: '#005533',
      strokeThickness: 4,
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Subtitle
    this.add.text(W / 2, H / 2 + 10, 'The boss has been defeated!', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#88ccaa',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Final score
    this.add.text(W / 2, H / 2 + 40, 'SCORE  ' + this._score, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#44ffaa',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Restart button
    const btnBg = this.add.rectangle(W / 2, H / 2 + 90, 180, 44, 0x002211)
      .setDepth(2).setInteractive({ useHandCursor: true });
    this.add.rectangle(W / 2, H / 2 + 90, 184, 48, 0x44ffaa, 0)
      .setDepth(2).setStrokeStyle(2, 0x44ffaa);
    const btnText = this.add.text(W / 2, H / 2 + 90, '[ PLAY AGAIN ]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#44ffaa',
    }).setOrigin(0.5, 0.5).setDepth(3);

    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0x004422);
      btnText.setColor('#ffffff');
    });
    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0x002211);
      btnText.setColor('#44ffaa');
    });
    btnBg.on('pointerdown', () => {
      this.scene.start('StartScene');
      this.scene.stop();
    });

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
