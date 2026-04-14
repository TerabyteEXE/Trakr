// DG Tracker - Disc Golf Score Tracking Application
// ================================================

// =========================================
// STATE MANAGEMENT
// =========================================

let state = JSON.parse(localStorage.getItem('dg_ledger')) || {
    players: [],
    pars: [],
    activeIdx: null,
    isLive: false,
    isFinished: false,
    theme: 'light'
};

let tempScore = 3;
let tempPar = 3;

// =========================================
// INITIALIZATION & VIEW MANAGEMENT
// =========================================

function init() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (state.isFinished) {
        showView('summary-view');
        renderSummary();
    } else if (state.isLive) {
        showView('game-view');
        renderGame();
        selectPlayer(state.activeIdx || 0);
    } else {
        renderSetup();
    }
}

function showView(id) {
    document.querySelectorAll('.view-step').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function save() {
    localStorage.setItem('dg_ledger', JSON.stringify(state));
}

// =========================================
// PLAYER SETUP SCREEN
// =========================================

function addPlayer() {
    const input = document.getElementById('new-name');
    if (!input.value.trim()) return;
    state.players.push({
        name: input.value.trim().toUpperCase(),
        scores: []
    });
    input.value = '';
    renderSetup();
    save();
}

function renderSetup() {
    const list = document.getElementById('player-setup-list');
    list.innerHTML = state.players.map((p, i) =>
        `<div class="flex justify-between items-center border-b border-[var(--border)] py-2">
            <span class="font-bold font-mono">${p.name}</span>
            <button onclick="removePlayer(${i})" class="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>`
    ).join('');
}

function removePlayer(idx) {
    state.players.splice(idx, 1);
    renderSetup();
    save();
}

function startRound() {
    if (state.players.length === 0) return;
    state.isLive = true;
    showView('game-view');
    selectPlayer(0);
    save();
}

// =========================================
// GAMEPLAY SCREEN
// =========================================

function selectPlayer(idx) {
    state.activeIdx = idx;
    const p = state.players[idx];
    const hIdx = p.scores.length;

    if (state.pars[hIdx] === undefined) {
        document.getElementById('par-prompter').classList.remove('hidden');
        document.getElementById('current-h-num').innerText = hIdx + 1;
        tempPar = 3;
        document.getElementById('par-val').innerText = tempPar;
    } else {
        document.getElementById('par-prompter').classList.add('hidden');
        tempPar = state.pars[hIdx];
    }

    tempScore = tempPar;
    document.getElementById('target-name').innerText = p.name;
    document.getElementById('stroke-count').innerText = tempScore;
    renderGame();
}

function adjPar(v) {
    tempPar = Math.max(1, tempPar + v);
    document.getElementById('par-val').innerText = tempPar;
    tempScore = tempPar;
    document.getElementById('stroke-count').innerText = tempScore;
}

function adjScore(v) {
    tempScore = Math.max(1, tempScore + v);
    document.getElementById('stroke-count').innerText = tempScore;
}

function logScore() {
    if (state.activeIdx === null) return;
    const p = state.players[state.activeIdx];
    if (state.pars[p.scores.length] === undefined) {
        state.pars[p.scores.length] = tempPar;
    }
    p.scores.push(tempScore);
    let nextIdx = (state.activeIdx + 1) % state.players.length;
    save();
    selectPlayer(nextIdx);
}

function renderGame() {
    // Render player selector chips
    const chips = document.getElementById('player-selector');
    chips.innerHTML = state.players.map((p, i) =>
        `<button onclick="selectPlayer(${i})" class="btn-outline px-4 py-2 text-xs ${state.activeIdx === i ? 'bg-[var(--text)] text-[var(--bg)]' : ''}">${p.name}</button>`
    ).join('');

    // Render scoreboard/ledger
    const ledger = document.getElementById('ledger-content');
    ledger.innerHTML = state.players.map((p, pIdx) => {
        let total = p.scores.reduce((a, b) => a + b, 0);
        let parTotal = p.scores.reduce((acc, _, i) => acc + (state.pars[i] || 0), 0);
        let rel = total - parTotal;

        const scoreButtons = p.scores.map((s, i) => {
            const par = state.pars[i] || 3;
            const diff = s - par;
            let bgColor = 'bg-gray-200';
            if (diff < 0) bgColor = 'bg-green-300';
            else if (diff === 0) bgColor = 'bg-blue-300';
            else if (diff === 1) bgColor = 'bg-yellow-300';
            else bgColor = 'bg-red-300';

            return `<button onclick="editHole(${pIdx}, ${i})" class="${bgColor} px-3 py-1 rounded text-sm font-bold cursor-pointer hover:opacity-75">${s}</button>`;
        }).join('');

        return `<div class="space-y-4">
            <div class="flex justify-between items-baseline border-b-2 border-[var(--border)]">
                <h4 class="text-2xl font-black">${p.name}</h4>
                <span class="text-4xl font-black font-mono">${rel > 0 ? '+' : ''}${rel}</span>
            </div>
            <div class="flex flex-wrap gap-1">
                ${scoreButtons}
            </div>
        </div>`;
    }).join('');
}

function editHole(pIdx, hIdx) {
    const val = prompt("Correct Strokes:", state.players[pIdx].scores[hIdx]);
    if (val && !isNaN(val)) {
        state.players[pIdx].scores[hIdx] = parseInt(val);
        save();
        renderGame();
    }
}

// =========================================
// SUMMARY & AWARDS SCREEN
// =========================================

function finishRound() {
    state.isFinished = true;
    showView('summary-view');
    renderSummary();
    save();
}

function renderSummary() {
    document.getElementById('final-date').innerText = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    const stats = state.players.map(p => {
        const total = p.scores.reduce((a, b) => a + b, 0);
        const parTotal = p.scores.reduce((acc, _, i) => acc + (state.pars[i] || 0), 0);
        const birdies = p.scores.filter((s, i) => s < state.pars[i]).length;
        const pars = p.scores.filter((s, i) => s === state.pars[i]).length;
        const eagles = p.scores.filter((s, i) => s < state.pars[i] - 1).length;

        return {
            name: p.name,
            rel: total - parTotal,
            total,
            birdies,
            pars,
            eagles
        };
    });

    const winner = [...stats].sort((a, b) => a.rel - b.rel)[0];
    const sniper = [...stats].sort((a, b) => b.birdies - a.birdies)[0];
    const anchor = [...stats].sort((a, b) => b.pars - a.pars)[0];

    document.getElementById('awards-grid').innerHTML = `
        <div class="border-2 border-[var(--border)] p-4">
            <p class="text-[10px] uppercase font-bold opacity-40">🏆 Top Gun</p>
            <p class="text-2xl font-black">${winner.name}</p>
            <p class="text-xs opacity-60">${winner.rel > 0 ? '+' : ''}${winner.rel}</p>
        </div>
        <div class="border-2 border-[var(--border)] p-4">
            <p class="text-[10px] uppercase font-bold opacity-40">🎯 Sniper</p>
            <p class="text-2xl font-black">${sniper.name}</p>
            <p class="text-xs opacity-60">${sniper.birdies} birdies</p>
        </div>
        <div class="border-2 border-[var(--border)] p-4">
            <p class="text-[10px] uppercase font-bold opacity-40">⛳ Steady Eddie</p>
            <p class="text-2xl font-black">${anchor.name}</p>
            <p class="text-xs opacity-60">${anchor.pars} pars</p>
        </div>
    `;

    document.getElementById('final-standings').innerHTML = stats.sort((a, b) => a.rel - b.rel)
        .map((s, i) => `<div class="flex justify-between font-mono text-sm py-1 border-b border-[var(--border)]">
            <span>${i + 1}. ${s.name}</span>
            <span>${s.rel > 0 ? '+' : ''}${s.rel} (${s.total})</span>
        </div>`).join('');
}

// =========================================
// THEME & RESET
// =========================================

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    init();
    save();
}

function resetApp() {
    if (confirm("ARCHIVE LEDGER? This will clear all data.")) {
        localStorage.clear();
        location.reload();
    }
}

// =========================================
// INITIALIZE ON PAGE LOAD
// =========================================

init();
