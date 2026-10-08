const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Éléments du DOM
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const highScoreEl = document.getElementById('high-score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');

// Dimensions de la grille
const GRID_SIZE = 30;
const COLS = canvas.width / GRID_SIZE;
const ROWS = canvas.height / GRID_SIZE;

// Variables de jeu
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 0, y: 0 };
let obstacles = [];
let score = 0;
let level = 1;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let gameSpeed = 120;
let gameInterval = null; 
let isPlaying = false;

highScoreEl.textContent = highScore;

// Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'eat') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'levelup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    }
}

// Événements clavier
window.addEventListener('keydown', e => {
    if (!isPlaying) return;

    switch (e.key) {
        case 'ArrowUp':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
    }
});

startBtn.addEventListener('click', startGame);

function startGame() {
    snake = [
        { x: 5, y: 10 },
        { x: 4, y: 10 },
        { x: 3, y: 10 }
    ];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    level = 1;
    gameSpeed = 120;
    scoreEl.textContent = score;
    levelEl.textContent = level;

    generateObstacles();
    generateFood();

    overlay.style.display = 'none';
    isPlaying = true;
    
    if (gameInterval) clearInterval(gameInterval);
    runGameLoop();
}

function runGameLoop() {
    clearInterval(gameInterval);
    gameInterval = setInterval(() => {
        update();
        draw();
    }, gameSpeed);
}

function update() {
    direction = nextDirection;

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };

    // 1. Collision avec les murs
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        return gameOver();
    }

    // 2. Collision avec le serpent
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            return gameOver();
        }
    }

    // 3. Collision avec les obstacles
    for (let obs of obstacles) {
        if (head.x === obs.x && head.y === obs.y) {
            return gameOver();
        }
    }

    snake.unshift(head);

    // 4. Manger la pomme
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = score;
        playSound('eat');
        
        if (score > highScore) {
            highScore = score;
            highScoreEl.textContent = highScore;
            localStorage.setItem('snakeHighScore', highScore);
        }

        if (gameSpeed > 40) {
            gameSpeed -= 2;
        }

        if (score % 50 === 0) {
            level++;
            levelEl.textContent = level;
            playSound('levelup');
            generateObstacles();
        }
    
        generateFood();
        runGameLoop();
    } else {
        snake.pop();
    }
}

function draw() {
    // Effacer le canvas
    ctx.fillStyle = '#121216';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
   
    // Grille
    ctx.strokeStyle = '#1a1a22';
    for (let x = 0; x < canvas.width; x += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();      
    }

    for (let y = 0; y < canvas.height; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = '#7f8c8d';
    for (let obs of obstacles) {
        ctx.fillRect(obs.x * GRID_SIZE, obs.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
    }

    // Pomme
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    let centerX = food.x * GRID_SIZE + GRID_SIZE / 2;
    let centerY = food.y * GRID_SIZE + GRID_SIZE / 2;
    ctx.arc(centerX, centerY, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Serpent
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60';
        ctx.fillRect(
            segment.x * GRID_SIZE + 1,
            segment.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
    });
}

function generateFood() {
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * COLS);
        food.y = Math.floor(Math.random() * ROWS);

        const onSnake = snake.some(s => s.x === food.x && s.y === food.y);
        const onObstacles = obstacles.some(o => o.x === food.x && o.y === food.y);

        if (!onSnake && !onObstacles) {
            validPosition = true;
        }
    }
}

function generateObstacles() {
    obstacles = [];
    const numObstacles = (level - 1) * 3;
    for (let i = 0; i < numObstacles; i++) {
        let valid = false;
        while (!valid) {
            let obs = {
                x: Math.floor(Math.random() * COLS),
                y: Math.floor(Math.random() * ROWS)
            };
            const nearStart = obs.x < 10 && obs.y === 10;
            const onSnake = snake.some(s => s.x === obs.x && s.y === obs.y);
            const onFood = food.x === obs.x && food.y === obs.y;

            if (!nearStart && !onSnake && !onFood) {
                obstacles.push(obs);
                valid = true;
            }
        }
    }
}

function gameOver() {
    isPlaying = false;
    clearInterval(gameInterval);
    playSound('gameover');
    
    overlayTitle.textContent = "Game Over !";
    overlayTitle.style.color = "#ff4757";
    overlayMsg.textContent = `Score final : ${score} (Niveau ${level})`;
    startBtn.textContent = "Recommencer";
    overlay.style.display = 'flex';
}