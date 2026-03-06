const fs = require("fs");
const path = require("path");

const setsDir = path.join(__dirname, "sets");
const outputFile = path.join(__dirname, "cardIndex.json");

const cardMap = {};

const setFiles = fs.readdirSync(setsDir).filter((f) => f.endsWith(".json"));

setFiles.forEach((file) => {
  const setPath = path.join(setsDir, file);
  const setName = file.replace(".json", "");

  let setData;

  try {
    const raw = fs.readFileSync(setPath, "utf8");

    if (!raw.trim()) {
      console.warn("Skipping empty file:", file);
      return;
    }

    setData = JSON.parse(raw);
  } catch (err) {
    console.error("Bad JSON in:", file);
    console.error(err.message);
    return;
  }

  if (!setData.rarities) return;

  Object.entries(setData.rarities).forEach(([rarity, cards]) => {
    cards.forEach((card) => {
      const name = card.name;

      if (!cardMap[name]) {
        cardMap[name] = {
          name: card.name,
          searchName: card.name.toLowerCase(), // <-- improvement
          type: card.type,
          race: card.race,
          attribute: card.attribute,
          level: card.level,
          atk: card.atk,
          def: card.def,
          desc: card.desc,
          card_images: card.card_images,
          sets: [setName],
        };
      } else {
        if (!cardMap[name].sets.includes(setName)) {
          cardMap[name].sets.push(setName);
        }
      }
    });
  });
});

const cardIndex = Object.values(cardMap);

cardIndex.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(outputFile, JSON.stringify(cardIndex, null, 2), "utf8");

console.log(`cardIndex.json generated with ${cardIndex.length} unique cards.`);
