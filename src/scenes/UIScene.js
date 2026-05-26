/**
 * UIScene — runs in parallel with GameScene
 * Displays:
 *   - Score (top-left)
 *   - Charge bar (bottom-left)
 *   - Power-up name + timer (above charge bar)
 *   - Boss HP bar (top-center, hidden until boss enters)
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ── Score HUD ─────────────────────────────────────────────────────────────
    this._scoreText = this.add.text(20, 16, 'SCORE  0', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setDepth(22);

    // ── Charge Bar ────────────────────────────────────────────────────────────
    const chargeBarX = 20;
    const chargeBarY = H - 28;
    const chargeBarMaxW = 140;
    const chargeBarH = 14;

    this.add.rectangle(chargeBarX + chargeBarMaxW / 2, chargeBarY, chargeBarMaxW + 4, chargeBarH + 4, 0x000000)
      .setOrigin(0.5, 0.5).setDepth(20);
    this.add.rectangle(chargeBarX + chargeBarMaxW / 2, chargeBarY, chargeBarMaxW, chargeBarH, 0x222244)
      .setOrigin(0.5, 0.5).setDepth(21);

    this._chargeBarFill = this.add.rectangle(chargeBarX, chargeBarY, 0, chargeBarH, 0xff8800)
      .setOrigin(0, 0.5).setDepth(22);

    this.add.text(chargeBarX, chargeBarY - 14, 'CHARGE', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#aaaacc',
    }).setDepth(22);

    this._chargeBarMaxW = chargeBarMaxW;

    // ── Power-up HUD (above charge bar) ──────────────────────────────────────
    this._powerUpLabel = this.add.text(chargeBarX, chargeBarY - 46, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#00eeff',
    }).setDepth(22).setVisible(false);

    this._powerUpTimer = this.add.text(chargeBarX + 90, chargeBarY - 46, '', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#aaffff',
    }).setDepth(22).setVisible(false);

    const POWERUP_COLORS = {
      spread:  '#00eeff',
      missile: '#ff6622',
      rapid:   '#ffee00',
    };
    this._powerUpColors = POWERUP_COLORS;

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
    this.game.events.on('scoreUpdate', this._onScoreUpdate, this);
    this.game.events.on('powerUpUpdate', this._onPowerUpUpdate, this);

    this.events.once('shutdown', () => {
      this.game.events.off('chargeUpdate', this._onChargeUpdate, this);
      this.game.events.off('bossEntered', this._onBossEntered, this);
      this.game.events.off('bossHpUpdate', this._onBossHpUpdate, this);
      this.game.events.off('scoreUpdate', this._onScoreUpdate, this);
      this.game.events.off('powerUpUpdate', this._onPowerUpUpdate, this);
    });
  }

  _onScoreUpdate(score) {
    this._scoreText.setText('SCORE  ' + score);
  }

  _onPowerUpUpdate(activeTypes) {
    if (!activeTypes || activeTypes.length === 0) {
      this._powerUpLabel.setVisible(false);
      this._powerUpTimer.setVisible(false);
      return;
    }
    const names = { spread: 'SPREAD', missile: 'MISSILE', rapid: 'RAPID' };
    const labelText = activeTypes.map(t => names[t] ?? t.toUpperCase()).join(' + ');
    // Color: use first active type's color, or white if mixed
    const color = activeTypes.length === 1
      ? (this._powerUpColors[activeTypes[0]] ?? '#ffffff')
      : '#ffffff';
    this._powerUpLabel.setText(labelText);
    this._powerUpLabel.setColor(color);
    this._powerUpLabel.setVisible(true);
    this._powerUpTimer.setVisible(false);
  }

  _onChargeUpdate(ratio) {
    this._chargeBarFill.width = ratio * this._chargeBarMaxW;
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
    const r = Math.floor(Phaser.Math.Linear(0, 255, 1 - ratio));
    const g = Math.floor(Phaser.Math.Linear(255, 0, 1 - ratio));
    this._bossBarFill.setFillStyle(Phaser.Display.Color.GetColor(r, g, 0));
  }
}

