# Game Design Document — Space Shooter MVP

## Overview

| Field | Value |
|---|---|
| Title | (TBD) |
| Genre | Horizontal side-scrolling shoot 'em up |
| Platform | Browser (Desktop) |
| Engine | Phaser.js 3 |
| Players | Single player |
| Session Length | ~2–3 minutes |

## Core Loop

Auto-scroll → Survive enemy waves → Reach boss → Defeat boss → Win screen

---

## Player

- **Ship**: One spaceship, no power-ups
- **Health**: One-hit death (no HP bar)
- **Movement**: 8-directional, constrained to the screen
- **Weapons**:
  - `Z` key (or `Space`): Rapid-fire single bullet (auto-fire while held)
  - `X` key: Hold to charge, release to fire a large charged shot (visual charge indicator on ship)

---

## Enemies

### Enemy Type A — Sniper
- Spawns from the right edge in small groups (2–3)
- Moves in a sine-wave horizontal path
- Fires one slow bullet aimed at the player's current position
- 1 hit to kill

### Enemy Type B — Kamikaze
- Spawns from the right edge in tight formation waves (4–6)
- Flies in a straight horizontal path until within ~200px of the player
- Dives directly toward the player's position when in range
- 1 hit to kill

---

## Boss

- Appears after the level scroll ends (screen locks)
- **HP**: 20 hits (normal bullets = 1 hit, charged shot = 5 hits)
- **HP Bar**: Displayed at the top of the screen
- **Phase**: Single phase
- **Behaviors** (cycling pattern):
  1. Fires 3-way spread of bullets
  2. Fires a slow aimed bullet at the player
  3. Short forward lunge, then retreats
- **Kill condition**: HP reaches 0 → explosion → Win screen

---

## Level Structure

| Segment | Content |
|---|---|
| 0–10s | Open space, no enemies (tutorial feel) |
| 10–30s | Wave 1: 2× Enemy A |
| 30–50s | Wave 2: 6× Enemy B (formation) |
| 50–70s | Wave 3: 2× Enemy A + 4× Enemy B |
| 70–80s | Screen slows, boss entrance |
| 80s+ | Boss fight (screen locked) |

---

## Win / Lose

- **Win**: Boss HP reaches 0 → "YOU WIN" screen with restart option
- **Lose**: Player is hit by any enemy or bullet → "GAME OVER" screen with restart option

---

## Visual (MVP Placeholder)

- All objects rendered as colored rectangles/circles
- Player = blue rectangle
- Enemy A = red rectangle
- Enemy B = orange triangle shape (rotated rect)
- Boss = large dark rectangle
- Bullets = small white/yellow rectangles
- Background = scrolling black canvas with static white dots (stars)
- Placeholder sprites swappable with real pixel art via a single sprite config file (`src/config/sprites.js`)

---

## Out of Scope (Post-MVP)

- Audio, music
- Power-ups, multiple ships
- Multiple levels
- Score / leaderboard
- Mobile support
- Animations / particle effects
