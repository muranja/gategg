/* --- AUDIO SYSTEM --- */
class AudioSys {
    constructor() { 
        this.ctx = new (window.AudioContext || window.webkitAudioContext)(); 
        this.baseFreq = 300; 
        this.currentStep = 0;
        this.muted = false;
    }
    playTone(freq, type, duration, vol=0.1) {
        if(this.muted) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.type = type; osc.frequency.value = freq;
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    }
    playSnap() { this.playTone(400, 'triangle', 0.1, 0.1); }
    playWhoosh() { this.playTone(200, 'sine', 0.2, 0.05); }
    playFanfare() {
        if(this.muted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50]; 
        notes.forEach((f, i) => { setTimeout(() => this.playTone(f, 'square', 0.3, 0.1), i * 150); });
    }
    playRisingPing() {
        if(this.muted) return;
        const scale = [1, 1.125, 1.25, 1.33, 1.5, 1.6, 1.875, 2]; 
        let multiplier = scale[this.currentStep % scale.length] * (1 + Math.floor(this.currentStep/scale.length));
        let freq = this.baseFreq * multiplier;
        if(freq > 2000) freq = 2000;
        this.playTone(freq, 'sine', 0.15, 0.1);
        this.currentStep++;
    }
    resetPitch() { this.currentStep = 0; }
}

/* --- FIREWORK SYSTEM --- */
class FireworkSystem {
    constructor() {
        this.canvas = document.getElementById('victory-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = []; this.active = false;
        this.resize(); 
        window.addEventListener('resize', () => this.resize());
    }
    resize() { 
        if(this.canvas && this.canvas.parentElement) {
            this.canvas.width = this.canvas.parentElement.clientWidth; 
            this.canvas.height = this.canvas.parentElement.clientHeight; 
        }
    }
    
    stop() { 
        this.active = false; 
        this.particles = []; 
        if(this.ctx) this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height); 
    }
    
    start() { this.active = true; this.particles = []; this.loop(); }
    
    createBurst(x, y) {
        const colors = ['#fff', '#ffd700', '#4fc3f7', '#ffeb3b'];
        for(let i=0; i<15; i++) {
            this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12, color: colors[Math.floor(Math.random()*colors.length)], alpha: 1, grav: 0.2, decay: 0.03 });
        }
        if(!this.active) { this.active = true; this.loop(); }
    }
    createExplosion(x, y) {
        const colors = ['#ffeb3b', '#ff5722', '#4caf50', '#2196f3', '#e91e63', '#fff'];
        for(let i=0; i<40; i++) {
            this.particles.push({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, color: colors[Math.floor(Math.random()*colors.length)], alpha: 1, grav: 0.1, decay: 0.015 });
        }
    }
    loop() {
        if(!this.active && this.particles.length === 0) return;
        if(!this.ctx) return;
        requestAnimationFrame(() => this.loop());
        this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height); 
        if(document.getElementById('win-modal').style.display === 'flex' && Math.random() < 0.05) {
            this.createExplosion(Math.random()*this.canvas.width, Math.random()*(this.canvas.height*0.7));
        }
        for(let i=this.particles.length-1; i>=0; i--) {
            let p = this.particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=p.grav; p.alpha-=p.decay;
            this.ctx.globalAlpha = p.alpha; this.ctx.fillStyle = p.color;
            this.ctx.beginPath(); this.ctx.arc(p.x, p.y, p.decay > 0.02 ? 3 : 4, 0, Math.PI*2); this.ctx.fill();
            if(p.alpha <= 0) this.particles.splice(i, 1);
        }
        this.ctx.globalAlpha = 1;
    }
}

/* --- GAME LOGIC VALIDATOR --- */
class GameValidator {
    constructor() { this.suits = ['♥', '♦', '♣', '♠']; }
    isSolvable(initialDeck) {
        let deck = JSON.parse(JSON.stringify(initialDeck));
        let state = { stock: [], waste: [], foundations: [[],[],[],[]], tableau: [[],[],[],[],[],[],[]] };
        let dIdx = 0;
        for(let i=0; i<7; i++) {
            for(let j=0; j<i; j++) { state.tableau[i].push(deck[dIdx++]); }
            let c = deck[dIdx++]; c.flipped = true; state.tableau[i].push(c);
        }
        state.stock = deck.slice(dIdx);
        let moves = 0; let noProgressCount = 0; let limit = 2000;
        while (moves < limit) {
            let moved = false;
            if(this.tryMoveToFoundation(state)) { moved = true; }
            if(!moved && this.tryTableauMove(state)) { moved = true; }
            if(!moved && this.tryWasteToTableau(state)) { moved = true; }
            if(!moved) {
                if(state.stock.length > 0) {
                    const c = state.stock.pop(); c.flipped = true; state.waste.push(c); moved = true;
                } else if(state.waste.length > 0) {
                    state.stock = state.waste.reverse().map(c => ({...c, flipped: false})); state.waste = []; moved = true;
                }
            }
            if(moved) { moves++; noProgressCount = 0; } else { noProgressCount++; if(noProgressCount > 2) break; }
            if(state.foundations.reduce((a,b)=>a+b.length,0) === 52) return true;
        }
        return false;
    }
    tryMoveToFoundation(state) {
        for(let i=0; i<7; i++) {
            if(state.tableau[i].length) {
                let c = state.tableau[i].at(-1); let fIdx = this.suits.indexOf(c.suit); let pile = state.foundations[fIdx]; let top = pile.length ? pile.at(-1) : null;
                if((!top && c.rank===1) || (top && c.rank===top.rank+1)) {
                    state.foundations[fIdx].push(state.tableau[i].pop());
                    if(state.tableau[i].length) state.tableau[i].at(-1).flipped = true;
                    return true;
                }
            }
        }
        if(state.waste.length) {
            let c = state.waste.at(-1); let fIdx = this.suits.indexOf(c.suit); let pile = state.foundations[fIdx]; let top = pile.length ? pile.at(-1) : null;
            if((!top && c.rank===1) || (top && c.rank===top.rank+1)) { state.foundations[fIdx].push(state.waste.pop()); return true; }
        }
        return false;
    }
    tryTableauMove(state) {
        for(let i=0; i<7; i++) {
            if(!state.tableau[i].length) continue;
            let startFlipIdx = state.tableau[i].findIndex(c=>c.flipped);
            // NOTE: Validator keeps standard rule (Kings only) for initial solve check to ensure quality decks
            if(startFlipIdx === 0 && state.tableau[i][0].rank === 13) continue;
            let card = state.tableau[i][startFlipIdx];
            for(let j=0; j<7; j++) {
                if(i===j) continue; let dest = state.tableau[j]; let top = dest.length ? dest.at(-1) : null;
                if(!top) {
                    if(card.rank === 13 && startFlipIdx > 0) {
                        let stack = state.tableau[i].splice(startFlipIdx); state.tableau[j].push(...stack);
                        if(state.tableau[i].length) state.tableau[i].at(-1).flipped = true; return true;
                    }
                } else {
                    if(card.color !== top.color && card.rank === top.rank - 1) {
                        let stack = state.tableau[i].splice(startFlipIdx); state.tableau[j].push(...stack);
                        if(state.tableau[i].length) state.tableau[i].at(-1).flipped = true; return true;
                    }
                }
            }
        }
        return false;
    }
    tryWasteToTableau(state) {
        if(!state.waste.length) return false;
        let card = state.waste.at(-1);
        for(let j=0; j<7; j++) {
            let dest = state.tableau[j]; let top = dest.length ? dest.at(-1) : null;
            if(!top) { if(card.rank === 13) { state.tableau[j].push(state.waste.pop()); return true; } }
            else { if(card.color !== top.color && card.rank === top.rank - 1) { state.tableau[j].push(state.waste.pop()); return true; } }
        }
        return false;
    }
}

/* --- MAIN GAME CLASS --- */
export class Solitaire {
    constructor() {
        this.suits = ['♥', '♦', '♣', '♠'];
        this.ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        this.state = {}; this.history = []; this.dragItem = null;
        this.timer = null; this.seconds = 0; this.score = 0; this.wasteFanSize = 0; 
        this.autoPlaying = false; this.autoCompleteTriggered = false;
        this.lastMoveTime = Date.now();
        this.gameStarted = false;
        this.paused = false;
        
        this.fx = new FireworkSystem();
        this.audio = new AudioSys();
        this.validator = new GameValidator();
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        
        document.addEventListener('keydown', (e) => {
            if(this.autoPlaying) return;
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); this.undo(); }
            if(e.key.toLowerCase() === 'n' || e.key === 'F2') { e.preventDefault(); this.init(true); }
            if(e.key.toLowerCase() === 'h' || e.key === ' ') { e.preventDefault(); this.hint(); }
            if(e.key.toLowerCase() === 'p') { e.preventDefault(); this.togglePause(); }
        });

        this.loadPrefs();
        this.init(false); // Try to load save on startup
    }

    /* --- SAFE STORAGE HELPERS --- */
    safeStorageGet(key, fallback) {
        try {
            const val = localStorage.getItem(key);
            return val !== null ? val : fallback;
        } catch (e) { return fallback; }
    }
    safeStorageSet(key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    }

    /* --- SAVE SYSTEM --- */
    saveGame() {
        if(this.autoPlaying || this.paused) return; 
        const saveData = {
            state: this.state,
            score: this.score,
            seconds: this.seconds,
            history: this.history,
            wasteFanSize: this.wasteFanSize,
            timestamp: Date.now()
        };
        try {
            localStorage.setItem('sol_save_data', JSON.stringify(saveData));
        } catch(e) { console.warn("Save failed", e); }
    }

    loadGame() {
        const saved = localStorage.getItem('sol_save_data');
        if(!saved) return false;
        
        try {
            const data = JSON.parse(saved);
            this.state = data.state;
            this.score = data.score;
            this.seconds = data.seconds;
            this.history = data.history || [];
            this.wasteFanSize = data.wasteFanSize;
            
            this.updateScore(0);
            const m = Math.floor(this.seconds / 60).toString().padStart(2, '0');
            const s = (this.seconds % 60).toString().padStart(2, '0');
            document.getElementById('timer').innerText = `${m}:${s}`;
            
            this.gameStarted = true;
            this.startTimer();
            this.render();
            return true;
        } catch(e) {
            console.error("Corrupt save data", e);
            return false;
        }
    }

    clearSave() {
        localStorage.removeItem('sol_save_data');
    }

    /* --- PREFS & UI --- */
    loadPrefs() {
        this.prefs = {
            name: this.safeStorageGet('sol_name', "Player" + Math.floor(Math.random()*1000)),
            avatar: this.safeStorageGet('sol_avatar', "👤"),
            theme: this.safeStorageGet('sol_theme', "classic"),
            sound: this.safeStorageGet('sol_sound', 'true') !== 'false',
            streak: parseInt(this.safeStorageGet('sol_streak', '0')) || 0
        };
        const wrapper = document.getElementById('game-wrapper');
        if(wrapper) wrapper.setAttribute('data-theme', this.prefs.theme);
        this.audio.muted = !this.prefs.sound;
        this.updateProfileUI();
        if(this.prefs.streak > 0) {
            const streakEl = document.getElementById('streak-display');
            if(streakEl) {
                streakEl.style.display = 'block';
                streakEl.innerText = `🔥 ${this.prefs.streak}`;
            }
        }
    }

    openSettings() {
        document.getElementById('settings-modal').style.display = 'flex';
        document.getElementById('input-name').value = this.prefs.name;
        document.getElementById('sound-toggle').checked = this.prefs.sound;
        this.updateSettingsUI();
    }
    closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
    
    setName(val) { 
        this.prefs.name = val || "Player"; 
        this.safeStorageSet('sol_name', this.prefs.name); 
        this.updateProfileUI(); 
    }
    setAvatar(val) { 
        this.prefs.avatar = val; 
        this.safeStorageSet('sol_avatar', val); 
        this.updateSettingsUI(); this.updateProfileUI(); 
    }
    setTheme(val) { 
        this.prefs.theme = val; 
        this.safeStorageSet('sol_theme', val);
        const wrapper = document.getElementById('game-wrapper');
        if(wrapper) wrapper.setAttribute('data-theme', val); 
        this.updateSettingsUI(); 
    }
    toggleSound(val) { 
        this.prefs.sound = val; 
        this.safeStorageSet('sol_sound', val); 
        this.audio.muted = !val; 
    }
    
    updateSettingsUI() {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.t === this.prefs.theme));
        document.querySelectorAll('.avatar-opt').forEach(b => b.classList.toggle('active', b.innerText === this.prefs.avatar));
    }
    updateProfileUI() {
        document.getElementById('header-name').innerText = this.prefs.name;
        document.getElementById('header-avatar').innerText = this.prefs.avatar;
    }

    togglePause() {
        if(this.autoPlaying) return;
        if(this.paused) {
            this.paused = false;
            if(this.gameStarted) this.startTimer();
            document.getElementById('pause-overlay').style.display = 'none';
            document.getElementById('board').style.filter = 'none';
        } else {
            this.paused = true;
            this.stopTimer();
            document.getElementById('pause-overlay').style.display = 'flex';
            document.getElementById('board').style.filter = 'blur(5px)';
        }
    }

    /* --- INITIALIZATION --- */
    init(forceNew = false) {
        this.fx.stop();
        this.autoPlaying = false;
        this.autoCompleteTriggered = false;
        this.stopTimer();
        
        document.getElementById('win-modal').style.display = 'none';
        document.getElementById('loading-overlay').style.display = 'flex';
        this.audio.resetPitch();

        // 1. Try to RESUME if this is not a forced new game
        if (!forceNew && this.loadGame()) {
            document.getElementById('loading-overlay').style.display = 'none';
            return; 
        }

        // 2. Otherwise, Start FRESH
        this.clearSave(); 
        this.history = [];
        this.score = 0;
        this.wasteFanSize = 0;
        this.updateScore(0);
        this.seconds = 0;
        document.getElementById('timer').innerText = "00:00";
        this.gameStarted = false; 
        this.paused = false;
        this.lastMoveTime = Date.now();

        setTimeout(() => {
            requestAnimationFrame(() => {
                let deck = this.generateDeck();
                let attempts = 0;
                while(attempts < 200) {
                    this.shuffle(deck);
                    if(this.validator.isSolvable(deck)) break;
                    attempts++;
                }
                this.deal(deck);
                document.getElementById('loading-overlay').style.display = 'none';
                this.render();
            });
        }, 100);
    }

    generateDeck() {
        let deck = [];
        this.suits.forEach(s => { this.ranks.forEach((r, i) => { deck.push({ id: r+s, rank: i+1, val: r, suit: s, color: (s==='♥'||s==='♦')?'red':'black', flipped: false }); }); });
        return deck;
    }
    shuffle(deck) { for(let i=deck.length-1; i>0; i--) { const j = Math.floor(Math.random() * (i+1)); [deck[i], deck[j]] = [deck[j], deck[i]]; } }
    deal(deck) {
        this.state = { stock: [], waste: [], foundations: [[],[],[],[]], tableau: [[],[],[],[],[],[],[]] };
        let playDeck = JSON.parse(JSON.stringify(deck)); let dIdx = 0;
        for(let i=0; i<7; i++) { for(let j=0; j<i; j++) { this.state.tableau[i].push(playDeck[dIdx++]); } let c = playDeck[dIdx++]; c.flipped = true; this.state.tableau[i].push(c); }
        this.state.stock = playDeck.slice(dIdx);
    }

    /* --- GAMEPLAY LOGIC --- */
    calculatePoints(basePoints) {
        const now = Date.now();
        const delta = (now - this.lastMoveTime) / 1000; 
        this.lastMoveTime = now;
        let bonus = 0;
        if(delta < 4) bonus = 10; 
        else if(delta < 8) bonus = 5; 
        return basePoints + bonus;
    }

    updateScore(n) { 
        this.score = Math.max(0, this.score + n); 
        document.getElementById('score').innerText = this.score; 
    }

    checkStartTimer() {
        if(!this.gameStarted && !this.paused) {
            this.gameStarted = true;
            this.startTimer();
        }
    }

    clickStock() {
        if(this.autoPlaying || this.paused) return;
        this.checkStartTimer();
        if (this.state.stock.length === 0) {
            if(this.state.waste.length === 0) return;
            this.saveState();
            this.state.stock = this.state.waste.reverse().map(c => ({...c, flipped: false}));
            this.state.waste = []; this.wasteFanSize = 0;
        } else {
            this.saveState();
            const c = this.state.stock.pop(); c.flipped = true; this.state.waste.push(c); this.wasteFanSize = 1;
        }
        this.render(); 
        this.checkAutoWinCondition();
        this.saveGame();
    }

    /* --- AUTO MOVE (DOUBLE CLICK) --- */
    tryAutoMoveCard(card, currentLoc) {
        if (this.autoPlaying || this.paused) return;

        let stack = [card];
        if (currentLoc.startsWith('tableau')) {
            const parts = currentLoc.split('-');
            const cIdx = parseInt(parts[1]);
            const rIdx = parseInt(parts[2]);
            stack = this.state.tableau[cIdx].slice(rIdx);
        }

        if (stack.length === 1 && !currentLoc.startsWith('foundation')) {
            const fIdx = this.suits.indexOf(card.suit);
            const pile = this.state.foundations[fIdx];
            const top = pile.length ? pile.at(-1) : null;

            if ((!top && card.rank === 1) || (top && card.rank === top.rank + 1)) {
                const target = { type: 'foundation', idx: fIdx };
                this.performMove(target, stack, currentLoc);
                return;
            }
        }

        for (let i = 0; i < 7; i++) {
            if (currentLoc.startsWith(`tableau-${i}`)) continue;

            const destCol = this.state.tableau[i];
            const destTop = destCol.length ? destCol.at(-1) : null;
            const movingCard = stack[0]; 

            let isValid = false;
            if (!destTop) {
                // Rule: Allow ANY card to empty slot
                isValid = true;
            } else {
                if (movingCard.color !== destTop.color && movingCard.rank === destTop.rank - 1) {
                    isValid = true;
                }
            }

            if (isValid) {
                const target = { type: 'tableau', idx: i };
                this.performMove(target, stack, currentLoc);
                return;
            }
        }
    }

    performMove(target, stack, currentLoc) {
        this.dragItem = { loc: currentLoc, stack: stack }; 
        this.executeMove(target, stack);
        this.dragItem = null;
        this.audio.playWhoosh();
        this.render();
        this.checkAutoWinCondition();
    }

    /* --- DRAG AND DROP --- */
    startDrag(e, cardData, loc) {
        if(this.autoPlaying || this.paused || !cardData.flipped) return;
        this.checkStartTimer();
        e.preventDefault();
        
        const el = e.currentTarget; 
        const rect = el.getBoundingClientRect();
        const wrapper = document.getElementById('game-wrapper');
        const wrapperRect = wrapper.getBoundingClientRect();
        
        let movingStack = [cardData]; 
        let movingEls = [el]; 
        
        if(loc.startsWith('tableau')) {
            const [_, cIdx, rIdx] = loc.split('-'); 
            const col = this.state.tableau[cIdx]; 
            const idx = parseInt(rIdx);
            if(idx < col.length - 1) { 
                movingStack = col.slice(idx); 
                let sibling = el.nextElementSibling; 
                while(sibling) { movingEls.push(sibling); sibling = sibling.nextElementSibling; } 
            }
        }
        
        const ghost = document.createElement('div'); 
        ghost.classList.add('drag-active');
        
        ghost.style.left = (rect.left - wrapperRect.left) + 'px';
        ghost.style.top = (rect.top - wrapperRect.top) + 'px';
        
        movingEls.forEach((domEl) => {
            const clone = domEl.cloneNode(true); 
            const domRect = domEl.getBoundingClientRect();
            
            clone.style.position = 'absolute'; 
            clone.style.left = '0px'; 
            clone.style.top = (domRect.top - rect.top) + 'px';
            clone.onpointerdown = null; 
            clone.ondblclick = null; 
            
            ghost.appendChild(clone); 
            domEl.style.opacity = '0';
        });
        
        wrapper.appendChild(ghost);
        
        this.dragItem = { 
            originalEls: movingEls, 
            ghost: ghost, 
            stack: movingStack, 
            loc: loc, 
            offsetX: (e.clientX || e.touches[0].clientX) - rect.left, 
            offsetY: (e.clientY || e.touches[0].clientY) - rect.top 
        };
        
        document.addEventListener('pointermove', this.handlePointerMove); 
        document.addEventListener('pointerup', this.handlePointerUp);
    }
    
    handlePointerMove(e) {
        if(!this.dragItem) return; 
        e.preventDefault();
        
        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;
        const wrapper = document.getElementById('game-wrapper');
        const wrapperRect = wrapper.getBoundingClientRect();
        
        const relX = clientX - wrapperRect.left;
        const relY = clientY - wrapperRect.top;
        
        this.dragItem.ghost.style.left = (relX - this.dragItem.offsetX) + 'px';
        this.dragItem.ghost.style.top = (relY - this.dragItem.offsetY) + 'px';
        
        this.dragItem.ghost.style.transform = "none";
        this.dragItem.ghost.style.transition = "none";
        
        this.applyMagnet(clientX, clientY);
    }
    
    applyMagnet(cursorX, cursorY) {
        const ghostRect = this.dragItem.ghost.getBoundingClientRect();
        const gx = ghostRect.left;
        const gy = ghostRect.top;
        
        let closest = null;
        let minDist = 100; 
        
        this.state.foundations.forEach((_, i) => {
            const el = document.getElementById(`f${i}`);
            if(!el) return;
            const r = el.getBoundingClientRect();
            
            let isValid = false;
            const pile = this.state.foundations[i];
            const top = pile.length ? pile.at(-1) : null;
            const moving = this.dragItem.stack[0];
            
            if (this.dragItem.stack.length === 1 && moving.suit === this.suits[i]) {
                if ((!top && moving.rank === 1) || (top && moving.rank === top.rank + 1)) isValid = true;
            }
            
            if (isValid) {
                const dist = Math.hypot(
                    (gx + ghostRect.width/2) - (r.left + r.width/2),
                    (gy + ghostRect.height/2) - (r.top + r.height/2)
                );
                
                if (dist < minDist) {
                    closest = { type: 'foundation', idx: i, destX: r.left, destY: r.top };
                    minDist = dist;
                }
            }
        });
        
        this.state.tableau.forEach((col, i) => {
            if(this.dragItem.loc.startsWith(`tableau-${i}`)) return;
            
            const colEl = document.querySelector(`.tableau-col[data-idx="${i}"]`);
            const cards = colEl.querySelectorAll('.card');
            const isEmpty = cards.length === 0;
            
            let targetRect;
            if (isEmpty) {
                // FIX: Use the column's position but restrict height to a single card
                const colRect = colEl.getBoundingClientRect();
                targetRect = {
                    left: colRect.left,
                    top: colRect.top,
                    width: colRect.width,
                    height: ghostRect.height // Virtual height of one card
                };
            } else {
                targetRect = cards[cards.length-1].getBoundingClientRect();
            }
            
            const moving = this.dragItem.stack[0];
            const top = col.length ? col.at(-1) : null;
            let isValid = false;
            
            if(!top) {
                // Rule: Allow ANY card to empty slot
                isValid = true;
            } 
            else if(moving.color !== top.color && moving.rank === top.rank - 1) isValid = true;
            
            if (isValid) {
                const dist = Math.hypot(
                    (gx + ghostRect.width/2) - (targetRect.left + targetRect.width/2),
                    (gy + ghostRect.height/2) - (targetRect.top + targetRect.height/2)
                );
                
                if (dist < minDist) {
                    let destY = targetRect.top;
                    if (!isEmpty) {
                        let offset = 35; 
                        if(col.length > 8) offset = 30; 
                        if(col.length > 12) offset = 25;
                        destY += offset;
                    }
                    closest = { type: 'tableau', idx: i, destX: targetRect.left, destY: destY };
                    minDist = dist;
                }
            }
        });
        
        if (closest) {
            const dx = closest.destX - gx;
            const dy = closest.destY - gy;
            
            this.dragItem.ghost.style.transform = `translate(${dx}px, ${dy}px)`;
            this.dragItem.ghost.style.transition = "transform 0.1s ease-out";
            this.dragItem.target = closest;
        } else {
            this.dragItem.target = null;
        }
    }
    
    handlePointerUp(e) {
        document.removeEventListener('pointermove', this.handlePointerMove); 
        document.removeEventListener('pointerup', this.handlePointerUp);
        
        if(!this.dragItem) return;
        
        const { target, originalEls, ghost, stack } = this.dragItem; 
        let success = false;
        
        if(target) {
            const primary = stack[0];
            if(target.type === 'foundation') {
                const pile = this.state.foundations[target.idx]; 
                const top = pile.length ? pile.at(-1) : null;
                if(primary.suit === this.suits[target.idx] && ((!top && primary.rank===1) || (top && primary.rank===top.rank+1))) { 
                    this.executeMove(target, stack); 
                    success = true; 
                }
            } else if(target.type === 'tableau') {
                const col = this.state.tableau[target.idx]; 
                const top = col.length ? col.at(-1) : null;
                let valid = false; 
                
                if(!top) {
                    // Rule: Allow ANY card
                    valid = true;
                }
                else if(primary.color !== top.color && primary.rank === top.rank - 1) valid = true;
                
                if(valid) { 
                    this.executeMove(target, stack); 
                    success = true; 
                }
            }
        }
        
        ghost.remove(); 
        if(success) { 
            this.audio.playSnap(); 
            this.render(); 
            this.checkAutoWinCondition(); 
        } else { 
            originalEls.forEach(el => el.style.opacity = '1'); 
        } 
        this.dragItem = null;
    }
    
    executeMove(target, stack) {
        this.saveState();
        if(this.dragItem.loc === 'waste') { 
            this.state.waste.pop(); 
            if(this.state.waste.length === 0) {
                this.wasteFanSize = 0;
            } else {
                this.wasteFanSize = Math.min(3, this.state.waste.length);
            }
        } 
        else if (this.dragItem.loc.startsWith('foundation')) { const [_, fIdx] = this.dragItem.loc.split('-'); this.state.foundations[parseInt(fIdx)].pop(); this.updateScore(-15); } 
        else {
            const [_, cIdx, rIdx] = this.dragItem.loc.split('-'); const col = this.state.tableau[cIdx]; col.splice(parseInt(rIdx), stack.length);
            if(col.length && !col.at(-1).flipped) { col.at(-1).flipped = true; this.updateScore(this.calculatePoints(5)); }
        }
        if(target.type === 'foundation') { this.state.foundations[target.idx].push(stack[0]); this.updateScore(this.calculatePoints(10)); } 
        else { this.state.tableau[target.idx].push(...stack); this.updateScore(this.calculatePoints(5)); }
        
        this.saveGame();
    }

    render() {
        const stockEl = document.getElementById('stock');
        if(stockEl) stockEl.innerHTML = this.state.stock.length ? `<div class="card back" style="top:0;left:0"></div>` : `<span class="slot-icon">↺</span>`;
        
        const wasteEl = document.getElementById('waste'); 
        if(wasteEl) {
            wasteEl.innerHTML = '';
            if(this.state.waste.length > 0) {
                const count = Math.min(3, this.state.waste.length); const start = this.state.waste.length - count;
                this.state.waste.slice(start).forEach((c, i, arr) => {
                    const isTop = (i === arr.length-1); const el = this.createCard(c, `waste-${this.state.waste.length - count + i}`);
                    el.style.left = (i * 12) + 'px'; el.style.top = '0px';
                    if(isTop) el.onpointerdown = (e) => this.startDrag(e, c, 'waste'); else { el.style.filter = "brightness(85%)"; el.style.pointerEvents = "none"; }
                    wasteEl.appendChild(el);
                });
            } else {
                wasteEl.classList.remove('occupied'); wasteEl.classList.add('empty-grip');
            }
        }

        this.state.foundations.forEach((pile, i) => {
            const el = document.getElementById(`f${i}`);
            if(el) {
                if(pile.length > 0) { el.classList.add('occupied'); el.classList.remove('empty-grip'); } else { el.classList.remove('occupied'); el.classList.add('empty-grip'); }
                el.innerHTML = pile.length === 0 ? `<span class="slot-icon">${this.suits[i]}</span>` : '';
                if(pile.length) {
                    const c = pile.at(-1); const cardEl = this.createCard(c, `foundation-${i}`);
                    cardEl.style.top='0'; cardEl.style.left='0'; cardEl.onpointerdown = (e) => this.startDrag(e, c, `foundation-${i}`);
                    el.appendChild(cardEl);
                }
            }
        });
        
        const tab = document.getElementById('tab-container'); 
        if(tab) {
            tab.innerHTML = '';
            this.state.tableau.forEach((col, i) => {
                const colEl = document.createElement('div'); colEl.className = 'tableau-col';
                if(col.length===0) colEl.classList.add('empty-col'); colEl.dataset.idx = i;
                let offset = 35; if(col.length > 8) offset = 30; if(col.length > 12) offset = 25;
                col.forEach((c, idx) => {
                    const cardEl = this.createCard(c, `tableau-${i}-${idx}`); 
                    cardEl.style.top = (idx * offset) + 'px';
                    cardEl.style.zIndex = idx + 1;
                    if(c.flipped) cardEl.onpointerdown = (e) => this.startDrag(e, c, `tableau-${i}-${idx}`);
                    colEl.appendChild(cardEl);
                });
                tab.appendChild(colEl);
            });
        }
    }
    
    createCard(c, loc) {
        const div = document.createElement('div');
        if(!c.flipped) { div.className = 'card back'; return div; }
        div.className = `card ${c.color}`; div.dataset.loc = loc;
        div.innerHTML = `<div class="c-top">${c.val}<br>${c.suit}</div><div class="c-mid">${c.suit}</div><div class="c-bot">${c.val}<br>${c.suit}</div>`;
        
        div.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.tryAutoMoveCard(c, loc);
        });
        return div;
    }

    checkAutoWinCondition() {
        const allTableauFlipped = this.state.tableau.every(col => col.every(c => c.flipped));
        const stockEmpty = this.state.stock.length === 0;
        const wasteEmpty = this.state.waste.length === 0;
        const alreadyWon = this.state.foundations.reduce((a,b)=>a+b.length,0) === 52;
        if (alreadyWon) { 
            this.win(); 
        } else if(allTableauFlipped && stockEmpty && wasteEmpty) { 
            if(!this.autoCompleteTriggered) { this.autoCompleteTriggered = true; this.startAutoComplete(); }
        }
    }

    async startAutoComplete() {
        this.autoPlaying = true;
        this.audio.resetPitch();
        while(true) {
            let bestMove = null; let lowestRank = 14;
            for(let i=0; i<7; i++) {
                if(this.state.tableau[i].length) {
                    const c = this.state.tableau[i].at(-1); const fIdx = this.suits.indexOf(c.suit); const pile = this.state.foundations[fIdx]; const top = pile.length ? pile.at(-1) : null;
                    if((!top && c.rank===1) || (top && c.rank===top.rank+1)) {
                        if(c.rank < lowestRank) { lowestRank = c.rank; bestMove = { type:'tableau', idx: i, card: c, fIdx: fIdx }; }
                    }
                }
            }
            if(bestMove) await this.animateAutoMove(bestMove); else break;
            if(this.state.foundations.reduce((a,b)=>a+b.length,0) === 52) break;
        }
        this.win();
    }

    animateAutoMove(move) {
        return new Promise(resolve => {
            let sourceCardEl = document.querySelector(`[data-loc="tableau-${move.idx}-${this.state.tableau[move.idx].length-1}"]`);
            this.state.tableau[move.idx].pop();
            if(!sourceCardEl) { resolve(); return; }
            
            const wrapper = document.getElementById('game-wrapper');
            const wrapperRect = wrapper.getBoundingClientRect();
            const startRect = sourceCardEl.getBoundingClientRect(); 
            const targetEl = document.getElementById(`f${move.fIdx}`); 
            const targetRect = targetEl.getBoundingClientRect();
            
            const flyEl = sourceCardEl.cloneNode(true); 
            flyEl.classList.add('flying-card');
            
            flyEl.style.left = (startRect.left - wrapperRect.left) + 'px'; 
            flyEl.style.top = (startRect.top - wrapperRect.top) + 'px';
            
            wrapper.appendChild(flyEl);
            
            this.state.foundations[move.fIdx].push(move.card);
            
            flyEl.getBoundingClientRect(); 
            
            flyEl.style.left = (targetRect.left - wrapperRect.left) + 'px'; 
            flyEl.style.top = (targetRect.top - wrapperRect.top) + 'px';
            
            this.audio.playWhoosh();
            setTimeout(() => { 
                this.audio.playRisingPing(); 
                this.fx.createBurst(targetRect.left + 40, targetRect.top + 60); 
                flyEl.remove(); 
                this.render(); 
                resolve(); 
            }, 100); 
        });
    }

    win() {
        this.stopTimer();
        this.clearSave();
        this.audio.playFanfare();
        this.prefs.streak++;
        this.safeStorageSet('sol_streak', this.prefs.streak);
        document.getElementById('win-name').innerText = this.prefs.name;
        document.getElementById('win-score').innerText = this.score;
        document.getElementById('win-modal').style.display = 'flex';
        this.fx.start(); 
    }

    saveState() { const snap = JSON.parse(JSON.stringify(this.state)); snap.fanSize = this.wasteFanSize; this.history.push(snap); if(this.history.length>20) this.history.shift(); }
    
    undo() { 
        if(this.history.length && !this.autoPlaying && !this.paused){ 
            const snap = this.history.pop(); 
            const oldState = JSON.parse(JSON.stringify(this.state));
            this.state = JSON.parse(JSON.stringify(snap));
            this.wasteFanSize = snap.fanSize;
            
            let scoreRestore = 5;
            for(let i = 0; i < 4; i++) {
                if(oldState.foundations[i].length > this.state.foundations[i].length) {
                    scoreRestore += 15;
                }
            }
            
            this.updateScore(scoreRestore); 
            this.render(); 
            this.saveGame();
        } 
    }
    
    hint() {
        if(this.autoPlaying || this.paused) return;
        this.updateScore(-20); 
        document.querySelectorAll('.highlight').forEach(e=>e.classList.remove('highlight'));
        const highlight = (sel1, sel2) => {
            document.querySelector(sel1)?.classList.add('highlight'); 
            document.querySelector(sel2)?.classList.add('highlight');
            setTimeout(()=>document.querySelectorAll('.highlight').forEach(e=>e.classList.remove('highlight')), 1500); 
            return true;
        };
        const canMoveToFoundation = (c) => {
            const fIdx = this.suits.indexOf(c.suit); const top = this.state.foundations[fIdx].length ? this.state.foundations[fIdx].at(-1) : null;
            return (!top && c.rank===1) || (top && c.rank===top.rank+1);
        };
        const canMoveToTableau = (c, destCol) => {
            const top = destCol.length ? destCol.at(-1) : null; 
            // Rule: Allow ANY card to empty slot
            if(!top) return true; 
            return c.color !== top.color && c.rank === top.rank - 1;
        };
        // 1. Foundation
        for(let i=0; i<7; i++) {
            if(this.state.tableau[i].length) { const c = this.state.tableau[i].at(-1); if(canMoveToFoundation(c)) return highlight(`.tableau-col[data-idx="${i}"] .card:last-child`, `#f${this.suits.indexOf(c.suit)}`); }
        }
        if(this.state.waste.length) { const c = this.state.waste.at(-1); if(canMoveToFoundation(c)) return highlight('#waste .card:last-child', `#f${this.suits.indexOf(c.suit)}`); }
        // 2. Tableau
        for(let i=0; i<7; i++) {
            const srcCol = this.state.tableau[i]; if(!srcCol.length) continue; const flipIdx = srcCol.findIndex(c => c.flipped); const cardToMove = srcCol[flipIdx];
            if (flipIdx === 0 && cardToMove.rank === 13) { /* Ignore King on empty */ }
            else {
                for(let j=0; j<7; j++) { 
                    if(i === j) continue; const destCol = this.state.tableau[j];
                    if(canMoveToTableau(cardToMove, destCol)) {
                        const targetSel = destCol.length > 0 ? `.tableau-col[data-idx="${j}"] .card:last-child` : `.tableau-col[data-idx="${j}"]`; 
                        return highlight(`[data-loc="tableau-${i}-${flipIdx}"]`, targetSel); 
                    }
                }
            }
        }
        // 3. Waste
        if(this.state.waste.length) { 
            const c = this.state.waste.at(-1); 
            for(let i=0; i<7; i++) { 
                if(canMoveToTableau(c, this.state.tableau[i])) {
                    const destCol = this.state.tableau[i]; const targetSel = destCol.length > 0 ? `.tableau-col[data-idx="${i}"] .card:last-child` : `.tableau-col[data-idx="${i}"]`;
                    return highlight('#waste .card:last-child', targetSel); 
                }
            } 
        }
        if(this.state.stock.length > 0) { document.getElementById('stock').classList.add('highlight'); setTimeout(()=>document.getElementById('stock').classList.remove('highlight'), 1000); }
    }

    startTimer() { this.stopTimer(); this.timer = setInterval(()=>{ this.seconds++; const m=Math.floor(this.seconds/60).toString().padStart(2,'0'); const s=(this.seconds%60).toString().padStart(2,'0'); document.getElementById('timer').innerText=`${m}:${s}`; }, 1000); }
    stopTimer() { if(this.timer) clearInterval(this.timer); }
    resetTimer() { this.stopTimer(); this.seconds=0; document.getElementById('timer').innerText="00:00"; }
}