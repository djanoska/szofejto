const DIGRAPHS = ['dzs', 'cs', 'dz', 'gy', 'ly', 'ny', 'sz', 'ty', 'zs'];
const MAX_ATTEMPTS = 8;
const WORD_LEN = 5;

// Ékezet-leképezési térkép a billentyűzet színezéséhez
const ACCENT_MAP = {
  'a': ['a', 'á'], 'e': ['e', 'é'], 'i': ['i', 'í'], 
  'o': ['o', 'ó', 'ö', 'ő'], 'u': ['u', 'ú', 'ü', 'ű']
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
      if (lower.startsWith(dg, i)) { matched = dg; break; }
    }
    if (matched) { tokens.push(matched); i += matched.length; } 
    else { tokens.push(lower[i]); i += 1; }
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
    wordList = text.split('\n')
                   .map(w => w.trim().toLowerCase())
                   .filter(w => w.length > 0 && tokenize(w).length === WORD_LEN);
    
    if(wordList.length === 0) {
      showMsg("Hiba a szavak beolvasásakor!");
      return;
    }
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
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
    if (currentGuessTokens.length > 0) { currentGuessTokens.pop(); updateRowVisuals(); }
  } else if (key === 'enter') {
    if (currentGuessTokens.length === WORD_LEN) { checkGuess(); } 
    else { showMsg("Nincs meg az 5 betű!"); }
  } else {
    if (currentGuessTokens.length < WORD_LEN) { currentGuessTokens.push(key); updateRowVisuals(); }
  }
}

function updateRowVisuals() {
  for (let c = 0; c < WORD_LEN; c++) {
    const cell = document.getElementById(`cell-${currentAttempt}-${c}`);
    cell.textContent = currentGuessTokens[c] ? currentGuessTokens[c] : '';
  }
}

// Megkeresi, hogy egy betűnek melyik az alap billentyűje (pl. á -> a)
function getBaseKey(letter) {
  for (const [base, accents] of Object.entries(ACCENT_MAP)) {
    if (accents.includes(letter)) return base;
  }
  return letter;
}

function checkGuess() {
  const guessString = currentGuessTokens.join('').toLowerCase();
  
  if (!wordList.includes(guessString)) {
    showMsg("Nincs ilyen szó a listában!");
    return;
  }

  showMsg(""); 
  const secretRemaining = secretWordTokens.map(t => t.toLowerCase());
  const guessLower = currentGuessTokens.map(t => t.toLowerCase());
  const statuses = Array(WORD_LEN).fill('absent');

  // 1. Kör: Pontos egyezés (Zöld)
  for (let i = 0; i < WORD_LEN; i++) {
    if (guessLower[i] === secretRemaining[i]) {
      statuses[i] = 'correct';
      secretRemaining[i] = null;
    }
  }

  // 2. Kör: Részleges egyezés (Sárga)
  for (let i = 0; i < WORD_LEN; i++) {
    if (statuses[i] === 'correct') continue;
    const idx = secretRemaining.indexOf(guessLower[i]);
    if (idx !== -1) {
      statuses[i] = 'present';
      secretRemaining[idx] = null;
    }
  }

 // Megjelenítés és billentyűzet színezés
  for (let i = 0; i < WORD_LEN; i++) {
    const cell = document.getElementById(`cell-${currentAttempt}-${i}`);
    if (cell) cell.classList.add(statuses[i]);

    const currentLetter = guessLower[i]; // A játékos által beírt pontos betű (pl. "á")

    // Csak azokat a gombokat keressük meg, amik pontosan erre a betűre hallgatnak
    const keyBtns = document.querySelectorAll(`#keyboard .key`);
    
    keyBtns.forEach(keyBtn => {
      // Kiolvassuk a data-key-t, ha nincs, akkor a gomb szövegét használjuk, kisbetűsítve
      const btnKeyAttr = keyBtn.getAttribute('data-key');
      const btnKey = (btnKeyAttr ? btnKeyAttr : keyBtn.textContent).trim().toLowerCase();

      // SZIGORÚ EGYEZÉS: Csak a ténylegesen leütött betű gombját bántjuk!
      if (btnKey === currentLetter) {
        
        // Wordle szabály: A már zöld (correct) gombot semmi nem írhatja felül
        if (!keyBtn.classList.contains('correct')) {
          if (statuses[i] === 'correct') {
            keyBtn.classList.remove('present', 'absent');
            keyBtn.classList.add('correct');
          } else if (statuses[i] === 'present') {
            // A sárga nem írhatja felül a már meglévő sárgát vagy zöldet
            if (!keyBtn.classList.contains('present')) {
              keyBtn.classList.add('present');
            }
          } else if (statuses[i] === 'absent') {
            // A szürke csak akkor adódik hozzá, ha a gomb még nem zöld és nem sárga
            if (!keyBtn.classList.contains('present')) {
              keyBtn.classList.add('absent');
            }
          }
        }
        
      }
    });
  }

  if (guessString === secretWordTokens.join('').toLowerCase()) {
    showMsg("Gratulálok, eltaláltad!");
    gameOver = true;
    return;
  }

  currentAttempt++;
  currentGuessTokens = [];

  if (currentAttempt >= MAX_ATTEMPTS) {
    showMsg(`Vége! A szó: ${secretWordTokens.join('').toUpperCase()}`);
    gameOver = true;
  }
}

document.getElementById('keyboard').addEventListener('click', (e) => {
  const target = e.target.closest('.key');
  if (target) handleKeyPress(target.dataset.key);
});

initGrid();
loadWords();