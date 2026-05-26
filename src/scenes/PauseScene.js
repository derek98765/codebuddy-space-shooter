/**
 * PauseScene — launched on top of GameScene + UIScene when ESC is pressed.
 * Pressing ESC again (or clicking Resume) resumes the game.
 */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Semi-transparent dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(0);

    // "PAUSED" title
    this.add.text(W / 2, H / 2 - 60, 'PAUSED', {
      fontSize: '52px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(1);

    // Subtitle hint
    this.add.text(W / 2, H / 2 + 10, 'Press ESC or click Resume to continue', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    }).setOrigin(0.5).setDepth(1);

    // Resume button
    const btnW = 180, btnH = 44;
    const btnBg = this.add.rectangle(W / 2, H / 2 + 70, btnW, btnH, 0x224422)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    this.add.text(W / 2, H / 2 + 70, 'RESUME', {
      fontSize: '18px',
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color: '#44ff88',
    }).setOrigin(0.5).setDepth(2);

    btnBg.on('pointerover',  () => btnBg.setFillStyle(0x336633));
    btnBg.on('pointerout',   () => btnBg.setFillStyle(0x224422));
    btnBg.on('pointerdown',  () => this._resume());

    // ESC to resume
    this.input.keyboard.once('keydown-ESC', () => this._resume());
  }

  _resume() {
    // Resume the paused scenes
    this.scene.resume('GameScene');
    this.scene.resume('UIScene');
    this.scene.stop();
  }
}
