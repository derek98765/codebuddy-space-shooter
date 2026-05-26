# Execution Plan — Space Shooter MVP

## Tech Stack

- **Phaser 3** (CDN, no build tool needed — plain HTML + JS)
- Single `index.html` entry point
- Source split into logical JS files loaded as ES modules

---

## File Structure

```
/
├── index.html
├── GDD.md
├── EXECUTION_PLAN.md
├── src/
│   ├── main.js               # Phaser game config, scene registration
│   ├── scenes/
│   │   ├── GameScene.js      # Core gameplay
│   │   ├── UIScene.js        # HUD (charge bar, boss HP bar) — runs parallel
│   │   ├── GameOverScene.js
│   │   └── WinScene.js
│   ├── entities/
│   │   ├── Player.js
│   │   ├── EnemyA.js
│   │   ├── EnemyB.js
│   │   └── Boss.js
│   └── config/
│       └── sprites.js        # Sprite/asset config (swap placeholders with real art here)
└── assets/                   # Empty for now, sprites dropped here later
```

---

## Build Milestones (targeting 1–2 hours total)

### ✅ Milestone 1 — Scaffold & Scrolling Background (15 min)
- [x] `index.html` with Phaser 3 CDN
- [x] `GameScene` with scrolling star background
- [x] Player ship placeholder (blue rect) on screen, 8-directional movement
- [x] Screen boundary clamping

### ✅ Milestone 2 — Player Shooting (15 min)
- [x] `Z` key: rapid-fire bullet (auto-fire while held, bullet travels right)
- [x] `X` key: hold-to-charge mechanic with visual charge indicator (rect grows on ship)
- [x] Release fires large charged bullet
- [x] Bullets despawn off-screen

### ✅ Milestone 3 — Enemy A (15 min)
- [x] Enemy A spawns from right, sine-wave movement
- [x] Enemy A fires aimed bullet at player every N seconds
- [x] Bullet collision: enemy dies on 1 hit from player bullet
- [x] Player dies on contact with enemy or enemy bullet → Game Over scene

### ✅ Milestone 4 — Enemy B (15 min)
- [x] Enemy B spawns in formation from right
- [x] Straight flight → kamikaze dive when within ~200px range
- [x] Same collision rules

### ✅ Milestone 5 — Level Scrolling & Wave Spawner (15 min)
- [x] Time-based wave spawner in `GameScene`
- [x] Auto-scroll logic (background scroll speed)
- [x] Wave sequence matches the GDD level structure table

### ✅ Milestone 6 — Boss (20 min)
- [x] Screen scroll stops, Boss enters from right
- [x] HP = 20, boss HP bar rendered in UIScene
- [x] 3 cycling behaviors (spread shot, aimed shot, lunge)
- [x] Boss death → Win scene

### ✅ Milestone 7 — Polish Pass (5 min)
- [x] Game Over / Win screens with "Restart" button
- [x] Charge bar in UIScene
- [x] Verify all collisions are correct
- [x] Quick playthrough test

---

## Phase 2 — Advanced Features (targeting ~4 hours total)

### File Structure Additions

```
src/
├── entities/
│   ├── EnemyC.js             # ✅ already exists
│   ├── EnemyD.js             # Carrier enemy (drops power-ups)
│   └── PowerUp.js            # Collectible pickup entity
└── utils/
    └── particles.js          # Reusable explode(scene, x, y, color, size) helper
```

---

### ✅ Milestone 8 — Scoring System (30 min)

- `GameScene.js`: award points on kill — EnemyA=100, EnemyB=150, EnemyC=200, EnemyD=300, Boss=1000
- `UIScene.js`: live score in top-left HUD via `scoreUpdate` event
- `WinScene.js` / `GameOverScene.js`: `init(data)` receives `{ score }` and displays it

### ✅ Milestone 9 — Particle Effects (45 min)

- `src/utils/particles.js`: `explode(scene, x, y, color, count, scale)` + `bossExplosion()` + `createEngineTrail()`
- Enemy death: coloured burst (A=red, B=orange, C=green, D=purple)
- Boss death: 6-wave large explosion sequence (~1.2 s)
- Player engine trail: continuous blue/white Phaser 3.60 particle stream

### ✅ Milestone 10 — Carrier Enemy EnemyD (30 min)

- `src/entities/EnemyD.js`: slow, HP=3, purple with glow stripe, fires aimed shot, `onDrop` callback on death
- `src/entities/PowerUp.js`: drifts left with bob, pulsing glow, type label, player overlap → `activatePowerUp`
- Wave spawner: EnemyD #1 at 45 s, #2 at 65 s; drop type rotates spread→laser→rapid

### ✅ Milestone 11 — Power-Up System (60 min)

- `Player.js`: three weapon modes, single active; new pickup replaces old

| Power-up    | Effect                                         | Duration |
|-------------|------------------------------------------------|----------|
| Spread Shot | 3-way fan (±15°) using normalBullets           | 10 s     |
| Laser       | Graphics beam, per-target 200ms damage cooldown| 8 s      |
| Rapid Fire  | Fire rate ×3, charge time halved               | 10 s     |

- `UIScene.js`: bottom-left power-up name (colour-coded) + countdown timer

### ✅ Milestone 12 — Difficulty Scaling & Enemy Polish (45 min)

- EnemyA: `scaleDifficulty(1)` at 30 s → bullet speed +20%; level 2 at 60 s → dual-aim
- EnemyB: `scaleDifficulty(1)` at 40 s → dive range 200 → 150 px
- EnemyC: `scaleDifficulty(1)` at 50 s → burst interval tightened to ~1.8 s
- EnemyD: 2nd carrier at 65 s with next power-up type in rotation
- Boss `_enrage()` at 50% HP: spread 3-way → 5-way; lunge duration ÷ 1.4 (speed +40%)

### ✅ Milestone 13 — Integration & Polish (30 min)

- All debug `console.log` removed from game logic (DEV toolbar logs retained)
- All system interactions verified: scoring + particles + power-ups + difficulty + EnemyD drops
- EXECUTION_PLAN.md updated

---

## Dependency Order

```
M8  (independent) ──────────────────────┐
M9  (independent) ──────────────────────┤
M10 → M11 → M12  ───────────────────────┤→ M13
```

---

## Sprite Swap Strategy

The `src/config/sprites.js` file maps entity names to asset keys. When replacing placeholders with real pixel art:
1. Drop sprite files into `/assets`
2. Update `sprites.js` with the new asset keys
3. No changes required to game logic

---

## Notes

**Why Phaser 3?**
Phaser 3 includes a built-in arcade physics engine, scene management, input handling, and group/sprite management — everything needed without a build pipeline. Fastest path to a working browser game in 1–2 hours. Alternatives like PixiJS require writing more game systems from scratch; Unity/Godot add compilation overhead.
