class ApplePuzzleGame {
    constructor() {
        this.rows = 8;
        this.cols = 15;
        this.totalApples = this.rows * this.cols;
        this.apples = [];
        this.selectedApples = new Set();
        this.score = 0;
        this.timeLeft = 60;
        this.gameState = 'ready'; // ready, playing, ended
        this.isDragging = false;
        this.dragStartPos = null;
        this.dragBox = null;
        this.timerInterval = null;
        this.isMuted = false;
        this.volume = 50;
        
        this.init();
    }

    init() {
        this.createGameBoard();
        this.generateApples();
        this.setupEventListeners();
        this.updateGameState();
    }

    createGameBoard() {
        const gameBoard = document.getElementById('gameBoard');
        gameBoard.innerHTML = '';
        
        for (let i = 0; i < this.totalApples; i++) {
            const apple = document.createElement('div');
            apple.className = 'apple';
            apple.dataset.index = i;
            apple.dataset.row = Math.floor(i / this.cols);
            apple.dataset.col = i % this.cols;
            gameBoard.appendChild(apple);
        }
    }

    generateApples() {
        this.apples = [];
        for (let i = 0; i < this.totalApples; i++) {
            this.apples.push({
                number: Math.floor(Math.random() * 9) + 1,
                removed: false
            });
        }
        this.updateAppleDisplay();
    }

    updateAppleDisplay() {
        const appleElements = document.querySelectorAll('.apple');
        appleElements.forEach((element, index) => {
            const apple = this.apples[index];
            if (apple.removed) {
                element.classList.add('removed');
                element.textContent = '';
            } else {
                element.classList.remove('removed');
                element.textContent = apple.number;
            }
        });
    }

    setupEventListeners() {
        const gameBoard = document.getElementById('gameBoard');
        const newGameBtn = document.getElementById('newGameBtn');
        const startGameBtn = document.getElementById('startGameBtn');
        const speakerIcon = document.getElementById('speakerIcon');
        const volumeSlider = document.getElementById('volumeSlider');
        const volumeControl = document.getElementById('volumeControl');
        
        // Start screen button
        startGameBtn.addEventListener('click', this.showGame.bind(this));
        
        // New game button
        newGameBtn.addEventListener('click', this.startNewGame.bind(this));
        
        // Sound controls
        speakerIcon.addEventListener('click', this.toggleMute.bind(this));
        volumeSlider.addEventListener('input', this.changeVolume.bind(this));
        
        // Show/hide volume control on hover
        speakerIcon.addEventListener('mouseenter', () => {
            volumeControl.classList.add('show');
        });
        
        speakerIcon.addEventListener('mouseleave', () => {
            setTimeout(() => {
                if (!volumeControl.matches(':hover')) {
                    volumeControl.classList.remove('show');
                }
            }, 300);
        });
        
        volumeControl.addEventListener('mouseleave', () => {
            volumeControl.classList.remove('show');
        });
        
        // Mouse events for dragging - on game board container for full area coverage
        const gameBoardContainer = document.querySelector('.game-board-container');
        gameBoardContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Touch events for mobile
        gameBoardContainer.addEventListener('touchstart', this.handleTouchStart.bind(this));
        document.addEventListener('touchmove', this.handleTouchMove.bind(this));
        document.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Initialize audio
        this.initAudio();
    }

    handleMouseDown(e) {
        if (this.gameState !== 'playing') return;
        
        // Allow dragging from anywhere on the game board, not just apples
        this.isDragging = true;
        this.dragStartPos = { x: e.clientX, y: e.clientY };
        this.selectedApples.clear();
        this.updateSelectionDisplay();
        this.createDragBox(e.clientX, e.clientY);
    }

    handleMouseMove(e) {
        if (!this.isDragging || this.gameState !== 'playing') return;
        
        this.updateDragBox(e.clientX, e.clientY);
        this.updateSelection(e.clientX, e.clientY);
    }

    handleMouseUp(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.removeDragBox();
        this.validateSelection();
    }

    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseDown(mouseEvent);
    }

    handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.handleMouseMove(mouseEvent);
    }

    handleTouchEnd(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {});
        this.handleMouseUp(mouseEvent);
    }

    createDragBox(x, y) {
        this.dragBox = document.createElement('div');
        this.dragBox.className = 'drag-box';
        this.dragBox.style.left = x + 'px';
        this.dragBox.style.top = y + 'px';
        this.dragBox.style.width = '0px';
        this.dragBox.style.height = '0px';
        document.body.appendChild(this.dragBox);
    }

    updateDragBox(x, y) {
        if (!this.dragBox || !this.dragStartPos) return;
        
        const left = Math.min(this.dragStartPos.x, x);
        const top = Math.min(this.dragStartPos.y, y);
        const width = Math.abs(x - this.dragStartPos.x);
        const height = Math.abs(y - this.dragStartPos.y);
        
        this.dragBox.style.left = left + 'px';
        this.dragBox.style.top = top + 'px';
        this.dragBox.style.width = width + 'px';
        this.dragBox.style.height = height + 'px';
    }

    removeDragBox() {
        if (this.dragBox) {
            this.dragBox.remove();
            this.dragBox = null;
        }
    }

    updateSelection(x, y) {
        if (!this.dragStartPos) return;
        
        const gameBoard = document.getElementById('gameBoard');
        const gameBoardRect = gameBoard.getBoundingClientRect();
        
        // Calculate selection area
        const left = Math.min(this.dragStartPos.x, x);
        const top = Math.min(this.dragStartPos.y, y);
        const right = Math.max(this.dragStartPos.x, x);
        const bottom = Math.max(this.dragStartPos.y, y);
        
        this.selectedApples.clear();
        
        // Check which apples are in the selection area with increased sensitivity
        const appleElements = document.querySelectorAll('.apple:not(.removed)');
        appleElements.forEach(apple => {
            const appleRect = apple.getBoundingClientRect();
            
            // Expand apple detection area for easier selection
            const expandedLeft = appleRect.left - 10;
            const expandedRight = appleRect.right + 10;
            const expandedTop = appleRect.top - 10;
            const expandedBottom = appleRect.bottom + 10;
            
            // Check if selection area overlaps with expanded apple area
            if (!(right < expandedLeft || left > expandedRight || bottom < expandedTop || top > expandedBottom)) {
                this.selectedApples.add(parseInt(apple.dataset.index));
            }
        });
        
        this.updateSelectionDisplay();
    }

    updateSelectionDisplay() {
        const appleElements = document.querySelectorAll('.apple');
        appleElements.forEach((element, index) => {
            if (this.selectedApples.has(index)) {
                element.classList.add('selected');
            } else {
                element.classList.remove('selected');
            }
        });
    }

    validateSelection() {
        if (this.selectedApples.size === 0) return;
        
        let sum = 0;
        this.selectedApples.forEach(index => {
            if (!this.apples[index].removed) {
                sum += this.apples[index].number;
            }
        });
        
        if (sum === 10) {
            // Valid selection - add score first, then remove apples
            const selectedCount = this.selectedApples.size;
            this.score += selectedCount;
            this.timeLeft += selectedCount; // 점수 1점 = 시간 1초 추가
            this.updateScore();
            this.showScoreAnimation(selectedCount);
            this.playEatAppleSound(); // 사과 먹는 소리 재생
            this.removeSelectedApples();
        } else {
            // Invalid selection - deselect
            this.selectedApples.clear();
            this.updateSelectionDisplay();
        }
    }

    removeSelectedApples() {
        this.selectedApples.forEach(index => {
            this.apples[index].removed = true;
        });
        this.selectedApples.clear();
        this.updateAppleDisplay();
        this.updateSelectionDisplay();
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('currentScore').textContent = this.score;
        document.getElementById('timer').textContent = this.timeLeft;
        this.updateProgressBar(); // 시간 추가 시 진행 바도 즉시 업데이트
    }

    showScoreAnimation(score) {
        // Create score animation element
        const scoreElement = document.createElement('div');
        scoreElement.className = 'score-animation';
        scoreElement.textContent = `+${score}`;
        
        // Position it in the center of the game board
        const gameBoard = document.getElementById('gameBoard');
        const gameBoardRect = gameBoard.getBoundingClientRect();
        scoreElement.style.position = 'fixed';
        scoreElement.style.left = (gameBoardRect.left + gameBoardRect.width / 2) + 'px';
        scoreElement.style.top = (gameBoardRect.top + gameBoardRect.height / 2) + 'px';
        scoreElement.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(scoreElement);
        
        // Remove after 1 second
        setTimeout(() => {
            if (scoreElement.parentNode) {
                scoreElement.parentNode.removeChild(scoreElement);
            }
        }, 1000);
    }

    startTimer() {
        this.updateProgressBar(); // 초기 진행 바 설정
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            document.getElementById('timer').textContent = this.timeLeft;
            this.updateProgressBar(); // 진행 바 업데이트
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }

    updateProgressBar() {
        const progressFill = document.getElementById('timeProgressFill');
        const progressPercentage = (this.timeLeft / 60) * 100;
        progressFill.style.height = progressPercentage + '%';
        
        // 시간에 따른 색상 변화
        if (progressPercentage > 50) {
            progressFill.style.background = 'linear-gradient(to top, #27ae60, #2ecc71, #58d68d)';
        } else if (progressPercentage > 25) {
            progressFill.style.background = 'linear-gradient(to top, #f39c12, #e67e22, #f1c40f)';
        } else {
            progressFill.style.background = 'linear-gradient(to top, #e74c3c, #c0392b, #ec7063)';
        }
    }

    endGame() {
        this.gameState = 'ended';
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        document.getElementById('gameState').textContent = 'ended';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverModal').style.display = 'block';
        this.updateGameState();
    }

    startNewGame() {
        this.score = 0;
        this.timeLeft = 60;
        this.gameState = 'playing';
        this.selectedApples.clear();
        this.isDragging = false;
        this.removeDragBox();
        
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        document.getElementById('gameState').textContent = 'playing';
        document.getElementById('timer').textContent = this.timeLeft;
        document.getElementById('gameOverModal').style.display = 'none';
        document.getElementById('newGameBtn').disabled = true;
        document.getElementById('newGameBtn').textContent = '게임 진행 중...';
        
        this.generateApples();
        this.updateScore();
        this.updateSelectionDisplay();
        this.updateProgressBar(); // 진행 바 초기화
        this.startTimer();
    }

    restartGame() {
        this.startNewGame();
    }

    showGame() {
        // Hide start screen and show game
        document.getElementById('startScreen').style.display = 'none';
        document.getElementById('gameContainer').style.display = 'block';
        this.startNewGame();
    }

    returnToStartScreen() {
        // Stop current game
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Reset game state
        this.gameState = 'ready';
        this.isDragging = false;
        this.removeDragBox();
        
        // Show start screen and hide game
        document.getElementById('startScreen').style.display = 'flex';
        document.getElementById('gameContainer').style.display = 'none';
    }

    initAudio() {
        this.backgroundMusic = document.getElementById('backgroundMusic');
        this.backgroundMusic.volume = this.volume / 100;
        
        // Initialize Web Audio API for sound effects
        this.initWebAudio();
        
        // Try to play music when user interacts
        document.addEventListener('click', () => {
            if (!this.isMuted && this.backgroundMusic.paused) {
                this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
            }
        }, { once: true });
    }

    initWebAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('Web Audio API initialized for sound effects');
        } catch (e) {
            console.log('Web Audio API not supported, sound effects disabled');
        }
    }

    playEatAppleSound() {
        if (this.isMuted || !this.audioContext) return;
        
        try {
            const sampleRate = this.audioContext.sampleRate;
            const duration = 0.3; // 0.3 seconds
            const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
            const data = buffer.getChannelData(0);
            
            // Create a crunchy apple bite sound
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                
                // Mix multiple frequencies for a crunchy sound
                const freq1 = 150 + Math.sin(t * 30) * 50; // Base frequency
                const freq2 = 300 + Math.sin(t * 60) * 100; // Mid frequency
                const freq3 = 600 + Math.sin(t * 90) * 200; // High frequency
                
                // Create noise component for crunchiness
                const noise = (Math.random() - 0.5) * 0.2;
                
                // Combine all components
                const wave1 = Math.sin(2 * Math.PI * freq1 * t) * 0.4;
                const wave2 = Math.sin(2 * Math.PI * freq2 * t) * 0.3;
                const wave3 = Math.sin(2 * Math.PI * freq3 * t) * 0.2;
                
                // Apply envelope (quick attack, quick decay)
                const envelope = Math.exp(-t * 6) * (1 - Math.exp(-t * 40));
                
                data[i] = (wave1 + wave2 + wave3 + noise) * envelope * 0.3;
            }
            
            // Create and play the sound
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start();
            
        } catch (e) {
            console.log('Eat apple sound failed:', e);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        const speakerIcon = document.getElementById('speakerIcon');
        
        if (this.isMuted) {
            speakerIcon.textContent = '🔇';
            this.backgroundMusic.pause();
        } else {
            speakerIcon.textContent = '🔊';
            this.backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
        }
    }

    changeVolume(event) {
        this.volume = event.target.value;
        this.backgroundMusic.volume = this.volume / 100;
    }

    updateGameState() {
        const newGameBtn = document.getElementById('newGameBtn');
        if (this.gameState === 'ready') {
            newGameBtn.disabled = false;
            newGameBtn.textContent = '새게임 시작';
        } else if (this.gameState === 'playing') {
            newGameBtn.disabled = true;
            newGameBtn.textContent = '게임 진행 중...';
        } else if (this.gameState === 'ended') {
            newGameBtn.disabled = false;
            newGameBtn.textContent = '새게임 시작';
        }
    }
}

// Global game instance
let gameInstance = null;

// Utility functions
function goToIntro() {
    if (gameInstance) {
        gameInstance.returnToStartScreen();
    }
}

function restartGame() {
    if (gameInstance) {
        gameInstance.restartGame();
    }
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    gameInstance = new ApplePuzzleGame();
});
