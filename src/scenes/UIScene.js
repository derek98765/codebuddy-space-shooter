/**
 * UIScene — runs in parallel with GameScene
 * Displays:
 *   - Charge bar (bottom-left)
 *   - Boss HP bar (top-center, hidden until boss enters)
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Charge Bar ────────────────────────────────────────────────────────────
    const chargeBarX = 20;
    const chargeBarY = H - 28;
    const chargeBarMaxW = 140;
    const chargeBarH = 14;

    // Background track
    this.add.rectangle(chargeBarX + chargeBarMaxW / 2, chargeBarY, chargeBarMaxW + 4, chargeBarH + 4, 0x000000)
      .setOrigin(0.5, 0.5).setDepth(20);
    this.add.rectangle(chargeBarX + chargeBarMaxW / 2, chargeBarY, chargeBarMaxW, chargeBarH, 0x222244)
      .setOrigin(0.5, 0.5).setDepth(21);

    // Fill
    this._chargeBarFill = this.add.rectangle(chargeBarX, chargeBarY, 0, chargeBarH, 0xff8800)
      .setOrigin(0, 0.5).setDepth(22);

    // Label
    this.add.text(chargeBarX, chargeBarY - 14, 'CHARGE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setDepth(22);

    this._chargeBarMaxW = chargeBarMaxW;

    // ── Boss HP Bar ───────────────────────────────────────────────────────────
    const bossBarW = 300;
    const bossBarH = 18;
    const bossBarX = W / 2 - bossBarW / 2;
    const bossBarY = 22;

    this._bossBarContainer = this.add.container(0, 0).setDepth(20).setVisible(false);

    const bossBg = this.add.rectangle(W / 2, bossBarY, bossBarW + 4, bossBarH + 4, 0x000000).setOrigin(0.5, 0.5);
    const bossTrack = this.add.rectangle(W / 2, bossBarY, bossBarW, bossBarH, 0x440000).setOrigin(0.5, 0.5);
    this._bossBarFill = this.add.rectangle(bossBarX, bossBarY, bossBarW, bossBarH, 0xff2222).setOrigin(0, 0.5);
    this._bossLabel = this.add.text(W / 2, bossBarY - 16, 'BOSS', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ff8888',
      align: 'center',
    }).setOrigin(0.5, 0.5);

    this._bossBarContainer.add([bossBg, bossTrack, this._bossBarFill, this._bossLabel]);
    this._bossBarMaxW = bossBarW;
    this._bossBarX = bossBarX;

    // ── Event listeners ───────────────────────────────────────────────────────
    this.game.events.on('chargeUpdate', this._onChargeUpdate, this);
    this.game.events.on('bossEntered', this._onBossEntered, this);
    this.game.events.on('bossHpUpdate', this._onBossHpUpdate, this);

    this.events.once('shutdown', () => {
      this.game.events.off('chargeUpdate', this._onChargeUpdate, this);
      this.game.events.off('bossEntered', this._onBossEntered, this);
      this.game.events.off('bossHpUpdate', this._onBossHpUpdate, this);
    });
  }

  _onChargeUpdate(ratio) {
    this._chargeBarFill.width = ratio * this._chargeBarMaxW;
    // Glow color: ramp from orange to white at full charge
    const t = Math.min(ratio, 1);
    const r = 255;
    const g = Math.floor(Phaser.Math.Linear(136, 255, t));
    const b = Math.floor(Phaser.Math.Linear(0, 100, t));
    this._chargeBarFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, b));
  }

  _onBossEntered(hp, maxHp) {
    this._bossBarContainer.setVisible(true);
    this._bossBarFill.width = this._bossBarMaxW;
  }

  _onBossHpUpdate(hp, maxHp) {
    const ratio = Math.max(0, hp / maxHp);
    this._bossBarFill.width = ratio * this._bossBarMaxW;
    // Color shifts from green → red as HP drops
    const r = Math.floor(Phaser.Math.Linear(0, 255, 1 - ratio));
    const g = Math.floor(Phaser.Math.Linear(255, 0, 1 - ratio));
    this._bossBarFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, 0));
  }
}
