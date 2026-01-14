// fetchAndNormalizeAllSets.js
const fs = require("fs");
const path = require("path");
const https = require("https");

// Folder for raw and normalized sets
const SETS_DIR = path.join(__dirname, "sets");
if (!fs.existsSync(SETS_DIR)) fs.mkdirSync(SETS_DIR);

// Load all sets
const allSetsPath = path.join(__dirname, "allSets.json");
const allSets = JSON.parse(fs.readFileSync(allSetsPath, "utf8"));

// Map YGOPRODeck rarities to normalized rarities
const rarityMap = {
  "Secret Rare": "secret",
  "Ultra Rare": "ultra",
  "Super Rare": "super",
  Rare: "rare",
  Common: "common",
};

// Utility to fetch JSON from a URL
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve(json.data || []);
          } catch (err) {
            reject(err);
          }
        });
      })
      .on("error", reject);
  });
}

// Normalize a single set
function normalizeSet(setName, raw) {
  const normalized = {
    setName,
    rarities: {
      secret: [],
      ultra: [],
      super: [],
      rare: [],
      common: [],
    },
  };

  // Track duplicates per rarity
  const seen = {
    secret: new Set(),
    ultra: new Set(),
    super: new Set(),
    rare: new Set(),
    common: new Set(),
  };

  raw.forEach((card) => {
    if (!card.card_sets) return;

    // Only consider entries from this set
    card.card_sets
      .filter((cs) => cs.set_name === setName)
      .forEach((cs) => {
        const key = rarityMap[cs.set_rarity];
        if (!key) return;

        if (seen[key].has(card.id)) return; // skip duplicates
        seen[key].add(card.id);

        const cardEntry = {
          id: card.id,
          name: card.name,
        };

        if (Array.isArray(card.card_images) && card.card_images.length > 0) {
          cardEntry.card_images = card.card_images;
        }

        normalized.rarities[key].push(cardEntry);
      });
  });

  return normalized;
}

// Main function to fetch & normalize all sets
async function fetchAndNormalizeAllSets() {
  for (const set of allSets) {
    try {
      console.log(`Fetching set: ${set.set_name}...`);

      const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodeURIComponent(
        set.set_name
      )}`;
      const rawData = await fetchJSON(url);

      // Save raw JSON
      const rawFilePath = path.join(SETS_DIR, `${set.set_name}.raw.json`);
      fs.writeFileSync(rawFilePath, JSON.stringify(rawData, null, 2));
      console.log(`Saved raw data: ${rawFilePath}`);

      // Normalize
      const normalized = normalizeSet(set.set_name, rawData);
      const normFilePath = path.join(SETS_DIR, `${set.set_name}.json`);
      fs.writeFileSync(normFilePath, JSON.stringify(normalized, null, 2));
      console.log(`Saved normalized data: ${normFilePath}`);
    } catch (err) {
      console.error(`Error processing set ${set.set_name}:`, err.message);
    }
  }

  console.log("All sets processed.");
}

fetchAndNormalizeAllSets();
