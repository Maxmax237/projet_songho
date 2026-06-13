// ==================== VARIABLES GLOBALES ====================
let currentRoom = null;
let currentPlayerId = null;
let playerRole = null;
let gameState = null;
let pollingInterval = null;

const northRow = document.getElementById('north-row');
const southRow = document.getElementById('south-row');
const scoreNorth = document.getElementById('score-north');
const scoreSouth = document.getElementById('score-south');
const turnText = document.getElementById('turn-text');
const gameMessage = document.getElementById('game-message');
const resetBtn = document.getElementById('resetBtn');
const quitBtn = document.getElementById('quitBtn');
const roomCodeInput = document.getElementById('roomCode');
const roomStatusDiv = document.getElementById('roomStatus');

// ==================== REQUÊTES API ====================
async function apiCall(action, data = {}) {
    const payload = { action, ...data };
    if (currentRoom) payload.roomCode = currentRoom;
    if (currentPlayerId) payload.playerId = currentPlayerId;

    try {
        const response = await fetch('api.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!result.success) {
            console.error('API Error:', result.error);
            return null;
        }
        return result;
    } catch (error) {
        console.error('Network error:', error);
        gameMessage.innerText = 'Erreur réseau';
        return null;
    }
}

// ==================== RENDU ====================
function renderBoard() {
    if (!gameState) return;

    northRow.innerHTML = '';
    southRow.innerHTML = '';

    for (let i = 0; i < gameState.boardNorth.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const isMyTurn = (playerRole === 'north' && gameState.currentPlayer === 'north');
        const hasSeeds = gameState.boardNorth[i] > 0;
        
        if (isMyTurn && hasSeeds && gameState.gameActive && !gameState.gameEnded) {
            cell.classList.add('highlight');
        } else {
            cell.classList.add('disabled');
        }
        
        const countSpan = document.createElement('div');
        countSpan.className = 'seed-count';
        countSpan.innerText = gameState.boardNorth[i];
        const iconSpan = document.createElement('div');
        iconSpan.className = 'seed-icon';
        iconSpan.innerText = '●'.repeat(Math.min(gameState.boardNorth[i], 15));
        
        cell.appendChild(countSpan);
        cell.appendChild(iconSpan);
        cell.onclick = () => onCellClick('north', i);
        northRow.appendChild(cell);
    }

    for (let i = 0; i < gameState.boardSouth.length; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        const isMyTurn = (playerRole === 'south' && gameState.currentPlayer === 'south');
        const hasSeeds = gameState.boardSouth[i] > 0;
        
        if (isMyTurn && hasSeeds && gameState.gameActive && !gameState.gameEnded) {
            cell.classList.add('highlight');
        } else {
            cell.classList.add('disabled');
        }
        
        const countSpan = document.createElement('div');
        countSpan.className = 'seed-count';
        countSpan.innerText = gameState.boardSouth[i];
        const iconSpan = document.createElement('div');
        iconSpan.className = 'seed-icon';
        iconSpan.innerText = '●'.repeat(Math.min(gameState.boardSouth[i], 15));
        
        cell.appendChild(countSpan);
        cell.appendChild(iconSpan);
        cell.onclick = () => onCellClick('south', i);
        southRow.appendChild(cell);
    }

    scoreNorth.innerText = gameState.capturedNorth;
    scoreSouth.innerText = gameState.capturedSouth;
    
    if (gameState.gameEnded) {
        turnText.innerText = gameState.winner || 'PARTIE TERMINÉE';
    } else if (!gameState.gameActive) {
        turnText.innerText = '⏳ EN ATTENTE...';
    } else {
        const currentName = gameState.currentPlayer === 'north' ? '👑 JOUEUR 1 (haut)' : '👑 JOUEUR 2 (bas)';
        const isMyTurnText = (playerRole === gameState.currentPlayer) ? ' 🔥 VOTRE TOUR' : ' ⏳ TOUR ADVERSAIRE';
        turnText.innerText = `${currentName}${isMyTurnText}`;
    }
}

// ==================== CLIC ====================
async function onCellClick(player, pitIndex) {
    if (!gameState || !gameState.gameActive || gameState.gameEnded) {
        gameMessage.innerText = 'Partie terminée';
        return;
    }
    
    if (playerRole !== gameState.currentPlayer) {
        gameMessage.innerText = 'Ce n\'est pas votre tour';
        return;
    }
    
    if (player !== playerRole) {
        gameMessage.innerText = 'Vous ne pouvez jouer que vos cases';
        return;
    }
    
    const board = (player === 'north') ? gameState.boardNorth : gameState.boardSouth;
    if (board[pitIndex] === 0) {
        gameMessage.innerText = 'Case vide';
        return;
    }
    
    gameMessage.innerText = '🎲 Mouvement...';
    
    const result = await apiCall('move', { player, pitIndex });
    
    if (result && result.success) {
        gameState = result.state;
        renderBoard();
        gameMessage.innerText = result.message || '✅ Mouvement effectué';
    } else {
        gameMessage.innerText = result?.error || '❌ Erreur';
    }
}

// ==================== CHARGEMENT ====================
async function loadGameState() {
    if (!currentRoom) return;
    
    const result = await apiCall('get_state');
    if (result && result.success) {
        gameState = result.state;
        renderBoard();
    }
}

// ==================== POLLING ====================
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        if (currentRoom) loadGameState();
    }, 1500);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// ==================== CRÉER ====================
async function createGame() {
    const result = await apiCall('create_room');
    if (result && result.success) {
        currentRoom = result.roomCode;
        currentPlayerId = result.playerId;
        playerRole = result.role;
        gameState = result.state;
        
        roomStatusDiv.innerText = `🎮 Partie créée : ${currentRoom}`;
        roomCodeInput.value = currentRoom;
        
        resetBtn.disabled = false;
        quitBtn.disabled = false;
        
        renderBoard();
        startPolling();
        gameMessage.innerText = 'En attente du deuxième joueur...';
    } else {
        gameMessage.innerText = result?.error || 'Erreur création';
    }
}

// ==================== REJOINDRE ====================
async function joinGame() {
    const roomCode = roomCodeInput.value.trim();
    if (!roomCode || roomCode.length !== 6) {
        gameMessage.innerText = 'Code invalide (6 chiffres)';
        return;
    }
    
    const result = await apiCall('join_room', { roomCode });
    if (result && result.success) {
        currentRoom = result.roomCode;
        currentPlayerId = result.playerId;
        playerRole = result.role;
        gameState = result.state;
        
        roomStatusDiv.innerText = `🎮 Partie rejointe : ${currentRoom}`;
        
        resetBtn.disabled = false;
        quitBtn.disabled = false;
        
        renderBoard();
        startPolling();
        gameMessage.innerText = 'Partie rejointe !';
    } else {
        gameMessage.innerText = result?.error || 'Code invalide ou partie pleine';
    }
}

// ==================== RÉINITIALISER ====================
async function resetGame() {
    if (!currentRoom) return;
    
    const result = await apiCall('reset_room');
    if (result && result.success) {
        gameState = result.state;
        renderBoard();
        gameMessage.innerText = '🔄 Partie réinitialisée';
    } else {
        gameMessage.innerText = result?.error || 'Erreur réinitialisation';
    }
}

// ==================== QUITTER ====================
async function quitGame() {
    if (currentRoom) {
        await apiCall('quit_room');
    }
    stopPolling();
    currentRoom = null;
    currentPlayerId = null;
    playerRole = null;
    gameState = null;
    resetBtn.disabled = true;
    quitBtn.disabled = true;
    roomStatusDiv.innerText = 'Aucune partie';
    roomCodeInput.value = '';
    northRow.innerHTML = '';
    southRow.innerHTML = '';
    scoreNorth.innerText = '0';
    scoreSouth.innerText = '0';
    turnText.innerText = 'En attente...';
    gameMessage.innerText = 'Créez ou rejoignez une partie';
}

// ==================== ÉVÉNEMENTS ====================
document.getElementById('createRoomBtn').onclick = createGame;
document.getElementById('joinRoomBtn').onclick = joinGame;
resetBtn.onclick = resetGame;
quitBtn.onclick = quitGame;

window.addEventListener('beforeunload', () => {
    if (currentRoom && currentPlayerId) {
        navigator.sendBeacon('api.php', JSON.stringify({ 
            action: 'quit_room', 
            roomCode: currentRoom, 
            playerId: currentPlayerId 
        }));
    }
});
