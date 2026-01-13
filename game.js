
(() => {
  // DOM references
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const highEl = document.getElementById('high');
  const speedText = document.getElementById('speedText');
  const modeText = document.getElementById('modeText');
  const finalScoreEl = document.getElementById('finalScore');

  const startOverlay = document.getElementById('startOverlay');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const gameOverOverlay = document.getElementById('gameOverOverlay');

  const startBtn   = document.getElementById('startBtn');
  const wrapBtn    = document.getElementById('wrapBtn');
  const speedBtn   = document.getElementById('speedBtn');
  const resetBtn   = document.getElementById('resetBtn');
  const restartBtn = document.getElementById('restartBtn');
  const menuBtn    = document.getElementById('menuBtn');

  const dpad   = document.querySelector('.dpad');
  const dUp    = dpad.querySelector('.up');
  const dDown  = dpad.querySelector('.down');
  const dLeft  = dpad.querySelector('.left');
  const dRight = dpad.querySelector('.right');
  const dOK    = dpad.querySelector('.center');

  // Game state
  let gridCols = 0, gridRows = 0, cell = 0;
  let snake = [];
  let dir = { x: 1, y: 0 };        // current direction
  let pendingDir = { x: 1, y: 0 }; // queued direction change
  let food = { x: 0, y: 0 };
  let score = 0;
  let high = parseInt(localStorage.getItem('snake_tv_high') || '0', 10);
  let tickMs = 140; // speed (ms per tick)
  let wrap = false;
  let running = false;
  let paused = false;
  let loopId = null;

  highEl.textContent = high;

  // ------- Setup & Resize -------
  function resize() {
    // Fit canvas to screen
    canvas.width  = Math.floor(window.innerWidth);
    canvas.height = Math.floor(window.innerHeight);

    // Target ~32-48px cells depending on screen size
    const target = Math.max(32, Math.min(48, Math.floor(Math.min(canvas.width, canvas.height) / 24)));
    cell = target;
    gridCols = Math.floor(canvas.width / cell);
    gridRows = Math.floor(canvas.height / cell);

    // Ensure playable bounds
    gridCols = Math.max(16, gridCols);
    gridRows = Math.max(12, gridRows);

    drawGrid();
    if (!running) drawScene();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ------- Utilities -------
  function rndInt(max) { return Math.floor(Math.random() * max); }

  function spawnFood() {
    let fx, fy, bad;
    do {
      fx = rndInt(gridCols);
      fy = rndInt(gridRows);
      bad = snake.some(s => s.x === fx && s.y === fy);
    } while (bad);
    food = { x: fx, y: fy };
  }

  function resetGame() {
    score = 0; scoreEl.textContent = score;
    dir = { x: 1, y: 0 };
    pendingDir = dir;

    // Start snake centered
    const cx = Math.floor(gridCols / 2);
    const cy = Math.floor(gridRows / 2);
    snake = [
      { x: cx - 1, y: cy },
      { x: cx,     y: cy },
      { x: cx + 1, y: cy },
    ];
    spawnFood();
    drawScene();
  }

  function setSpeed(mode) {
    if (mode === 'Slow') tickMs = 200;
    else if (mode === 'Medium') tickMs = 140;
    else tickMs = 100; // Fast
    speedText.textContent = mode;
  }

  function toggleWrap() {
    wrap = !wrap;
    modeText.textContent = wrap ? 'Wrap' : 'Walls';
  }

  function start() {
    if (running) return;
    running = true; paused = false;
    startOverlay.style.display = 'none';
    gameOverOverlay.style.display = 'none';
    pauseOverlay.style.display = 'none';
    resetGame();
    scheduleLoop();
  }

  function pause() {
    if (!running) return;
    paused = !paused;
    pauseOverlay.style.display = paused ? '' : 'none';
  }

  function gameOver() {
    running = false;
    paused = false;
    clearInterval(loopId);
    loopId = null;
    finalScoreEl.textContent = score;
    gameOverOverlay.style.display = '';
    if (score > high) {
      high = score;
      localStorage.setItem('snake_tv_high', String(high));
      highEl.textContent = high;
    }
  }

  function scheduleLoop() {
    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, tickMs);
  }

  // ------- Game Loop -------
  function tick() {
    if (paused) return;

    // Apply pending direction (prevent 180° turns)
    if ((pendingDir.x !== -dir.x || pendingDir.y !== -dir.y)) {
      dir = pendingDir;
    }

    const head = snake[snake.length - 1];
    let nx = head.x + dir.x;
    let ny = head.y + dir.y;

    // Walls vs Wrap
    if (wrap) {
      if (nx < 0) nx = gridCols - 1;
      if (ny < 0) ny = gridRows - 1;
      if (nx >= gridCols) nx = 0;
      if (ny >= gridRows) ny = 0;
    } else {
      if (nx < 0 || ny < 0 || nx >= gridCols || ny >= gridRows) {
        return gameOver();
      }
    }

    // Self-collision
    if (snake.some(s => s.x === nx && s.y === ny)) {
      return gameOver();
    }

    // Move
    const newHead = { x: nx, y: ny };
    snake.push(newHead);

    // Eat?
    if (nx === food.x && ny === food.y) {
      score += 10;
      scoreEl.textContent = score;
      spawnFood();
      // Slight speed increase as you eat
      if (tickMs > 70) {
        tickMs -= 2;
        scheduleLoop();
      }
    } else {
      snake.shift(); // remove tail
    }

    drawScene();
  }

  // ------- Rendering -------
  function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1a1f29';
    ctx.lineWidth = 1;
    for (let x = 0; x <= gridCols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, gridRows * cell);
      ctx.stroke();
    }
    for (let y = 0; y <= gridRows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(gridCols * cell, y * cell + 0.5);
      ctx.stroke();
    }
  }

  function drawScene() {
    drawGrid();

    // Food
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--food').trim();
    ctx.fillRect(food.x * cell + 4, food.y * cell + 4, cell - 8, cell - 8);

    // Snake
    const snakeColor = getComputedStyle(document.documentElement).getPropertyValue('--snake').trim();
    const headColor  = getComputedStyle(document.documentElement).getPropertyValue('--snake-head').trim();
    for (let i = 0; i < snake.length; i++) {
      const seg = snake[i];
      ctx.fillStyle = (i === snake.length - 1) ? headColor : snakeColor;
      ctx.fillRect(seg.x * cell + 2, seg.y * cell + 2, cell - 4, cell - 4);
    }
  }

  // ------- Input -------
  function setDirection(key) {
    switch (key) {
      case 'ArrowUp':    pendingDir = { x: 0, y: -1 }; break;
      case 'ArrowDown':  pendingDir = { x: 0, y:  1 }; break;
      case 'ArrowLeft':  pendingDir = { x: -1, y: 0 }; break;
      case 'ArrowRight': pendingDir = { x:  1, y: 0 }; break;
      case 'w':
      case 'W':
        toggleWrap();
        break;
      case 'Enter':
        if (!running) start();
        else pause();
        break;
      case 'r':
      case 'R':
        // Reset back to menu
        running = false;
        paused = false;
        clearInterval(loopId);
        loopId = null;
        startOverlay.style.display = '';
        pauseOverlay.style.display = 'none';
        gameOverOverlay.style.display = 'none';
        resize();
        break;
      default:
        break;
    }
  }

  window.addEventListener('keydown', (e) => {
    setDirection(e.key);
    // Prevent TV browsers from scrolling on arrow keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      e.preventDefault();
    }
  });

  // D-Pad clicks
  dUp.addEventListener('click',   () => setDirection('ArrowUp'));
  dDown.addEventListener('click', () => setDirection('ArrowDown'));
  dLeft.addEventListener('click', () => setDirection('ArrowLeft'));
  dRight.addEventListener('click',() => setDirection('ArrowRight'));
  dOK.addEventListener('click',   () => setDirection('Enter'));

  // Buttons
  startBtn.addEventListener('click', start);
  wrapBtn.addEventListener('click',  toggleWrap);
  speedBtn.addEventListener('click', () => {
    const next = { 'Slow':'Medium', 'Medium':'Fast', 'Fast':'Slow' }[speedText.textContent] || 'Medium';
    speedText.textContent = next;
    setSpeed(next);
  });
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem('snake_tv_high');
    high = 0; highEl.textContent = '0';
  });
  restartBtn.addEventListener('click', start);
  menuBtn.addEventListener('click', () => {
    running = false;
    paused = false;
    clearInterval(loopId); loopId = null;
    startOverlay.style.display = '';
    gameOverOverlay.style.display = 'none';
    resize();
  });

  // Initialize UI
  setSpeed('Medium');
  modeText.textContent = 'Walls';
})();
