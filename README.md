# 💣 Arena Pixel Bombers

A 100% static, retro 16-bit top-down grid combat game (inspired by classic Bomberman) built with **HTML5 Canvas**, **CSS3**, and **Vanilla JavaScript (ES6+ Modules)**. Battle against **3 intelligent AI Bots** across **3 distinct arena maps** and **3 difficulty levels**, with full support for **Desktop**, **Mobile Portrait**, and **Mobile Landscape** handheld layouts.

---

## ✨ Features

- **1 Player vs 3 AI Bots:** Player 1 (Cyan) vs Crimson, Lime, and Gold AI bots.
- **3 Selectable Arena Maps (`15×13` Grid):**
  - **Classic Fortress (`classic`)** — Symmetrical checkerboard pillars with balanced cover.
  - **Magma Foundry (`lava`)** — Open central combat pit with reinforced corner bunkers for fast chain reactions.
  - **Cyber Neon Grid (`cyber`)** — Tactical L/T-shaped corridor maze with narrow choke points.
- **3 AI Difficulty Levels (Real-Time Danger Map + BFS / A\* Pathfinding):**
  - **Beginner:** Relaxed movement, `~400ms` decision tick, basic dodging.
  - **Medium:** Standard speed, `~180ms` tick, verifies safe BFS escapes before planting bombs and seeks power-ups.
  - **Pro:** Fast `~60ms` tick, prioritizes `+Fire`/`+Speed`, hunts opponents with A\*, and weaves through chain-reaction timers.
- **Bombs, Chain Reactions & Power-Ups:**
  - `2.5s` bomb fuse with immediate chain-reaction detonations.
  - Destroying soft bricks has a `35%` chance to drop **+Bomb** (up to 5), **+Fire** (up to 6), or **+Speed**.
- **Sudden Death (`00:30` Remaining):**
  - Match timer counts down from `02:30`. At `00:30`, indestructible blocks drop inward in a spiral pattern to prevent stalemates.
- **Procedural 8-Bit Web Audio:**
  - Zero external audio files—synthesizes SFX (clicks, footsteps, bomb drops, explosions, power-ups, Sudden Death siren, victory/defeat jingles) plus a toggleable chiptune BGM pulse via `AudioContext`.
- **Handheld Mobile & Desktop UX:**
  - Live AI attract-mode background on the Main Menu.
  - Dynamic `15:13` canvas scaling (`100dvh` + safe-area insets).
  - Multi-touch D-Pad (thumb-slide support) + simultaneous Bomb button, tactile `navigator.vibrate` haptics, and a **Touch UI (`AUTO / ON / OFF`)** toggle.
  - Persistent `localStorage` career records (**Wins**, **Win Streak**, **Best Win Time**) per difficulty.

---

## 🎮 Controls

| Action | Desktop | Mobile |
| :--- | :--- | :--- |
| **Move** | `W A S D` or `Arrow Keys` | On-screen D-Pad (supports thumb sliding) |
| **Plant Bomb** | `Spacebar` or `Enter` | On-screen `💣 BOMB` button |
| **Pause / Resume** | `P` or `Esc` | Top HUD `⏸️` button |

---

## 📁 Project Structure

```text
bomber/
├── index.html   # Main Menu, Map/Difficulty selectors, HUD, Pause/Result modals, Touch Deck
├── style.css    # 16-bit retro UI, scanline backdrop, Portrait & Landscape responsive layouts
├── script.js    # Game engine, 3 map themes, Danger Map + BFS/A* AI, Web Audio & multi-touch
└── README.md    # Project documentation
```

---
