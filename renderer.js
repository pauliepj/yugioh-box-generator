const { ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");

let isCardListVisible = false;
let selectedSet = null;
let allCardsIndex = [];

// ---------------- LOAD DATA ----------------
let sets = [];
try {
  const setsPath = path.join(__dirname, "allSets.json");
  sets = JSON.parse(fs.readFileSync(setsPath, "utf8"));
} catch (err) {
  console.error("Failed to load allSets.json:", err);
}

try {
  const cardIndexPath = path.join(__dirname, "cardIndex.json");
  allCardsIndex = JSON.parse(fs.readFileSync(cardIndexPath, "utf8"));
  // Normalize names for search
  allCardsIndex.forEach((c) => (c.nameLower = c.name.toLowerCase()));
} catch (err) {
  console.error("Failed to load cardIndex.json:", err);
}

// ---------------- ELEMENTS ----------------
const container = document.getElementById("sets-container");
const generateBtn = document.getElementById("generate");
const changeBtn = document.getElementById("change-set");
const showFullSetBtn = document.getElementById("show-fullset");
const status = document.getElementById("status");
const selectedDisplay = document.getElementById("selected-set");
const toggleBtn = document.getElementById("toggle-sort");
const fullSetContainer = document.getElementById("full-set-container");
const searchHoverPreview = document.getElementById("search-hover-preview");
const hoverPreview = document.getElementById("hover-preview");
const searchInput = document.getElementById("card-search");
const searchResults = document.getElementById("search-results");

// ---------------- SORT ----------------
let sortOrder = "asc";
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

// ---------------- POPULATE SETS ----------------
function populateSetButtons() {
  container.innerHTML = "";

  sets.forEach((set) => {
    const btn = document.createElement("button");
    btn.className = "set-button";
    btn.innerText = set.set_name;

    btn.onclick = () => {
      selectedSet = set.set_name;
      generateBtn.disabled = false;

      toggleBtn.style.display = "none";
      document.getElementById("app").style.display = "grid";
      container.style.display = "none";

      selectedDisplay.innerHTML = "";
      const textSpan = document.createElement("span");
      textSpan.innerText = `Selected Set: ${selectedSet}`;
      selectedDisplay.appendChild(textSpan);

      if (set.set_image) {
        const img = document.createElement("img");
        img.src = set.set_image;
        img.alt = set.set_name;
        selectedDisplay.appendChild(img);
      }

      const buttonRow = document.createElement("div");
      buttonRow.className = "button-row";
      changeBtn.style.display = "inline-block";
      showFullSetBtn.style.display = "inline-block";
      buttonRow.appendChild(changeBtn);
      buttonRow.appendChild(showFullSetBtn);
      selectedDisplay.appendChild(buttonRow);

      document
        .querySelectorAll(".set-button")
        .forEach((b) => (b.style.background = ""));
      btn.style.background = "#aaf";
    };

    container.appendChild(btn);
  });

  if (!selectedSet) {
    container.style.display = "block";
    toggleBtn.style.display = "inline-block";
  }
}

// ---------------- CHANGE SET ----------------
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

// ---------------- GENERATE BOX ----------------
generateBtn.onclick = async () => {
  if (!selectedSet) return;
  status.innerText = `Generating box for ${selectedSet}...`;

  const result = await ipcRenderer.invoke("generate-box", selectedSet);
  if (result.success) {
    status.innerHTML = `Box generated for ${result.boxName}. 
      <br>Saved to: ${result.filePath} 
      <button id="open-folder-btn">Open Folder</button>`;
    document.getElementById("open-folder-btn").onclick = () =>
      ipcRenderer.invoke("open-folder", path.dirname(result.filePath));
  } else {
    status.innerText = `Error: ${result.error}`;
  }
};

// ---------------- HOVER PREVIEW ----------------
let hoverTimer = null;

function showSearchHoverPreview(card) {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    let hoverHTML = `
      ${card.card_images?.[0]?.image_url ? `<img src="${card.card_images[0].image_url}" style="width:100%; margin-bottom:5px;">` : ""}
      <strong>${card.name}</strong><br>
      Sets:<br>${card.sets.map((s) => `- ${s}`).join("<br>")}`;
    searchHoverPreview.innerHTML = hoverHTML;
    searchHoverPreview.style.display = "block";
  }, 300); // shorter delay
}

function showHoverPreview(card) {
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    let hoverHTML = `
      ${card.card_images?.[0]?.image_url ? `<img src="${card.card_images[0].image_url}" style="width:100%; margin-bottom:5px;">` : ""}
      <strong>${card.name}</strong><br>
      Type: ${card.type || "-"}<br>
    `;
    if (card.type === "Spell Card" || card.type === "Trap Card") {
      hoverHTML += `Spell/Trap type: ${card.race || "-"}<br>`;
    } else {
      hoverHTML += `
        Level: ${card.level || "-"}<br>
        Attribute: ${card.attribute || "-"}<br>
        Race: ${card.race || "-"}<br>
        ATK/DEF: ${card.atk ?? "-"} / ${card.def ?? "-"}<br>
      `;
    }
    hoverHTML += `<hr>${card.desc || ""}`;
    hoverPreview.innerHTML = hoverHTML;
    hoverPreview.style.display = "block";
  }, 300); // shorter delay
}

function hideHoverPreview() {
  clearTimeout(hoverTimer);
  hoverPreview.style.display = "none";
  searchHoverPreview.style.display = "none";
}

// ---------------- SEARCH ----------------
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = "";
  if (query.length < 2) return;

  const matches = allCardsIndex.filter((card) =>
    card.nameLower.startsWith(query),
  );

  matches.forEach((card) => {
    const row = document.createElement("div");
    row.className = "search-item";
    row.innerText = `${card.name}`;
    searchResults.appendChild(row);

    row.addEventListener("mouseenter", () => showSearchHoverPreview(card));
    row.addEventListener("mouseleave", hideHoverPreview);
  });
});

// ---------------- SHOW/HIDE FULL SET ----------------
showFullSetBtn.onclick = () => {
  if (!selectedSet) return;
  if (isCardListVisible) {
    fullSetContainer.style.display = "none";
    showFullSetBtn.innerText = "Show Card List";
    isCardListVisible = false;
    return;
  }

  const setPath = path.join(__dirname, "sets", `${selectedSet}.json`);
  let setData;
  try {
    setData = JSON.parse(fs.readFileSync(setPath, "utf8"));
  } catch (err) {
    console.error(err);
    return;
  }

  fullSetContainer.innerHTML = "";

  const rarityOrder = [
    "starlight rare",
    "ghost rare",
    "quarter century secret rare",
    "10,000 secret rare",
    "collector's rare",
    "ultimate rare",
    "platinum secret rare",
    "prismatic secret rare",
    "extra secret rare / 20th secret rare",
    "secret rare",
    "gold ghost rare",
    "premium gold rare",
    "gold secret rare",
    "gold rare",
    "ultra rare (pharaoh's rare)",
    "ultra rare",
    "millennium rare",
    "super rare",
    "rare",
    "black lettering rare",
    "parallel rares",
    "super short print",
    "short print",
    "common",
  ];

  const allCards = [];
  Object.entries(setData.rarities).forEach(([rarity, cards]) => {
    cards.forEach((card) => {
      allCards.push({ name: card.name, rarity: card.rarityActual || rarity });
    });
  });

  allCards.sort(
    (a, b) =>
      rarityOrder.indexOf(a.rarity.toLowerCase()) -
      rarityOrder.indexOf(b.rarity.toLowerCase()),
  );

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

    // Attach hover using preloaded cardIndex
    const details = allCardsIndex.find((c) => c.name === card.name);
    if (details) {
      row.addEventListener("mouseenter", () => showHoverPreview(details));
      row.addEventListener("mouseleave", hideHoverPreview);
    }
  });

  fullSetContainer.style.display = "block";
  showFullSetBtn.innerText = "Hide Card List";
  isCardListVisible = true;
};

// ---------------- INITIALIZE ----------------
sortSets();
populateSetButtons();
