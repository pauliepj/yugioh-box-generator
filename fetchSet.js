// This file is not needed to run this program. All sets are already fetched from the API and included in the project.

const fs = require("fs");
const https = require("https");
const path = require("path");

const SET_NAME = process.argv[2];

if (!SET_NAME) {
  console.error('Usage: node fetchSet.js "Set Name"');
  process.exit(1);
}

const encodedSet = encodeURIComponent(SET_NAME);
const outputDir = path.join(__dirname, "sets");

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const url = `https://db.ygoprodeck.com/api/v7/cardinfo.php?cardset=${encodedSet}`;
console.log("Fetching:", url);

https.get(url, (res) => {
  let data = "";

  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const json = JSON.parse(data);

    if (!json.data) {
      console.error("No cards found for set:", SET_NAME);
      console.error(json);
      return;
    }

    // 🔑 LOSSLESS: only filter by set_name
    const cards = json.data.map((card) => ({
      id: card.id,
      name: card.name,
      card_sets: card.card_sets?.filter((s) => s.set_name === SET_NAME) || [],
    }));

    const outPath = path.join(outputDir, `${SET_NAME}.raw.json`);
    fs.writeFileSync(outPath, JSON.stringify(cards, null, 2));

    console.log(`Saved ${cards.length} cards to ${outPath}`);
  });
});
