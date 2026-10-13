# MATHOKU — Tactile Grid Weaver

A fluid, tactical arithmetic puzzle game that combines the word-weaving satisfaction of *Wordle / SpellTower* with the deep numeric logic of *Sudoku / Countdown*.

Built with **HTML5 Canvas**, **Web Audio API** (procedural pentatonic synthesizer), and responsive touch/mouse controls.

---

## 🕹️ How to Play

### 1. The Checkerboard Topology
The $5 \times 5$ board is organized in an alternating checkerboard pattern:
* **Cyan Rounded Squares**: Numbers ($1$ to $9$)
* **Purple Circular Discs**: Operators ($+$, $-$, $\times$, $\div$)

Because of this arrangement, from **any Number tile**, every orthogonal step (Up, Down, Left, Right) is an **Operator**, and from **any Operator tile**, every step is a **Number**. You naturally weave like a circuit!

### 2. Weaving Equations
1. Press on a **Number** tile to start your chain.
2. Drag through an adjacent **Operator**, then an adjacent **Number**, and so on:
   $$\text{[5]} \longrightarrow \text{[×]} \longrightarrow \text{[3]} \longrightarrow \text{[+]} \longrightarrow \text{[4]} \implies \mathbf{19}$$
3. The live floating pill calculates and displays the progressive equation in real-time as you drag!
4. Calculations evaluate progressively **Left-to-Right** (ideal for fast tactile chaining).

### 3. Tactile Backtracking
Made an accidental turn? Simply drag your finger or cursor backward to the previous tile to undo your step without breaking your flow!

### 4. Cracking Target Vaults
At the top of the screen are 3 active **Target Vault Cards** (guaranteed solvable on the board):
* When your active path matches any target number, the glowing ribbon turns **Electric Gold** and a chime rings out!
* Release your finger/click to **shatter** the tiles in the path, collect huge bounty points, and unlock the vault!
* New numbers and operators dissolve into the cleared cells, ready for the next weave.

---

## 🎮 Game Modes

* **🎯 Bounty Hunt**: Solve 3 guaranteed target bounties within a limited move budget. Complete all 3 to advance levels!
* **📅 Daily Weaver**: A seeded puzzle with par moves.
* **🧘 Zen Endless**: Infinite chilled-out swiping with continuous target refreshes and no move pressure.

---

## 🚀 Running the Game

### Direct Open
Double-click [index.html](file:///Users/oladee/Pixelated/MathGames/Mathoku/index.html) in your browser.

### Local Server
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080/Mathoku/` in your browser.
