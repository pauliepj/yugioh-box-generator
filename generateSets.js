// This file is not needed to run this program. All sets are already fetched from the API and included in the project.

const https = require("https");
const fs = require("fs");

https
  .get("https://db.ygoprodeck.com/api/v7/cardsets.php", (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => {
      const sets = JSON.parse(data);
      fs.writeFileSync("allSets.json", JSON.stringify(sets, null, 2));
      console.log("Saved allSets.json with", sets.length, "entries");
    });
  })
  .on("error", (err) => {
    console.error("Failed:", err);
  });
