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

/* ================== WARNA KAPAL ================== */
const SHIP_COLORS = {
  Carrier:    { main: '#8b5cf6', accent: '#c4b5fd' },
  Battleship: { main: '#f97316', accent: '#fdba74' },
  Cruiser:    { main: '#eab308', accent: '#fde047' },
  Submarine:  { main: '#334155', accent: '#64748b' },
  Destroyer:  { main: '#ec4899', accent: '#f9a8d4' },
};

/* ================== JOLLY ROGER (SVG) ================== */
const JOLLY_ROGER_SVG = `
  <svg viewBox="0 0 200 200" class="jolly-roger" xmlns="http://www.w3.org/2000/svg">
    <!-- Tulang silang (belakang tengkorak) -->
    <g stroke="#e2e8f0" stroke-width="16" stroke-linecap="round">
      <line x1="35" y1="35" x2="165" y2="165"/>
      <line x1="165" y1="35" x2="35" y2="165"/>
    </g>
    <g fill="#e2e8f0">
      <circle cx="35" cy="35" r="14"/>
      <circle cx="165" cy="165" r="14"/>
      <circle cx="165" cy="35" r="14"/>
      <circle cx="35" cy="165" r="14"/>
    </g>
    <!-- Tengkorak -->
    <ellipse cx="100" cy="85" rx="58" ry="62" fill="#f1f5f9"/>
    <path d="M 60 130 L 140 130 L 135 165 Q 130 175 100 175 Q 70 175 65 165 Z"
          fill="#f1f5f9"/>
    <!-- Mata -->
    <ellipse cx="76" cy="82" rx="15" ry="17" fill="#0f172a"/>
    <ellipse cx="124" cy="82" rx="15" ry="17" fill="#0f172a"/>
    <!-- Hidung -->
    <path d="M 100 100 L 93 115 L 107 115 Z" fill="#0f172a"/>
    <!-- Gigi -->
    <g stroke="#0f172a" stroke-width="2.5">
      <line x1="78" y1="130" x2="78" y2="162"/>
      <line x1="89" y1="130" x2="89" y2="165"/>
      <line x1="100" y1="130" x2="100" y2="168"/>
      <line x1="111" y1="130" x2="111" y2="165"/>
      <line x1="122" y1="130" x2="122" y2="162"/>
    </g>
  </svg>
`;

/* ================== SVG KAPAL (per segmen) ================== */
/**
 * @param {string} shipName - nama kapal (Carrier, dst)
 * @param {'head'|'body'|'tail'} part - bagian kapal
 * @param {boolean} horizontal - true = kapal mendatar
 */
function shipSegmentSVG(shipName, part, horizontal) {
  const colors = SHIP_COLORS[shipName] || { main: '#64748b', accent: '#94a3b8' };
  const { main, accent } = colors;

  // Bentuk dasar untuk kapal horizontal (haluan di KANAN, buritan di KIRI)
  let shape;
  if (part === 'head') {
    // Haluan — runcing ke kanan
    shape = `<path d="M 0,4 L 13,4 L 19,10 L 13,16 L 0,16 Z"
                   fill="${main}" stroke="${accent}" stroke-width="0.6"/>`;
  } else if (part === 'tail') {
    // Buritan — rounded di kiri
    shape = `<path d="M 3,4 L 20,4 L 20,16 L 3,16 Q -1,10 3,4 Z"
                   fill="${main}" stroke="${accent}" stroke-width="0.6"/>`;
  } else {
    // Badan — kotak polos
    shape = `<rect x="0" y="4" width="20" height="12"
                   fill="${main}" stroke="${accent}" stroke-width="0.6"/>`;
  }

  // Kalau vertikal, rotasi 90° di sekitar pusat
  const inner = horizontal
    ? shape
    : `<g transform="rotate(90 10 10)">${shape}</g>`;

  return `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

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
/* ================== BOT ================== */
class Bot {
  constructor(difficulty) {
    this.difficulty = difficulty;
    this.tried = new Set();
    this.targets = [];        // antrian target prioritas
    this.activeHits = [];     // koordinat hit pada kapal yang sedang dikejar
    this.lockedAxis = null;   // 'h' | 'v' — dipakai expert saat sudah tahu arah
  }

  key(r, c) { return r + ',' + c; }

  randomUntried() {
    const avail = [];
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!this.tried.has(this.key(r, c))) avail.push([r, c]);
    return avail.length ? avail[Math.floor(Math.random() * avail.length)] : null;
  }

  /* ========== PILIH TARGET BERIKUTNYA ========== */
  pickTarget() {
    // Easy: selalu acak
    if (this.difficulty === 'easy') return this.randomUntried();

    // Semua level (kecuali easy): utamakan antrian target
    if (this.targets.length) return this.targets.shift();

    // Hard & Expert: pola catur untuk fase mencari
    if (this.difficulty === 'hard' || this.difficulty === 'expert') {
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

  /* ========== UMPAN BALIK HASIL TEMBAKAN ========== */
  feedback(r, c, result) {
    this.tried.add(this.key(r, c));

    // Meleset / sudah pernah → tidak ada yang perlu dilakukan
    if (result === 'miss' || result === 'invalid') return;

    // Easy tidak belajar
    if (this.difficulty === 'easy') return;

    // ---- KAPAL TENGGELAM → reset semua state & kembali mencari ----
    if (result === 'sunk') {
      this.activeHits = [];
      this.targets = [];
      this.lockedAxis = null;
      return;
    }

    // ---- HIT ----

    // Kalau hit baru tidak bersebelahan dengan kumpulan activeHits,
    // berarti ini kapal baru → reset agar tidak salah mengejar
    if (this.activeHits.length > 0) {
      const adjacent = this.activeHits.some(
        ([hr, hc]) => Math.abs(hr - r) + Math.abs(hc - c) === 1
      );
      if (!adjacent) {
        this.activeHits = [];
        this.targets = [];
        this.lockedAxis = null;
      }
    }

    this.activeHits.push([r, c]);

    // ---- Tentukan strategi ----

    // EXPERT: begitu punya 2+ hit, kunci sumbu & habisi garis
    if (this.difficulty === 'expert' && this.activeHits.length >= 2) {
      this.lockAxisAndPursue();
      return;
    }

    // HARD: sama, tapi tanpa kunci sumbu permanen
    if (this.difficulty === 'hard' && this.activeHits.length >= 2) {
      this.followLine();
      return;
    }

    // ---- Baru 1 hit → periksa 4 tetangga ----
    // EXPERT: LIFO (unshift) → dive dalam, selesaikan kapal ini dulu
    // NORMAL/HARD: FIFO (push) → sebar pencarian
    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of neighbors) {
      const nr = r + dr, nc = c + dc;
      if (
        nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE &&
        !this.tried.has(this.key(nr, nc)) &&
        !this.targets.some(t => t[0] === nr && t[1] === nc)
      ) {
        if (this.difficulty === 'expert') {
          this.targets.unshift([nr, nc]);    // prioritas tertinggi
        } else {
          this.targets.push([nr, nc]);       // di belakang antrian
        }
      }
    }
  }

  /* ========== EXPERT: kunci sumbu + habisi kapal ========== */
  lockAxisAndPursue() {
    const rows = this.activeHits.map(h => h[0]);
    const cols = this.activeHits.map(h => h[1]);
    const minR = Math.min(...rows), maxR = Math.max(...rows);
    const minC = Math.min(...cols), maxC = Math.max(...cols);

    // Tentukan sumbu kalau belum
    if (!this.lockedAxis) {
      if (minR === maxR)      this.lockedAxis = 'h';
      else if (minC === maxC) this.lockedAxis = 'v';
      else {
        // L-shape (2 kapal bersebelahan?) → prioritaskan ujung terakhir
        this.lockNeighborsOfLatest();
        return;
      }
    }

    if (this.lockedAxis === 'h') {
      const r = rows[0];
      const l = minC - 1, rt = maxC + 1;
      // Coba dulu arah yang belum tentu salah — prioritaskan yang lebih panjang
      const candidates = [];
      if (l >= 0 && !this.tried.has(this.key(r, l))) candidates.push([r, l]);
      if (rt < SIZE && !this.tried.has(this.key(r, rt))) candidates.push([r, rt]);
      // Unshift di depan (LIFO) supaya segera dieksekusi
      for (const cand of candidates) {
        this.targets.unshift(cand);
      }
    } else if (this.lockedAxis === 'v') {
      const c = cols[0];
      const t = minR - 1, b = maxR + 1;
      const candidates = [];
      if (t >= 0 && !this.tried.has(this.key(t, c))) candidates.push([t, c]);
      if (b < SIZE && !this.tried.has(this.key(b, c))) candidates.push([b, c]);
      for (const cand of candidates) {
        this.targets.unshift(cand);
      }
    }
  }

  /* ========== HARD: kejar ujung garis (versi ringan) ========== */
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
    } else {
      this.lockNeighborsOfLatest();
    }
  }

  /* ========== Fallback: coba 4 tetangga dari hit terakhir ========== */
  lockNeighborsOfLatest() {
    if (!this.activeHits.length) return;
    const [lr, lc] = this.activeHits[this.activeHits.length - 1];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = lr + dr, nc = lc + dc;
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
const readyBtn         = document.getElementById('ready-btn');      // ⬅ BARU
const placementHintEl  = document.getElementById('placement-hint'); // ⬅ BARU

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
const overlayEl       = document.getElementById('overlay');
const overlayTitleEl  = document.getElementById('overlay-title');
const overlayEmblemEl = document.getElementById('overlay-emblem');
const overlayCloseBtn = document.getElementById('overlay-close');
const confettiCanvas  = document.getElementById('confetti-canvas');

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
  // Precompute segmen kapal (hanya kalau perlu tampil)
  const segMap = new Map();
  if (showShips) {
    board.ships.forEach(ship => {
      const total = ship.coords.length;
      ship.coords.forEach(([r, c], idx) => {
        let part = 'body';
        if (total > 1) {
          if (idx === 0)           part = 'tail';
          if (idx === total - 1)   part = 'head';
        }
        segMap.set(`${r},${c}`, {
          shipName: ship.name,
          part,
          horizontal: ship.horizontal,
        });
      });
    });
  }

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const cell = boardEl.querySelector(
        `.cell[data-row="${r}"][data-col="${c}"]`
      );
      if (!cell) continue;

      const v = board.cells[r][c];
      let newClass = 'cell';
      let newInner = '';

      if (v === HIT) {
        newClass = 'cell hit';
      } else if (v === MISS) {
        newClass = 'cell miss';
      } else if (v === SHIP && showShips) {
        newClass = 'cell ship';
        const seg = segMap.get(`${r},${c}`);
        if (seg) {
          newInner = shipSegmentSVG(seg.shipName, seg.part, seg.horizontal);
        }
      }

      // ⬇ KUNCI: hanya update kalau kelasnya berubah
      // Ini mencegah animasi smoke restart setiap render
      if (cell.className !== newClass) {
        cell.className = newClass;
        cell.innerHTML = newInner;
      }
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

  // Reset tombol Ready
  readyBtn.classList.remove('show');
  rotateBtn.style.display = '';
  placementHintEl.innerHTML =
    'Klik papan untuk menempatkan kapal. <b>Klik kanan</b> atau tombol rotasi untuk mengubah orientasi.';

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

/* ================== TAHAP 1: Semua kapal sudah ditempatkan ================== */
function finishManualPlacement() {
  placing = false;
  placementIndex = SHIPS.length;

  // Hapus listener hover & preview
  clearPreview();

  // Nonaktifkan interaksi klik pada papan pemain
  playerBoardEl.classList.remove('placing');

  // Ubah panel: tunjukkan pesan siap + tombol Ready
  currentShipNameEl.textContent = '✅ Semua kapal sudah ditempatkan!';
  rotateBtn.style.display = 'none';
  placementHintEl.innerHTML =
    'Cek kembali posisimu. Jika sudah yakin, klik <b>Ready</b> untuk memulai pertempuran.';
  shipsListEl.innerHTML = SHIPS.map(
    s => `<div class="ship-item placed">✅ ${s.name} (${s.size})</div>`
  ).join('');

  // Tampilkan tombol Ready
  readyBtn.classList.add('show');

  log('✅ Semua kapal siap. Klik tombol Ready untuk memulai.', 'sunk');
}

/* ================== TAHAP 2: User klik Ready → mulai bertempur ================== */
function startBattle() {
  // Sembunyikan panel penempatan
  placementPanelEl.classList.remove('active');
  readyBtn.classList.remove('show');

  // Tampilkan kedua papan sejajar
  document.body.classList.remove('phase-manual');
  enemyWrapperEl.style.display = '';

  // Kembalikan judul papan pemain
  playerTitleEl.textContent = '🚢 Papanmu';

  // Aktifkan giliran
  playerTurn = true;
  enemyBoardEl.classList.remove('locked');

  renderSunkShips();
  log('⚔️ Pertempuran dimulai! Klik papan musuh untuk menembak.', 'sunk');
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

  // Buka semua kapal musuh
  renderBoard(enemyBoardEl, enemyBoard, true);

  if (playerWon) {
    log('🎉 Kamu menang!', 'sunk');
  } else {
    log('💥 Kamu kalah.', 'sunk');
  }

  // Tampilkan overlay setelah jeda singkat (biar pemain sempat lihat papan terakhir)
  setTimeout(() => {
    if (playerWon) showVictory();
    else           showDefeat();
  }, 900);
}

/* ================== OVERLAY VICTORY / DEFEAT ================== */
function showVictory() {
  overlayTitleEl.textContent = 'VICTORY';
  overlayEmblemEl.innerHTML = '🏆';
  overlayEl.className = 'overlay show victory';
  startConfetti();
}

function showDefeat() {
  overlayTitleEl.textContent = 'GAME OVER';
  overlayEmblemEl.innerHTML = JOLLY_ROGER_SVG;
  overlayEl.className = 'overlay show defeat';
  stopConfetti();
}

function hideOverlay() {
  overlayEl.className = 'overlay';
  stopConfetti();
}

/* ================== CONFETTI ================== */
let confettiAnim = null;
let confettiResizeHandler = null;

function startConfetti() {
  const ctx = confettiCanvas.getContext('2d');

  function resize() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
  resize();
  confettiResizeHandler = resize;
  window.addEventListener('resize', resize);

  const colors = [
    '#fbbf24', '#f97316', '#ef4444', '#22c55e',
    '#3b82f6', '#a855f7', '#ec4899', '#38bdf8',
    '#fef3c7', '#fde047',
  ];

  const particles = [];
  const COUNT = 180;

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * -confettiCanvas.height,
      vx: (Math.random() - 0.5) * 2.5,
      vy: 1.5 + Math.random() * 3.5,
      size: 6 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.25,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.02 + Math.random() * 0.03,
    });
  }

  function animate() {
    ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (const p of particles) {
      p.sway += p.swaySpeed;
      p.x += p.vx + Math.sin(p.sway) * 0.8;
      p.y += p.vy;
      p.rot += p.rotSpeed;

      if (p.y > confettiCanvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * confettiCanvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    confettiAnim = requestAnimationFrame(animate);
  }

  animate();
}

function stopConfetti() {
  if (confettiAnim) {
    cancelAnimationFrame(confettiAnim);
    confettiAnim = null;
  }
  if (confettiResizeHandler) {
    window.removeEventListener('resize', confettiResizeHandler);
    confettiResizeHandler = null;
  }
  // Bersihkan canvas
  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
}

/* ================== EVENT ================== */
readyBtn.addEventListener('click', startBattle);          // ⬅ BARU
rotateBtn.addEventListener('click', toggleOrientation);
newGameBtn.addEventListener('click', () => {
  hideOverlay();
  document.body.classList.remove('phase-manual');
  subtitleEl.textContent = 'Papan 20 × 20';
  showScreen('screen-difficulty');
});

playerBoardEl.addEventListener('contextmenu', (e) => {
  if (placing) e.preventDefault();
});

overlayCloseBtn.addEventListener('click', () => {
  hideOverlay();
  document.body.classList.remove('phase-manual');
  subtitleEl.textContent = 'Papan 20 × 20';
  showScreen('screen-difficulty');
});

/* ================== INIT ================== */
showScreen('screen-difficulty');
