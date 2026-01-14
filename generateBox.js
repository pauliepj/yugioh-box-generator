const fs = require("fs");
const path = require("path");
const { getRulesForSet } = require("./boxRules");

// Utilities used in Box Generation
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickCards(pool, count) {
  const result = {};
  for (let i = 0; i < count; i++) {
    if (!pool || pool.length === 0) continue; // safety
    const card = pool[Math.floor(Math.random() * pool.length)];
    result[card.id] = (result[card.id] || 0) + 1;
  }
  return result;
}

function mergeCounts(target, source) {
  for (const [id, qty] of Object.entries(source)) {
    target[id] = (target[id] || 0) + qty;
  }
}

// Box Generation
function generateBox(setCode) {
  const setPath = path.join(__dirname, "sets", `${setCode}.json`);

  if (!fs.existsSync(setPath)) {
    throw new Error(`Set file not found: ${setPath}`);
  }

  const setData = JSON.parse(fs.readFileSync(setPath, "utf8"));
  const rules = getRulesForSet(setData.setName);

  const box = {};

  // Rarity rolls
  const rolls = rules.rarityRolls;
  const secretCount = randInt(rolls.secret.min, rolls.secret.max);
  const ultraCount = randInt(rolls.ultra.min, rolls.ultra.max);
  const superCount = randInt(rolls.super.min, rolls.super.max);
  const totalFoils = secretCount + ultraCount + superCount;
  const rareCount = Math.max(0, rules.packsPerBox - totalFoils);

  mergeCounts(box, pickCards(setData.rarities.secret, secretCount));
  mergeCounts(box, pickCards(setData.rarities.ultra, ultraCount));
  mergeCounts(box, pickCards(setData.rarities.super, superCount));
  mergeCounts(box, pickCards(setData.rarities.rare, rareCount));

  //  Common Quantity Generation
  const totalCommons = rules.packsPerBox * rules.commonsPerPack;
  mergeCounts(box, pickCards(setData.rarities.common, totalCommons));

  // uncomment this is you want to check the logs to see rarity quantities.
  // I have tested this multiple times and the per-box rarity quantities appear to be realistic.

  //   console.log({
  //     secretCount,
  //     ultraCount,
  //     superCount,
  //     rareCount,
  //     commons: totalCommons,
  //   });

  return {
    setName: setData.setName,
    cards: box,
  };
}

// Export YDK file
function exportYDK(boxData) {
  const lines = [];
  lines.push("#created by Box Generator");
  lines.push("#main");

  for (const [cardId, qty] of Object.entries(boxData.cards)) {
    for (let i = 0; i < qty; i++) {
      lines.push(cardId);
    }
  }

  lines.push("#extra");
  lines.push("!side");

  return lines.join("\n");
}

// Exports
module.exports = {
  generateBox,
  exportYDK,
};

// CLI Fallbacks
if (require.main === module) {
  const setCode = process.argv[2];
  if (!setCode) {
    console.error("Usage: node generateBox.js <SET_CODE>");
    process.exit(1);
  }

  try {
    const box = generateBox(setCode);
    const ydk = exportYDK(box);

    const downloadsPath = path.join(process.env.USERPROFILE, "Downloads");
    const ydkPath = path.join(downloadsPath, `box_${setCode}.ydk`);
    fs.writeFileSync(ydkPath, ydk, "utf8");

    console.log(`Generated box for "${box.setName}"`);
    console.log(`Saved to Downloads as: ${ydkPath}`);
  } catch (err) {
    console.error("Error generating box:", err.message);
  }
}
