// ------------------------------------------------------------------
// Voice Command Shopping Assistant
// Basic vanilla JS app, no framework needed for something this size.
// Everything lives in-memory (no backend) since this is an assignment demo.
// ------------------------------------------------------------------

// our "database" of known items -> category + a substitute suggestion
// obviously a real app would pull this from an API, but hardcoding is fine here
const ITEM_CATALOG = {
  milk: { category: "Dairy", substitute: "almond milk" },
  cheese: { category: "Dairy", substitute: "vegan cheese" },
  butter: { category: "Dairy", substitute: "margarine" },
  yogurt: { category: "Dairy", substitute: "greek yogurt" },
  apple: { category: "Produce", substitute: "pear" },
  apples: { category: "Produce", substitute: "pears" },
  banana: { category: "Produce", substitute: "plantain" },
  bananas: { category: "Produce", substitute: "plantains" },
  orange: { category: "Produce", substitute: "mandarin" },
  oranges: { category: "Produce", substitute: "mandarins" },
  bread: { category: "Bakery", substitute: "whole wheat bread" },
  chips: { category: "Snacks", substitute: "pretzels" },
  cookies: { category: "Snacks", substitute: "granola bars" },
  water: { category: "Beverages", substitute: "sparkling water" },
  juice: { category: "Beverages", substitute: "fresh smoothie" },
  toothpaste: { category: "Personal Care", substitute: "herbal toothpaste" },
  soap: { category: "Personal Care", substitute: "hand wash" },
  eggs: { category: "Dairy", substitute: "egg substitute" },
  rice: { category: "Grains", substitute: "quinoa" },
};

// seasonal picks, changes based on current month so it feels "smart"
const SEASONAL_ITEMS = {
  winter: ["oranges", "soup mix", "hot chocolate"],
  summer: ["watermelon", "ice cream", "lemonade"],
  monsoon: ["ginger tea", "umbrella snacks", "soup"],
  spring: ["strawberries", "salad greens", "fresh herbs"],
};

// simple state, kept in memory only
let shoppingList = []; // { id, name, qty, category }
let recognition = null;
let isListening = false;

// ---- DOM refs ----
const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const loadingEl = document.getElementById("loading");
const feedbackBox = document.getElementById("feedback");
const heardText = document.getElementById("heardText");
const langSelect = document.getElementById("langSelect");
const textCommand = document.getElementById("textCommand");
const sendTextBtn = document.getElementById("sendTextBtn");
const searchBox = document.getElementById("searchBox");
const shoppingListEl = document.getElementById("shoppingList");
const emptyMsg = document.getElementById("emptyMsg");
const suggestionListEl = document.getElementById("suggestionList");

// ------------------------------------------------------------------
// Speech Recognition setup (Web Speech API)
// Note: this only works well in Chrome/Edge. Adding a fallback text
// input above so the app is still usable elsewhere - basic error handling.
// ------------------------------------------------------------------
function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    micStatus.textContent = "Voice recognition not supported here — use the text box below instead.";
    micBtn.disabled = true;
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = langSelect.value;

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("recording");
    loadingEl.classList.remove("hidden");
    micStatus.textContent = "Listening...";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    showHeard(transcript);
    handleCommand(transcript);
  };

  recognition.onerror = (event) => {
    micStatus.textContent = "Didn't catch that (" + event.error + "). Try again.";
  };

  recognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("recording");
    loadingEl.classList.add("hidden");
    micStatus.textContent = 'Tap mic and speak (e.g. "Add 2 bottles of milk")';
  };
}

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  recognition.lang = langSelect.value; // pick up latest language choice
  if (isListening) {
    recognition.stop();
  } else {
    recognition.start();
  }
});

// update recognition language whenever user changes the dropdown
langSelect.addEventListener("change", () => {
  if (recognition) recognition.lang = langSelect.value;
});

function showHeard(text) {
  feedbackBox.classList.remove("hidden");
  heardText.textContent = 'Heard: "' + text + '"';
}

// ------------------------------------------------------------------
// Text fallback + search
// ------------------------------------------------------------------
sendTextBtn.addEventListener("click", () => {
  const val = textCommand.value.trim();
  if (!val) return;
  showHeard(val);
  handleCommand(val);
  textCommand.value = "";
});

textCommand.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextBtn.click();
});

searchBox.addEventListener("input", () => {
  renderList(searchBox.value.trim());
});

// ------------------------------------------------------------------
// Very basic NLP: pattern matching on common phrases.
// Good enough for "add / remove / search" style commands, which is
// what the assignment actually needs (not building a full NLP engine!).
// ------------------------------------------------------------------
function handleCommand(rawText) {
  const text = rawText.toLowerCase().trim();

  // --- remove patterns ---
  if (/remove|delete|take .* off/.test(text)) {
    const itemGuess = extractItemName(text, ["remove", "delete", "take", "off", "my", "list", "from"]);
    removeItem(itemGuess);
    return;
  }

  // --- search patterns ---
  if (/find|search|look for/.test(text)) {
    const priceMatch = text.match(/under\s*\$?(\d+)/);
    searchBox.value = extractItemName(text, ["find", "me", "search", "for", "look"]);
    renderList(searchBox.value, priceMatch ? Number(priceMatch[1]) : null);
    return;
  }

  // --- add patterns: "add X", "I need X", "I want to buy X", "buy X" ---
  if (/add|need|want|buy|get/.test(text)) {
    const qtyMatch = text.match(/(\d+)/);
    const qty = qtyMatch ? Number(qtyMatch[1]) : 1;
    const itemGuess = extractItemName(text, [
      "add", "i", "need", "want", "to", "buy", "get", "my", "list",
      "of", "some", "a", "an", String(qty),
    ]);
    addItem(itemGuess, qty);
    return;
  }

  micStatus.textContent = "Hmm, not sure what you meant. Try 'Add milk' or 'Remove bread'.";
}

// strips out filler/command words to guess the actual item name
function extractItemName(text, stopWords) {
  let words = text.split(/\s+/);
  words = words.filter((w) => !stopWords.includes(w.replace(/[^a-z0-9]/g, "")));
  return words.join(" ").replace(/[^a-z0-9\s]/g, "").trim();
}

// ------------------------------------------------------------------
// List operations
// ------------------------------------------------------------------
function addItem(name, qty) {
  if (!name) {
    micStatus.textContent = "Couldn't figure out the item name, try again.";
    return;
  }

  const known = ITEM_CATALOG[name] || ITEM_CATALOG[name.replace(/s$/, "")];
  const category = known ? known.category : "Other";

  // if item already exists, just bump the quantity instead of duplicating
  const existing = shoppingList.find((i) => i.name === name);
  if (existing) {
    existing.qty += qty;
  } else {
    shoppingList.push({
      id: Date.now(),
      name,
      qty,
      category,
    });
  }

  renderList();
  maybeSuggestSubstitute(name);
}

function removeItem(name) {
  const before = shoppingList.length;
  shoppingList = shoppingList.filter((i) => !i.name.includes(name) && name && !name.includes(i.name));
  if (shoppingList.length === before) {
    micStatus.textContent = `Couldn't find "${name}" on your list.`;
  }
  renderList();
}

function maybeSuggestSubstitute(name) {
  const known = ITEM_CATALOG[name] || ITEM_CATALOG[name.replace(/s$/, "")];
  if (known) {
    micStatus.textContent = `Added ${name}. Out of stock? Try ${known.substitute} instead.`;
  }
}

// ------------------------------------------------------------------
// Rendering
// ------------------------------------------------------------------
function renderList(filterText = "", maxPrice = null) {
  shoppingListEl.innerHTML = "";

  let itemsToShow = shoppingList;
  if (filterText) {
    itemsToShow = shoppingList.filter((i) => i.name.includes(filterText.toLowerCase()));
  }
  // fake price filter just for demo purposes since we don't have real prices
  if (maxPrice) {
    itemsToShow = itemsToShow.filter(() => Math.random() * 10 <= maxPrice);
  }

  if (itemsToShow.length === 0) {
    emptyMsg.textContent = filterText ? "No matching items found." : 'Your list is empty. Try saying "Add milk".';
    shoppingListEl.appendChild(emptyMsg);
    return;
  }

  // group by category so the list stays organised
  const grouped = {};
  itemsToShow.forEach((item) => {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  });

  Object.keys(grouped).forEach((cat) => {
    const groupDiv = document.createElement("div");
    groupDiv.className = "category-group";

    const title = document.createElement("div");
    title.className = "category-title";
    title.textContent = cat;
    groupDiv.appendChild(title);

    grouped[cat].forEach((item) => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.innerHTML = `
        <span><span class="item-name">${item.name}</span><span class="item-qty">x${item.qty}</span></span>
        <button class="remove-btn" data-id="${item.id}">✕</button>
      `;
      groupDiv.appendChild(row);
    });

    shoppingListEl.appendChild(groupDiv);
  });

  // wire up the remove buttons after render
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      shoppingList = shoppingList.filter((i) => i.id !== Number(btn.dataset.id));
      renderList(searchBox.value.trim());
    });
  });
}

// ------------------------------------------------------------------
// Smart suggestions: mix of "you might be low" + seasonal picks
// ------------------------------------------------------------------
function getSeason() {
  const month = new Date().getMonth(); // 0-11
  if ([11, 0, 1].includes(month)) return "winter";
  if ([2, 3].includes(month)) return "spring";
  if ([5, 6, 7].includes(month)) return "summer";
  return "monsoon";
}

function renderSuggestions() {
  suggestionListEl.innerHTML = "";
  const season = getSeason();
  const seasonal = SEASONAL_ITEMS[season] || [];

  // just a couple of generic "running low" style hints for the demo
  const staples = ["milk", "bread", "eggs"];

  const all = [...new Set([...staples, ...seasonal])];

  all.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = item;
    chip.addEventListener("click", () => addItem(item, 1));
    suggestionListEl.appendChild(chip);
  });
}

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
setupRecognition();
renderSuggestions();
renderList();
