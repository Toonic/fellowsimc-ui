export const HERO_DEFINITIONS = {
  rime: {
    name: "Rime",
    role: "Frost Mage",
    primaryStat: "intellect",
    primaryStatLabel: "Intellect",
    simcClass: "rime",
    implemented: true
  },
  mara: {
    name: "Mara",
    role: "Assassination Rogue",
    primaryStat: "agility",
    primaryStatLabel: "Agility",
    simcClass: "mara",
    implemented: true
  },
  tariq: {
    name: "Tariq",
    role: "Berserker Warrior",
    primaryStat: "strength",
    primaryStatLabel: "Strength",
    simcClass: "tariq",
    implemented: true
  },
  ardeos: {
    name: "Ardeos",
    role: "Fire Mage",
    primaryStat: "intellect",
    primaryStatLabel: "Intellect",
    simcClass: "ardeos",
    implemented: true
  },
  elarion: {
    name: "Elarion",
    role: "Hunter / Archer",
    primaryStat: "agility",
    primaryStatLabel: "Agility",
    simcClass: "elarion",
    implemented: true
  },
  gunde: {
    name: "Gunde",
    role: "Warrior / Brawler",
    primaryStat: "strength",
    primaryStatLabel: "Strength",
    simcClass: "gunde",
    implemented: true
  },
  aeona: {
    name: "Aeona",
    role: "Chronomancer",
    primaryStat: "intellect",
    primaryStatLabel: "Intellect",
    simcClass: "aeona",
    implemented: true
  },
  xavian: {
    name: "Xavian",
    role: "Dark Caster",
    primaryStat: "strength",
    primaryStatLabel: "Strength",
    simcClass: "xavian",
    implemented: true
  }
};

export const HERO_LEGENDARIES = {
  rime: [
    { id: "frostwyrms_spite", name: "Drakesblood Tapestry" },
    { id: "undulating_spirit", name: "Eldrin Signet of Undulating Spirits" },
    { id: "skandis_decree", name: "Skandi's Bands of Endless Winter" }
  ],
  mara: [
    { id: "from_the_shadows", name: "Assassin's Shadow-Lined Cape" },
    { id: "drenched_in_blood", name: "Stalker's Crimson Loop" },
    { id: "vexiras_venom", name: "Wristbands of Vexira's Prey" }
  ],
  tariq: [
    { id: "slayers_mosh", name: "Drape of the Slayer King" },
    { id: "thundering_vortex", name: "Loop of the Thundering Vortex" },
    { id: "executioners_grin", name: "Executioner's Unsanitary Bands" }
  ],
  ardeos: [
    { id: "fire_toad", name: "Exquisite Flaming Toad Cloak" },
    { id: "explosivo", name: "Ring of Boomtastic Explosions" },
    { id: "devouring_flame", name: "Draconic Bracers of the Devouring Flame" }
  ],
  elarion: [
    { id: "shimmer", name: "Shimmering Silver Cape" },
    { id: "astronomers_hail", name: "Master Astronomer's Bracers" },
    { id: "starstrikers_ascent", name: "Signet of Starstriker's Ascent" }
  ],
  aeona: [
    { id: "lonesome_song", name: "Time-warped Drape of the Lone Diety" },
    { id: "chrono_trigger", name: "Signet of the Chrono Trigger" },
    { id: "mass_entropy", name: "Bands of the Withering Shores" }
  ],
  gunde: [
    { id: "lego_1", name: "Carver's Sinister Apron" },
    { id: "lego_2", name: "Band of The Bleeding Heart" },
    { id: "lego_3", name: "Feathered Wraps Of The Raven God" }
  ],
  xavian: [
    { id: "grossly_incandescent", name: "Gilded Cloak of the Sunlit Kingdom" },
    { id: "solar_glare", name: "Runed Loop of the Horizon" },
    { id: "fortress_in_the_sands", name: "Sandworn Bands of the Fortress" }
  ]
};
