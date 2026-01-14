const RULESETS = {
  LEGACY: {
    packsPerBox: 24,

    rarityRolls: {
      secret: { min: 0, max: 2 },
      ultra: { min: 2, max: 4 },
      super: { min: 4, max: 6 },
    },

    allowDuplicates: {
      secret: true,
      ultra: true,
      super: true,
      rare: true,
      common: true,
    },

    commonsPerPack: 8,
  },
};

const SET_GROUPS = {
  LEGACY: ["Metal Raiders", "Magic Ruler", "Pharaoh's Servant"],
};

function getRulesForSet(setName) {
  // Check if the set is in any group
  for (const [ruleset, sets] of Object.entries(SET_GROUPS)) {
    if (sets.includes(setName)) {
      return RULESETS[ruleset];
    }
  }

  // If not found, fallback to LEGACY
  return RULESETS.LEGACY;
}

module.exports = {
  RULESETS,
  SET_GROUPS,
  getRulesForSet,
};
