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

  // Track which IDs we've already added per rarity
  const seen = {
    secret: new Set(),
    ultra: new Set(),
    super: new Set(),
    rare: new Set(),
    common: new Set(),
  };

  raw.forEach((card) => {
    if (!card.card_sets) return;

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
