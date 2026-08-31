const DIGRAPHS = ['dzs', 'cs', 'dz', 'gy', 'ly', 'ny', 'sz', 'ty', 'zs'];
const MAX_ATTEMPTS = 8;
const WORD_LEN = 5;

// Ékezet-leképezési térkép
// Minden karakter külön van kezelve:
// a ≠ á, e ≠ é, o ≠ ö ≠ ő stb.
const ACCENT_MAP = {
  'a': ['a'],
  'á': ['á'],
  'e': ['e'],
  'é': ['é'],
  'i': ['i'],
  'í': ['í'],
  'o': ['o'],
  'ó': ['ó'],
  'ö': ['ö'],
  'ő': ['ő'],
  'u': ['u'],
  'ú': ['ú'],
  'ü': ['ü'],
  'ű': ['ű']
};

let wordList = [];
let secretWordTokens = [];
let currentAttempt = 0;
let currentGuessTokens = [];
let gameOver = false;

function tokenize(word) {
  const tokens = [];
  let i = 0;
  const lower = word.toLowerCase().trim();

  while (i < lower.length) {
    let matched = null;

    for (const dg of DIGRAPHS) {
      if (lower.startsWith(dg, i)) {
        matched = dg;
        break;
      }
    }

    if (matched) {
      tokens.push(matched);
      i += matched.length;
    } else {
      tokens.push(lower[i]);
      i += 1;
    }
  }

  return tokens;
}

function initGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;

    for (let c = 0; c < WORD_LEN; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.id = `cell-${r}-${c}`;
      row.appendChild(cell);
    }

    grid.appendChild(row);
  }
}

async function loadWords() {
  try {
    const response = await fetch('szavak.txt');
    const text = await response.text();

    wordList = text
      .split('\n')
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0 && tokenize(w).length === WORD_LEN);

    if (wordList.length === 0) {
      showMsg("Hiba a szavak beolvasásakor!");
      return;
    }

    const randomWord =
      wordList[Math.floor(Math.random() * wordList.length)];

    secretWordTokens = tokenize(randomWord);

    console.log("Megfejtés:", randomWord);

  } catch (error) {
    showMsg("Nem sikerült betölteni a szavakat!");
  }
}

function showMsg(text) {
  document.getElementById('msg').textContent = text;
}

function handleKeyPress(key) {
  if (gameOver) return;

  if (key === 'back') {
    if (currentGuessTokens.length > 0) {
      currentGuessTokens.pop();
      updateRowVisuals();
    }

  } else if (key === 'enter') {
    if (currentGuessTokens.length === WORD_LEN) {
      checkGuess();
    } else {
      showMsg("Nincs meg az 5 betű!");
    }

  } else {
    if (currentGuessTokens.length < WORD_LEN) {
      currentGuessTokens.push(key);
      updateRowVisuals();
    }
  }
}

function updateRowVisuals() {
  for (let c = 0; c < WORD_LEN; c++) {
    const cell = document.getElementById(
      `cell-${currentAttempt}-${c}`
    );

    cell.textContent =
      currentGuessTokens[c]
        ? currentGuessTokens[c]
        : '';
  }
}

// Minden karakter saját billentyű.
// Nincs a ↔ á vagy e ↔ é kapcsolat.
function getBaseKey(letter) {
  return letter;
}

async function checkGuess() {
  const guessString =
    currentGuessTokens.join('').toLowerCase();

  // Ellenőrizzük, hogy létező szó-e
  if (!wordList.includes(guessString)) {
    showMsg("Nincs ilyen szó a listában!");
    return;
  }

  showMsg("");

  const secretRemaining =
    secretWordTokens.map(t => t.toLowerCase());

  const guessLower =
    currentGuessTokens.map(t => t.toLowerCase());

  const statuses =
    Array(WORD_LEN).fill('absent');

  // ========================================
  // 1. KÖR – PONTOS EGYEZÉS
  // ========================================

  for (let i = 0; i < WORD_LEN; i++) {
    if (guessLower[i] === secretRemaining[i]) {
      statuses[i] = 'correct';
      secretRemaining[i] = null;
    }
  }

  // ========================================
  // 2. KÖR – RÉSZLEGES EGYEZÉS
  // ========================================

  for (let i = 0; i < WORD_LEN; i++) {
    if (statuses[i] === 'correct') continue;

    const idx =
      secretRemaining.indexOf(guessLower[i]);

    if (idx !== -1) {
      statuses[i] = 'present';
      secretRemaining[idx] = null;
    }
  }

  // ========================================
  // MEGJELENÍTÉS + FLIP ANIMÁCIÓ
  // ========================================

  for (let i = 0; i < WORD_LEN; i++) {

    const cell = document.getElementById(
      `cell-${currentAttempt}-${i}`
    );

    if (cell) {

      // A betűk egymás után fordulnak
      setTimeout(() => {

        // Biztosítjuk, hogy az animáció újrainduljon
        cell.classList.remove('flip');

        void cell.offsetWidth;

        cell.classList.add('flip');

        // A fordulás közepén jelenik meg a szín
        setTimeout(() => {
          cell.classList.add(statuses[i]);
        }, 300);

      }, i * 150);
    }

    // ========================================
    // BILLENTYŰZET SZÍNEZÉSE
    // ========================================

    const baseKey =
      getBaseKey(guessLower[i]);

    const keyBtn =
      document.querySelector(
        `#keyboard .key[data-key='${baseKey}']`
      );

    if (keyBtn) {

      if (!keyBtn.classList.contains('correct')) {

        if (statuses[i] === 'correct') {

          keyBtn.classList.remove(
            'present',
            'absent'
          );

          keyBtn.classList.add('correct');

        } else if (statuses[i] === 'present') {

          keyBtn.classList.add('present');

        } else if (
          statuses[i] === 'absent' &&
          !keyBtn.classList.contains('present')
        ) {

          keyBtn.classList.add('absent');
        }
      }
    }
  }

  // Várjuk meg az animációk végét
  await new Promise(resolve =>
    setTimeout(resolve, 900)
  );

  // ========================================
  // NYERT
  // ========================================

  if (
    guessString ===
    secretWordTokens.join('').toLowerCase()
  ) {

    showMsg("Gratulálok, eltaláltad!");

    gameOver = true;

    return;
  }

  // ========================================
  // KÖVETKEZŐ PRÓBÁLKOZÁS
  // ========================================

  currentAttempt++;
  currentGuessTokens = [];

  // ========================================
  // JÁTÉK VÉGE
  // ========================================

  if (currentAttempt >= MAX_ATTEMPTS) {

    showMsg(
      `Vége! A szó: ${
        secretWordTokens.join('').toUpperCase()
      }`
    );

    gameOver = true;
  }
}

// ========================================
// BILLENTYŰZET
// ========================================

document
  .getElementById('keyboard')
  .addEventListener('click', (e) => {

    const target =
      e.target.closest('.key');

    if (target) {
      handleKeyPress(target.dataset.key);
    }
  });

// ========================================
// INDÍTÁS
// ========================================

initGrid();
loadWords();
