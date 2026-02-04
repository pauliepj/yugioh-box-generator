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

// Canonical rarity order
const canonicalBuckets = [
  "ultimate",
  "secret",
  "starlight",
  "shatterfoil",
  "ghost",
  "ultra",
  "super",
  "rare",
  "common",
];

// Utility: fetch JSON from URL
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

// Extract unique rarities from a raw set
function extractUniqueRarities(rawCards) {
  const raritySet = new Set();
  rawCards.forEach((card) => {
    if (!card.card_sets) return;
    card.card_sets.forEach((cs) => {
      if (cs.set_rarity) raritySet.add(cs.set_rarity.trim());
    });
  });
  return [...raritySet].sort();
}

// Generate rarityMap dynamically
function generateRarityMap(rawCards) {
  const rarities = extractUniqueRarities(rawCards);
  const map = {};
  const queue = [...canonicalBuckets];

  rarities.forEach((r) => {
    map[r] = queue.length ? queue.shift() : "common"; // fallback
  });

  return map;
}

// Normalize a single set correctly
function normalizeSet(setName, rawCards) {
  const normalized = {
    setName,
    rarities: {},
  };

  // We'll dynamically discover all rarities in this set
  const raritiesInSet = new Set();

  rawCards.forEach((card) => {
    if (!card.card_sets) return;
    card.card_sets
      .filter((cs) => cs.set_name === setName)
      .forEach((cs) => {
        if (cs.set_rarity) raritiesInSet.add(cs.set_rarity.trim());
      });
  });

  // Initialize rarities in normalized object
  raritiesInSet.forEach((r) => {
    normalized.rarities[r.toLowerCase()] = [];
  });

  const seen = {};
  raritiesInSet.forEach((r) => {
    seen[r.toLowerCase()] = new Set();
  });

  // Fill normalized data
  rawCards.forEach((card) => {
    if (!card.card_sets) return;

    card.card_sets
      .filter((cs) => cs.set_name === setName)
      .forEach((cs) => {
        const actualRarity = cs.set_rarity?.trim();
        if (!actualRarity) return;

        const key = actualRarity.toLowerCase(); // use the exact rarity for this set

        if (seen[key].has(card.id)) return; // skip duplicates
        seen[key].add(card.id);

        const cardEntry = {
          id: card.id,
          name: card.name,
          desc: card.desc || "",
          race: card.race || "",
          atk: card.atk ?? null,
          def: card.def ?? null,
          level: card.level ?? null,
          attribute: card.attribute || "",
          type: card.type || "",
          rarityActual: actualRarity, // what this set says
          rarityCanonical: key, // same as key; can later map to canonical UI if needed
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
        set.set_name,
      )}`;
      const rawData = await fetchJSON(url);

      // Save raw JSON
      const rawFilePath = path.join(SETS_DIR, `${set.set_name}.raw.json`);
      fs.writeFileSync(rawFilePath, JSON.stringify(rawData, null, 2));
      console.log(`Saved raw data: ${rawFilePath}`);

      // Generate rarityMap dynamically
      const rarityMap = generateRarityMap(rawData);

      // Normalize
      const normalized = normalizeSet(set.set_name, rawData, rarityMap);
      const normFilePath = path.join(SETS_DIR, `${set.set_name}.json`);
      fs.writeFileSync(normFilePath, JSON.stringify(normalized, null, 2));
      console.log(`Saved normalized data: ${normFilePath}`);
    } catch (err) {
      console.error(`Error processing set ${set.set_name}:`, err.message);
    }
  }

  console.log("All sets processed.");
}

// Run
fetchAndNormalizeAllSets();
