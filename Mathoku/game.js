/**
 * MATHOKU — Grid Weaver Game Engine
 * Tactile Swipe & Match Math Puzzle
 */

(function () {
    'use strict';

    // Board Dimensions
    const GRID_SIZE = 5; // 5x5 board (25 tiles)
    const MIN_CHAIN_LENGTH = 3; // Num -> Op -> Num minimum

    // DOM Elements
    const canvas = document.getElementById('mathoku-canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('board-container');

    const statScore = document.getElementById('stat-score');
    const statMoves = document.getElementById('stat-moves');
    const statBest = document.getElementById('stat-best');
    const statGoalLabel = document.getElementById('stat-goal-label');
    const bountyProgress = document.getElementById('bounty-progress');

    const targetCardEls = [
        document.getElementById('target-card-0'),
        document.getElementById('target-card-1'),
        document.getElementById('target-card-2')
    ];

    const equationPill = document.getElementById('equation-pill');
    const equationExpr = document.getElementById('equation-expr');

    const tabBounty = document.getElementById('tab-bounty');
    const tabDaily = document.getElementById('tab-daily');
    const tabZen = document.getElementById('tab-zen');

    const btnSound = document.getElementById('btn-sound');
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');

    const modalHelp = document.getElementById('modal-help');
    const modalWin = document.getElementById('modal-win');
    const btnNextLevel = document.getElementById('btn-next-level');

    // Audio Engine
    const audio = window.mathokuAudio;

    // Game State
    let currentMode = 'bounty'; // 'bounty', 'daily', 'zen'
    let level = 1;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('mathoku_highscore') || '0', 10);
    let movesLeft = 15;
    let targets = []; // [{ value: int, reward: int, completed: bool }]
    let solvedTargetsCount = 0;
    let longestChain = 0;

    // Board Grid [row][col]
    let board = [];

    // Swiping State
    let isDragging = false;
    let currentPath = []; // [{ row, col, type, val/op }]
    let pointerPos = { x: 0, y: 0 };
    let currentResult = null; // { value: int, isValid: bool, exprStr: string }
    let matchedTargetIndex = -1;

    // Visual Effects
    let particles = [];
    let floatingTexts = [];
    let tileAnims = []; // spawn/flash animations
    let dpr = window.devicePixelRatio || 1;
    let cellSize = 0;
    let boardPad = 14;

    // Color Palette
    const COLORS = {
        bg: '#0a0e17',
        numBg: 'rgba(0, 229, 255, 0.12)',
        numBorder: '#00e5ff',
        numText: '#ffffff',
        opBg: 'rgba(213, 0, 249, 0.14)',
        opBorder: '#d500f9',
        opText: '#ffffff',
        pathGlow: '#00e5ff',
        targetMatchGlow: '#ffd600',
        emerald: '#00e676',
        coral: '#ff5252'
    };

    // Operator definitions
    const OPERATORS = ['+', '-', '×', '÷'];

    // Polyfill roundRect for Canvas
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

    // Initialize Game
    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setupInputs();
        setupAudioUI();
        setupModals();

        statBest.textContent = highScore.toLocaleString();
        startMode('bounty');

        requestAnimationFrame(gameLoop);
    }

    function setupAudioUI() {
        btnSound.addEventListener('click', () => {
            audio.init();
            audio.muted = !audio.muted;
            iconSoundOn.style.display = audio.muted ? 'none' : 'block';
            iconSoundOff.style.display = audio.muted ? 'block' : 'none';
        });

        window.addEventListener('pointerdown', () => audio.init(), { once: true });
        window.addEventListener('keydown', () => audio.init(), { once: true });
    }

    function setupModals() {
        btnHelp.addEventListener('click', () => modalHelp.classList.add('visible'));
        btnCloseHelp.addEventListener('click', () => modalHelp.classList.remove('visible'));
        btnStart.addEventListener('click', () => modalHelp.classList.remove('visible'));

        btnReset.addEventListener('click', () => {
            startMode(currentMode);
        });

        btnNextLevel.addEventListener('click', () => {
            modalWin.classList.remove('visible');
            level++;
            startMode('bounty');
        });

        // Mode switchers
        tabBounty.addEventListener('click', () => switchMode('bounty'));
        tabDaily.addEventListener('click', () => switchMode('daily'));
        tabZen.addEventListener('click', () => switchMode('zen'));
    }

    function switchMode(newMode) {
        if (currentMode === newMode) return;
        currentMode = newMode;
        tabBounty.classList.toggle('active', newMode === 'bounty');
        tabDaily.classList.toggle('active', newMode === 'daily');
        tabZen.classList.toggle('active', newMode === 'zen');
        startMode(newMode);
    }

    function resizeCanvas() {
        const rect = container.getBoundingClientRect();
        dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        cellSize = (rect.width - boardPad * 2) / GRID_SIZE;
    }

    // Start New Game according to Mode
    function startMode(mode) {
        currentPath = [];
        isDragging = false;
        matchedTargetIndex = -1;
        currentResult = null;
        updateEquationPill();

        if (mode === 'bounty') {
            movesLeft = Math.max(10, 18 - level);
            statGoalLabel.textContent = 'Moves Left';
            statMoves.textContent = movesLeft;
        } else if (mode === 'daily') {
            movesLeft = 12;
            statGoalLabel.textContent = 'Daily Par';
            statMoves.textContent = movesLeft;
        } else {
            // Zen
            statGoalLabel.textContent = 'Zen Mode';
            statMoves.textContent = '∞';
        }

        generateBoard();
        generateGuaranteedTargets();
        updateHUD();
    }

    // Checkerboard Grid Generation
    function generateBoard() {
        board = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            const row = [];
            for (let c = 0; c < GRID_SIZE; c++) {
                const isNumber = (r + c) % 2 === 0;
                row.push(createTile(r, c, isNumber));
            }
            row.forEach(tile => tile.scale = 1);
            board.push(row);
        }
    }

    function createTile(r, c, isNumber) {
        if (isNumber) {
            // Numbers 1 to 9 (weighted towards 1-6 for pleasant chaining)
            const valPool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
            const val = valPool[Math.floor(Math.random() * valPool.length)];
            return {
                row: r,
                col: c,
                type: 'number',
                value: val,
                label: `${val}`,
                scale: 0.1, // for entrance animation
                flash: 0
            };
        } else {
            // Operators +, -, ×, ÷
            // + and - are slightly more frequent to prevent huge numbers too fast
            const opPool = ['+', '+', '-', '-', '×', '×', '÷'];
            const op = opPool[Math.floor(Math.random() * opPool.length)];
            return {
                row: r,
                col: c,
                type: 'operator',
                op: op,
                label: op,
                scale: 0.1,
                flash: 0
            };
        }
    }

    // Guarantee that target values are 100% reachable via DFS on the current board
    function generateGuaranteedTargets() {
        const foundValues = new Set();
        const candidates = [];

        // Run DFS walks from various number tiles to discover reachable equations
        for (let r = 0; r < GRID_SIZE; r += 2) {
            for (let c = 0; c < GRID_SIZE; c += 2) {
                dfsWalk(r, c, [board[r][c]], board[r][c].value, candidates, foundValues);
                if (candidates.length >= 20) break;
            }
            if (candidates.length >= 20) break;
        }

        // Sort candidates by length and value diversity
        candidates.sort((a, b) => a.val - b.val);

        // Pick 3 diverse targets: Easy (length 3), Medium (length 5), Hard (length 5 or 7)
        let easy = candidates.find(c => c.length === 3 && c.val > 0 && c.val <= 30) || candidates[0];
        let medium = candidates.find(c => c.length >= 5 && c.val > (easy ? easy.val : 10)) || candidates[Math.floor(candidates.length / 2)];
        let hard = candidates.find(c => c.length >= 5 && c.val > (medium ? medium.val : 20)) || candidates[candidates.length - 1];

        // Fallback defaults if board was very restrictive
        const target1 = easy ? easy.val : 12;
        const target2 = medium ? medium.val : 24;
        const target3 = hard ? hard.val : 36;

        targets = [
            { value: target1, reward: 300, completed: false },
            { value: target2, reward: 500, completed: false },
            { value: target3, reward: 800, completed: false }
        ];

        solvedTargetsCount = 0;
        updateTargetCards();
    }

    function dfsWalk(r, c, visited, currentVal, candidates, foundValues) {
        if (visited.length >= 7) return;

        // If at a valid number tile and chain length >= 3
        if (visited.length >= 3 && visited.length % 2 === 1) {
            if (currentVal > 0 && currentVal <= 100 && Number.isInteger(currentVal)) {
                if (!foundValues.has(currentVal)) {
                    foundValues.add(currentVal);
                    candidates.push({ val: currentVal, length: visited.length });
                }
            }
        }

        // Orthogonal neighbors
        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];

        for (let i = 0; i < 4; i++) {
            const nr = r + dr[i];
            const nc = c + dc[i];

            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                const nextTile = board[nr][nc];
                if (!visited.includes(nextTile)) {
                    if (visited.length % 2 === 1 && nextTile.type === 'operator') {
                        // Num -> Op
                        visited.push(nextTile);
                        dfsWalk(nr, nc, visited, currentVal, candidates, foundValues);
                        visited.pop();
                    } else if (visited.length % 2 === 0 && nextTile.type === 'number') {
                        // Op -> Num
                        const lastOp = visited[visited.length - 1].op;
                        let nextVal = currentVal;
                        let valid = true;

                        if (lastOp === '+') nextVal += nextTile.value;
                        else if (lastOp === '-') nextVal -= nextTile.value;
                        else if (lastOp === '×') nextVal *= nextTile.value;
                        else if (lastOp === '÷') {
                            if (nextTile.value !== 0 && currentVal % nextTile.value === 0) {
                                nextVal = Math.floor(currentVal / nextTile.value);
                            } else {
                                valid = false;
                            }
                        }

                        if (valid && nextVal >= 0 && nextVal <= 200) {
                            visited.push(nextTile);
                            dfsWalk(nr, nc, visited, nextVal, candidates, foundValues);
                            visited.pop();
                        }
                    }
                }
            }
        }
    }

    function updateTargetCards() {
        targets.forEach((tgt, idx) => {
            const card = targetCardEls[idx];
            if (!card) return;

            const valEl = card.querySelector('.val');
            valEl.textContent = tgt.value;

            card.classList.toggle('completed', tgt.completed);
            card.classList.toggle('active-match', idx === matchedTargetIndex);
        });

        bountyProgress.textContent = `${solvedTargetsCount} / ${targets.length} Solved`;
    }

    function updateHUD() {
        statScore.textContent = score.toLocaleString();
        if (currentMode === 'bounty' || currentMode === 'daily') {
            statMoves.textContent = movesLeft;
        } else {
            statMoves.textContent = '∞';
        }
    }

    // Input Handling (Unified Pointer Events)
    function setupInputs() {
        canvas.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
    }

    function getGridCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        const c = Math.floor((px - boardPad) / cellSize);
        const r = Math.floor((py - boardPad) / cellSize);

        return { r, c, px, py };
    }

    function handlePointerDown(e) {
        audio.init();
        const { r, c, px, py } = getGridCoords(e);
        pointerPos = { x: px, y: py };

        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const tile = board[r][c];
            // Must begin on a NUMBER tile!
            if (tile.type === 'number') {
                isDragging = true;
                currentPath = [tile];
                tile.scale = 1.25;
                audio.playStep(0);
                evaluateCurrentPath();
            }
        }
    }

    function handlePointerMove(e) {
        if (!isDragging) return;

        const { r, c, px, py } = getGridCoords(e);
        pointerPos = { x: px, y: py };

        if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            const tile = board[r][c];
            const lastTile = currentPath[currentPath.length - 1];

            // 1. Backtracking Support!
            if (currentPath.length >= 2 && tile === currentPath[currentPath.length - 2]) {
                const popped = currentPath.pop();
                popped.scale = 1.0;
                audio.playBacktrack();
                evaluateCurrentPath();
                return;
            }

            // 2. Ignore if already in path
            if (currentPath.includes(tile)) return;

            // 3. Must be strictly orthogonal neighbor
            const dist = Math.abs(r - lastTile.row) + Math.abs(c - lastTile.col);
            if (dist === 1) {
                // Must alternate types! (Num -> Op, Op -> Num)
                if (lastTile.type === 'number' && tile.type === 'operator') {
                    currentPath.push(tile);
                    tile.scale = 1.25;
                    audio.playStep(currentPath.length - 1);
                    evaluateCurrentPath();
                } else if (lastTile.type === 'operator' && tile.type === 'number') {
                    // Test if division is clean before allowing swipe
                    if (lastTile.op === '÷') {
                        const tempVal = currentResult ? currentResult.value : 0;
                        if (tile.value === 0 || tempVal % tile.value !== 0) {
                            audio.playInvalid();
                            addFloatingText('Must divide cleanly!', px, py, COLORS.coral);
                            return;
                        }
                    }

                    currentPath.push(tile);
                    tile.scale = 1.25;
                    audio.playStep(currentPath.length - 1);
                    evaluateCurrentPath();
                }
            }
        }
    }

    function handlePointerUp() {
        if (!isDragging) return;
        isDragging = false;

        // Path must be at least 3 tiles and end on a Number tile to be an equation
        if (currentPath.length >= MIN_CHAIN_LENGTH && currentPath.length % 2 === 1 && currentResult && currentResult.isValid) {
            commitPath();
        } else {
            // Cancel path
            currentPath.forEach(t => t.scale = 1.0);
            currentPath = [];
            currentResult = null;
            matchedTargetIndex = -1;
            updateEquationPill();
            updateTargetCards();
        }
    }

    // Real-time Path Calculation (Left-to-Right chaining)
    function evaluateCurrentPath() {
        if (currentPath.length === 0) {
            currentResult = null;
            matchedTargetIndex = -1;
            updateEquationPill();
            updateTargetCards();
            return;
        }

        let exprStr = `${currentPath[0].value}`;
        let val = currentPath[0].value;
        let isValid = true;

        for (let i = 1; i < currentPath.length; i += 2) {
            const opTile = currentPath[i];
            const numTile = currentPath[i + 1];

            if (!numTile) {
                // Trailing operator: e.g. "5 +"
                exprStr += ` ${opTile.op} ...`;
                isValid = false;
                break;
            }

            const op = opTile.op;
            const nextNum = numTile.value;

            if (op === '+') val += nextNum;
            else if (op === '-') val -= nextNum;
            else if (op === '×') val *= nextNum;
            else if (op === '÷') {
                if (nextNum !== 0 && val % nextNum === 0) {
                    val = Math.floor(val / nextNum);
                } else {
                    isValid = false;
                }
            }

            exprStr += ` ${op} ${nextNum}`;
        }

        if (isValid && currentPath.length >= MIN_CHAIN_LENGTH) {
            exprStr += ` = ${val}`;
        }

        currentResult = {
            value: val,
            isValid: isValid && currentPath.length >= MIN_CHAIN_LENGTH,
            exprStr: exprStr
        };

        // Check if matches any active target bounty
        matchedTargetIndex = -1;
        if (currentResult.isValid) {
            targets.forEach((tgt, idx) => {
                if (!tgt.completed && tgt.value === val) {
                    matchedTargetIndex = idx;
                }
            });

            if (matchedTargetIndex >= 0) {
                audio.playTargetReached();
            }
        }

        updateEquationPill();
        updateTargetCards();
    }

    function updateEquationPill() {
        if (!currentResult || currentPath.length === 0) {
            equationExpr.textContent = 'Trace a path to begin';
            equationPill.classList.remove('match-target');
            return;
        }

        equationExpr.innerHTML = currentResult.exprStr;
        if (matchedTargetIndex >= 0) {
            equationPill.classList.add('match-target');
            equationExpr.innerHTML = `${currentResult.exprStr} <span class="val-highlight">🎯 TARGET MATCH!</span>`;
        } else {
            equationPill.classList.remove('match-target');
        }
    }

    // Commit Solved Path
    function commitPath() {
        const chainLength = currentPath.length;
        if (chainLength > longestChain) longestChain = chainLength;

        const val = currentResult.value;
        const isBountyMatch = matchedTargetIndex >= 0;

        audio.playClear();

        // Calculate points
        let earnedPoints = chainLength * 50;
        if (isBountyMatch) {
            const bounty = targets[matchedTargetIndex];
            bounty.completed = true;
            solvedTargetsCount++;
            earnedPoints += bounty.reward * chainLength;

            addFloatingText(`🎯 TARGET CRACKED! +${earnedPoints}`, canvas.width / (2 * dpr), boardPad + cellSize * 2, COLORS.targetMatchGlow, 1.4);
        } else {
            addFloatingText(`+${earnedPoints}`, pointerPos.x, pointerPos.y, COLORS.primaryCyan, 1.1);
        }

        addScore(earnedPoints);

        // Explode tiles and refill
        currentPath.forEach(tile => {
            const cx = boardPad + tile.col * cellSize + cellSize / 2;
            const cy = boardPad + tile.row * cellSize + cellSize / 2;
            createTileSparks(cx, cy, tile.type === 'number' ? COLORS.primaryCyan : COLORS.opBorder);

            // Refill tile with new content preserving Number/Operator parity!
            const newTile = createTile(tile.row, tile.col, tile.type === 'number');
            board[tile.row][tile.col] = newTile;
        });

        currentPath = [];
        currentResult = null;
        matchedTargetIndex = -1;

        if (currentMode === 'bounty' || currentMode === 'daily') {
            movesLeft--;
            updateHUD();

            // Check Win Condition
            if (solvedTargetsCount >= targets.length) {
                triggerWin();
                return;
            }

            // Check Out of Moves
            if (movesLeft <= 0) {
                audio.playInvalid();
                addFloatingText('OUT OF MOVES!', canvas.width / (2 * dpr), canvas.height / (2 * dpr), COLORS.coral, 1.5);
                setTimeout(() => {
                    startMode(currentMode);
                }, 1400);
                return;
            }
        }

        // If in Zen mode and target was hit, refresh that target
        if (currentMode === 'zen' && isBountyMatch) {
            generateGuaranteedTargets();
        }

        updateTargetCards();
        updateEquationPill();
    }

    function triggerWin() {
        audio.playWin();
        document.getElementById('win-score').textContent = score.toLocaleString();
        document.getElementById('win-longest').textContent = `${longestChain} Tiles`;
        modalWin.classList.add('visible');
    }

    function addScore(pts) {
        score += pts;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('mathoku_highscore', highScore.toString());
            statBest.textContent = highScore.toLocaleString();
        }
        statScore.textContent = score.toLocaleString();
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
        // Tile bounce / spawn animation
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const t = board[r][c];
                if (t.scale < 1.0) {
                    t.scale += (1.0 - t.scale) * 12 * dt;
                }
            }
        }

        // Sparks update
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx * dt * 60;
            p.y += p.vy * dt * 60;
            p.alpha -= p.decay * dt * 60;
            if (p.alpha <= 0) particles.splice(i, 1);
        }

        // Floating texts update
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y -= 25 * dt;
            ft.alpha -= 1.1 * dt;
            if (ft.alpha <= 0) floatingTexts.splice(i, 1);
        }
    }

    // Render Canvas Scene
    function render() {
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        ctx.clearRect(0, 0, w, h);

        // 1. Draw Grid Tiles
        drawTiles();

        // 2. Draw Active Swiping Ribbon
        drawSwipingRibbon();

        // 3. Draw Sparks & Effects
        drawEffects();

        // 4. Draw Floating Texts
        drawFloatingTexts();
    }

    function drawTiles() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const tile = board[r][c];
                const cx = boardPad + c * cellSize + cellSize / 2;
                const cy = boardPad + r * cellSize + cellSize / 2;
                const size = (cellSize - 8) * tile.scale;

                const isSelected = currentPath.includes(tile);

                ctx.save();
                ctx.translate(cx, cy);

                if (tile.type === 'number') {
                    // Number Tile: Sleek rounded rectangle
                    const rad = 14;
                    ctx.beginPath();
                    ctx.roundRect(-size / 2, -size / 2, size, size, rad);

                    if (isSelected) {
                        ctx.fillStyle = matchedTargetIndex >= 0 ? 'rgba(255, 214, 0, 0.35)' : 'rgba(0, 229, 255, 0.35)';
                        ctx.fill();

                        ctx.strokeStyle = matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : COLORS.primaryCyan;
                        ctx.lineWidth = 2.5;
                        ctx.shadowColor = matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : COLORS.primaryCyan;
                        ctx.shadowBlur = 14;
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = COLORS.numBg;
                        ctx.fill();

                        ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }

                    // Label
                    ctx.shadowBlur = 0;
                    ctx.font = '900 1.35rem Inter, sans-serif';
                    ctx.fillStyle = isSelected && matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : COLORS.numText;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tile.label, 0, 1);

                } else {
                    // Operator Tile: Elegant circular disc
                    const radius = size * 0.45;
                    ctx.beginPath();
                    ctx.arc(0, 0, radius, 0, Math.PI * 2);

                    if (isSelected) {
                        ctx.fillStyle = matchedTargetIndex >= 0 ? 'rgba(255, 214, 0, 0.35)' : 'rgba(213, 0, 249, 0.35)';
                        ctx.fill();

                        ctx.strokeStyle = matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : COLORS.opBorder;
                        ctx.lineWidth = 2.5;
                        ctx.shadowColor = matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : COLORS.opBorder;
                        ctx.shadowBlur = 14;
                        ctx.stroke();
                    } else {
                        ctx.fillStyle = COLORS.opBg;
                        ctx.fill();

                        ctx.strokeStyle = 'rgba(213, 0, 249, 0.45)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                    }

                    // Operator Glyphs
                    ctx.shadowBlur = 0;
                    ctx.font = '900 1.3rem Inter, sans-serif';
                    ctx.fillStyle = isSelected && matchedTargetIndex >= 0 ? COLORS.targetMatchGlow : '#f0f4fc';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(tile.label, 0, 0);
                }

                ctx.restore();
            }
        }
    }

    function drawSwipingRibbon() {
        if (currentPath.length === 0) return;

        const isMatch = matchedTargetIndex >= 0;
        const ribbonColor = isMatch ? COLORS.targetMatchGlow : COLORS.primaryCyan;

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Ribbon Outer Glow
        ctx.strokeStyle = ribbonColor;
        ctx.lineWidth = 8;
        ctx.shadowColor = ribbonColor;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        const startX = boardPad + currentPath[0].col * cellSize + cellSize / 2;
        const startY = boardPad + currentPath[0].row * cellSize + cellSize / 2;
        ctx.moveTo(startX, startY);

        for (let i = 1; i < currentPath.length; i++) {
            const px = boardPad + currentPath[i].col * cellSize + cellSize / 2;
            const py = boardPad + currentPath[i].row * cellSize + cellSize / 2;
            ctx.lineTo(px, py);
        }

        // Connect to current trailing cursor/finger if dragging
        if (isDragging) {
            ctx.lineTo(pointerPos.x, pointerPos.y);
        }
        ctx.stroke();

        // Ribbon Inner White Core Line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // Floating cursor node
        if (isDragging) {
            ctx.beginPath();
            ctx.arc(pointerPos.x, pointerPos.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = ribbonColor;
            ctx.shadowColor = ribbonColor;
            ctx.shadowBlur = 10;
            ctx.fill();
        }

        ctx.restore();
    }

    function drawEffects() {
        for (const p of particles) {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    function drawFloatingTexts() {
        for (const ft of floatingTexts) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, ft.alpha);
            ctx.font = `900 ${15 * (ft.scale || 1)}px Inter, sans-serif`;
            ctx.fillStyle = ft.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }
    }

    function createTileSparks(x, y, color) {
        for (let i = 0; i < 14; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 5;
            particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 2.5 + Math.random() * 2.5,
                color: color,
                alpha: 1,
                decay: 0.02 + Math.random() * 0.025
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

    // Run Engine
    init();
})();
