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
const showFullSetBtn = document.getElementById("show-fullset");
const status = document.getElementById("status");
const selectedDisplay = document.getElementById("selected-set");
const toggleBtn = document.getElementById("toggle-sort");
const fullSetContainer = document.getElementById("full-set-container");
const hoverPreview = document.getElementById("hover-preview");

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
    btn.innerText = set.set_name;

    btn.onclick = () => {
      selectedSet = set.set_name;
      generateBtn.disabled = false;

      // Hide sort button
      toggleBtn.style.display = "none";

      // Show main app layout, hide set list
      document.getElementById("app").style.display = "grid";
      container.style.display = "none";

      // Clear and render selected set info in left panel
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

      // Buttons side by side
      const buttonRow = document.createElement("div");
      buttonRow.className = "button-row";

      changeBtn.style.display = "inline-block";
      showFullSetBtn.style.display = "inline-block";

      buttonRow.appendChild(changeBtn);
      buttonRow.appendChild(showFullSetBtn);

      selectedDisplay.appendChild(buttonRow);

      // Remove highlighting from all buttons except this one
      document.querySelectorAll(".set-button").forEach((b) => {
        b.style.background = "";
      });
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

// Generate Box
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

// Show/Hide Card List
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
  const setPath = path.join(__dirname, "sets", `${selectedSet}.json`);
  let setData;
  try {
    setData = JSON.parse(fs.readFileSync(setPath, "utf8"));
  } catch (err) {
    console.error(err);
    return;
  }

  fullSetContainer.innerHTML = "";

  // Rarity hierarchy
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

  // Flatten all cards
  const allCards = [];
  Object.entries(setData.rarities).forEach(([rarity, cards]) => {
    cards.forEach((card) => {
      allCards.push({
        name: card.name,
        rarity: card.rarityActual || rarity,
      });
    });
  });

  // Sort by rarity
  allCards.sort((a, b) => {
    const aIndex = rarityOrder.indexOf(a.rarity.toLowerCase());
    const bIndex = rarityOrder.indexOf(b.rarity.toLowerCase());
    return aIndex - bIndex;
  });

  // Render
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

// Hover Preview (500 ms delay)
let hoverTimer = null;

fullSetContainer.addEventListener("mouseover", (e) => {
  const row = e.target.closest(".card-item");
  if (!row) return;

  clearTimeout(hoverTimer);

  hoverTimer = setTimeout(() => {
    const cardName = row.querySelector(".card-name").innerText;

    const setPath = path.join(__dirname, "sets", `${selectedSet}.json`);
    let setData;
    try {
      setData = JSON.parse(fs.readFileSync(setPath, "utf8"));
    } catch (err) {
      console.error(err);
      return;
    }

    let cardDetails = null;
    Object.values(setData.rarities).forEach((cards) => {
      cards.forEach((card) => {
        if (card.name === cardName) cardDetails = card;
      });
    });

    if (!cardDetails) return;

    // Start building hover HTML
    let hoverHTML = `
      ${cardDetails.card_images?.[0]?.image_url ? `<img src="${cardDetails.card_images[0].image_url}" style="width:100%; margin-bottom:5px;"/>` : ""}
      <strong>${cardDetails.name}</strong><br>
      Type: ${cardDetails.type || "-"}<br>
    `;

    // Monster card vs Spell/Trap card
    if (cardDetails.type === "Spell Card" || cardDetails.type === "Trap Card") {
      hoverHTML += `Spell/Trap type: ${cardDetails.race}<br>`;
    } else {
      hoverHTML += `
        Level: ${cardDetails.level || "-"}<br>
        Attribute: ${cardDetails.attribute || "-"}<br>
        Race: ${cardDetails.race || "-"}<br>
        ATK/DEF: ${cardDetails.atk ?? "-"} / ${cardDetails.def ?? "-"}<br>
      `;
    }

    hoverHTML += `<hr>${cardDetails.desc || ""}`;

    hoverPreview.innerHTML = hoverHTML;
    hoverPreview.style.display = "block";
  }, 500); // 500 ms delay
});

// Hide hover preview on mouse out
fullSetContainer.addEventListener("mouseout", () => {
  clearTimeout(hoverTimer);
  hoverPreview.style.display = "none";
});

fullSetContainer.addEventListener("mouseleave", () => {
  clearTimeout(hoverTimer);
  hoverPreview.style.display = "none";
});

// Initial
sortSets();
populateSetButtons();
