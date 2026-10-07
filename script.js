/* ================== KONFIGURASI ================== */
const SIZE = 20;
const COLS = 'ABCDEFGHIJKLMNOPQRST'.split('');
const SHIPS = [
  { name: 'Carrier',    size: 5 },
  { name: 'Battleship', size: 4 },
  { name: 'Cruiser',    size: 3 },
  { name: 'Submarine',  size: 3 },
  { name: 'Destroyer',  size: 2 },
];
const WATER = 0, SHIP = 1, MISS = 2, HIT = 3;

/* ================== BOARD ================== */
class Board {
  constructor() {
    this.cells = Array.from({ length: SIZE }, () => Array(SIZE).fill(WATER));
    this.ships = [];
  }

  canPlace(row, col, size, horizontal) {
    if (horizontal) {
      if (col + size > SIZE) return false;
      for (let c = col; c < col + size; c++)
        if (this.cells[row][c] !== WATER) return false;
    } else {
      if (row + size > SIZE) return false;
      for (let r = row; r < row + size; r++)
        if (this.cells[r][col] !== WATER) return false;
    }
    return true;
  }

  placeShip(name, size, row, col, horizontal) {
    if (!this.canPlace(row, col, size, horizontal)) return false;
    const coords = [];
    if (horizontal) {
      for (let c = col; c < col + size; c++) {
        this.cells[row][c] = SHIP;
        coords.push([row, c]);
      }
    } else {
      for (let r = row; r < row + size; r++) {
        this.cells[r][col] = SHIP;
        coords.push([r, col]);
      }
    }
    this.ships.push({ name, size, coords, horizontal, sunk: false });
    return true;
  }

  randomPlaceAll() {
    for (const ship of SHIPS) {
      let ok = false, tries = 0;
      while (!ok && tries < 2000) {
        tries++;
        const h = Math.random() < 0.5;
        const r = Math.floor(Math.random() * SIZE);
        const c = Math.floor(Math.random() * SIZE);
        if (this.placeShip(ship.name, ship.size, r, c, h)) ok = true;
      }
    }
  }

  fire(row, col) {
    if (this.cells[row][col] === MISS || this.cells[row][col] === HIT)
      return 'invalid';

    if (this.cells[row][col] === SHIP) {
      this.cells[row][col] = HIT;
      const ship = this.shipAt(row, col);
      if (ship && ship.coords.every(([r, c]) => this.cells[r][c] === HIT)) {
        ship.sunk = true;
        return 'sunk';
      }
      return 'hit';
    }

    this.cells[row][col] = MISS;
    return 'miss';
  }

  shipAt(row, col) {
    return this.ships.find(s => s.coords.some(([r, c]) => r === row && c === col));
  }

  allSunk() { return this.ships.every(s => s.sunk); }
  sunkShips() { return this.ships.filter(s => s.sunk); }
}

/* ================== BOT ================== */
class Bot {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.tried = new Set();
    this.targets = [];
    this.activeHits = [];
  }

  key(r, c) { return r + ',' + c; }

  randomUntried() {
    const avail = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!this.tried.has(this.key(r, c))) avail.push([r, c]);
    return avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
  }

  pickTarget() {
    if (this.difficulty === 'easy') return this.randomUntried();

    if (this.targets.length) return this.targets.shift();

    if (this.difficulty === 'hard') {
      const parity = [];
      for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++)
          if ((r + c) % 2 === 0 && !this.tried.has(this.key(r, c)))
            parity.push([r, c]);
      if (parity.length)
        return parity[Math.floor(Math.random() * parity.length)];
    }

    return this.randomUntried();
  }

  feedback(r, c, result) {
    this.tried.add(this.key(r, c));

    if (result === 'miss' || result === 'invalid') return;
    if (this.difficulty === 'easy') return;

    if (result === 'sunk') {
      this.activeHits = [];
      this.targets = [];
      return;
    }

    if (this.activeHits.length > 0) {
      const adjacent = this.activeHits.some(
        ([hr, hc]) => Math.abs(hr - r) + Math.abs(hc - c) === 1
      );
      if (!adjacent) {
        this.activeHits = [];
        this.targets = [];
      }
    }
    this.activeHits.push([r, c]);

    if (this.difficulty === 'hard' && this.activeHits.length >= 2) {
      this.followLine();
    } else {
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nr = r + dr, nc = c + dc;
        if (
          nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
          !this.tried.has(this.key(nr, nc)) &&
          !this.targets.some(t => t[0] === nr && t[1] === nc)
        ) {
          this.targets.push([nr, nc]);
        }
      }
    }
  }

  followLine() {
    const rows = this.activeHits.map(h => h[0]);
    const cols = this.activeHits.map(h => h[1]);
    const minR = Math.min(...rows), maxR = Math.max(...rows);
    const minC = Math.min(...cols), maxC = Math.max(...cols);

    if (minR === maxR) {
      const l = minC - 1, r = maxC + 1;
      if (l >= 0 && !this.tried.has(this.key(minR, l)))
        this.targets.unshift([minR, l]);
      if (r < SIZE && !this.tried.has(this.key(minR, r)))
        this.targets.unshift([minR, r]);
    } else if (minC === maxC) {
      const t = minR - 1, b = maxR + 1;
      if (t >= 0 && !this.tried.has(this.key(t, minC)))
        this.targets.unshift([t, minC]);
      if (b < SIZE && !this.tried.has(this.key(b, minC)))
        this.targets.unshift([b, minC]);
    }
  }
}

/* ================== STATE ================== */
let difficulty = 'normal';
let placementMode = 'auto';

let playerBoard, enemyBoard, bot;
let gameOver = false;
let playerTurn = false;

/* Fase penempatan manual */
let placing = false;
let placementIndex = 0;
let placementHorizontal = true;

/* ================== DOM ================== */
const subtitleEl       = document.getElementById('subtitle');
const screens          = document.querySelectorAll('.screen');
const difficultyBtns   = document.querySelectorAll('[data-difficulty]');
const modeBtns         = document.querySelectorAll('[data-mode]');
const backToDiffBtn    = document.getElementById('back-to-difficulty');

const playerBoardEl    = document.getElementById('player-board');
const enemyBoardEl     = document.getElementById('enemy-board');
const enemyWrapperEl   = document.getElementById('enemy-wrapper');
const playerTitleEl    = document.getElementById('player-title');
const logEl            = document.getElementById('log');
const winnerEl         = document.getElementById('winner');
const enemySunkEl      = document.getElementById('enemy-sunk');
const playerSunkEl     = document.getElementById('player-sunk');

const placementPanelEl = document.getElementById('placement-panel');
const currentShipNameEl= document.getElementById('current-ship-name');
const rotateBtn        = document.getElementById('rotate-btn');
const shipsListEl      = document.getElementById('ships-list');

const newGameBtn       = document.getElementById('new-game');

/* ================== SCREEN CONTROL ================== */
function showScreen(id) {
  screens.forEach(s => s.classList.toggle('active', s.id === id));
}

/* ================== RENDER ================== */
function buildBoardGrid(boardEl, isEnemy) {
  boardEl.innerHTML = '';

  const corner = document.createElement('div');
  corner.className = 'label';
  boardEl.appendChild(corner);

  for (let c = 0; c < SIZE; c++) {
    const l = document.createElement('div');
    l.className = 'label';
    l.textContent = COLS[c];
    boardEl.appendChild(l);
  }

  for (let r = 0; r < SIZE; r++) {
    const rl = document.createElement('div');
    rl.className = 'label';
    rl.textContent = r + 1;
    boardEl.appendChild(rl);

    for (let c = 0; c < SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = r;
      cell.dataset.col = c;
      if (isEnemy) {
        cell.addEventListener('click', onEnemyCellClick);
      } else {
        cell.addEventListener('click', onPlayerCellClick);
        cell.addEventListener('mouseenter', onPlayerCellHover);
        cell.addEventListener('contextmenu', onPlayerCellRightClick);
      }
      boardEl.appendChild(cell);
    }
  }
}

function renderBoard(boardEl, board, showShips) {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = boardEl.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
      if (!cell) continue;

      cell.className = 'cell';
      const v = board.cells[r][c];
      if (v === HIT) cell.classList.add('hit');
      else if (v === MISS) cell.classList.add('miss');
      else if (v === SHIP && showShips) cell.classList.add('ship');
    }
  }
}

function renderSunkShips() {
  const eSunk = enemyBoard.sunkShips();
  const pSunk = playerBoard.sunkShips();

  enemySunkEl.innerHTML = eSunk.length
    ? eSunk.map(s => `<span>💀 ${s.name}</span>`).join('')
    : '—';

  playerSunkEl.innerHTML = pSunk.length
    ? pSunk.map(s => `<span>💀 ${s.name}</span>`).join('')
    : '—';
}

function log(msg, cls = 'info') {
  const div = document.createElement('div');
  div.className = 'line ' + cls;
  div.innerHTML = msg;
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

/* ================== ALUR: SCREEN 1 → 2 ================== */
difficultyBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    difficulty = btn.dataset.difficulty;
    subtitleEl.textContent = `Kesulitan: ${difficulty.toUpperCase()}`;
    showScreen('screen-placement');
  });
});

backToDiffBtn.addEventListener('click', () => {
  subtitleEl.textContent = 'Papan 20 × 20';
  showScreen('screen-difficulty');
});

/* ================== ALUR: SCREEN 2 → 3 ================== */
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    placementMode = btn.dataset.mode;
    startGame();
  });
});

/* ================== START GAME ================== */
function startGame() {
  gameOver = false;
  placing = false;
  placementIndex = 0;
  placementHorizontal = true;

  playerBoard = new Board();
  enemyBoard = new Board();
  bot = new Bot(difficulty);

  buildBoardGrid(playerBoardEl, false);
  buildBoardGrid(enemyBoardEl, true);

  winnerEl.style.display = 'none';
  winnerEl.className = '';
  logEl.innerHTML = '';
  document.body.classList.remove('phase-manual');

  showScreen('screen-game');

  if (placementMode === 'manual') {
    startManualPlacement();
  } else {
    startAutoGame();
  }
}

/* ================== MODE OTOMATIS ================== */
function startAutoGame() {
  playerBoard.randomPlaceAll();
  enemyBoard.randomPlaceAll();

  playerTitleEl.textContent = '🚢 Papanmu';
  enemyWrapperEl.style.display = '';
  placementPanelEl.classList.remove('active');
  playerBoardEl.classList.remove('placing');
  enemyBoardEl.classList.remove('locked');

  renderBoard(playerBoardEl, playerBoard, true);
  renderBoard(enemyBoardEl, enemyBoard, false);
  renderSunkShips();

  playerTurn = true;

  log(`Permainan baru dimulai. Kesulitan: <b>${difficulty.toUpperCase()}</b>`, 'info');
  log('Kapal ditempatkan otomatis. Klik papan musuh untuk menembak.', 'info');
}

/* ================== MODE MANUAL ================== */
function startManualPlacement() {
  placing = true;
  placementIndex = 0;
  placementHorizontal = true;

  // Musuh sudah disiapkan tapi disembunyikan
  enemyBoard.randomPlaceAll();

  playerTitleEl.textContent = '🚢 Atur Posisi Kapalmu';
  placementPanelEl.classList.add('active');
  playerBoardEl.classList.add('placing');
  enemyBoardEl.classList.add('locked');

  document.body.classList.add('phase-manual');

  renderBoard(playerBoardEl, playerBoard, true);
  updatePlacementUI();

  log('🚢 Fase penempatan manual dimulai.', 'info');
  log('Klik papan untuk menempatkan kapal. Klik kanan untuk rotasi.', 'info');
}

function updatePlacementUI() {
  const ship = SHIPS[placementIndex];
  if (!ship) return;

  currentShipNameEl.textContent = `${ship.name} (${ship.size} kotak)`;
  rotateBtn.textContent = placementHorizontal
    ? '🔄 Horizontal ↔'
    : '🔄 Vertikal ↕';

  shipsListEl.innerHTML = SHIPS.map((s, i) => {
    if (i < placementIndex) return `<div class="ship-item placed">✅ ${s.name} (${s.size})</div>`;
    if (i === placementIndex) return `<div class="ship-item current">▶ ${s.name} (${s.size})</div>`;
    return `<div class="ship-item">○ ${s.name} (${s.size})</div>`;
  }).join('');
}

function clearPreview() {
  playerBoardEl
    .querySelectorAll('.preview-valid, .preview-invalid')
    .forEach(el => el.classList.remove('preview-valid', 'preview-invalid'));
}

function onPlayerCellHover(e) {
  if (!placing) return;
  const ship = SHIPS[placementIndex];
  if (!ship) return;

  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  clearPreview();
  const valid = playerBoard.canPlace(r, c, ship.size, placementHorizontal);

  for (let i = 0; i < ship.size; i++) {
    const nr = placementHorizontal ? r : r + i;
    const nc = placementHorizontal ? c + i : c;
    if (nr >= SIZE || nc >= SIZE) break;
    const el = playerBoardEl.querySelector(`.cell[data-row="${nr}"][data-col="${nc}"]`);
    if (el) el.classList.add(valid ? 'preview-valid' : 'preview-invalid');
  }
}

function onPlayerCellClick(e) {
  if (!placing) return;
  const ship = SHIPS[placementIndex];
  if (!ship) return;

  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  if (!playerBoard.placeShip(ship.name, ship.size, r, c, placementHorizontal)) {
    log(`❌ ${ship.name} tidak bisa ditempatkan di sana.`, 'miss');
    return;
  }

  placementIndex++;
  clearPreview();
  renderBoard(playerBoardEl, playerBoard, true);

  if (placementIndex >= SHIPS.length) {
    finishManualPlacement();
  } else {
    updatePlacementUI();
    log(`✅ ${ship.name} ditempatkan. Lanjut: ${SHIPS[placementIndex].name}.`, 'info');
  }
}

function onPlayerCellRightClick(e) {
  if (!placing) return;
  e.preventDefault();
  toggleOrientation();
}

function toggleOrientation() {
  if (!placing) return;
  placementHorizontal = !placementHorizontal;
  rotateBtn.textContent = placementHorizontal
    ? '🔄 Horizontal ↔'
    : '🔄 Vertikal ↕';
  clearPreview();
}

function finishManualPlacement() {
  placing = false;
  placementPanelEl.classList.remove('active');
  playerBoardEl.classList.remove('placing');
  enemyBoardEl.classList.remove('locked');
  clearPreview();

  document.body.classList.remove('phase-manual');
  enemyWrapperEl.style.display = '';
  playerTitleEl.textContent = '🚢 Papanmu';

  playerTurn = true;
  renderSunkShips();

  log('🎯 Semua kapal ditempatkan! Pertempuran dimulai.', 'sunk');
  log('Klik papan musuh untuk menembak.', 'info');
}

/* ================== SERANGAN PEMBUAT ================== */
function onEnemyCellClick(e) {
  if (gameOver || !playerTurn || placing) return;

  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  if (enemyBoard.cells[r][c] === HIT || enemyBoard.cells[r][c] === MISS) return;

  playerTurn = false;
  enemyBoardEl.classList.add('locked');

  const result = enemyBoard.fire(r, c);
  const coordLabel = `${COLS[c]}${r + 1}`;

  renderBoard(enemyBoardEl, enemyBoard, false);

  if (result === 'sunk') {
    const ship = enemyBoard.shipAt(r, c);
    log(`🎯 <b>${coordLabel}</b> — KENA! Kapal <b>${ship.name.toUpperCase()}</b> HANCUR!`, 'sunk');
  } else if (result === 'hit') {
    log(`🎯 <b>${coordLabel}</b> — KENA!`, 'hit');
  } else {
    log(`💦 <b>${coordLabel}</b> — meleset.`, 'miss');
  }

  renderSunkShips();

  if (enemyBoard.allSunk()) { endGame(true); return; }
  setTimeout(botTurn, 500);
}

/* ================== GILIRAN BOT ================== */
function botTurn() {
  if (gameOver || placing) return;

  const target = bot.pickTarget();
  if (!target) return;

  const [r, c] = target;
  const result = playerBoard.fire(r, c);
  bot.feedback(r, c, result);
  renderBoard(playerBoardEl, playerBoard, true);

  const coordLabel = `${COLS[c]}${r + 1}`;

  if (result === 'sunk') {
    const ship = playerBoard.shipAt(r, c);
    log(`💥 Musuh menembak <b>${coordLabel}</b> — <b>${ship.name.toUpperCase()}</b> HANCUR!`, 'sunk');
  } else if (result === 'hit') {
    log(`💥 Musuh menembak <b>${coordLabel}</b> — KENA!`, 'hit');
  } else {
    log(`🌊 Musuh menembak <b>${coordLabel}</b> — meleset.`, 'miss');
  }

  renderSunkShips();

  if (playerBoard.allSunk()) { endGame(false); return; }

  playerTurn = true;
  enemyBoardEl.classList.remove('locked');
}

/* ================== SELESAI ================== */
function endGame(playerWon) {
  gameOver = true;
  enemyBoardEl.classList.add('locked');

  if (playerWon) {
    winnerEl.textContent = '🎉 SELAMAT! Kamu menenggelamkan semua kapal musuh!';
    winnerEl.className = 'win';
    log('🎉 Kamu menang!', 'sunk');
  } else {
    winnerEl.textContent = '💥 Kamu kalah! Semua kapalmu tenggelam.';
    winnerEl.className = 'lose';
    log('💥 Kamu kalah.', 'sunk');
  }

  renderBoard(enemyBoardEl, enemyBoard, true);
}

/* ================== EVENT ================== */
rotateBtn.addEventListener('click', toggleOrientation);
newGameBtn.addEventListener('click', () => {
  document.body.classList.remove('phase-manual');
  subtitleEl.textContent = 'Papan 20 × 20';
  showScreen('screen-difficulty');
});

playerBoardEl.addEventListener('contextmenu', (e) => {
  if (placing) e.preventDefault();
});

/* ================== INIT ================== */
showScreen('screen-difficulty');