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

    // ── Key controls ──────────────────────────────────────────────────────────
    const keyH = 44;
    const wasdW = keyH * (1149 / 315);
    const jW    = keyH * (285  / 315);
    const gap   = 40;
    const totalW = wasdW + gap + jW;
    const keysX  = W / 2 - totalW / 2;
    const keysY  = H / 2 + 20;

    if (this.textures.exists('key-wasd')) {
      this.add.image(keysX + wasdW / 2, keysY, 'key-wasd')
        .setDisplaySize(wasdW, keyH).setOrigin(0.5, 0.5).setDepth(1).setAlpha(0.85);
    }
    this.add.text(keysX + wasdW / 2, keysY - keyH / 2 - 10, 'MOVE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#cccccc',
    }).setOrigin(0.5, 1).setDepth(1);

    if (this.textures.exists('key-j')) {
      this.add.image(keysX + wasdW + gap + jW / 2, keysY, 'key-j')
        .setDisplaySize(jW, keyH).setOrigin(0.5, 0.5).setDepth(1).setAlpha(0.85);
    }
    this.add.text(keysX + wasdW + gap + jW / 2, keysY - keyH / 2 - 10, 'FIRE', {
      fontSize: '13px', fontFamily: 'monospace', color: '#cccccc',
    }).setOrigin(0.5, 1).setDepth(1);

    // ESC hint
    this.add.text(W / 2, keysY + keyH / 2 + 18, 'ESC  — resume', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
    }).setOrigin(0.5, 0).setDepth(1);

    // Resume button
    const btnW = 180, btnH = 44;
    const btnBg = this.add.rectangle(W / 2, keysY + keyH / 2 + 68, btnW, btnH, 0x224422)
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    this.add.text(W / 2, keysY + keyH / 2 + 68, 'RESUME', {
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
