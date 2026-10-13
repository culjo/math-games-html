# FACTORIA — The Math Deckbuilder (Rogue-lite Engine)

A rogue-lite arithmetic deckbuilder inspired by *Balatro*, *Slay the Spire*, and the *24 Game*.

Draft numbers, assemble equations, acquire game-changing passive Engine Modules (Relics), and breach high-security numerical Vaults!

Built with modern semantic **HTML5**, **CSS3**, and **Web Audio API** (pure procedural synthesis, no external assets required).

---

## 🕹️ Core Game Loop

1. **Target Score Vault:**
   * Each round you face a security **Vault** with a Target Score (e.g. 300, 800, 2,500...).
   * You have **4 Hands** and **3 Discards**.
   * Breaching the Vault before running out of Hands grants **Bounty Cash ($)** and access to the **Factoria Depot (Shop)**.

2. **The Equation Assembly Rail:**
   * Your hand holds a mix of **Number Cards** (`1` to `25+`) and **Operator Cards** (`+`, `-`, `×`, `÷`, `^`).
   * Click or drag cards into the assembly rail to form a valid equation:
     * Valid format: alternating numbers and operators (e.g. `[12] [×] [4] [+] [5] = 53`).
   * The live formula preview shows the expected result and real-time score calculation.

3. **Crunchy Score Formula:**
   $$\text{Hand Score} = (\text{Equation Result} + \text{Flat Chips}) \times (\text{Base Mult} + \text{Bonus Mult}) \times \text{X-Mult}$$
   * The value of your equation forms your **Base Chips**.
   * Every card, foil enhancement, and active Engine Module adds to Chips, Mult, or multiplies your X-Mult!

4. **Sequential Relic Cascade:**
   * When an equation is submitted, your active **Engine Modules (Relics)** trigger sequentially from left to right.
   * Watch your multipliers climb with ascending musical synth chimes before slamming into the Vault's defense meter!

---

## ⚙️ Engine Modules (Relics)

Hold up to **5 Engine Modules** to customize your build:

| Module | Effect | Strategy |
| :--- | :--- | :--- |
| **Even-Steven** | Every even number played grants **+4 Mult**. | Fill deck with $2, 4, 6, 8, 12$ and multiplier operators. |
| **Odd-Ball** | Every odd number played grants **+30 Chips**. | Great for early game flat chips boost. |
| **Prime Catalyst** | Every Prime number played grants **+12 Mult**. | Primes ($2, 3, 5, 7, 11, 13, 17, 19$) become powerhouses. |
| **Clean Division** | Exact integer division ($a \div b$ with remainder $0$) multiplies total hand score by **×2.5 Mult**! | Pair with pairs like $12 \div 4$ or $20 \div 5$. |
| **Fibonacci Surge** | If equation result is a Fibonacci number ($8, 13, 21, 34, 55, 89, 144...$), gain **×3.0 Mult**! | High-skill target aiming for astronomical scores. |
| **Square Deal** | Square numbers ($4, 9, 16, 25, 36...$) add **+60 Chips** each. | Scales hard with high card numbers. |
| **Golden Ratio** | Playing an equation with exactly 5 cards grants **+12 Mult & +50 Chips**. | Rewards elegant medium-length equations. |
| **Lucky Seven** | Any appearance of digit $7$ adds **+77 Chips & +7 Mult**. | Synergizes with $7, 17, 27$ and results ending in $7$. |
| **Centurion** | If equation total $\ge 100$, gain **×2.5 Mult**. | Heavy multiplication and power equations go nuclear. |
| **Inversion Drive** | All `[-]` subtractions add their value to Chips instead of reducing total. | Turns negative math into positive scoring. |

---

## ⚠️ Boss Vault Protocols

Every 3rd Vault of each Sector is a **Boss Vault** with dangerous rules:

* **The Prime Siphon:** Prime numbers score $0$ chips.
* **The Odd Tax:** Odd numbers grant $0$ Mult.
* **Short Circuit Grid:** Max 4 cards allowed in any equation.
* **The Monolith Core:** Vault target score is increased by $40\%$.
* **Division Blind:** `[÷]` operator cards are disabled.

---

## 🎮 Controls

| Action | Desktop Keyboard / Mouse | Mobile / Touch |
| :--- | :--- | :--- |
| **Stage Card** | Click Card | Tap Card |
| **Recall Card** | Click Staged Card in Rail | Tap Staged Card in Rail |
| **Select for Discard** | Shift-Click or Toggle Card | Tap to select |
| **Submit Equation** | Click **Submit** or press `[Space]` | Tap **Submit** |
| **Discard Selected** | Click **Discard** or press `[D]` / `[Backspace]` | Tap **Discard** |
| **Inspect Deck** | Click **🎴 Deck** | Tap **🎴 Deck** |

---

## 🚀 Running the Game

Launch with any local web server:

```bash
python3 -m http.server 8080
```

Open:
* `http://localhost:8080/factoria/` or
* `http://localhost:8080/` (from the Arcade Portal Hub)
