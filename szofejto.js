// Magyar többjegyű betűk listája
const DIGRAPHS = ['dzs', 'cs', 'dz', 'gy', 'ly', 'ny', 'sz', 'ty', 'zs'];
const MAX_ATTEMPTS = 8; // 7 + 1 tipp lehetőség
const WORD_LEN = 5;

let wordList = [];
let secretWordTokens = [];
let currentAttempt = 0;
let currentGuessTokens = [];
let gameOver = false;

// Szó felbontása egyedi tokenekre (a többjegyű betűket egyben tartva)
function tokenize(word) {
  const tokens = [];
  let i = 0;
  const lower = word.toLowerCase().trim();
  while (i < lower.length) {
    let matched = null;
    for (const dg of DIGRAPHS) {
      if (lower.startsWith(dg, i)) { matched = dg; break; }
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

// A játék rácsának dinamikus felépítése
function initGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = ''; // Kiürítjük a biztonság kedvéért
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

// Adatok betöltése a külső szavak.txt fájlból
async function loadWords() {
  try {
    const response = await fetch('szavak.txt');
    const text = await response.text();
    // Feldolgozzuk a sorokat, és szűrjük, hogy csak valid 5 tokenes szavak maradjanak
    wordList = text.split('\n')
                   .map(w => w.trim().toLowerCase())
                   .filter(w => w.length > 0 && tokenize(w).length === WORD_LEN);
    
    if(wordList.length === 0) {
      showMsg("Hiba: A szavak.txt nem tartalmaz megfelelő 5 betűs szót!");
      return;
    }

    // Kiválasztunk egy véletlenszerű szót a listából
    const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
    secretWordTokens = tokenize(randomWord);
    console.log("Kitalálandó szó:", randomWord); // Fejlesztői teszteléshez a konzolon
  } catch (error) {
    showMsg("Nem sikerült betölteni a szavak.txt fájlt!");
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
    // Karakter hozzáadása, ha még nem értük el az 5-öt
    if (currentGuessTokens.length < WORD_LEN) {
      currentGuessTokens.push(key);
      updateRowVisuals();
    }
  }
}

function updateRowVisuals() {
  for (let c = 0; c < WORD_LEN; c++) {
    const cell = document.getElementById(`cell-${currentAttempt}-${c}`);
    if (currentGuessTokens[c]) {
      cell.textContent = currentGuessTokens[c];
      cell.classList.add('pop');
    } else {
      cell.textContent = '';
      cell.classList.remove('pop');
    }
  }
}

function checkGuess() {
  const guessString = currentGuessTokens.join('');
  
  // Ellenőrizzük, hogy a szó benne van-e a txt-ből olvasott listában
  if (!wordList.includes(guessString)) {
    showMsg("Nincs ilyen szó a listában!");
    return;
  }

  showMsg(""); // Üzenet törlése
  const secretRemaining = [...secretWordTokens];
  const statuses = Array(WORD_LEN).fill('absent');

  // 1. Kör: Zöld szín (Találat a helyén)
  for (let i = 0; i < WORD_LEN; i++) {
    if (currentGuessTokens[i] === secretWordTokens[i]) {
      statuses[i] = 'correct';
      secretRemaining[i] = null; // Kivesszük a vizsgálatból
    }
  }

  // 2. Kör: Sárga szín (Benne van, de máshol) - ITT IS JAVÍTVA AZ i BETŰ
  for (let i = 0; i < WORD_LEN; i++) {
    if (statuses[i] === 'correct') continue;
    const idx = secretRemaining.indexOf(currentGuessTokens[i]);
    if (idx !== -1) {
      statuses[i] = 'present';
      secretRemaining[idx] = null;
    }
  }

   // Osztályok kiosztása a rácson a színekhez
  for (let i = 0; i < WORD_LEN; i++) {
    const cell = document.getElementById(`cell-${currentAttempt}-${i}`);
    if (cell) {
      cell.classList.add(statuses[i]);
    }

    // ÚJ: A virtuális billentyűzet gombjainak átszínezése
    const keyBtn = document.querySelector(`#keyboard .key[data-key="${currentGuessTokens[i]}"]`);
    if (keyBtn) {
      // Ha már zöld a gomb, ne írjuk felül semmivel
      if (!keyBtn.classList.contains('correct')) {
        // Ha most zöld lett, kapja meg a zöldet
        if (statuses[i] === 'correct') {
          keyBtn.classList.remove('present', 'absent');
          keyBtn.classList.add('correct');
        } 
        // Ha sárga lett és még nem zöld, kapja meg a sárgát
        else if (statuses[i] === 'present') {
          keyBtn.classList.add('present');
        } 
        // Ha nincs a szóban és még nincs rajta más státusz, legyen szürke (absent)
        else if (statuses[i] === 'absent' && !keyBtn.classList.contains('present')) {
          keyBtn.classList.add('absent');
        }
      }
    }
  }

  // Nyert a játékos?
  if (guessString === secretWordTokens.join('')) {
    showMsg("Gratulálok, eltaláltad!");
    gameOver = true;
    return;
  }

  // Lépés a következő tippre
  currentAttempt++;
  currentGuessTokens = [];

  // Elfogyott az összes lehetőség (7 + 1 bónusz)
  if (currentAttempt >= MAX_ATTEMPTS) {
    showMsg(`Vége a játéknak! A szó: ${secretWordTokens.join('').toUpperCase()}`);
    gameOver = true;
  }
}

// Eseménykezelő a virtuális billentyűzethez
document.getElementById('keyboard').addEventListener('click', (e) => {
  const target = e.target.closest('.key');
  if (target) {
    handleKeyPress(target.dataset.key);
  }
});

// Inicializálás az oldal betöltésekor
initGrid();
loadWords();