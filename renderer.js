const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

let isCardListVisible = false;
let selectedSet = null;

// Load sets from JSON
let sets = [];
try {
  const setsPath = path.join(__dirname, "allSets.json");
  sets = JSON.parse(fs.readFileSync(setsPath, "utf8"));
} catch (err) {
  console.error("Failed to load allSets.json:", err);
}

// Elements
const container = document.getElementById("sets-container");
const generateBtn = document.getElementById("generate");
const changeBtn = document.getElementById("change-set");
const status = document.getElementById("status");
const selectedDisplay = document.getElementById("selected-set");
const toggleBtn = document.getElementById("toggle-sort");
const fullSetContainer = document.getElementById("full-set-container");
const hideCardlistBtn = document.getElementById("hide-cardlist");

// Sort
let sortOrder = "asc"; // asc = oldest → newest
function sortSets() {
  sets.sort((a, b) => {
    if (!a.tcg_date) return 1;
    if (!b.tcg_date) return -1;
    const diff = new Date(a.tcg_date) - new Date(b.tcg_date);
    return sortOrder === "asc" ? diff : -diff;
  });
}

toggleBtn.onclick = () => {
  sortOrder = sortOrder === "asc" ? "desc" : "asc";
  toggleBtn.innerText =
    sortOrder === "asc" ? "Sort: Oldest → Newest" : "Sort: Newest → Oldest";
  sortSets();
  populateSetButtons();
};

// Populate Sets
function populateSetButtons() {
  container.innerHTML = "";

  sets.forEach((set) => {
    const btn = document.createElement("button");
    btn.className = "set-button";

    const span = document.createElement("span");
    span.innerText = set.set_name;
    btn.appendChild(span);

    btn.onclick = () => {
      selectedSet = set.set_name;
      generateBtn.disabled = false;

      // Clear previous display
      selectedDisplay.innerHTML = "";

      // Selected Label
      const textSpan = document.createElement("span");
      textSpan.innerText = `Selected Set: ${selectedSet}`;
      selectedDisplay.appendChild(textSpan);

      // Set Image
      if (set.set_image) {
        const img = document.createElement("img");
        img.src = set.set_image;
        img.alt = set.set_name;
        img.style.width = "200px";
        img.style.height = "200px";
        img.style.objectFit = "cover";
        img.style.marginTop = "5px";
        selectedDisplay.appendChild(img);
      }

      // Buttons container
      const selectedButtonsContainer = document.createElement("div");
      selectedButtonsContainer.style.display = "flex";
      selectedButtonsContainer.style.marginTop = "5px";
      selectedButtonsContainer.style.gap = "10px";

      // Change Set button
      changeBtn.style.display = "inline-block";
      selectedButtonsContainer.appendChild(changeBtn);

      // Show Full Set button
      showFullSetBtn.style.display = "inline-block";
      selectedButtonsContainer.appendChild(showFullSetBtn);

      selectedDisplay.appendChild(selectedButtonsContainer);

      // Hide set list and sort button
      container.style.display = "none";
      toggleBtn.style.display = "none";

      // Remove highlighting on all buttons except this one
      document
        .querySelectorAll(".set-button")
        .forEach((b) => (b.style.background = ""));
      btn.style.background = "#aaf";
    };

    container.appendChild(btn);
  });
}

// Change Set
changeBtn.onclick = () => {
  selectedSet = null;
  generateBtn.disabled = true;
  selectedDisplay.innerHTML = "<span>No set selected</span>";

  fullSetContainer.style.display = "none";
  showFullSetBtn.innerText = "Show Card List";
  showFullSetBtn.style.display = "none";
  isCardListVisible = false;

  changeBtn.style.display = "none";
  container.style.display = "block";
  toggleBtn.style.display = "inline-block";
};

// Generate Box button/operations
generateBtn.onclick = async () => {
  if (!selectedSet) return;

  status.innerText = `Generating box for ${selectedSet}...`;

  const result = await ipcRenderer.invoke("generate-box", selectedSet);

  if (result.success) {
    status.innerHTML = `Box generated for ${result.boxName}. 
      <br>Saved to: ${result.filePath} 
      <button id="open-folder-btn">Open Folder</button>`;

    document.getElementById("open-folder-btn").onclick = () => {
      ipcRenderer.invoke("open-folder", path.dirname(result.filePath));
    };
  } else {
    status.innerText = `Error: ${result.error}`;
  }
};

// Show/Hide Cardlist
const showFullSetBtn = document.createElement("button");
showFullSetBtn.innerText = "Show Card List";
showFullSetBtn.style.display = "none";
selectedDisplay.appendChild(showFullSetBtn);

showFullSetBtn.onclick = async () => {
  if (!selectedSet) return;

  // TOGGLE OFF
  if (isCardListVisible) {
    fullSetContainer.style.display = "none";
    showFullSetBtn.innerText = "Show Card List";
    isCardListVisible = false;
    return;
  }

  // TOGGLE ON
  const setPath = path.join(process.cwd(), "sets", `${selectedSet}.json`);
  let setData;

  try {
    setData = JSON.parse(fs.readFileSync(setPath, "utf8"));
  } catch (err) {
    console.error("Failed to load set JSON:", err);
    return;
  }

  fullSetContainer.innerHTML = "";

  const allCards = [];
  Object.entries(setData.rarities).forEach(([rarity, cards]) => {
    cards.forEach((card) => {
      allCards.push({
        name: card.name,
        rarity,
      });
    });
  });

  allCards.forEach((card) => {
    const row = document.createElement("div");
    row.className = "card-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "card-name";
    nameSpan.innerText = card.name;

    const raritySpan = document.createElement("span");
    raritySpan.className = "card-rarity";
    raritySpan.innerText = card.rarity;

    row.appendChild(nameSpan);
    row.appendChild(raritySpan);

    fullSetContainer.appendChild(row);
  });

  fullSetContainer.style.display = "block";
  showFullSetBtn.innerText = "Hide Card List";
  isCardListVisible = true;
};

// Initial
sortSets();
populateSetButtons();
