/**
 * FACTORIA: The Math Deckbuilder — Rogue-lite Game Engine
 * Balatro meets Slay the Spire meets Arithmetic Engine.
 */

(function () {
    'use strict';

    // Audio helper
    const sfx = window.factoriaAudio;

    // Primes, Fibonaccis, and Squares lookup sets
    const PRIMES = new Set([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]);
    const FIBONACCI = new Set([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]);
    const SQUARES = new Set([1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196, 225]);

    // =========================================================================
    // RELIC CATALOG (Engine Modules)
    // =========================================================================
    const RELIC_CATALOG = [
        {
            id: 'even_steven',
            name: 'Even-Steven',
            icon: '⚖️',
            desc: 'Every even number played grants +4 Mult.',
            price: 6,
            rarity: 'common',
            evaluate: (ctx) => {
                const evens = ctx.numbers.filter(c => c.value % 2 === 0);
                if (evens.length > 0) {
                    const bonus = evens.length * 4;
                    ctx.mult += bonus;
                    return `+${bonus} Mult (${evens.length} Evens)`;
                }
                return null;
            }
        },
        {
            id: 'odd_ball',
            name: 'Odd-Ball',
            icon: '🎲',
            desc: 'Every odd number played grants +30 Chips.',
            price: 5,
            rarity: 'common',
            evaluate: (ctx) => {
                const odds = ctx.numbers.filter(c => c.value % 2 !== 0);
                if (odds.length > 0) {
                    const bonus = odds.length * 30;
                    ctx.chips += bonus;
                    return `+${bonus} Chips (${odds.length} Odds)`;
                }
                return null;
            }
        },
        {
            id: 'prime_catalyst',
            name: 'Prime Catalyst',
            icon: '⚡',
            desc: 'Every Prime number played grants +12 Mult.',
            price: 7,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                const primes = ctx.numbers.filter(c => PRIMES.has(c.value));
                if (primes.length > 0) {
                    const bonus = primes.length * 12;
                    ctx.mult += bonus;
                    return `+${bonus} Mult (${primes.length} Primes!)`;
                }
                return null;
            }
        },
        {
            id: 'clean_division',
            name: 'Clean Division',
            icon: '✂️',
            desc: 'If equation contains division (÷) with remainder 0, gain ×2.5 Mult.',
            price: 8,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                const hasDiv = ctx.operators.some(op => op.symbol === '÷');
                if (hasDiv && ctx.cleanDivision) {
                    ctx.xMult *= 2.5;
                    return '×2.5 Mult (Clean Div!)';
                }
                return null;
            }
        },
        {
            id: 'fibonacci_surge',
            name: 'Fibonacci Surge',
            icon: '🌀',
            desc: 'If final equation result is a Fibonacci number, gain ×3 Mult.',
            price: 9,
            rarity: 'rare',
            evaluate: (ctx) => {
                if (FIBONACCI.has(Math.round(ctx.result))) {
                    ctx.xMult *= 3.0;
                    return '×3 Mult (Fibonacci Resonance!)';
                }
                return null;
            }
        },
        {
            id: 'square_deal',
            name: 'Square Deal',
            icon: '🟦',
            desc: 'Square numbers (4, 9, 16, 25...) grant +60 Chips each.',
            price: 6,
            rarity: 'common',
            evaluate: (ctx) => {
                const squares = ctx.numbers.filter(c => SQUARES.has(c.value));
                if (squares.length > 0) {
                    const bonus = squares.length * 60;
                    ctx.chips += bonus;
                    return `+${bonus} Chips (${squares.length} Squares)`;
                }
                return null;
            }
        },
        {
            id: 'multiplication_station',
            name: 'Multiply Core',
            icon: '✖️',
            desc: 'Each [×] operator card used grants +8 Mult.',
            price: 6,
            rarity: 'common',
            evaluate: (ctx) => {
                const muls = ctx.operators.filter(op => op.symbol === '×');
                if (muls.length > 0) {
                    const bonus = muls.length * 8;
                    ctx.mult += bonus;
                    return `+${bonus} Mult (${muls.length} ×)`;
                }
                return null;
            }
        },
        {
            id: 'addition_dynamo',
            name: 'Addition Dynamo',
            icon: '➕',
            desc: 'Each [+] operator card used adds +45 Chips.',
            price: 5,
            rarity: 'common',
            evaluate: (ctx) => {
                const adds = ctx.operators.filter(op => op.symbol === '+');
                if (adds.length > 0) {
                    const bonus = adds.length * 45;
                    ctx.chips += bonus;
                    return `+${bonus} Chips (${adds.length} +)`;
                }
                return null;
            }
        },
        {
            id: 'the_golden_ratio',
            name: 'Golden Ratio',
            icon: '📐',
            desc: 'Equations with exactly 5 cards grant +12 Mult and +50 Chips.',
            price: 7,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                if (ctx.stagedCount === 5) {
                    ctx.mult += 12;
                    ctx.chips += 50;
                    return '+12 Mult & +50 Chips (Exact 5!)';
                }
                return null;
            }
        },
        {
            id: 'lucky_seven',
            name: 'Lucky Seven',
            icon: '🎰',
            desc: 'If digit 7 appears in any played card or result, +77 Chips & +7 Mult.',
            price: 7,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                const hasSeven = ctx.cards.some(c => String(c.value).includes('7')) || String(ctx.result).includes('7');
                if (hasSeven) {
                    ctx.chips += 77;
                    ctx.mult += 7;
                    return '+77 Chips & +7 Mult (Lucky 7!)';
                }
                return null;
            }
        },
        {
            id: 'high_roller',
            name: 'High Roller',
            icon: '💎',
            desc: 'Numbers with value ≥ 10 grant +50 Chips each.',
            price: 6,
            rarity: 'common',
            evaluate: (ctx) => {
                const highs = ctx.numbers.filter(c => c.value >= 10);
                if (highs.length > 0) {
                    const bonus = highs.length * 50;
                    ctx.chips += bonus;
                    return `+${bonus} Chips (${highs.length} Highs)`;
                }
                return null;
            }
        },
        {
            id: 'minimalist',
            name: 'Minimalist',
            icon: '⚡',
            desc: 'Equations with 3 cards or fewer gain ×2.0 Mult.',
            price: 7,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                if (ctx.stagedCount <= 3) {
                    ctx.xMult *= 2.0;
                    return '×2.0 Mult (Minimalist)';
                }
                return null;
            }
        },
        {
            id: 'maximalist',
            name: 'Maximalist',
            icon: '🚂',
            desc: 'Equations with 7 cards or more gain +120 Chips and +15 Mult.',
            price: 8,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                if (ctx.stagedCount >= 7) {
                    ctx.chips += 120;
                    ctx.mult += 15;
                    return '+120 Chips & +15 Mult (Maximalist!)';
                }
                return null;
            }
        },
        {
            id: 'zero_resonator',
            name: 'Zero Resonator',
            icon: '⭕',
            desc: 'If final result ends in 0 (multiple of 10), gain +100 Chips & +8 Mult.',
            price: 7,
            rarity: 'uncommon',
            evaluate: (ctx) => {
                if (ctx.result !== 0 && Math.round(ctx.result) % 10 === 0) {
                    ctx.chips += 100;
                    ctx.mult += 8;
                    return '+100 Chips & +8 Mult (Zero Base!)';
                }
                return null;
            }
        },
        {
            id: 'centurion',
            name: 'Centurion',
            icon: '💯',
            desc: 'If final result is ≥ 100, gain ×2.5 Mult.',
            price: 8,
            rarity: 'rare',
            evaluate: (ctx) => {
                if (ctx.result >= 100) {
                    ctx.xMult *= 2.5;
                    return '×2.5 Mult (Century Strike!)';
                }
                return null;
            }
        },
        {
            id: 'overclocked_cpu',
            name: 'Overclocked CPU',
            icon: '🔋',
            desc: 'Start every Vault with +1 Hand.',
            price: 8,
            rarity: 'rare',
            onRoundStart: (state) => {
                state.maxHands++;
                state.hands++;
            }
        },
        {
            id: 'recycle_bin',
            name: 'Recycle Bin',
            icon: '♻️',
            desc: 'Start every Vault with +2 Discards.',
            price: 6,
            rarity: 'uncommon',
            onRoundStart: (state) => {
                state.maxDiscards += 2;
                state.discards += 2;
            }
        },
        {
            id: 'compound_interest',
            name: 'Interest Token',
            icon: '🏦',
            desc: 'Earn $1 extra per $5 saved at the end of each Vault (up to +$5).',
            price: 6,
            rarity: 'common',
            onRoundEnd: (state) => {
                const interest = Math.min(5, Math.floor(state.cash / 5));
                if (interest > 0) {
                    state.cash += interest;
                    return `+$${interest} Interest`;
                }
                return null;
            }
        },
        {
            id: 'omni_subtractor',
            name: 'Inversion Drive',
            icon: '🔄',
            desc: 'All [-] subtractions add their value to Chips instead of reducing.',
            price: 8,
            rarity: 'rare',
            evaluate: (ctx) => {
                const subs = ctx.operators.filter(op => op.symbol === '-');
                if (subs.length > 0) {
                    ctx.chips += 60 * subs.length;
                    return `+${60 * subs.length} Chips (Inversion Drive)`;
                }
                return null;
            }
        },
        {
            id: 'bounty_hunter',
            name: 'Bounty License',
            icon: '🎖️',
            desc: 'Defeating Boss Vaults awards +$8 bonus bounty.',
            price: 6,
            rarity: 'uncommon'
        }
    ];

    // =========================================================================
    // BOSS PROTOCOLS (Boss Vault Debuffs)
    // =========================================================================
    const BOSS_PROTOCOLS = [
        {
            id: 'prime_siphon',
            name: 'The Prime Siphon',
            desc: 'Prime numbers score 0 chips.',
            checkCard: (card) => {
                if (card.type === 'number' && PRIMES.has(card.value)) {
                    return { zeroChips: true };
                }
                return null;
            }
        },
        {
            id: 'odd_tax',
            name: 'The Odd Tax',
            desc: 'Odd numbers grant 0 Mult.',
            checkCard: (card) => {
                if (card.type === 'number' && card.value % 2 !== 0) {
                    return { zeroMult: true };
                }
                return null;
            }
        },
        {
            id: 'short_circuit',
            name: 'Short Circuit Grid',
            desc: 'Max 4 cards allowed in any equation.',
            maxCards: 4
        },
        {
            id: 'the_monolith',
            name: 'The Monolith Core',
            desc: 'Target score is increased by 40%.',
            targetMult: 1.4
        },
        {
            id: 'division_blind',
            name: 'Division Blind',
            desc: 'Division [÷] operators are disabled.',
            forbidOp: '÷'
        }
    ];

    // =========================================================================
    // GAME STATE
    // =========================================================================
    let state = {
        sector: 1,
        vaultIndex: 0, // 0 = Low, 1 = High, 2 = Boss
        cash: 10,
        score: 0,
        highScore: parseInt(localStorage.getItem('factoria_highscore') || '0', 10),
        currentVaultScore: 0,
        targetScore: 300,
        vaultBounty: 5,
        hands: 4,
        maxHands: 4,
        discards: 3,
        maxDiscards: 3,
        currentBoss: null,
        relics: [], // max 5
        deck: [],
        drawPile: [],
        discardPile: [],
        hand: [],
        handSize: 8,
        staged: [],
        selectedForDiscard: new Set(),
        isEvaluating: false,
        shopRerollCost: 5,
        totalSectorsCleared: 0
    };

    // DOM Elements
    const sectorVal = document.getElementById('sector-val');
    const vaultTypeVal = document.getElementById('vault-type-val');
    const cashVal = document.getElementById('cash-val');
    const deckCount = document.getElementById('deck-count');
    const vaultTierTitle = document.getElementById('vault-tier-title');
    const vaultName = document.getElementById('vault-name');
    const vaultBountyVal = document.getElementById('vault-bounty-val');
    const bossAlert = document.getElementById('boss-alert');
    const bossAlertText = document.getElementById('boss-alert-text');
    const currentScoreVal = document.getElementById('current-score-val');
    const targetScoreVal = document.getElementById('target-score-val');
    const vaultProgressFill = document.getElementById('vault-progress-fill');
    const handsVal = document.getElementById('hands-val');
    const handsPips = document.getElementById('hands-pips');
    const discardsVal = document.getElementById('discards-val');
    const discardsPips = document.getElementById('discards-pips');
    const activeRelicsCount = document.getElementById('active-relics-count');
    const relicsTray = document.getElementById('relics-tray');
    const formulaPill = document.getElementById('formula-pill');
    const equationRail = document.getElementById('equation-rail');
    const bdChips = document.getElementById('bd-chips');
    const bdMult = document.getElementById('bd-mult');
    const bdTotal = document.getElementById('bd-total');
    const cardsHand = document.getElementById('cards-hand');
    const btnDiscard = document.getElementById('btn-discard');
    const discardCountBadge = document.getElementById('discard-count-badge');
    const btnSubmit = document.getElementById('btn-submit');
    const btnClearStaged = document.getElementById('btn-clear-staged');

    // Modals
    const modalShop = document.getElementById('modal-shop');
    const shopCashVal = document.getElementById('shop-cash-val');
    const shopRelicsList = document.getElementById('shop-relics-list');
    const shopBoostersList = document.getElementById('shop-boosters-list');
    const btnShopReroll = document.getElementById('btn-shop-reroll');
    const rerollCost = document.getElementById('reroll-cost');
    const btnNextVault = document.getElementById('btn-next-vault');

    const modalBooster = document.getElementById('modal-booster');
    const boosterModalTitle = document.getElementById('booster-modal-title');
    const boosterModalDesc = document.getElementById('booster-modal-desc');
    const boosterCardsRow = document.getElementById('booster-cards-row');
    const btnSkipBooster = document.getElementById('btn-skip-booster');

    const modalDeck = document.getElementById('modal-deck');
    const inspectDeckCount = document.getElementById('inspect-deck-count');
    const deckStatsSummary = document.getElementById('deck-stats-summary');
    const deckCardsGrid = document.getElementById('deck-cards-grid');
    const btnCloseDeck = document.getElementById('btn-close-deck');
    const btnDeck = document.getElementById('btn-deck');

    const modalHelp = document.getElementById('modal-help');
    const btnHelp = document.getElementById('btn-help');
    const btnCloseHelp = document.getElementById('btn-close-help');
    const btnStartPlaying = document.getElementById('btn-start-playing');

    const modalGameover = document.getElementById('modal-gameover');
    const goScoreVal = document.getElementById('go-score-val');
    const goBestVal = document.getElementById('go-best-val');
    const goSectorsVal = document.getElementById('go-sectors-val');
    const btnTryAgain = document.getElementById('btn-try-again');

    const btnSound = document.getElementById('btn-sound');
    const soundIcon = document.getElementById('sound-icon');
    const btnRestart = document.getElementById('btn-restart');
    const tooltip = document.getElementById('card-tooltip');

    // =========================================================================
    // INITIALIZATION & NEW RUN
    // =========================================================================
    function init() {
        setupEventListeners();
        startNewRun();
    }

    function startNewRun() {
        state.sector = 1;
        state.vaultIndex = 0;
        state.cash = 10;
        state.score = 0;
        state.totalSectorsCleared = 0;
        state.relics = [];
        state.deck = createStarterDeck();
        state.handSize = 8;
        state.selectedForDiscard.clear();
        state.staged = [];

        modalGameover.style.display = 'none';
        modalShop.style.display = 'none';
        modalBooster.style.display = 'none';
        modalDeck.style.display = 'none';

        initVault();
    }

    function createStarterDeck() {
        const deck = [];
        let idCounter = 1;

        // 16 Starting Number Cards
        const starterNumbers = [1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8, 9, 10, 12, 15];
        starterNumbers.forEach(val => {
            deck.push(createNumberCard(idCounter++, val));
        });

        // 8 Starting Operator Cards
        const starterOperators = ['+', '+', '+', '-', '-', '×', '×', '÷'];
        starterOperators.forEach(sym => {
            deck.push(createOperatorCard(idCounter++, sym));
        });

        return deck;
    }

    function createNumberCard(id, val, foil = null) {
        return {
            id: `card_${id}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'number',
            value: val,
            foil: foil // null, 'foil' (+50 chips), 'holo' (+10 mult), 'polychrome' (x1.5 mult)
        };
    }

    function createOperatorCard(id, symbol, foil = null) {
        return {
            id: `op_${id}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'operator',
            symbol: symbol,
            foil: foil
        };
    }

    // =========================================================================
    // VAULT PROGRESSION & GENERATION
    // =========================================================================
    function initVault() {
        state.currentVaultScore = 0;
        state.maxHands = 4;
        state.hands = 4;
        state.maxDiscards = 3;
        state.discards = 3;
        state.staged = [];
        state.selectedForDiscard.clear();

        // Check Relics that grant start of round bonuses (e.g. Overclocked CPU, Recycle Bin)
        state.relics.forEach(relic => {
            if (relic.onRoundStart) relic.onRoundStart(state);
        });

        const s = state.sector;
        const v = state.vaultIndex; // 0=Low, 1=High, 2=Boss

        // Calculate Target Score scaling
        const base = 250 * Math.pow(1.65, s - 1);
        if (v === 0) {
            state.targetScore = Math.round(base);
            state.vaultBounty = 4 + s;
            state.currentBoss = null;
        } else if (v === 1) {
            state.targetScore = Math.round(base * 1.8);
            state.vaultBounty = 6 + s;
            state.currentBoss = null;
        } else {
            // Boss Vault
            state.targetScore = Math.round(base * 3.2);
            state.vaultBounty = 9 + s * 2;
            // Pick a Boss Protocol
            const boss = BOSS_PROTOCOLS[(s - 1) % BOSS_PROTOCOLS.length];
            state.currentBoss = boss;
            if (boss.targetMult) {
                state.targetScore = Math.round(state.targetScore * boss.targetMult);
            }
            sfx.playBossAlarm();
        }

        // Shuffle deck into draw pile
        state.drawPile = shuffleArray([...state.deck]);
        state.discardPile = [];
        state.hand = [];

        // Draw initial hand
        drawCards(state.handSize);

        updateHUD();
        renderHand();
        renderStagedRail();
        renderRelicsTray();
    }

    function drawCards(count) {
        for (let i = 0; i < count; i++) {
            if (state.drawPile.length === 0) {
                if (state.discardPile.length === 0) break; // no cards left anywhere
                state.drawPile = shuffleArray([...state.discardPile]);
                state.discardPile = [];
                sfx.playDiscard();
            }
            const card = state.drawPile.pop();
            state.hand.push(card);
            sfx.playCardDraw();
        }
    }

    // =========================================================================
    // EQUATION EVALUATION & MATH PARSER
    // =========================================================================
    function parseAndEvaluateEquation(cards) {
        if (!cards || cards.length === 0) {
            return { isValid: false, errorMsg: 'Assembly rail is empty' };
        }

        // Must start and end with a number
        if (cards[0].type !== 'number') {
            return { isValid: false, errorMsg: 'Equation must start with a number' };
        }
        if (cards[cards.length - 1].type !== 'number') {
            return { isValid: false, errorMsg: 'Equation must end with a number' };
        }

        // Check alternating tokens (Number -> Operator -> Number -> Operator...)
        for (let i = 0; i < cards.length; i++) {
            const expected = i % 2 === 0 ? 'number' : 'operator';
            if (cards[i].type !== expected) {
                return { isValid: false, errorMsg: 'Numbers and operators must alternate' };
            }
        }

        // Check Boss restrictions
        if (state.currentBoss) {
            if (state.currentBoss.maxCards && cards.length > state.currentBoss.maxCards) {
                return { isValid: false, errorMsg: `Boss Rule: Max ${state.currentBoss.maxCards} cards allowed` };
            }
            if (state.currentBoss.forbidOp) {
                if (cards.some(c => c.symbol === state.currentBoss.forbidOp)) {
                    return { isValid: false, errorMsg: `Boss Rule: [${state.currentBoss.forbidOp}] is disabled!` };
                }
            }
        }

        // Mathematical Evaluation with PEMDAS
        // Tokens: numbers and operator symbols
        const tokens = cards.map(c => c.type === 'number' ? c.value : c.symbol);

        // If Boss Nullifier is active, replace '+' with '-'
        if (state.currentBoss && state.currentBoss.id === 'nullifier') {
            for (let i = 1; i < tokens.length; i += 2) {
                if (tokens[i] === '+') tokens[i] = '-';
            }
        }

        let cleanDivision = true;
        let hadNegative = false;

        // Step 1: Evaluate Powers (^)
        let pass1 = [];
        let i = 0;
        while (i < tokens.length) {
            if (tokens[i + 1] === '^') {
                const base = tokens[i];
                const exp = Math.min(6, Math.max(0, tokens[i + 2]));
                const val = Math.pow(base, exp);
                tokens[i + 2] = val;
                i += 2;
            } else {
                pass1.push(tokens[i]);
                i++;
            }
        }

        // Step 2: Evaluate Multiplication (×) and Division (÷)
        let pass2 = [];
        i = 0;
        while (i < pass1.length) {
            const op = pass1[i + 1];
            if (op === '×') {
                const a = pass1[i];
                const b = pass1[i + 2];
                pass1[i + 2] = a * b;
                i += 2;
            } else if (op === '÷') {
                const a = pass1[i];
                const b = pass1[i + 2];
                if (b === 0) {
                    return { isValid: false, errorMsg: 'Division by zero is impossible' };
                }
                if (a % b !== 0) cleanDivision = false;
                pass1[i + 2] = Math.floor(a / b);
                i += 2;
            } else {
                pass2.push(pass1[i]);
                i++;
            }
        }

        // Step 3: Evaluate Addition (+) and Subtraction (-)
        let result = pass2[0];
        for (i = 1; i < pass2.length; i += 2) {
            const op = pass2[i];
            const nextVal = pass2[i + 1];
            if (op === '+') {
                result += nextVal;
            } else if (op === '-') {
                result -= nextVal;
            }
            if (result < 0) hadNegative = true;
        }

        return {
            isValid: true,
            result: result,
            cleanDivision: cleanDivision,
            hadNegative: hadNegative
        };
    }

    // =========================================================================
    // SCORING PIPELINE (Balatro-style Sequential Triggers)
    // =========================================================================
    async function submitActiveEquation() {
        if (state.isEvaluating) return;

        const evalResult = parseAndEvaluateEquation(state.staged);
        if (!evalResult.isValid) {
            sfx.playError();
            showTooltip(evalResult.errorMsg || 'Invalid Equation');
            return;
        }

        state.isEvaluating = true;
        btnSubmit.disabled = true;
        btnDiscard.disabled = true;

        sfx.playCardPlace();

        const cards = [...state.staged];
        const numbers = cards.filter(c => c.type === 'number');
        const operators = cards.filter(c => c.type === 'operator');

        // Initial Base Chips & Mult
        let baseChips = Math.max(1, Math.round(evalResult.result));
        let chips = baseChips;
        let mult = 1;
        let xMult = 1.0;

        // Apply Card Foil Enhancements
        cards.forEach(card => {
            if (card.foil === 'foil') chips += 50;
            if (card.foil === 'holo') mult += 10;
            if (card.foil === 'polychrome') xMult *= 1.5;
            if (card.foil === 'gold') {
                state.cash += 3;
                updateHUD();
            }
        });

        // Trigger context for Relic evaluations
        const ctx = {
            cards: cards,
            numbers: numbers,
            operators: operators,
            stagedCount: cards.length,
            result: evalResult.result,
            cleanDivision: evalResult.cleanDivision,
            hadNegative: evalResult.hadNegative,
            chips: chips,
            mult: mult,
            xMult: xMult
        };

        // Sequential Relic Triggers
        let step = 0;
        for (const relic of state.relics) {
            if (relic.evaluate) {
                const msg = relic.evaluate(ctx);
                if (msg) {
                    await delay(280);
                    sfx.playRelicTrigger(step++);

                    // Visual Flash on Relic
                    flashRelicElement(relic.id);
                    showFloatingMessage(msg, '#ffd700');

                    // Update breakdown visually
                    animateScoreBreakdown(ctx.chips, ctx.mult, ctx.xMult);
                }
            }
        }

        await delay(320);

        // Final score calculation
        const totalMult = Math.round(ctx.mult * ctx.xMult);
        const handScore = Math.round(ctx.chips * totalMult);

        sfx.playMultImpact();
        state.currentVaultScore += handScore;
        state.score += handScore;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('factoria_highscore', state.highScore.toString());
        }

        animateScoreBreakdown(ctx.chips, ctx.mult, ctx.xMult, handScore);
        updateHUD();

        await delay(500);

        // Discard staged cards
        state.discardPile.push(...state.staged);
        state.staged = [];
        renderStagedRail();

        // Check Vault Breach Victory or Remaining Hands
        if (state.currentVaultScore >= state.targetScore) {
            // VICTORY!
            await handleVaultVictory();
        } else {
            state.hands--;
            updateHUD();

            if (state.hands <= 0) {
                // GAME OVER
                await handleGameOver();
            } else {
                // Draw replacement cards up to handSize
                const needed = state.handSize - state.hand.length;
                if (needed > 0) drawCards(needed);
                renderHand();
                state.isEvaluating = false;
                updateActionButtons();
            }
        }
    }

    async function handleVaultVictory() {
        sfx.playVaultBreached();

        // Interest token check
        state.relics.forEach(relic => {
            if (relic.onRoundEnd) relic.onRoundEnd(state);
        });

        // Award bounty
        let earned = state.vaultBounty;
        if (state.vaultIndex === 2 && state.relics.some(r => r.id === 'bounty_hunter')) {
            earned += 8;
        }
        state.cash += earned;
        sfx.playBuy();

        updateHUD();

        await delay(700);

        // Advance Vault or Sector
        if (state.vaultIndex < 2) {
            state.vaultIndex++;
        } else {
            state.sector++;
            state.vaultIndex = 0;
            state.totalSectorsCleared++;
        }

        // Open Factoria Depot (Shop)
        openShop();
    }

    async function handleGameOver() {
        sfx.playGameOver();
        await delay(600);

        goScoreVal.textContent = state.score.toLocaleString();
        goBestVal.textContent = state.highScore.toLocaleString();
        goSectorsVal.textContent = state.totalSectorsCleared.toString();
        modalGameover.style.display = 'flex';
    }

    // =========================================================================
    // SHOP & UPGRADE DEPOT
    // =========================================================================
    function openShop() {
        shopCashVal.textContent = `$${state.cash}`;
        rerollCost.textContent = `$${state.shopRerollCost}`;
        populateShopInventory();
        modalShop.style.display = 'flex';
    }

    function populateShopInventory() {
        shopRelicsList.innerHTML = '';
        shopBoostersList.innerHTML = '';

        // Pick 2 random relics not currently owned
        const availableRelics = RELIC_CATALOG.filter(r => !state.relics.some(owned => owned.id === r.id));
        const pickedRelics = shuffleArray(availableRelics).slice(0, 2);

        pickedRelics.forEach(relic => {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            card.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${relic.icon} ${relic.name}</span>
                    <span class="item-desc">${relic.desc}</span>
                </div>
                <button class="btn-buy" ${state.cash < relic.price || state.relics.length >= 5 ? 'disabled' : ''}>
                    Buy $${relic.price}
                </button>
            `;

            card.querySelector('.btn-buy').addEventListener('click', () => {
                if (state.cash >= relic.price && state.relics.length < 5) {
                    state.cash -= relic.price;
                    state.relics.push(relic);
                    sfx.playBuy();
                    shopCashVal.textContent = `$${state.cash}`;
                    renderRelicsTray();
                    populateShopInventory();
                    updateHUD();
                }
            });

            shopRelicsList.appendChild(card);
        });

        // 2 Boosters for sale
        const boosters = [
            {
                name: '📦 Number Booster',
                desc: 'Draft 1 high-value or enhanced number for your deck.',
                price: 4,
                type: 'number'
            },
            {
                name: '⚡ Operator Booster',
                desc: 'Draft 1 rare operator card (×, ÷, ^).',
                price: 4,
                type: 'operator'
            }
        ];

        boosters.forEach(b => {
            const card = document.createElement('div');
            card.className = 'shop-item-card';
            card.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${b.name}</span>
                    <span class="item-desc">${b.desc}</span>
                </div>
                <button class="btn-buy" ${state.cash < b.price ? 'disabled' : ''}>
                    Buy $${b.price}
                </button>
            `;

            card.querySelector('.btn-buy').addEventListener('click', () => {
                if (state.cash >= b.price) {
                    state.cash -= b.price;
                    sfx.playBuy();
                    shopCashVal.textContent = `$${state.cash}`;
                    updateHUD();
                    openBoosterModal(b.type);
                }
            });

            shopBoostersList.appendChild(card);
        });
    }

    function openBoosterModal(type) {
        boosterCardsRow.innerHTML = '';
        boosterModalTitle.textContent = type === 'number' ? '📦 Number Booster Pack' : '⚡ Operator Booster Pack';
        boosterModalDesc.textContent = 'Select 1 card to add permanently to your deck:';

        const choices = [];
        if (type === 'number') {
            const vals = [7, 8, 9, 11, 12, 13, 16, 20, 25];
            const foils = [null, null, 'foil', 'holo', 'polychrome'];
            for (let i = 0; i < 3; i++) {
                const v = vals[Math.floor(Math.random() * vals.length)];
                const f = foils[Math.floor(Math.random() * foils.length)];
                choices.push(createNumberCard(state.deck.length + i, v, f));
            }
        } else {
            const ops = ['×', '÷', '^', '+', '-'];
            const foils = [null, null, 'foil', 'holo'];
            for (let i = 0; i < 3; i++) {
                const op = ops[Math.floor(Math.random() * ops.length)];
                const f = foils[Math.floor(Math.random() * foils.length)];
                choices.push(createOperatorCard(state.deck.length + i, op, f));
            }
        }

        choices.forEach(cardData => {
            const el = createCardElement(cardData);
            el.addEventListener('click', () => {
                state.deck.push(cardData);
                sfx.playCardPlace();
                modalBooster.style.display = 'none';
                updateHUD();
                populateShopInventory();
            });
            boosterCardsRow.appendChild(el);
        });

        modalBooster.style.display = 'flex';
    }

    // =========================================================================
    // RENDERING & UI UPDATES
    // =========================================================================
    function updateHUD() {
        sectorVal.textContent = state.sector;
        vaultTypeVal.textContent = state.vaultIndex === 0 ? 'LOW VAULT' : (state.vaultIndex === 1 ? 'HIGH VAULT' : 'BOSS VAULT');
        cashVal.textContent = `$${state.cash}`;
        deckCount.textContent = state.deck.length;

        vaultTierTitle.textContent = `SECTOR 0${state.sector} • ${vaultTypeVal.textContent}`;
        vaultName.textContent = state.vaultIndex === 2 ? (state.currentBoss ? state.currentBoss.name : 'VAULT OVERLORD') : `CIPHER GATE ${state.sector}-${state.vaultIndex + 1}`;
        vaultBountyVal.textContent = `+$${state.vaultBounty}`;

        if (state.currentBoss) {
            bossAlert.style.display = 'flex';
            bossAlertText.textContent = `BOSS PROTOCOL: ${state.currentBoss.desc}`;
        } else {
            bossAlert.style.display = 'none';
        }

        currentScoreVal.textContent = state.currentVaultScore.toLocaleString();
        targetScoreVal.textContent = state.targetScore.toLocaleString();

        const pct = Math.min(100, Math.round((state.currentVaultScore / state.targetScore) * 100));
        vaultProgressFill.style.width = `${pct}%`;

        handsVal.textContent = state.hands;
        handsPips.innerHTML = Array(state.maxHands).fill(0).map((_, i) =>
            `<span class="pip ${i < state.hands ? 'active' : ''}"></span>`
        ).join('');

        discardsVal.textContent = state.discards;
        discardsPips.innerHTML = Array(state.maxDiscards).fill(0).map((_, i) =>
            `<span class="pip ${i < state.discards ? 'active' : ''}"></span>`
        ).join('');

        activeRelicsCount.textContent = state.relics.length;
    }

    function renderHand() {
        cardsHand.innerHTML = '';
        state.hand.forEach((card, index) => {
            const el = createCardElement(card);
            if (state.selectedForDiscard.has(card.id)) {
                el.classList.add('selected-discard');
            }

            el.addEventListener('click', (e) => {
                if (state.isEvaluating) return;

                // If user clicks, either stage card or toggle discard
                if (e.shiftKey || state.selectedForDiscard.size > 0 && !state.staged.includes(card)) {
                    toggleDiscardSelect(card);
                } else {
                    stageCard(card);
                }
            });

            cardsHand.appendChild(el);
        });

        updateActionButtons();
    }

    function renderStagedRail() {
        equationRail.innerHTML = '';
        if (state.staged.length === 0) {
            equationRail.innerHTML = '<div class="rail-placeholder" id="rail-placeholder">Click cards in your hand to stage them into an equation</div>';
            equationRail.classList.remove('has-cards');
            formulaPill.innerHTML = '<span class="preview-empty">Stage numbers and operators from your hand to build an equation</span>';
            animateScoreBreakdown(0, 1, 1, 0);
        } else {
            equationRail.classList.add('has-cards');
            state.staged.forEach((card, idx) => {
                const el = createCardElement(card);
                el.classList.add('staged-card');
                el.title = 'Click to recall to hand';
                el.addEventListener('click', () => {
                    if (state.isEvaluating) return;
                    unstageCard(card);
                });
                equationRail.appendChild(el);
            });

            // Live evaluation preview
            const evalResult = parseAndEvaluateEquation(state.staged);
            if (evalResult.isValid) {
                const formulaText = state.staged.map(c => c.type === 'number' ? c.value : c.symbol).join(' ');
                formulaPill.textContent = `${formulaText} = ${evalResult.result} Base`;

                // Calculate preview chips and mult
                let chips = Math.max(1, Math.round(evalResult.result));
                let mult = 1;
                let xMult = 1.0;

                state.staged.forEach(c => {
                    if (c.foil === 'foil') chips += 50;
                    if (c.foil === 'holo') mult += 10;
                    if (c.foil === 'polychrome') xMult *= 1.5;
                });

                state.relics.forEach(r => {
                    if (r.evaluate) {
                        r.evaluate({
                            cards: state.staged,
                            numbers: state.staged.filter(c => c.type === 'number'),
                            operators: state.staged.filter(c => c.type === 'operator'),
                            stagedCount: state.staged.length,
                            result: evalResult.result,
                            cleanDivision: evalResult.cleanDivision,
                            hadNegative: evalResult.hadNegative,
                            chips: chips,
                            mult: mult,
                            xMult: xMult
                        });
                    }
                });

                const totalMult = Math.round(mult * xMult);
                const predictedTotal = Math.round(chips * totalMult);
                animateScoreBreakdown(chips, mult, xMult, predictedTotal);
            } else {
                formulaPill.innerHTML = `<span style="color: var(--coral);">⚠️ ${evalResult.errorMsg}</span>`;
                animateScoreBreakdown(0, 1, 1, 0);
            }
        }

        updateActionButtons();
    }

    function renderRelicsTray() {
        relicsTray.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            if (i < state.relics.length) {
                const relic = state.relics[i];
                const el = document.createElement('div');
                el.className = 'relic-card';
                el.id = `relic-${relic.id}`;
                el.innerHTML = `
                    <div class="relic-top">
                        <span class="relic-icon">${relic.icon}</span>
                        <span class="relic-name">${relic.name}</span>
                    </div>
                    <span class="relic-stat-badge">${relic.rarity.toUpperCase()}</span>
                `;
                el.addEventListener('mouseenter', (e) => showTooltip(`${relic.name}: ${relic.desc}`, e));
                el.addEventListener('mouseleave', hideTooltip);
                relicsTray.appendChild(el);
            } else {
                const empty = document.createElement('div');
                empty.className = 'relic-empty';
                empty.textContent = '+ Empty Slot';
                relicsTray.appendChild(empty);
            }
        }
    }

    function createCardElement(card) {
        const el = document.createElement('div');
        el.className = `game-card ${card.type === 'operator' ? 'card-operator' : 'card-number'}`;
        if (card.foil) el.classList.add(card.foil);

        if (card.type === 'number') {
            const v = card.value;
            const isPrime = PRIMES.has(v);
            const isSquare = SQUARES.has(v);
            const tag = isPrime ? 'prime' : (isSquare ? 'square' : (v % 2 === 0 ? 'even' : 'odd'));

            el.innerHTML = `
                <div class="card-corner-top">
                    <span>${v}</span>
                    <span class="card-tag ${tag}">${tag.toUpperCase()}</span>
                </div>
                <div class="card-center-val">${v}</div>
                <div class="card-corner-bottom">
                    <span>${v}</span>
                </div>
            `;
        } else {
            const sym = card.symbol;
            const opClass = sym === '+' ? 'card-op-add' :
                            sym === '-' ? 'card-op-sub' :
                            sym === '×' ? 'card-op-mul' :
                            sym === '÷' ? 'card-op-div' : 'card-op-pow';
            el.classList.add(opClass);

            el.innerHTML = `
                <div class="card-corner-top">
                    <span>${sym}</span>
                </div>
                <div class="card-center-val">${sym}</div>
                <div class="card-corner-bottom">
                    <span>${sym}</span>
                </div>
            `;
        }

        return el;
    }

    // =========================================================================
    // CARD INTERACTION LOGIC
    // =========================================================================
    function stageCard(card) {
        state.selectedForDiscard.delete(card.id);
        const idx = state.hand.indexOf(card);
        if (idx !== -1) {
            state.hand.splice(idx, 1);
            state.staged.push(card);
            sfx.playCardPlace();
            renderHand();
            renderStagedRail();
        }
    }

    function unstageCard(card) {
        const idx = state.staged.indexOf(card);
        if (idx !== -1) {
            state.staged.splice(idx, 1);
            state.hand.push(card);
            sfx.playCardReturn();
            renderHand();
            renderStagedRail();
        }
    }

    function toggleDiscardSelect(card) {
        if (state.selectedForDiscard.has(card.id)) {
            state.selectedForDiscard.delete(card.id);
            sfx.playCardReturn();
        } else {
            if (state.selectedForDiscard.size < 5) {
                state.selectedForDiscard.add(card.id);
                sfx.playCardSelect();
            }
        }
        renderHand();
    }

    function discardSelectedCards() {
        if (state.discards <= 0 || state.selectedForDiscard.size === 0 || state.isEvaluating) return;

        sfx.playDiscard();
        state.discards--;

        const toDiscard = state.hand.filter(c => state.selectedForDiscard.has(c.id));
        state.hand = state.hand.filter(c => !state.selectedForDiscard.has(c.id));
        state.discardPile.push(...toDiscard);
        state.selectedForDiscard.clear();

        // Draw back up to handSize
        drawCards(toDiscard.length);

        updateHUD();
        renderHand();
    }

    function updateActionButtons() {
        const evalResult = parseAndEvaluateEquation(state.staged);
        btnSubmit.disabled = !evalResult.isValid || state.isEvaluating;

        const selCount = state.selectedForDiscard.size;
        discardCountBadge.textContent = `(${selCount})`;
        btnDiscard.disabled = selCount === 0 || state.discards <= 0 || state.isEvaluating;
    }

    // =========================================================================
    // INSPECT DECK MODAL
    // =========================================================================
    function openDeckModal() {
        inspectDeckCount.textContent = state.deck.length;
        deckCardsGrid.innerHTML = '';

        const nums = state.deck.filter(c => c.type === 'number');
        const ops = state.deck.filter(c => c.type === 'operator');
        deckStatsSummary.innerHTML = `
            <span><strong>${nums.length}</strong> Numbers</span>
            <span><strong>${ops.length}</strong> Operators</span>
        `;

        // Sort deck: numbers first, then operators
        const sorted = [...state.deck].sort((a, b) => {
            if (a.type !== b.type) return a.type === 'number' ? -1 : 1;
            if (a.type === 'number') return a.value - b.value;
            return a.symbol.localeCompare(b.symbol);
        });

        sorted.forEach(card => {
            const el = createCardElement(card);
            deckCardsGrid.appendChild(el);
        });

        modalDeck.style.display = 'flex';
    }

    // =========================================================================
    // VISUAL FEEDBACK & TOOLTIPS
    // =========================================================================
    function animateScoreBreakdown(chips, mult, xMult = 1, total = null) {
        bdChips.textContent = chips;
        const totalMult = Math.round(mult * xMult);
        bdMult.textContent = `${totalMult}x`;
        bdTotal.textContent = total !== null ? total.toLocaleString() : (chips * totalMult).toLocaleString();
    }

    function flashRelicElement(relicId) {
        const el = document.getElementById(`relic-${relicId}`);
        if (el) {
            el.classList.add('trigger-flash');
            setTimeout(() => el.classList.remove('trigger-flash'), 450);
        }
    }

    function showFloatingMessage(text, color = '#ffd700') {
        const msg = document.createElement('div');
        msg.textContent = text;
        msg.style.position = 'fixed';
        msg.style.left = '50%';
        msg.style.top = '40%';
        msg.style.transform = 'translate(-50%, -50%)';
        msg.style.fontFamily = 'var(--font-display)';
        msg.style.fontWeight = '900';
        msg.style.fontSize = '1.4rem';
        msg.style.color = color;
        msg.style.textShadow = '0 0 16px rgba(255, 215, 0, 0.6)';
        msg.style.pointerEvents = 'none';
        msg.style.zIndex = '300';
        msg.style.transition = 'all 0.5s ease-out';
        document.body.appendChild(msg);

        requestAnimationFrame(() => {
            msg.style.transform = 'translate(-50%, -100%) scale(1.1)';
            msg.style.opacity = '0';
        });

        setTimeout(() => msg.remove(), 550);
    }

    function showTooltip(text, e) {
        tooltip.textContent = text;
        tooltip.style.display = 'block';
        if (e) {
            tooltip.style.left = `${Math.min(window.innerWidth - 260, e.clientX + 12)}px`;
            tooltip.style.top = `${e.clientY + 12}px`;
        } else {
            tooltip.style.left = '50%';
            tooltip.style.top = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }
    }

    function hideTooltip() {
        tooltip.style.display = 'none';
        tooltip.style.transform = 'none';
    }

    // =========================================================================
    // EVENT LISTENERS
    // =========================================================================
    function setupEventListeners() {
        btnSubmit.addEventListener('click', submitActiveEquation);
        btnDiscard.addEventListener('click', discardSelectedCards);

        btnClearStaged.addEventListener('click', () => {
            if (state.isEvaluating) return;
            while (state.staged.length > 0) {
                const c = state.staged.pop();
                state.hand.push(c);
            }
            sfx.playCardReturn();
            renderHand();
            renderStagedRail();
        });

        btnDeck.addEventListener('click', openDeckModal);
        btnCloseDeck.addEventListener('click', () => modalDeck.style.display = 'none');

        btnHelp.addEventListener('click', () => modalHelp.style.display = 'flex');
        btnCloseHelp.addEventListener('click', () => modalHelp.style.display = 'none');
        btnStartPlaying.addEventListener('click', () => modalHelp.style.display = 'none');

        btnRestart.addEventListener('click', () => {
            if (confirm('Abandon current run and start fresh?')) {
                startNewRun();
            }
        });

        btnTryAgain.addEventListener('click', startNewRun);

        btnNextVault.addEventListener('click', () => {
            modalShop.style.display = 'none';
            initVault();
        });

        btnShopReroll.addEventListener('click', () => {
            if (state.cash >= state.shopRerollCost) {
                state.cash -= state.shopRerollCost;
                state.shopRerollCost += 1;
                sfx.playBuy();
                shopCashVal.textContent = `$${state.cash}`;
                rerollCost.textContent = `$${state.shopRerollCost}`;
                populateShopInventory();
                updateHUD();
            } else {
                sfx.playError();
            }
        });

        btnSkipBooster.addEventListener('click', () => {
            modalBooster.style.display = 'none';
        });

        btnSound.addEventListener('click', () => {
            sfx.init();
            const muted = sfx.toggleMute();
            soundIcon.textContent = muted ? '🔇' : '🔊';
        });

        // Initialize audio on first user touch / keypress
        window.addEventListener('click', () => sfx.init(), { once: true });
        window.addEventListener('keydown', () => sfx.init(), { once: true });

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !btnSubmit.disabled) {
                e.preventDefault();
                submitActiveEquation();
            } else if ((e.code === 'KeyD' || e.code === 'Backspace') && !btnDiscard.disabled) {
                discardSelectedCards();
            } else if (e.code === 'Escape') {
                modalDeck.style.display = 'none';
                modalHelp.style.display = 'none';
            }
        });
    }

    // Utility: Fisher-Yates shuffle
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Launch on DOM ready
    window.addEventListener('DOMContentLoaded', init);

})();
