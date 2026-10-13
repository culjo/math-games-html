/**
 * ZERO POINT — Quantum Math Cascade
 * Core Game Engine
 */

(function () {
    'use strict';

    // Game Constants
    const COLS = 6;
    const ROWS = 8;
    const DANGER_ROW = 1; // Row index where warning fires (0 is game over top)
    const MOVES_PER_RISE = 5;

    // Canvas & Rendering Context
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    // UI DOM Elements
    const scoreVal = document.getElementById('score-val');
    const bestVal = document.getElementById('best-val');
    const comboVal = document.getElementById('combo-val');
    const riseCounter = document.getElementById('rise-counter');
    const holdSlot = document.getElementById('hold-slot');
    const holdText = document.getElementById('hold-text');
    const nextSlot1 = document.getElementById('next-slot-1');
    const nextSlot2 = document.getElementById('next-slot-2');
    const modalHelp = document.getElementById('modal-help');
    const modalGameOver = document.getElementById('modal-gameover');
    const btnSound = document.getElementById('btn-sound');
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const btnStart = document.getElementById('btn-start');
    const btnRestart = document.getElementById('btn-restart');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnTouchHold = document.getElementById('btn-touch-hold');
    const btnTouchDrop = document.getElementById('btn-touch-drop');
    const btnTouchFrenzy = document.getElementById('btn-touch-frenzy');
    const btnTouchSwap = document.getElementById('btn-touch-swap');

    const btnFullscreen = document.getElementById('btn-fullscreen');
    const iconExpand = document.getElementById('icon-expand');
    const iconCompress = document.getElementById('icon-compress');
    const appEl = document.getElementById('app');

    const btnSwapToken = document.getElementById('btn-swap-token');
    const swapTokenCount = document.getElementById('swap-token-count');
    const swapBanner = document.getElementById('swap-banner');

    const bountyCard = document.getElementById('bounty-card');
    const bountyName = document.getElementById('bounty-name');
    const bountyReward = document.getElementById('bounty-reward');
    const bountyDesc = document.getElementById('bounty-desc');
    const bountyProgressText = document.getElementById('bounty-progress-text');
    const bountyProgressFill = document.getElementById('bounty-progress-fill');

    const overdriveContainer = document.getElementById('overdrive-container');
    const overdrivePercent = document.getElementById('overdrive-percent');
    const overdriveFill = document.getElementById('overdrive-fill');
    const btnOverdrive = document.getElementById('btn-overdrive');

    // Game State
    let grid = []; // 2D array [row][col]
    let score = 0;
    let highScore = parseInt(localStorage.getItem('zeropoint_highscore') || '0', 10);
    let combo = 1;
    let maxCombo = 1;
    let totalZeroPoints = 0;
    let movesUntilRise = MOVES_PER_RISE;
    let isGameOver = false;
    let isProcessing = false; // true during animations/cascades
    let aimCol = 2; // Selected column (0..5)
    let canHold = true;

    // Overdrive Frenzy State
    let overdriveCharge = 0; // 0 to 100
    let isOverdriveReady = false;
    let isFrenzyActive = false;
    let frenzyTurnsRemaining = 0;

    // Quantum Swap State
    let swapTokens = 1;
    const maxSwapTokens = 3;
    let isSwapModeActive = false;
    let firstSwapTile = null; // { r, c }
    let dropsSinceSwapCharge = 0;

    // Tactical Bounties
    let currentBounty = null;

    // Tactical Orbs
    let currentOrb = null;
    let heldOrb = null;
    let nextQueue = [];

    // Falling Projectile Animation
    let activeProjectile = null; // { col, startY, targetY, y, vy, orb, targetRow, isImpact }

    // Visual Effects
    let particles = [];
    let shockwaves = [];
    let laserBeams = [];
    let screenFlash = 0;
    let screenFlashColor = '#ffffff';
    let floatingTexts = [];
    let screenShake = 0;

    // Rendering Metrics
    let cellW = 0;
    let cellH = 0;
    let boardOffsetX = 0;
    let boardOffsetY = 0;
    let dpr = window.devicePixelRatio || 1;

    // Audio helper
    const sfx = window.soundFX;

    // Initialization
    function init() {
        if (!CanvasRenderingContext2D.prototype.roundRect) {
            CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r = 8) {
                if (typeof r === 'number') r = [r, r, r, r];
                const [tl, tr, br, bl] = r;
                this.moveTo(x + tl, y);
                this.lineTo(x + w - tr, y);
                this.quadraticCurveTo(x + w, y, x + w, y + tr);
                this.lineTo(x + w, y + h - br);
                this.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
                this.lineTo(x + bl, y + h);
                this.quadraticCurveTo(x, y + h, x, y + h - bl);
                this.lineTo(x, y + tl);
                this.quadraticCurveTo(x, y, x + tl, y);
                this.closePath();
                return this;
            };
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setupInputs();
        setupAudioUI();
        setupFullscreenUI();

        bestVal.textContent = highScore.toLocaleString();
        startNewGame();
        requestAnimationFrame(gameLoop);
    }

    function setupAudioUI() {
        btnSound.addEventListener('click', () => {
            sfx.init();
            sfx.muted = !sfx.muted;
            iconSoundOn.style.display = sfx.muted ? 'none' : 'block';
            iconSoundOff.style.display = sfx.muted ? 'block' : 'none';
        });

        // First click anywhere activates AudioContext
        window.addEventListener('click', () => sfx.init(), { once: true });
        window.addEventListener('keydown', () => sfx.init(), { once: true });
    }

    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        cellW = rect.width / COLS;
        cellH = rect.height / (ROWS + 1.2); // +1.2 space at the top for launcher
        boardOffsetX = 0;
        boardOffsetY = cellH * 1.2;
    }

    function startNewGame() {
        grid = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
        score = 0;
        combo = 1;
        maxCombo = 1;
        totalZeroPoints = 0;
        movesUntilRise = MOVES_PER_RISE;
        isGameOver = false;
        isProcessing = false;
        aimCol = Math.floor(COLS / 2);
        canHold = true;
        heldOrb = null;
        particles = [];
        shockwaves = [];
        laserBeams = [];
        screenFlash = 0;
        floatingTexts = [];
        activeProjectile = null;
        overdriveCharge = 0;
        isOverdriveReady = false;
        isFrenzyActive = false;
        frenzyTurnsRemaining = 0;
        swapTokens = 1;
        isSwapModeActive = false;
        firstSwapTile = null;
        dropsSinceSwapCharge = 0;
        currentBounty = generateBounty();

        // Seed bottom 2 rows with interesting mix of numbers and dark matter
        populateInitialBoard();

        // Initialize upcoming queues
        nextQueue = [generateOrb(), generateOrb(), generateOrb()];
        currentOrb = generateOrb();

        updateHUD();
        modalGameOver.classList.remove('visible');
    }

    function populateInitialBoard() {
        const starterValues = [1, 2, 3, 4, -1, -2, -3, -4];
        for (let r = ROWS - 2; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (Math.random() < 0.75) {
                    const val = starterValues[Math.floor(Math.random() * starterValues.length)];
                    grid[r][c] = createTile(val);
                }
            }
        }
    }

    function createTile(val, type = 'number') {
        return {
            value: val,
            type: type, // 'number', 'dark_matter', 'special'
            hp: type === 'dark_matter' ? 2 : 1,
            scaleX: 1,
            scaleY: 1,
            flash: 0,
            animY: 0
        };
    }

    // Orb Generator
    function generateOrb() {
        const specialChance = 0.12;
        if (Math.random() < specialChance) {
            const specials = ['invert', 'div2', 'mul2', 'zero'];
            const chosen = specials[Math.floor(Math.random() * specials.length)];
            return {
                type: 'special',
                subType: chosen,
                label: chosen === 'invert' ? '±' :
                       chosen === 'div2' ? '÷2' :
                       chosen === 'mul2' ? '×2' : '0'
            };
        }

        // Standard number orbs (range scales moderately with score)
        const maxVal = score > 5000 ? 8 : (score > 2000 ? 6 : 4);
        let val = Math.floor(Math.random() * maxVal) + 1;
        // 50% positive, 50% negative
        if (Math.random() < 0.5) val = -val;

        return {
            type: 'number',
            value: val,
            label: val > 0 ? `+${val}` : `${val}`
        };
    }

    // Drop Logic
    function dropActiveOrb() {
        if (isProcessing || isGameOver || activeProjectile) return;

        sfx.init();
        addOverdriveCharge(3);

        dropsSinceSwapCharge++;
        if (dropsSinceSwapCharge >= 8) {
            dropsSinceSwapCharge = 0;
            if (swapTokens < maxSwapTokens) {
                addSwapToken(1);
            }
        }

        const col = aimCol;

        // Find landing row in this column
        let landingRow = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (!grid[r][col]) {
                landingRow = r;
                break;
            }
        }

        const topOccupiedRow = landingRow + 1;
        const hasTopTile = topOccupiedRow < ROWS && grid[topOccupiedRow][col] !== null;

        // Determine target position for projectile
        let targetY = 0;
        let isImpact = false;

        if (currentOrb.type === 'special' && hasTopTile) {
            // Special orb targets the top tile directly
            targetY = boardOffsetY + topOccupiedRow * cellH + cellH / 2;
            isImpact = true;
        } else if (landingRow >= 0) {
            // Number orbs (and specials with empty column) land on top of the column
            targetY = boardOffsetY + landingRow * cellH + cellH / 2;
            isImpact = false;
        } else {
            // Column is full to the brim!
            triggerScreenShake(8);
            sfx.playWarning();
            return;
        }

        isProcessing = true;
        activeProjectile = {
            col: col,
            orb: currentOrb,
            x: boardOffsetX + col * cellW + cellW / 2,
            y: cellH * 0.55,
            targetY: targetY,
            vy: 8,
            landingRow: landingRow,
            impactRow: isImpact ? topOccupiedRow : landingRow,
            isImpact: isImpact
        };

        sfx.playDrop();
    }

    function swapHold() {
        if (!canHold || isProcessing || isGameOver) return;
        sfx.init();
        sfx.playMove();

        if (heldOrb === null) {
            heldOrb = currentOrb;
            currentOrb = nextQueue.shift();
            nextQueue.push(generateOrb());
        } else {
            const temp = currentOrb;
            currentOrb = heldOrb;
            heldOrb = temp;
        }

        canHold = false;
        updateHUD();
    }

    // Processing impact when projectile hits target
    function handleProjectileLanding() {
        const p = activeProjectile;
        activeProjectile = null;

        const col = p.col;
        const orb = p.orb;

        if (orb.type === 'special') {
            applySpecialOrb(orb, col, p.impactRow);
        } else {
            // Number Orb lands in empty cell at landingRow
            if (p.landingRow >= 0 && p.landingRow < ROWS) {
                grid[p.landingRow][col] = createTile(orb.value);
                const tile = grid[p.landingRow][col];
                tile.scaleX = 1.25;
                tile.scaleY = 0.75;
                tile.flash = 0.6;
            }
        }

        // Manage Frenzy turn duration
        if (isFrenzyActive) {
            frenzyTurnsRemaining--;
            overdriveCharge = Math.max(0, Math.round((frenzyTurnsRemaining / 3) * 100));
            if (frenzyTurnsRemaining <= 0) {
                isFrenzyActive = false;
                overdriveCharge = 0;
                addFloatingText('Frenzy Concluded', canvas.width / (2 * dpr), boardOffsetY + cellH * 3, '#8892b0', 1.1);
            }
        }

        // Advance queue
        currentOrb = nextQueue.shift();
        nextQueue.push(generateOrb());
        canHold = true;
        updateHUD();

        // Start cascade resolution pipeline
        resolveBoardCascades();
    }

    function applySpecialOrb(orb, col, row) {
        const sub = orb.subType;
        const targetTile = (row >= 0 && row < ROWS) ? grid[row][col] : null;

        if (sub === 'blackhole') {
            // Black Hole Vortex: Sucks in and annihilates the entire column!
            sfx.playBlackHole();
            triggerScreenShake(26);
            screenFlash = 0.55;
            screenFlashColor = '#bc13fe';

            shockwaves.push({ 
                x: boardOffsetX + col * cellW + cellW / 2, 
                y: boardOffsetY + (ROWS / 2) * cellH, 
                radius: 15, 
                maxRadius: cellW * 4.8, 
                alpha: 1, 
                color: '#bc13fe' 
            });

            // Annihilate all tiles in this column
            for (let r = 0; r < ROWS; r++) {
                if (grid[r][col]) {
                    const cx = boardOffsetX + col * cellW + cellW / 2;
                    const cy = boardOffsetY + r * cellH + cellH / 2;
                    createSparks(cx, cy, '#bc13fe', 12);
                    createSparks(cx, cy, '#ffd700', 8);
                    grid[r][col] = null;
                }
            }

            // Damage neighboring Dark Matter columns
            for (let r = 0; r < ROWS; r++) {
                damageDarkMatterTile(r, col - 1, 1);
                damageDarkMatterTile(r, col + 1, 1);
            }

            addFloatingText('⚫ GRAVITATIONAL CRUSH!', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + cellH * 2.5, '#ffd700', 1.4);
            addScore(1500);
        } else if (sub === 'supernova_core') {
            // Supernova Core: Detonates Tier 4 Supernova Crater at target area
            sfx.playAnnihilate(combo, 4);
            triggerScreenShake(22);
            screenFlash = 0.65;
            screenFlashColor = '#ffd700';

            const epicR = Math.max(0, Math.min(ROWS - 1, row >= 0 ? row : ROWS - 1));
            damageSupernovaArea(epicR, col, epicR, col);
            addFloatingText('🌟 SUPERNOVA CORE!', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + epicR * cellH, '#ffd700', 1.45);
            addScore(1600);
        } else if (sub === 'antimatter_nuke') {
            // Antimatter Nuke: Heavy 3x3 blast
            sfx.playAnnihilate(combo, 3);
            triggerScreenShake(18);
            const epicR = Math.max(0, Math.min(ROWS - 1, row >= 0 ? row : ROWS - 1));
            damageSupernovaArea(epicR, col, epicR, col);
            addFloatingText('💥 ANTIMATTER NUKE!', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + epicR * cellH, '#ff4e50', 1.35);
            addScore(1400);
        } else if (sub === 'zero') {
            // Singularity Bomb: clears 3x3 radius
            sfx.playAnnihilate(3);
            triggerScreenShake(12);
            for (let r = Math.max(0, row - 1); r <= Math.min(ROWS - 1, row + 1); r++) {
                for (let c = Math.max(0, col - 1); c <= Math.min(COLS - 1, col + 1); c++) {
                    if (grid[r][c]) {
                        createSparks(boardOffsetX + c * cellW + cellW / 2, boardOffsetY + r * cellH + cellH / 2, '#c471ed', 12);
                        grid[r][c] = null;
                    }
                }
            }
            addFloatingText('0 SINGULARITY!', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + row * cellH, '#c471ed');
            addScore(500);
        } else if (targetTile) {
            sfx.playSpecial();
            if (sub === 'invert') {
                targetTile.value = -targetTile.value;
                targetTile.flash = 1;
                addFloatingText('INVERTED!', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + row * cellH, '#c471ed');
            } else if (sub === 'div2') {
                if (Math.abs(targetTile.value) > 1) {
                    targetTile.value = Math.sign(targetTile.value) * Math.floor(Math.abs(targetTile.value) / 2);
                }
                targetTile.flash = 1;
                addFloatingText('FISSION ÷2', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + row * cellH, '#00f2fe');
            } else if (sub === 'mul2') {
                targetTile.value = targetTile.value * 2;
                targetTile.flash = 1;
                addFloatingText('AMPLIFY ×2', boardOffsetX + col * cellW + cellW / 2, boardOffsetY + row * cellH, '#f9d423');
            }
        }
    }

    // Cascade Pipeline: Gravity -> Adjacency -> Gravity until stable
    async function resolveBoardCascades(isSwap = false) {
        let cascadeOccurred = false;
        let chainStep = 0;

        while (true) {
            // 1. Apply Gravity
            const fell = applyGravity();
            if (fell) {
                await delay(120);
            }

            // 2. Scan Adjacency Matches
            const matchFound = scanAndResolveMatches(chainStep);
            if (matchFound) {
                cascadeOccurred = true;
                chainStep++;
                combo++;
                if (combo > maxCombo) maxCombo = combo;
                if (combo >= 2) {
                    checkBountyProgress('cascade', 1);
                }
                updateHUD();
                await delay(220);
                continue; // Re-check gravity and subsequent cascades
            }

            // If no fell and no matches, board is in equilibrium!
            break;
        }

        // End of player turn actions:
        if (!cascadeOccurred) {
            combo = 1;
            updateHUD();
        }

        if (!isSwap) {
            movesUntilRise--;
            if (movesUntilRise <= 0) {
                movesUntilRise = MOVES_PER_RISE;
                await pushRisingRow();
            }
        }

        checkGameOver();
        isProcessing = false;
        updateHUD();
    }

    function applyGravity() {
        let moved = false;
        for (let c = 0; c < COLS; c++) {
            for (let r = ROWS - 2; r >= 0; r--) {
                if (grid[r][c] && !grid[r + 1][c]) {
                    // Fall down to the lowest open spot
                    let dropTo = r + 1;
                    while (dropTo + 1 < ROWS && !grid[dropTo + 1][c]) {
                        dropTo++;
                    }
                    grid[dropTo][c] = grid[r][c];
                    grid[dropTo][c].scaleY = 1.15;
                    grid[r][c] = null;
                    moved = true;
                }
            }
        }
        return moved;
    }

    function scanAndResolveMatches(chainStep) {
        // Priority 1: ZERO POINT ANNIHILATION (Opposites: A + B == 0)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tileA = grid[r][c];
                if (!tileA || tileA.type !== 'number') continue;

                // Check Right neighbor
                if (c + 1 < COLS) {
                    const tileB = grid[r][c + 1];
                    if (tileB && tileB.type === 'number' && tileA.value + tileB.value === 0) {
                        totalZeroPoints++;
                        const magnitude = Math.abs(tileA.value);
                        triggerZeroPointBlast(r, c, `${tileA.value} + (${tileB.value}) = 0!`, chainStep, magnitude, r, c + 1);
                        grid[r][c] = null;
                        grid[r][c + 1] = null;
                        return true;
                    }
                }

                // Check Down neighbor
                if (r + 1 < ROWS) {
                    const tileB = grid[r + 1][c];
                    if (tileB && tileB.type === 'number' && tileA.value + tileB.value === 0) {
                        totalZeroPoints++;
                        const magnitude = Math.abs(tileA.value);
                        triggerZeroPointBlast(r, c, `${tileA.value} + (${tileB.value}) = 0!`, chainStep, magnitude, r + 1, c);
                        grid[r][c] = null;
                        grid[r + 1][c] = null;
                        return true;
                    }
                }
            }
        }

        // Priority 2: SYNTHESIS (Identical value & sign: A == B)
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tileA = grid[r][c];
                if (!tileA || tileA.type !== 'number') continue;

                // Check Right neighbor
                if (c + 1 < COLS) {
                    const tileB = grid[r][c + 1];
                    if (tileB && tileB.type === 'number' && tileA.value === tileB.value) {
                        const fusedVal = tileA.value * 2;
                        grid[r][c] = null;
                        grid[r][c + 1] = createTile(fusedVal);
                        grid[r][c + 1].flash = 1;
                        grid[r][c + 1].scaleX = 1.3;
                        sfx.playMerge(fusedVal);
                        addFloatingText(`${tileA.value} + ${tileB.value} = ${fusedVal}`, 
                            boardOffsetX + (c + 0.5) * cellW, 
                            boardOffsetY + r * cellH, 
                            fusedVal > 0 ? 'var(--cyan)' : 'var(--orange)');
                        addScore(100 * (chainStep + 1));
                        addOverdriveCharge(8);
                        checkBountyProgress('synthesis', 1);
                        return true;
                    }
                }

                // Check Down neighbor
                if (r + 1 < ROWS) {
                    const tileB = grid[r + 1][c];
                    if (tileB && tileB.type === 'number' && tileA.value === tileB.value) {
                        const fusedVal = tileA.value * 2;
                        grid[r][c] = null;
                        grid[r + 1][c] = createTile(fusedVal);
                        grid[r + 1][c].flash = 1;
                        grid[r + 1][c].scaleY = 1.3;
                        sfx.playMerge(fusedVal);
                        addFloatingText(`${tileA.value} + ${tileB.value} = ${fusedVal}`, 
                            boardOffsetX + c * cellW + cellW / 2, 
                            boardOffsetY + (r + 0.5) * cellH, 
                            fusedVal > 0 ? 'var(--cyan)' : 'var(--orange)');
                        addScore(100 * (chainStep + 1));
                        addOverdriveCharge(8);
                        checkBountyProgress('synthesis', 1);
                        return true;
                    }
                }
            }
        }

        return false;
    }

    function getTier(magnitude) {
        if (magnitude <= 1) return 1;
        if (magnitude <= 3) return 2;
        if (magnitude <= 7) return 3;
        if (magnitude <= 15) return 4;
        return 5;
    }

    function triggerZeroPointBlast(r, c, equationText, chainStep = 0, magnitude = 1, r2 = r, c2 = c) {
        const x1 = boardOffsetX + c * cellW + cellW / 2;
        const y1 = boardOffsetY + r * cellH + cellH / 2;
        const x2 = boardOffsetX + c2 * cellW + cellW / 2;
        const y2 = boardOffsetY + r2 * cellH + cellH / 2;
        const x = (x1 + x2) / 2;
        const y = (y1 + y2) / 2;

        const tier = getTier(magnitude);

        sfx.playAnnihilate(combo, tier);

        let bannerText = 'ZERO POINT!';
        let bannerColor = '#00f2fe';
        let bannerScale = 1.1;

        if (tier === 1) {
            // Tier 1: Micro Detonation (Magnitude 1)
            triggerScreenShake(6 + Math.min(combo * 2, 8));
            shockwaves.push({ x: x, y: y, radius: 10, maxRadius: cellW * 2.0, alpha: 1, color: '#fff' });
            createSparks(x, y, '#00f2fe', 14);
            createSparks(x, y, '#ff4e50', 14);
            damageAdjacentDarkMatter(r, c);
            damageAdjacentDarkMatter(r2, c2);
            bannerText = 'ZERO POINT!';
            bannerColor = '#00f2fe';
        } else if (tier === 2) {
            // Tier 2: Pulse Detonation (Magnitude 2-3)
            triggerScreenShake(10 + Math.min(combo * 2, 10));
            shockwaves.push({ x: x, y: y, radius: 12, maxRadius: cellW * 3.0, alpha: 1, color: '#00f2fe' });
            createSparks(x, y, '#00f2fe', 22);
            createSparks(x, y, '#ff4e50', 22);
            damageAdjacentDarkMatter(r, c);
            damageAdjacentDarkMatter(r2, c2);
            bannerText = '⚡ PULSE BLAST!';
            bannerColor = '#00f2fe';
            bannerScale = 1.25;
        } else if (tier === 3) {
            // Tier 3: Cross Laser Blast (Magnitude 4-7)
            triggerScreenShake(16);
            shockwaves.push({ x: x, y: y, radius: 14, maxRadius: cellW * 4.2, alpha: 1, color: '#ffffff' });
            createSparks(x, y, '#00f2fe', 32);
            createSparks(x, y, '#ffd700', 20);

            // Radiant Cross Laser Beams
            laserBeams.push({ type: 'horizontal', row: r, alpha: 1.0, width: 20, color: '#00f2fe' });
            if (r2 !== r) laserBeams.push({ type: 'horizontal', row: r2, alpha: 1.0, width: 20, color: '#00f2fe' });
            laserBeams.push({ type: 'vertical', col: c, alpha: 1.0, width: 20, color: '#00f2fe' });
            if (c2 !== c) laserBeams.push({ type: 'vertical', col: c2, alpha: 1.0, width: 20, color: '#00f2fe' });

            damageLaserPath(r, c, r2, c2);
            bannerText = '⚡ CROSS LASER BLAST!';
            bannerColor = '#00f2fe';
            bannerScale = 1.35;
        } else if (tier === 4) {
            // Tier 4: Supernova Crater (Magnitude 8-15)
            triggerScreenShake(24);
            screenFlash = 0.65;
            screenFlashColor = '#ffd700';

            shockwaves.push({ x: x, y: y, radius: 15, maxRadius: cellW * 5.2, alpha: 1, color: '#ffd700' });
            shockwaves.push({ x: x, y: y, radius: 8, maxRadius: cellW * 3.5, alpha: 1, color: '#ffffff' });
            createSparks(x, y, '#ffd700', 36);
            createSparks(x, y, '#ff4e50', 24);
            createSparks(x, y, '#ffffff', 20);

            damageSupernovaArea(r, c, r2, c2);
            bannerText = '🌟 SUPERNOVA CRATER!';
            bannerColor = '#ffd700';
            bannerScale = 1.5;
        } else {
            // Tier 5: Hyperspace Singularity (Magnitude 16+)
            triggerScreenShake(32);
            screenFlash = 0.85;
            screenFlashColor = '#ffffff';

            shockwaves.push({ x: x, y: y, radius: 20, maxRadius: cellW * 7.5, alpha: 1, color: '#c471ed' });
            shockwaves.push({ x: x, y: y, radius: 10, maxRadius: cellW * 5.0, alpha: 1, color: '#00f2fe' });
            createSparks(x, y, '#c471ed', 45);
            createSparks(x, y, '#00f2fe', 45);
            createSparks(x, y, '#ffd700', 35);

            damageHyperspace();
            bannerText = '💥 HYPERSPACE SINGULARITY!';
            bannerColor = '#c471ed';
            bannerScale = 1.65;
        }

        // Float equation text & tier banner
        addFloatingText(equationText, x, y - 14, '#ffffff', 1.05);
        if (combo > 1) {
            addFloatingText(`${bannerText} (CASCADE ${combo}x!)`, x, y + 20, bannerColor, bannerScale);
        } else {
            addFloatingText(bannerText, x, y + 20, bannerColor, bannerScale);
        }

        // Tier-scaled score bonus
        const baseScore = 200 * Math.pow(2, tier - 1);
        addScore(baseScore * combo * (chainStep + 1));

        const chargeBonus = Math.round((10 + tier * 8) * (1 + (combo - 1) * 0.25));
        addOverdriveCharge(chargeBonus);

        // Tactical Bounty checks & Supernova Token Bonus
        if (tier >= 3) {
            checkBountyProgress('laser', 1);
        }
        if (tier >= 4) {
            checkBountyProgress('supernova', 1);
            if (swapTokens < maxSwapTokens) {
                addSwapToken(1);
            }
        }
    }

    function damageDarkMatterTile(r, c, dmg = 1) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        const target = grid[r][c];
        if (target && target.type === 'dark_matter') {
            target.hp -= dmg;
            sfx.playCrack();
            checkBountyProgress('dark_matter', dmg);
            const nx = boardOffsetX + c * cellW + cellW / 2;
            const ny = boardOffsetY + r * cellH + cellH / 2;
            createSparks(nx, ny, '#888', 8);

            if (target.hp <= 0) {
                // Shattered into a fresh random number!
                const val = (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 4) + 1);
                grid[r][c] = createTile(val);
                addFloatingText('SHATTERED!', nx, ny, '#fff');
                addScore(150);
            } else {
                target.flash = 0.8;
            }
        }
    }

    function damageAdjacentDarkMatter(r, c) {
        const neighbors = [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ];
        neighbors.forEach(([nr, nc]) => damageDarkMatterTile(nr, nc, 1));
    }

    function damageLaserPath(r1, c1, r2, c2) {
        const rowsToBlast = new Set([r1, r2]);
        const colsToBlast = new Set([c1, c2]);

        rowsToBlast.forEach(r => {
            for (let c = 0; c < COLS; c++) {
                damageDarkMatterTile(r, c, 1);
            }
        });

        colsToBlast.forEach(c => {
            for (let r = 0; r < ROWS; r++) {
                damageDarkMatterTile(r, c, 1);
            }
        });
    }

    function damageSupernovaArea(r1, c1, r2, c2) {
        const minR = Math.max(0, Math.min(r1, r2) - 1);
        const maxR = Math.min(ROWS - 1, Math.max(r1, r2) + 1);
        const minC = Math.max(0, Math.min(c1, c2) - 1);
        const maxC = Math.min(COLS - 1, Math.max(c1, c2) + 1);

        for (let r = minR; r <= maxR; r++) {
            for (let c = minC; c <= maxC; c++) {
                const tile = grid[r][c];
                if (!tile) continue;

                if (tile.type === 'dark_matter') {
                    // Deal 2 damage to Dark Matter (vaporizes it!)
                    damageDarkMatterTile(r, c, 2);
                } else if (tile.type === 'number') {
                    // Vaporize smaller clutter tiles in the crater
                    if (Math.abs(tile.value) <= 4) {
                        const tx = boardOffsetX + c * cellW + cellW / 2;
                        const ty = boardOffsetY + r * cellH + cellH / 2;
                        createSparks(tx, ty, '#ffd700', 10);
                        grid[r][c] = null;
                    }
                }
            }
        }
    }

    function damageHyperspace() {
        for (let r = ROWS - 3; r < ROWS; r++) {
            if (r >= 0) {
                for (let c = 0; c < COLS; c++) {
                    const tile = grid[r][c];
                    if (tile) {
                        const tx = boardOffsetX + c * cellW + cellW / 2;
                        const ty = boardOffsetY + r * cellH + cellH / 2;
                        createSparks(tx, ty, '#c471ed', 12);
                        grid[r][c] = null;
                    }
                }
            }
        }
    }

    async function pushRisingRow() {
        sfx.playWarning();
        triggerScreenShake(5);

        // Shift all rows up by 1
        for (let r = 0; r < ROWS - 1; r++) {
            grid[r] = grid[r + 1];
        }

        // Create new bottom row of Dark Matter blocks with a few number gaps
        const newRow = [];
        for (let c = 0; c < COLS; c++) {
            if (Math.random() < 0.6) {
                newRow.push(createTile(0, 'dark_matter'));
            } else {
                const val = (Math.random() < 0.5 ? 1 : -1) * (Math.floor(Math.random() * 3) + 1);
                newRow.push(createTile(val));
            }
        }
        grid[ROWS - 1] = newRow;

        addFloatingText('REACTOR PRESSURE RISE!', canvas.width / (2 * dpr), boardOffsetY + cellH * 3, 'var(--danger)', 1.3);
        await delay(200);
    }

    function checkGameOver() {
        // If any tile reaches row 0, reactor breach!
        for (let c = 0; c < COLS; c++) {
            if (grid[0][c]) {
                isGameOver = true;
                sfx.playGameOver();
                triggerScreenShake(18);

                // Update game over modal stats
                document.getElementById('go-score').textContent = score.toLocaleString();
                document.getElementById('go-best').textContent = highScore.toLocaleString();
                document.getElementById('go-cascade').textContent = `${maxCombo}x`;
                document.getElementById('go-zeroes').textContent = totalZeroPoints;

                setTimeout(() => {
                    modalGameOver.classList.add('visible');
                }, 400);
                return;
            }
        }
    }

    function addScore(pts) {
        score += pts;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('zeropoint_highscore', highScore.toString());
            bestVal.textContent = highScore.toLocaleString();
        }
        scoreVal.textContent = score.toLocaleString();
    }

    function addOverdriveCharge(pts) {
        if (isFrenzyActive) return;
        overdriveCharge = Math.min(100, Math.round(overdriveCharge + pts));
        if (overdriveCharge >= 100 && !isOverdriveReady) {
            isOverdriveReady = true;
            sfx.playOverdriveReady();
            addFloatingText('⚡ OVERDRIVE READY! Press [F]', canvas.width / (2 * dpr), boardOffsetY + cellH * 2.5, '#ffd700', 1.35);
        }
        updateHUD();
    }

    function activateOverdrive() {
        if (!isOverdriveReady || isFrenzyActive || isProcessing || isGameOver) return;

        isOverdriveReady = false;
        isFrenzyActive = true;
        frenzyTurnsRemaining = 3;

        sfx.playOverdriveActivate();
        triggerScreenShake(20);
        screenFlash = 0.75;
        screenFlashColor = '#ffd700';

        // Load 3 consecutive Frenzy super-weapons:
        // 1. Black Hole Vortex
        // 2. Supernova Core
        // 3. Antimatter Nuke
        currentOrb = {
            type: 'special',
            subType: 'blackhole',
            label: '⚫ VORTEX'
        };
        nextQueue[0] = {
            type: 'special',
            subType: 'supernova_core',
            label: '🌟 NOVA'
        };
        nextQueue[1] = {
            type: 'special',
            subType: 'antimatter_nuke',
            label: '💥 NUKE'
        };

        addFloatingText('🔥 SINGULARITY FRENZY! 🔥', canvas.width / (2 * dpr), boardOffsetY + cellH * 3, '#ffd700', 1.5);
        checkBountyProgress('frenzy', 1);
        updateHUD();
    }

    // Tactical Bounties System
    const BOUNTY_TEMPLATES = [
        {
            id: 'laser',
            title: 'Cross Laser Blast',
            desc: 'Detonate a ±4+ pair for a Tier 3+ Cross Laser',
            target: 1,
            rewardScore: 500,
            rewardSwap: 1,
            rewardOvd: 25,
            rewardText: '+500 PTS • +1 SWAP'
        },
        {
            id: 'supernova',
            title: 'Supernova Crater',
            desc: 'Trigger a Tier 4+ Supernova (±8 or higher)',
            target: 1,
            rewardScore: 800,
            rewardSwap: 1,
            rewardOvd: 35,
            rewardText: '+800 PTS • +1 SWAP'
        },
        {
            id: 'synthesis',
            title: 'Double Fusion',
            desc: 'Synthesize identical tiles 2 times (e.g. +2 & +2)',
            target: 2,
            rewardScore: 400,
            rewardSwap: 1,
            rewardOvd: 20,
            rewardText: '+400 PTS • +1 SWAP'
        },
        {
            id: 'cascade',
            title: 'Cascade Surge',
            desc: 'Trigger a 2x or higher combo cascade chain',
            target: 1,
            rewardScore: 600,
            rewardSwap: 1,
            rewardOvd: 25,
            rewardText: '+600 PTS • +1 SWAP'
        },
        {
            id: 'dark_matter',
            title: 'Dark Matter Breach',
            desc: 'Damage or shatter 3 Dark Matter cores',
            target: 3,
            rewardScore: 500,
            rewardSwap: 1,
            rewardOvd: 25,
            rewardText: '+500 PTS • +1 SWAP'
        },
        {
            id: 'frenzy',
            title: 'Singularity Overdrive',
            desc: 'Activate Singularity Frenzy mode [F]',
            target: 1,
            rewardScore: 750,
            rewardSwap: 1,
            rewardOvd: 30,
            rewardText: '+750 PTS • +1 SWAP'
        }
    ];

    function generateBounty() {
        const pool = currentBounty 
            ? BOUNTY_TEMPLATES.filter(t => t.id !== currentBounty.id)
            : BOUNTY_TEMPLATES;
        const template = pool[Math.floor(Math.random() * pool.length)];
        return {
            ...template,
            progress: 0
        };
    }

    function updateBountyUI() {
        if (!currentBounty || !bountyCard) return;
        bountyName.textContent = currentBounty.title;
        bountyReward.textContent = currentBounty.rewardText;
        bountyDesc.textContent = currentBounty.desc;
        bountyProgressText.textContent = `${currentBounty.progress}/${currentBounty.target}`;
        const pct = Math.min(100, Math.round((currentBounty.progress / currentBounty.target) * 100));
        bountyProgressFill.style.width = `${pct}%`;
    }

    function checkBountyProgress(type, amount = 1) {
        if (!currentBounty || isGameOver) return;
        if (currentBounty.id === type) {
            currentBounty.progress = Math.min(currentBounty.target, currentBounty.progress + amount);
            updateBountyUI();
            if (currentBounty.progress >= currentBounty.target) {
                completeBounty();
            }
        }
    }

    function completeBounty() {
        if (!currentBounty) return;
        const b = currentBounty;
        addScore(b.rewardScore);
        if (b.rewardSwap) addSwapToken(b.rewardSwap);
        if (b.rewardOvd) addOverdriveCharge(b.rewardOvd);

        sfx.playBountyComplete();
        if (bountyCard) {
            bountyCard.classList.add('completed-flash');
            setTimeout(() => bountyCard.classList.remove('completed-flash'), 650);
        }

        addFloatingText(`🎯 BOUNTY: ${b.title}! ${b.rewardText}`, canvas.width / (2 * dpr), boardOffsetY + cellH * 2.2, '#ffd700', 1.35);

        currentBounty = generateBounty();
        updateBountyUI();
    }

    // Quantum Swap Mechanics
    function addSwapToken(qty = 1) {
        if (swapTokens >= maxSwapTokens) return;
        swapTokens = Math.min(maxSwapTokens, swapTokens + qty);
        sfx.playPowerup();
        addFloatingText('⚡ +1 SWAP TOKEN!', canvas.width / (2 * dpr), boardOffsetY + cellH * 1.5, '#00f2fe', 1.25);
        updateHUD();
    }

    function toggleSwapMode() {
        if (isProcessing || isGameOver) return;
        if (!isSwapModeActive && swapTokens <= 0) {
            triggerScreenShake(6);
            sfx.playWarning();
            addFloatingText('NO SWAP TOKENS! Earn via 8 drops or Bounties', canvas.width / (2 * dpr), boardOffsetY + cellH * 3, '#ff4e50', 1.1);
            return;
        }

        isSwapModeActive = !isSwapModeActive;
        firstSwapTile = null;

        if (isSwapModeActive) {
            sfx.playMove();
            if (swapBanner) {
                swapBanner.style.display = 'block';
                swapBanner.textContent = 'SWAP MODE: Select first tile on board';
            }
        } else {
            if (swapBanner) swapBanner.style.display = 'none';
        }
        updateHUD();
    }

    function handleSwapClick(mouseX, mouseY) {
        if (!isSwapModeActive || isProcessing || isGameOver) return;

        const c = Math.floor((mouseX - boardOffsetX) / cellW);
        const r = Math.floor((mouseY - boardOffsetY) / cellH);

        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;

        if (!firstSwapTile) {
            // First selection must be an occupied tile
            if (!grid[r][c]) {
                sfx.playWarning();
                return;
            }
            firstSwapTile = { r, c };
            sfx.playMove();
            if (swapBanner) {
                swapBanner.textContent = 'Select adjacent tile to swap (or click same tile to cancel)';
            }
        } else {
            // Clicked same tile -> cancel selection
            if (firstSwapTile.r === r && firstSwapTile.c === c) {
                firstSwapTile = null;
                sfx.playMove();
                if (swapBanner) {
                    swapBanner.textContent = 'SWAP MODE: Select first tile on board';
                }
                return;
            }

            // Check orthogonal adjacency
            const isAdjacent = Math.abs(r - firstSwapTile.r) + Math.abs(c - firstSwapTile.c) === 1;

            if (!isAdjacent) {
                // If clicked another occupied tile, re-select it
                if (grid[r][c]) {
                    firstSwapTile = { r, c };
                    sfx.playMove();
                    if (swapBanner) {
                        swapBanner.textContent = 'Select adjacent tile to swap (or click same tile to cancel)';
                    }
                }
                return;
            }

            // Valid Swap Execution!
            const r1 = firstSwapTile.r;
            const c1 = firstSwapTile.c;
            const t1 = grid[r1][c1];
            const t2 = grid[r][c];

            grid[r1][c1] = t2;
            grid[r][c] = t1;

            swapTokens = Math.max(0, swapTokens - 1);
            sfx.playQuantumSwap();

            // Visual effects at both tiles
            const x1 = boardOffsetX + (c1 + 0.5) * cellW;
            const y1 = boardOffsetY + (r1 + 0.5) * cellH;
            const x2 = boardOffsetX + (c + 0.5) * cellW;
            const y2 = boardOffsetY + (r + 0.5) * cellH;
            createSparks(x1, y1, '#00f2fe', 16);
            createSparks(x2, y2, '#ffd700', 16);
            shockwaves.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, radius: 10, maxRadius: cellW * 2.5, alpha: 1, color: '#00f2fe' });
            addFloatingText('QUANTUM SWAP!', (x1 + x2) / 2, (y1 + y2) / 2, '#ffd700', 1.3);

            isSwapModeActive = false;
            firstSwapTile = null;
            if (swapBanner) swapBanner.style.display = 'none';
            updateHUD();

            isProcessing = true;
            resolveBoardCascades(true); // isSwap = true
        }
    }

    function drawSwapModeHighlights() {
        if (!isSwapModeActive) return;

        ctx.save();
        // Pulsing border around the board
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(boardOffsetX + 2, boardOffsetY + 2, cellW * COLS - 4, cellH * ROWS - 4);

        if (firstSwapTile) {
            const selX = boardOffsetX + firstSwapTile.c * cellW + 3;
            const selY = boardOffsetY + firstSwapTile.r * cellH + 3;

            // Pulsing gold box around selected tile
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 14;
            ctx.strokeRect(selX, selY, cellW - 6, cellH - 6);

            // Adjacent target indicators
            const neighbors = [
                [firstSwapTile.r - 1, firstSwapTile.c],
                [firstSwapTile.r + 1, firstSwapTile.c],
                [firstSwapTile.r, firstSwapTile.c - 1],
                [firstSwapTile.r, firstSwapTile.c + 1]
            ];

            ctx.shadowBlur = 8;
            ctx.shadowColor = '#00f2fe';
            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);

            for (const [nr, nc] of neighbors) {
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                    const nx = boardOffsetX + nc * cellW + 3;
                    const ny = boardOffsetY + nr * cellH + 3;
                    ctx.strokeRect(nx, ny, cellW - 6, cellH - 6);

                    // Small direction indicator dot toward neighbor
                    const cx = boardOffsetX + (nc + 0.5) * cellW;
                    const cy = boardOffsetY + (nr + 0.5) * cellH;
                    ctx.fillStyle = 'rgba(0, 242, 254, 0.7)';
                    ctx.beginPath();
                    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        ctx.restore();
    }

    // Fullscreen and Expanded View Controller
    function setupFullscreenUI() {
        if (!btnFullscreen) return;

        function updateFullscreenIcons() {
            const isFs = !!document.fullscreenElement || !!document.webkitFullscreenElement || (appEl && appEl.classList.contains('fullscreen-mode'));
            if (iconExpand) iconExpand.style.display = isFs ? 'none' : 'block';
            if (iconCompress) iconCompress.style.display = isFs ? 'block' : 'none';
        }

        btnFullscreen.addEventListener('click', () => {
            sfx.init();
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                const exitFs = document.exitFullscreen || document.webkitExitFullscreen;
                if (exitFs) exitFs.call(document).catch(() => {});
                if (appEl) appEl.classList.remove('fullscreen-mode');
                updateFullscreenIcons();
                setTimeout(resizeCanvas, 100);
            } else if (appEl && appEl.classList.contains('fullscreen-mode')) {
                appEl.classList.remove('fullscreen-mode');
                updateFullscreenIcons();
                setTimeout(resizeCanvas, 100);
            } else {
                const docEl = document.documentElement;
                const reqFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
                if (reqFs) {
                    reqFs.call(docEl).then(() => {
                        updateFullscreenIcons();
                        setTimeout(resizeCanvas, 100);
                    }).catch(() => {
                        if (appEl) appEl.classList.add('fullscreen-mode');
                        updateFullscreenIcons();
                        setTimeout(resizeCanvas, 100);
                    });
                } else {
                    if (appEl) appEl.classList.add('fullscreen-mode');
                    updateFullscreenIcons();
                    setTimeout(resizeCanvas, 100);
                }
            }
        });

        const onFsChange = () => {
            updateFullscreenIcons();
            setTimeout(resizeCanvas, 100);
        };

        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);
    }

    function updateHUD() {
        comboVal.textContent = `${combo}x`;
        riseCounter.textContent = `${movesUntilRise} Drop${movesUntilRise === 1 ? '' : 's'}`;

        // Update Overdrive Gauge
        if (overdriveContainer && overdrivePercent && overdriveFill) {
            if (isFrenzyActive) {
                overdriveContainer.classList.add('frenzy-active');
                overdrivePercent.textContent = `${frenzyTurnsRemaining} FRENZY TURNS`;
                overdrivePercent.style.color = '#ffd700';
                const pct = Math.round((frenzyTurnsRemaining / 3) * 100);
                overdriveFill.style.width = `${pct}%`;
            } else {
                overdriveContainer.classList.remove('frenzy-active');
                overdrivePercent.textContent = `${overdriveCharge}%`;
                overdrivePercent.style.color = isOverdriveReady ? 'var(--gold)' : 'var(--cyan)';
                overdriveFill.style.width = `${overdriveCharge}%`;
            }

            if (btnOverdrive) {
                btnOverdrive.style.display = isOverdriveReady ? 'block' : 'none';
            }
            if (btnTouchFrenzy) {
                btnTouchFrenzy.style.display = isOverdriveReady ? 'block' : 'none';
            }
        }

        // Update Swap Token UI
        if (swapTokenCount) {
            swapTokenCount.textContent = swapTokens;
        }
        if (btnSwapToken) {
            if (swapTokens > 0) {
                btnSwapToken.classList.add('has-tokens');
            } else {
                btnSwapToken.classList.remove('has-tokens');
            }
            if (isSwapModeActive) {
                btnSwapToken.classList.add('swap-mode-active');
            } else {
                btnSwapToken.classList.remove('swap-mode-active');
            }
        }
        if (btnTouchSwap) {
            if (isSwapModeActive) {
                btnTouchSwap.classList.add('swap-mode-active');
            } else {
                btnTouchSwap.classList.remove('swap-mode-active');
            }
        }

        // Update Tactical Bounty UI
        updateBountyUI();

        // Update Hold Slot UI
        if (heldOrb) {
            holdText.textContent = heldOrb.label;
            holdText.style.color = heldOrb.type === 'special' ? (heldOrb.subType === 'blackhole' ? '#ffd700' : 'var(--purple)') :
                                  (heldOrb.value > 0 ? 'var(--cyan)' : 'var(--orange)');
            holdSlot.classList.add('active');
        } else {
            holdText.textContent = '-';
            holdText.style.color = 'var(--text-muted)';
            holdSlot.classList.remove('active');
        }

        // Update Next Queue UI
        renderQueueSlot(nextSlot1, nextQueue[0]);
        renderQueueSlot(nextSlot2, nextQueue[1]);
    }

    function renderQueueSlot(element, orb) {
        if (!orb) {
            element.innerHTML = '';
            return;
        }
        const color = orb.type === 'special' ? 
            (orb.subType === 'blackhole' || orb.subType === 'supernova_core' ? 'var(--gold)' : 
             orb.subType === 'antimatter_nuke' ? 'var(--orange)' : 'var(--purple)') :
            (orb.value > 0 ? 'var(--cyan)' : 'var(--orange)');

        element.innerHTML = `<span style="font-weight:900; font-size: 0.85rem; color: ${color};">${orb.label}</span>`;
    }

    // Input Handlers
    function setupInputs() {
        // Mouse Hover & Click
        canvas.addEventListener('mousemove', (e) => {
            if (isProcessing || isGameOver) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const col = Math.floor(mouseX / cellW);
            if (col >= 0 && col < COLS && col !== aimCol) {
                aimCol = col;
                sfx.playMove();
            }
        });

        canvas.addEventListener('click', (e) => {
            if (isProcessing || isGameOver) return;
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (isSwapModeActive) {
                handleSwapClick(mouseX, mouseY);
                return;
            }

            const col = Math.floor(mouseX / cellW);
            if (col >= 0 && col < COLS) {
                aimCol = col;
                dropActiveOrb();
            }
        });

        // Touch Interaction
        let touchStartX = 0;
        let touchStartY = 0;
        canvas.addEventListener('touchstart', (e) => {
            if (isProcessing || isGameOver) return;
            const rect = canvas.getBoundingClientRect();
            touchStartX = e.touches[0].clientX - rect.left;
            touchStartY = e.touches[0].clientY - rect.top;

            if (isSwapModeActive) {
                handleSwapClick(touchStartX, touchStartY);
                return;
            }

            const col = Math.floor(touchStartX / cellW);
            if (col >= 0 && col < COLS) {
                aimCol = col;
            }
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (isProcessing || isGameOver || isSwapModeActive) return;
            const rect = canvas.getBoundingClientRect();
            const touchX = e.touches[0].clientX - rect.left;
            const col = Math.floor(touchX / cellW);
            if (col >= 0 && col < COLS && col !== aimCol) {
                aimCol = col;
                sfx.playMove();
            }
        }, { passive: true });

        // Keyboard Controls
        window.addEventListener('keydown', (e) => {
            if (isGameOver) return;
            if (e.code === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                if (aimCol > 0) {
                    aimCol--;
                    sfx.playMove();
                }
            } else if (e.code === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                if (aimCol < COLS - 1) {
                    aimCol++;
                    sfx.playMove();
                }
            } else if (e.code === 'Space' || e.code === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                if (!isSwapModeActive) {
                    dropActiveOrb();
                }
            } else if (e.key === 'c' || e.key === 'C') {
                swapHold();
            } else if (e.key === 's' || e.key === 'S') {
                toggleSwapMode();
            } else if (e.key === 'f' || e.key === 'F') {
                activateOverdrive();
            } else if (e.key === 'r' || e.key === 'R') {
                startNewGame();
            } else if (e.code === 'Escape') {
                if (isSwapModeActive) {
                    isSwapModeActive = false;
                    firstSwapTile = null;
                    if (swapBanner) swapBanner.style.display = 'none';
                    updateHUD();
                }
            }
        });

        // Button Listeners
        holdSlot.addEventListener('click', swapHold);
        btnTouchHold.addEventListener('click', swapHold);
        btnTouchDrop.addEventListener('click', dropActiveOrb);
        if (btnSwapToken) btnSwapToken.addEventListener('click', toggleSwapMode);
        if (btnTouchSwap) btnTouchSwap.addEventListener('click', toggleSwapMode);
        if (btnOverdrive) btnOverdrive.addEventListener('click', activateOverdrive);
        if (btnTouchFrenzy) btnTouchFrenzy.addEventListener('click', activateOverdrive);

        btnHelp.addEventListener('click', () => modalHelp.classList.add('visible'));
        btnCloseHelp.addEventListener('click', () => modalHelp.classList.remove('visible'));
        btnStart.addEventListener('click', () => modalHelp.classList.remove('visible'));
        btnRestart.addEventListener('click', startNewGame);
        btnPlayAgain.addEventListener('click', startNewGame);
    }

    // Main Game Loop (60 FPS)
    let lastTime = performance.now();
    function gameLoop(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        update(dt);
        render();

        requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        // Projectile physics update
        if (activeProjectile) {
            const p = activeProjectile;
            p.y += p.vy;
            p.vy += 38 * dt * 60; // Gravity acceleration

            if (p.y >= p.targetY) {
                p.y = p.targetY;
                handleProjectileLanding();
            }
        }

        // Shake decay
        if (screenShake > 0) {
            screenShake = Math.max(0, screenShake - 30 * dt);
        }

        // Shockwaves update
        for (let i = shockwaves.length - 1; i >= 0; i--) {
            const sw = shockwaves[i];
            sw.radius += (sw.maxRadius - sw.radius) * 12 * dt;
            sw.alpha -= 2.5 * dt;
            if (sw.alpha <= 0) {
                shockwaves.splice(i, 1);
            }
        }

        // Laser Beams update
        for (let i = laserBeams.length - 1; i >= 0; i--) {
            const b = laserBeams[i];
            b.alpha -= 3.5 * dt;
            if (b.alpha <= 0) {
                laserBeams.splice(i, 1);
            }
        }

        // Screen Flash decay
        if (screenFlash > 0) {
            screenFlash = Math.max(0, screenFlash - 4.5 * dt);
        }

        // Sparks update
        for (let i = particles.length - 1; i >= 0; i--) {
            const sp = particles[i];
            sp.x += sp.vx * dt * 60;
            sp.y += sp.vy * dt * 60;
            sp.vy += 0.25; // mild gravity
            sp.alpha -= sp.decay * dt * 60;
            if (sp.alpha <= 0) {
                particles.splice(i, 1);
            }
        }

        // Floating texts update
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y -= 25 * dt;
            ft.alpha -= 1.2 * dt;
            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
            }
        }

        // Tile squash/stretch return to 1
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const t = grid[r][c];
                if (t) {
                    t.scaleX += (1 - t.scaleX) * 10 * dt;
                    t.scaleY += (1 - t.scaleY) * 10 * dt;
                    if (t.flash > 0) {
                        t.flash = Math.max(0, t.flash - 3 * dt);
                    }
                }
            }
        }
    }

    // Rendering
    function render() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        ctx.save();

        // Screen shake transform
        if (screenShake > 0) {
            const sx = (Math.random() - 0.5) * screenShake;
            const sy = (Math.random() - 0.5) * screenShake;
            ctx.translate(sx, sy);
        }

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // 1. Draw Grid Background & Danger Threshold
        drawGridBackground(w, h);

        // 2. Draw Aim Line & Landing Ghost Preview
        drawAimerAndPreview();

        // 3. Draw Board Tiles
        drawTiles();

        // 3.5 Draw Swap Mode Selection Highlights
        drawSwapModeHighlights();

        // 4. Draw Active Falling Projectile
        drawActiveProjectile();

        // 5. Draw Launcher Capsule at the top
        drawLauncher();

        // 6. Draw Shockwaves & Sparks
        drawEffects();

        // 7. Draw Floating Texts
        drawFloatingTexts();

        ctx.restore();
    }

    function drawGridBackground(w, h) {
        // Grid column highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) {
            const x = boardOffsetX + c * cellW;
            ctx.beginPath();
            ctx.moveTo(x, boardOffsetY);
            ctx.lineTo(x, h);
            ctx.stroke();
        }

        // Danger Line above Row 1
        const dangerY = boardOffsetY + cellH;
        ctx.save();
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = 'rgba(255, 42, 95, 0.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, dangerY);
        ctx.lineTo(w, dangerY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 42, 95, 0.7)';
        ctx.font = '800 10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('CRITICAL THRESHOLD', w - 8, dangerY - 4);
        ctx.restore();
    }

    function getOrbFlavor(orb) {
        if (!orb) return 'pos';
        if (orb.type === 'special') {
            if (orb.subType === 'blackhole') return 'blackhole';
            if (orb.subType === 'supernova_core') return 'supernova_core';
            if (orb.subType === 'antimatter_nuke') return 'antimatter_nuke';
            return 'special';
        }
        return orb.value > 0 ? 'pos' : 'neg';
    }

    function drawAimerAndPreview() {
        if (isGameOver || isSwapModeActive) return;
        const col = aimCol;
        const centerX = boardOffsetX + col * cellW + cellW / 2;

        // Column highlight beam
        if (currentOrb && currentOrb.subType === 'blackhole') {
            ctx.fillStyle = 'rgba(188, 19, 254, 0.12)';
        } else {
            ctx.fillStyle = 'rgba(0, 242, 254, 0.035)';
        }
        ctx.fillRect(boardOffsetX + col * cellW, boardOffsetY, cellW, cellH * ROWS);

        // Dashed trajectory beam
        ctx.save();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = currentOrb && currentOrb.subType === 'blackhole' ? 'rgba(255, 215, 0, 0.45)' : 'rgba(0, 242, 254, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, cellH * 0.9);
        ctx.lineTo(centerX, boardOffsetY + cellH * ROWS);
        ctx.stroke();
        ctx.restore();

        // Ghost Tile & Mathematical Outcome Preview!
        if (!activeProjectile && currentOrb) {
            let landingRow = -1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (!grid[r][col]) {
                    landingRow = r;
                    break;
                }
            }

            const topRow = landingRow + 1;
            const hasTop = topRow < ROWS && grid[topRow][col] !== null;

            if (currentOrb.type === 'special') {
                const sub = currentOrb.subType;

                if (sub === 'blackhole') {
                    // Black Hole Vortex: entire column targeted!
                    ctx.save();
                    ctx.strokeStyle = '#ffd700';
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = '#bc13fe';
                    ctx.shadowBlur = 14;
                    ctx.strokeRect(boardOffsetX + col * cellW + 2, boardOffsetY + 2, cellW - 4, cellH * ROWS - 4);

                    ctx.fillStyle = '#ffd700';
                    ctx.font = '900 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('⚫ VORTEX (CRUSH COLUMN!)', centerX, boardOffsetY + 16);

                    const targetGhostRow = hasTop ? topRow : (landingRow >= 0 ? landingRow : 0);
                    const ghostY = boardOffsetY + targetGhostRow * cellH + cellH / 2;
                    ctx.globalAlpha = 0.65;
                    drawTileGraphic(centerX, ghostY, cellW - 10, cellH - 10, currentOrb.label, 'blackhole');
                    ctx.restore();
                } else if (sub === 'supernova_core' || sub === 'antimatter_nuke' || sub === 'zero') {
                    // 3x3 blast area weapon
                    const targetR = hasTop ? topRow : (landingRow >= 0 ? landingRow : ROWS - 1);
                    const rMin = Math.max(0, targetR - 1);
                    const rMax = Math.min(ROWS - 1, targetR + 1);
                    const cMin = Math.max(0, col - 1);
                    const cMax = Math.min(COLS - 1, col + 1);

                    const color = sub === 'supernova_core' ? '#ffd700' :
                                  sub === 'antimatter_nuke' ? '#ff4e50' : '#c471ed';
                    const textLabel = sub === 'supernova_core' ? '🌟 SUPERNOVA (3x3 CRATER!)' :
                                      sub === 'antimatter_nuke' ? '💥 NUKE (3x3 BLAST!)' : '💥 CLEAR 3x3';

                    ctx.save();
                    const areaX = boardOffsetX + cMin * cellW + 2;
                    const areaY = boardOffsetY + rMin * cellH + 2;
                    const areaW = (cMax - cMin + 1) * cellW - 4;
                    const areaH = (rMax - rMin + 1) * cellH - 4;

                    ctx.fillStyle = sub === 'supernova_core' ? 'rgba(255, 215, 0, 0.12)' :
                                    sub === 'antimatter_nuke' ? 'rgba(255, 78, 80, 0.12)' : 'rgba(196, 113, 237, 0.12)';
                    ctx.fillRect(areaX, areaY, areaW, areaH);

                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                    ctx.strokeRect(areaX, areaY, areaW, areaH);

                    ctx.fillStyle = color;
                    ctx.font = '900 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    const ghostY = boardOffsetY + targetR * cellH + cellH / 2;
                    ctx.fillText(textLabel, centerX, ghostY - cellH / 2 - 4);

                    ctx.globalAlpha = 0.65;
                    drawTileGraphic(centerX, ghostY, cellW - 10, cellH - 10, currentOrb.label, getOrbFlavor(currentOrb));
                    ctx.restore();
                } else if (hasTop) {
                    // Standard modifiers (invert, div2, mul2) affecting top tile
                    const ghostY = boardOffsetY + topRow * cellH + cellH / 2;

                    ctx.save();
                    ctx.strokeStyle = '#c471ed';
                    ctx.lineWidth = 2;
                    ctx.shadowColor = '#c471ed';
                    ctx.shadowBlur = 8;
                    ctx.strokeRect(boardOffsetX + col * cellW + 4, boardOffsetY + topRow * cellH + 4, cellW - 8, cellH - 8);

                    ctx.font = '800 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = '#c471ed';
                    const specialLabel = sub === 'invert' ? '➜ ± INVERT' :
                                         sub === 'div2' ? '➜ ÷2 FISSION' : '➜ ×2 AMPLIFY';
                    ctx.fillText(specialLabel, centerX, ghostY - cellH / 2 - 4);

                    ctx.globalAlpha = 0.5;
                    drawTileGraphic(centerX, ghostY, cellW - 10, cellH - 10, currentOrb.label, 'special');
                    ctx.restore();
                } else if (landingRow >= 0) {
                    const ghostY = boardOffsetY + landingRow * cellH + cellH / 2;
                    ctx.save();
                    ctx.globalAlpha = 0.45;
                    drawTileGraphic(centerX, ghostY, cellW - 10, cellH - 10, currentOrb.label, 'special');
                    ctx.restore();
                }
            } else if (landingRow >= 0) {
                // Ghost preview at landingRow
                const ghostY = boardOffsetY + landingRow * cellH + cellH / 2;
                const orbVal = currentOrb.value;

                // Check neighbors: below, left, right
                const neighbors = [];
                if (landingRow + 1 < ROWS && grid[landingRow + 1][col]) neighbors.push(grid[landingRow + 1][col]);
                if (col > 0 && grid[landingRow][col - 1]) neighbors.push(grid[landingRow][col - 1]);
                if (col < COLS - 1 && grid[landingRow][col + 1]) neighbors.push(grid[landingRow][col + 1]);

                let willZeroPoint = false;
                let willSynthesize = false;
                let previewTier = 1;

                if (currentOrb.type === 'number') {
                    for (const n of neighbors) {
                        if (n.type === 'number') {
                            if (n.value + orbVal === 0) {
                                willZeroPoint = true;
                                previewTier = Math.max(previewTier, getTier(Math.abs(orbVal)));
                            } else if (n.value === orbVal) {
                                willSynthesize = true;
                            }
                        }
                    }
                }

                ctx.save();
                if (willZeroPoint) {
                    let previewLabel = '💥 ZERO POINT!';
                    let previewColor = '#ffffff';

                    if (previewTier === 2) {
                        previewLabel = '⚡ PULSE BLAST!';
                        previewColor = '#00f2fe';
                    } else if (previewTier === 3) {
                        previewLabel = '⚡ CROSS LASER (Row & Col)!';
                        previewColor = '#00f2fe';
                    } else if (previewTier === 4) {
                        previewLabel = '🌟 SUPERNOVA (3x3 Crater!)';
                        previewColor = '#ffd700';
                    } else if (previewTier === 5) {
                        previewLabel = '💥 HYPERSPACE SINGULARITY!';
                        previewColor = '#c471ed';
                    }

                    ctx.shadowColor = previewColor;
                    ctx.shadowBlur = 16;
                    ctx.strokeStyle = previewColor;
                    ctx.lineWidth = previewTier >= 3 ? 3 : 2.5;
                    ctx.strokeRect(boardOffsetX + col * cellW + 4, boardOffsetY + landingRow * cellH + 4, cellW - 8, cellH - 8);

                    ctx.fillStyle = previewColor;
                    ctx.font = '900 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(previewLabel, centerX, ghostY - cellH / 2 - 4);
                } else if (willSynthesize) {
                    ctx.shadowColor = orbVal > 0 ? '#00f2fe' : '#ff4e50';
                    ctx.shadowBlur = 10;
                    ctx.strokeStyle = orbVal > 0 ? '#00f2fe' : '#ff4e50';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(boardOffsetX + col * cellW + 4, boardOffsetY + landingRow * cellH + 4, cellW - 8, cellH - 8);

                    ctx.fillStyle = orbVal > 0 ? '#00f2fe' : '#ff4e50';
                    ctx.font = '800 11px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`✨ SYNTHESIS (➜ ${orbVal * 2})`, centerX, ghostY - cellH / 2 - 4);
                }

                ctx.globalAlpha = 0.45;
                drawTileGraphic(centerX, ghostY, cellW - 10, cellH - 10, currentOrb.label, getOrbFlavor(currentOrb));
                ctx.restore();
            }
        }
    }

    function drawTiles() {
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const tile = grid[r][c];
                if (!tile) continue;

                const x = boardOffsetX + c * cellW + cellW / 2;
                const y = boardOffsetY + r * cellH + cellH / 2;
                const tw = (cellW - 8) * tile.scaleX;
                const th = (cellH - 8) * tile.scaleY;

                if (tile.type === 'dark_matter') {
                    drawDarkMatterTile(x, y, tw, th, tile.hp, tile.flash);
                } else {
                    const flavor = tile.value > 0 ? 'pos' : 'neg';
                    const label = tile.value > 0 ? `+${tile.value}` : `${tile.value}`;
                    drawTileGraphic(x, y, tw, th, label, flavor, tile.flash);
                }
            }
        }
    }

    function drawTileGraphic(x, y, w, h, label, flavor, flash = 0) {
        ctx.save();
        ctx.translate(x, y);

        const r = 12; // Corner radius
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, r);

        // Styling based on flavor
        if (flavor === 'pos') {
            // Cyan Glow Matter
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, 'rgba(0, 242, 254, 0.28)');
            grad.addColorStop(1, 'rgba(0, 160, 254, 0.12)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#00f2fe';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(0, 242, 254, 0.5)';
            ctx.shadowBlur = 8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
        } else if (flavor === 'neg') {
            // Neon Orange / Coral Anti-Matter
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, 'rgba(255, 78, 80, 0.28)');
            grad.addColorStop(1, 'rgba(255, 42, 95, 0.12)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#ff4e50';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(255, 78, 80, 0.5)';
            ctx.shadowBlur = 8;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
        } else if (flavor === 'blackhole') {
            // Black Hole Vortex: Event Horizon Void & Gold/Violet Accretion Disk
            const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.max(w, h) / 1.5);
            grad.addColorStop(0, '#020005');
            grad.addColorStop(0.65, '#0a0118');
            grad.addColorStop(1, '#1b0336');
            ctx.fillStyle = grad;
            ctx.fill();

            // Pulsing golden accretion boundary
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#bc13fe';
            ctx.shadowBlur = 14;
            ctx.stroke();

            // Subtle inner accretion ring
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(w, h) * 0.32, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(188, 19, 254, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#ffd700';
        } else if (flavor === 'supernova_core') {
            // Supernova Core: Blazing Solar Flare
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, 'rgba(255, 215, 0, 0.45)');
            grad.addColorStop(1, 'rgba(255, 120, 0, 0.25)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
            ctx.shadowBlur = 12;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
        } else if (flavor === 'antimatter_nuke') {
            // Antimatter Nuke: Crimson Warhead
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, 'rgba(255, 78, 80, 0.45)');
            grad.addColorStop(1, 'rgba(255, 0, 80, 0.25)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#ff4e50';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = 'rgba(255, 42, 95, 0.75)';
            ctx.shadowBlur = 12;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
        } else if (flavor === 'special') {
            // Purple Quantum Orb
            const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
            grad.addColorStop(0, 'rgba(196, 113, 237, 0.35)');
            grad.addColorStop(1, 'rgba(18, 194, 233, 0.2)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = '#c471ed';
            ctx.lineWidth = 2;
            ctx.shadowColor = 'rgba(196, 113, 237, 0.6)';
            ctx.shadowBlur = 10;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
        }

        // Flash overlay on impact/fusion
        if (flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
            ctx.fill();
        }

        // Draw Value Label (adapt font size to text length so labels like '⚫ VORTEX' fit nicely)
        ctx.shadowBlur = 0;
        if (label.length > 5) {
            ctx.font = '900 0.82rem Inter, sans-serif';
        } else if (label.length > 2) {
            ctx.font = '900 1.05rem Inter, sans-serif';
        } else {
            ctx.font = '900 1.25rem Inter, sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 1);

        ctx.restore();
    }

    function drawDarkMatterTile(x, y, w, h, hp, flash) {
        ctx.save();
        ctx.translate(x, y);

        const r = 10;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, r);
        ctx.fillStyle = '#161a29';
        ctx.fill();

        ctx.strokeStyle = hp > 1 ? '#3a445d' : '#e06c75';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cracks pattern if HP is 1
        if (hp === 1) {
            ctx.strokeStyle = '#e06c75';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, -h * 0.2);
            ctx.lineTo(0, 0);
            ctx.lineTo(w * 0.3, h * 0.2);
            ctx.moveTo(0, 0);
            ctx.lineTo(-w * 0.1, h * 0.3);
            ctx.stroke();
        }

        if (flash > 0) {
            ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
            ctx.fill();
        }

        ctx.fillStyle = '#7a889b';
        ctx.font = '800 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(hp > 1 ? 'DARK CORE' : 'CRACKED', 0, 0);

        ctx.restore();
    }

    function drawLauncher() {
        if (isGameOver) return;
        const col = aimCol;
        const centerX = boardOffsetX + col * cellW + cellW / 2;
        const centerY = cellH * 0.55;

        // Draw launcher cursor base
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.beginPath();
        ctx.roundRect(centerX - cellW * 0.45, centerY - cellH * 0.45, cellW * 0.9, cellH * 0.9, 14);
        ctx.fill();

        // Draw active orb in launcher if not currently flying
        if (!activeProjectile && currentOrb) {
            const flavor = getOrbFlavor(currentOrb);
            drawTileGraphic(centerX, centerY, cellW - 12, cellH - 12, currentOrb.label, flavor);
        }
        ctx.restore();
    }

    function drawActiveProjectile() {
        if (!activeProjectile) return;
        const p = activeProjectile;
        const flavor = getOrbFlavor(p.orb);
        drawTileGraphic(p.x, p.y, cellW - 10, cellH - 10, p.orb.label, flavor);
    }

    function drawEffects() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        // 1. Cross Laser Beams (Tier 3)
        for (const beam of laserBeams) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, beam.alpha);
            ctx.shadowColor = beam.color || '#00f2fe';
            ctx.shadowBlur = 24;

            if (beam.type === 'horizontal') {
                const by = boardOffsetY + beam.row * cellH + cellH / 2;
                ctx.fillStyle = beam.color || '#00f2fe';
                ctx.fillRect(0, by - beam.width / 2, w, beam.width);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, by - beam.width / 4, w, beam.width / 2);
            } else if (beam.type === 'vertical') {
                const bx = boardOffsetX + beam.col * cellW + cellW / 2;
                ctx.fillStyle = beam.color || '#00f2fe';
                ctx.fillRect(bx - beam.width / 2, boardOffsetY, beam.width, h - boardOffsetY);

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bx - beam.width / 4, boardOffsetY, beam.width / 2, h - boardOffsetY);
            }
            ctx.restore();
        }

        // 2. Shockwaves
        for (const sw of shockwaves) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = sw.color;
            ctx.shadowBlur = 15;
            ctx.stroke();
            ctx.restore();
        }

        // 3. Sparks
        for (const sp of particles) {
            ctx.save();
            ctx.fillStyle = sp.color;
            ctx.globalAlpha = sp.alpha;
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 4. Screen Flash (Tier 4 / 5)
        if (screenFlash > 0) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, screenFlash);
            ctx.fillStyle = screenFlashColor || '#ffffff';
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
        }
    }

    function drawFloatingTexts() {
        for (const ft of floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = `900 ${14 * (ft.scale || 1)}px Inter, sans-serif`;
            ctx.fillStyle = ft.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    function createSparks(x, y, color, count = 12) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2 + Math.random() * 3,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.03
            });
        }
    }

    function addFloatingText(text, x, y, color = '#ffffff', scale = 1) {
        floatingTexts.push({
            text: text,
            x: x,
            y: y,
            color: color,
            alpha: 1,
            scale: scale
        });
    }

    function triggerScreenShake(magnitude = 6) {
        screenShake = Math.max(screenShake, magnitude);
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Run Game
    init();
})();
