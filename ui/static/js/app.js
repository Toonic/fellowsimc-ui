// FellowSimc Frontend Controller

const HERO_DEFINITIONS = {
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

const HERO_LEGENDARIES = {
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


const ALL_WEAPON_TRAITS = [
  { id: "amethyst_splinters", name: "Amethyst Splinters" },
  { id: "brave_machinations", name: "Brave Machinations" },
  { id: "diamond_strike", name: "Diamond Strike" },
  { id: "divine_mediation", name: "Divine Mediation" },
  { id: "emerald_judgement", name: "Emerald Judgement" },
  { id: "first_man_standing", name: "First Man Standing" },
  { id: "grounded_spirit", name: "Grounded Spirit" },
  { id: "heart_of_stone", name: "Heart of Stone" },
  { id: "heroic_brand", name: "Heroic Brand" },
  { id: "hidden_power", name: "Hidden Power" },
  { id: "hunters_focus", name: "Hunter's Focus" },
  { id: "inspired_allegiance", name: "Inspired Allegiance" },
  { id: "iron_spikes", name: "Iron Spikes" },
  { id: "kindling", name: "Kindling" },
  { id: "king_of_the_hill", name: "King of the Hill" },
  { id: "latent_resurgence", name: "Latent Resurgence" },
  { id: "martial_initiative", name: "Martial Initiative" },
  { id: "navigators_intuition", name: "Navigator's Intuition" },
  { id: "patient_soul", name: "Patient Soul" },
  { id: "ruby_storm", name: "Ruby Storm" },
  { id: "sapphire_aurastone", name: "Sapphire Aurastone" },
  { id: "seized_opportunity", name: "Seized Opportunity" },
  { id: "stalwart_readiness", name: "Stalwart Readiness" },
  { id: "treasure_hunters_delight", name: "Treasure Hunter's Delight" },
  { id: "vengeful_soul", name: "Vengeful Soul" },
  { id: "visions_of_grandeur", name: "Visions of Grandeur" },
  { id: "willful_momentum", name: "Willful Momentum" }
];

const ALL_BLESSINGS = [
  { id: "the_herald", name: "The Herald" },
  { id: "the_philosopher", name: "The Philosopher" },
  { id: "the_trickster", name: "The Trickster" },
  { id: "the_monarch", name: "The Monarch" },
  { id: "the_intrepid", name: "The Intrepid" },
  { id: "the_celestial", name: "The Celestial" },
  { id: "the_sinister", name: "The Sinister" },
  { id: "the_heretic", name: "The Heretic" },
  { id: "the_vainglorious", name: "The Vainglorious" },
  { id: "the_wayfarer", name: "The Wayfarer" },
  { id: "the_mystic", name: "The Mystic" },
  { id: "the_usurper", name: "The Usurper" },
  { id: "the_vehement", name: "The Vehement" },
  { id: "subduer", name: "Subduer" }
];

let ALL_HERO_TALENTS = null;

let state = {
  reportCode: "",
  selectedFightId: null,
  selectedPlayerId: null,
  selectedPlayerName: "Rime",
  selectedHero: "rime",
  characterData: null,
  activeMode: "dungeon",
  selectedRouteType: "eternal_62",
  iterations: 1000,
  threads: 12,
  scalePct: 37.99,
  enableScale: true,
  customRouteText: "",
  aplChoice: "base",
  legendary: "none",
  useCustomApl: false,
  customAplText: `# Custom Action Priority List
actions.precombat=snapshot_stats
actions.precombat+=/frost_bolt
actions+=/ice_blitz
actions+=/winters_blessing
actions+=/flight_of_the_navir
actions+=/cold_snap,if=cooldown.chronoshift.up&worb<5
actions+=/chronoshift,if=(spirit>=70|spirit>=85|buff.ice_blitz.up)&(cooldown.cold_snap.charges=0|worb>=5)
actions+=/frost_bolt`,
  selectedTalents: new Set(),
  stats: {
    primary: 0,
    stamina: 0,
    haste: 0,
    expertise: 0,
    crit: 0,
    spirit: 0,
    armor: 0
  },
  gems: {
    sapphire: 0,
    amethyst: 0,
    emerald: 0,
    ruby: 0,
    diamond: 0,
    topaz: 0
  },
  traitCounts: {},
  blessingCounts: {},
  gearAffixes: [],
  gearItemNames: {},
  weapon: "chronoshift"
};

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  await loadTalentsData();
  initHeroPicker();
  initEventListeners();
  initStatInputs();
  initGemInputs();
  renderWeaponTraits();
  renderBlessings();
  selectHero("rime", false);
  checkApiConfig();
  rebuildProfileText();
});

// Tab Navigation
function initTabs() {
  const tabs = document.querySelectorAll(".fg-tab, .nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      const targetId = tab.dataset.tab;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });
}

// Load Talents Dataset
async function loadTalentsData() {
  try {
    const res = await fetch("/data/talents_data.json");
    if (res.ok) {
      ALL_HERO_TALENTS = await res.json();
    }
  } catch (e) {
    console.warn("Could not load /data/talents_data.json", e);
  }
  renderTalentTree();
}

// Hero Picker Setup
function initHeroPicker() {
  const items = document.querySelectorAll("#hero-picker-container .hero-picker-item:not(.disabled)");
  items.forEach(item => {
    item.addEventListener("click", () => {
      const heroKey = item.dataset.hero;
      if (heroKey && HERO_DEFINITIONS[heroKey]) {
        selectHero(heroKey, true);
      }
    });
  });
}

function selectHero(heroKey, resetTalents = false) {
  heroKey = heroKey.toLowerCase();
  if (!HERO_DEFINITIONS[heroKey]) {
    console.warn(`Hero ${heroKey} not recognized or not implemented in SimC.`);
    return;
  }

  state.selectedHero = heroKey;
  const def = HERO_DEFINITIONS[heroKey];

  // Update Hero Picker UI
  document.querySelectorAll("#hero-picker-container .hero-picker-item").forEach(item => {
    if (item.dataset.hero === heroKey) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update Primary Stat Label
  const primaryLabel = document.getElementById("label-stat-primary");
  if (primaryLabel) {
    primaryLabel.textContent = def.primaryStatLabel;
  }

  // Update Legendary Dropdown: Always default to "none" unless explicitly set
  const selectLeg = document.getElementById("select-legendary");
  if (selectLeg) {
    selectLeg.innerHTML = "";
    const noneOpt = document.createElement("option");
    noneOpt.value = "none";
    noneOpt.textContent = "None";
    noneOpt.selected = true;
    selectLeg.appendChild(noneOpt);

    const legList = HERO_LEGENDARIES[heroKey] || HERO_LEGENDARIES["rime"];
    legList.forEach(leg => {
      const opt = document.createElement("option");
      opt.value = leg.id;
      opt.textContent = leg.name;
      selectLeg.appendChild(opt);
    });
    state.legendary = "none";
  }

  // Update APL Presets dropdown
  const selectApl = document.getElementById("select-apl-preset");
  if (selectApl) {
    selectApl.innerHTML = "";
    if (heroKey === "rime") {
      selectApl.innerHTML = `
        <option value="base" selected>Dynamic Build Router (rime_base_apl.simc)</option>
        <option value="talons">Solved Talons APL (rime_talons_apl.simc)</option>
        <option value="generic">Generic APL (rime_generic_apl.simc)</option>
      `;
    } else {
      selectApl.innerHTML = `
        <option value="base" selected>Base APL (${heroKey}_base_apl.simc)</option>
      `;
    }
    state.aplChoice = "base";
  }

  if (resetTalents) {
    state.selectedTalents.clear();
  }

  renderTalentTree();
  rebuildProfileText();
}

// 6-Tier Talent Tree Controller
function renderTalentTree() {
  const container = document.getElementById("talent-tiers-container");
  if (!container) return;
  
  const heroKey = (state.selectedHero || "rime").toLowerCase();
  const heroTree = ALL_HERO_TALENTS?.[heroKey] || ALL_HERO_TALENTS?.["rime"];
  
  if (!heroTree || !heroTree.tiers) {
    container.innerHTML = `<div class="text-muted" style="padding: 20px;">Loading talents for ${heroKey}...</div>`;
    return;
  }

  container.innerHTML = "";

  heroTree.tiers.forEach(tierObj => {
    const tierRow = document.createElement("div");
    tierRow.className = "talent-tier-row";

    // Tier indicator (I, II, III, IV, V, VI)
    const tierIndicator = document.createElement("div");
    tierIndicator.className = "tier-indicator";
    tierIndicator.textContent = tierObj.label;
    tierRow.appendChild(tierIndicator);

    // 3-Card Grid
    const cardsGrid = document.createElement("div");
    cardsGrid.className = "tier-cards-grid";

    tierObj.talents.forEach(t => {
      const isSelected = state.selectedTalents.has(t.id);
      const card = document.createElement("div");
      card.className = `talent-card ${isSelected ? "active" : ""}`;
      card.dataset.talentId = t.id;
      card.dataset.pointCost = t.pointCost || 1;

      const iconSrc = t.localIcon || t.iconUrl || "";

      card.innerHTML = `
        <div class="talent-info-group">
          <div class="talent-icon-box">
            <img src="${iconSrc}" class="talent-icon-img" alt="${t.name}" onerror="this.style.display='none'">
          </div>
          <span class="talent-name">${t.name}</span>
        </div>
        <span class="talent-pts-badge">${t.pointCost}pt</span>
      `;

      // Click to toggle talent ON / OFF
      card.addEventListener("click", (e) => {
        e.preventDefault();
        toggleTalentSelection(t);
      });

      cardsGrid.appendChild(card);
    });

    tierRow.appendChild(cardsGrid);
    container.appendChild(tierRow);
  });

  // Clear All button
  const btnClear = document.getElementById("btn-clear-talents");
  if (btnClear) {
    btnClear.onclick = () => {
      state.selectedTalents.clear();
      updateTalentDisplay();
      rebuildProfileText();
    };
  }

  updateTalentDisplay();
}

function toggleTalentSelection(talent) {
  const isSelected = state.selectedTalents.has(talent.id);
  const cost = talent.pointCost || 1;
  const currentSpent = getTotalTalentPointsSpent();

  if (isSelected) {
    // Unlearn talent
    state.selectedTalents.delete(talent.id);
  } else {
    // Learn talent if within 14-point budget
    if (currentSpent + cost <= 14) {
      state.selectedTalents.add(talent.id);
    } else {
      // Point cap reached visual feedback
      const pointsEl = document.getElementById("talent-points-available");
      if (pointsEl) {
        pointsEl.style.color = "#f43f5e";
        setTimeout(() => { pointsEl.style.color = "#ffffff"; }, 350);
      }
      return;
    }
  }

  updateTalentDisplay();
  rebuildProfileText();
}

function getTotalTalentPointsSpent() {
  if (!ALL_HERO_TALENTS) return state.selectedTalents.size;
  const heroKey = (state.selectedHero || "rime").toLowerCase();
  const heroTree = ALL_HERO_TALENTS[heroKey] || ALL_HERO_TALENTS["rime"];
  if (!heroTree) return state.selectedTalents.size;

  let total = 0;
  const talentMap = {};
  heroTree.tiers.forEach(tr => {
    tr.talents.forEach(t => { talentMap[t.id] = t.pointCost || 1; });
  });

  state.selectedTalents.forEach(tid => {
    total += talentMap[tid] || 1;
  });
  return total;
}

function updateTalentDisplay() {
  const totalSpent = getTotalTalentPointsSpent();
  const available = Math.max(0, 14 - totalSpent);

  const pointsEl = document.getElementById("talent-points-available");
  if (pointsEl) {
    pointsEl.textContent = available;
  }

  // Update card active styles
  document.querySelectorAll(".talent-card").forEach(card => {
    const tid = card.dataset.talentId;
    if (state.selectedTalents.has(tid)) {
      card.classList.add("active");
    } else {
      card.classList.remove("active");
    }
  });

  // Auto-route APL preset if Icy Talons is active on Rime
  if (state.selectedHero === "rime" && state.selectedTalents.has("icy_talons")) {
    state.aplChoice = "talons";
    const aplSelect = document.getElementById("select-apl-preset");
    if (aplSelect) aplSelect.value = "talons";
  }
}


// Gem Powers Input Controller
function initGemInputs() {
  const gemKeys = ["sapphire", "amethyst", "emerald", "ruby", "diamond", "topaz"];
  gemKeys.forEach(key => {
    const el = document.getElementById(`gem-${key}`);
    if (el) {
      el.value = state.gems[key] || 0;
      el.addEventListener("input", (e) => {
        state.gems[key] = Math.max(0, parseInt(e.target.value) || 0);
        rebuildProfileText();
      });
    }
  });
}

// 27-Weapon Traits Steppers (0 to 4)
function renderWeaponTraits() {
  const container = document.getElementById("weapon-traits-container");
  if (!container) return;
  container.innerHTML = "";

  let activeCount = 0;

  ALL_WEAPON_TRAITS.forEach(trait => {
    const count = state.traitCounts[trait.id] || 0;
    if (count > 0) activeCount++;

    const card = document.createElement("div");
    card.className = `stepper-card ${count > 0 ? "active" : ""}`;
    card.innerHTML = `
      <span class="stepper-name" title="${trait.name}">${trait.name}</span>
      <div class="stepper-controls">
        <button type="button" class="btn-step btn-minus" ${count <= 0 ? "disabled" : ""}>−</button>
        <span class="step-val">${count}/4</span>
        <button type="button" class="btn-step btn-plus" ${count >= 4 ? "disabled" : ""}>+</button>
      </div>
    `;

    card.querySelector(".btn-minus").addEventListener("click", (e) => {
      e.stopPropagation();
      const current = state.traitCounts[trait.id] || 0;
      if (current > 0) {
        state.traitCounts[trait.id] = current - 1;
        if (state.traitCounts[trait.id] === 0) {
          delete state.traitCounts[trait.id];
        }
        renderWeaponTraits();
        rebuildProfileText();
      }
    });

    card.querySelector(".btn-plus").addEventListener("click", (e) => {
      e.stopPropagation();
      const current = state.traitCounts[trait.id] || 0;
      if (current < 4) {
        state.traitCounts[trait.id] = current + 1;
        renderWeaponTraits();
        rebuildProfileText();
      }
    });

    container.appendChild(card);
  });

  const totalEl = document.getElementById("traits-total-counter");
  if (totalEl) {
    totalEl.textContent = `${activeCount} Active`;
  }
}

// 14-Blessings & Affixes Steppers (0 to 4)
function renderBlessings() {
  const container = document.getElementById("blessings-container");
  if (!container) return;
  container.innerHTML = "";

  let activeCount = 0;

  ALL_BLESSINGS.forEach(blessing => {
    const count = state.blessingCounts[blessing.id] || 0;
    if (count > 0) activeCount++;

    const card = document.createElement("div");
    card.className = `stepper-card ${count > 0 ? "active" : ""}`;
    card.innerHTML = `
      <span class="stepper-name" title="${blessing.name}">${blessing.name}</span>
      <div class="stepper-controls">
        <button type="button" class="btn-step btn-minus" ${count <= 0 ? "disabled" : ""}>−</button>
        <span class="step-val">${count}/4</span>
        <button type="button" class="btn-step btn-plus" ${count >= 4 ? "disabled" : ""}>+</button>
      </div>
    `;

    card.querySelector(".btn-minus").addEventListener("click", (e) => {
      e.stopPropagation();
      const current = state.blessingCounts[blessing.id] || 0;
      if (current > 0) {
        state.blessingCounts[blessing.id] = current - 1;
        if (state.blessingCounts[blessing.id] === 0) {
          delete state.blessingCounts[blessing.id];
        }
        renderBlessings();
        rebuildProfileText();
      }
    });

    card.querySelector(".btn-plus").addEventListener("click", (e) => {
      e.stopPropagation();
      const current = state.blessingCounts[blessing.id] || 0;
      if (current < 4) {
        state.blessingCounts[blessing.id] = current + 1;
        renderBlessings();
        rebuildProfileText();
      }
    });

    container.appendChild(card);
  });

  const totalEl = document.getElementById("blessings-total-counter");
  if (totalEl) {
    totalEl.textContent = `${activeCount} Active`;
  }
}

// Stats Inputs Setup
function initStatInputs() {
  const statPrimary = document.getElementById("stat-primary");
  if (statPrimary) {
    statPrimary.value = state.stats.primary;
    statPrimary.addEventListener("input", (e) => {
      state.stats.primary = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statStam = document.getElementById("stat-stamina");
  if (statStam) {
    statStam.value = state.stats.stamina;
    statStam.addEventListener("input", (e) => {
      state.stats.stamina = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statHaste = document.getElementById("stat-haste");
  if (statHaste) {
    statHaste.value = state.stats.haste;
    statHaste.addEventListener("input", (e) => {
      state.stats.haste = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statExp = document.getElementById("stat-expertise");
  if (statExp) {
    statExp.value = state.stats.expertise;
    statExp.addEventListener("input", (e) => {
      state.stats.expertise = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statCrit = document.getElementById("stat-crit");
  if (statCrit) {
    statCrit.value = state.stats.crit;
    statCrit.addEventListener("input", (e) => {
      state.stats.crit = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statSpirit = document.getElementById("stat-spirit");
  if (statSpirit) {
    statSpirit.value = state.stats.spirit;
    statSpirit.addEventListener("input", (e) => {
      state.stats.spirit = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }

  const statArmor = document.getElementById("stat-armor");
  if (statArmor) {
    statArmor.value = state.stats.armor;
    statArmor.addEventListener("input", (e) => {
      state.stats.armor = parseInt(e.target.value) || 0;
      rebuildProfileText();
    });
  }
}

// Event Listeners Setup
function initEventListeners() {
  // Settings Modal
  const btnSettings = document.getElementById("btn-settings");
  const modalSettings = document.getElementById("modal-settings");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnSaveSettings = document.getElementById("btn-save-settings");

  if (btnSettings && modalSettings) {
    btnSettings.addEventListener("click", () => {
      modalSettings.style.display = "flex";
    });
  }
  if (btnCloseModal && modalSettings) {
    btnCloseModal.addEventListener("click", () => {
      modalSettings.style.display = "none";
    });
  }
  if (btnSaveSettings) {
    btnSaveSettings.addEventListener("click", saveApiConfig);
  }

  // Fetch Report
  const btnFetch = document.getElementById("btn-fetch-report");
  if (btnFetch) {
    btnFetch.addEventListener("click", fetchReport);
  }

  // Import Character
  const btnLoadChar = document.getElementById("btn-load-character");
  if (btnLoadChar) {
    btnLoadChar.addEventListener("click", importCharacter);
  }

  // Route Import Subcard Buttons
  const inputRoute = document.getElementById("input-route-url");
  const btnImportLogRoute = document.getElementById("btn-import-log-route");
  const btnUseCurrLog = document.getElementById("btn-use-current-log-route");

  function updateRouteButtonVisibility() {
    if (btnImportLogRoute && inputRoute) {
      btnImportLogRoute.style.display = inputRoute.value.trim() ? "inline-flex" : "none";
    }
  }

  if (inputRoute) {
    inputRoute.addEventListener("input", updateRouteButtonVisibility);
  }

  if (btnUseCurrLog) {
    btnUseCurrLog.addEventListener("click", () => {
      const currentUrl = document.getElementById("input-report-url").value;
      if (inputRoute) {
        inputRoute.value = currentUrl;
        updateRouteButtonVisibility();
      }
    });
  }
  if (btnImportLogRoute) {
    btnImportLogRoute.addEventListener("click", importCustomRoute);
  }

  // Mode Cards Selection
  document.querySelectorAll(".mode-card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON" || e.target.tagName === "SELECT") return;
      document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      state.activeMode = card.dataset.mode;
      rebuildProfileText();
    });
  });

  // Dungeon Route Dropdown Selector
  const selDungeonRoute = document.getElementById("select-dungeon-route");
  if (selDungeonRoute) {
    selDungeonRoute.addEventListener("change", (e) => {
      state.selectedRouteType = e.target.value;
      const desc = document.getElementById("dungeon-route-desc");
      if (desc) {
        if (e.target.value === "eternal_62") {
          desc.textContent = "Exported from a Wyrmheart 62 route.";
        } else {
          desc.textContent = state.customRouteText ? "Custom route imported from log." : "Custom route (import a log below).";
        }
      }
      rebuildProfileText();
    });
  }

  // Scale Damage % Inputs
  const inputScale = document.getElementById("input-scale-pct");
  if (inputScale) {
    inputScale.addEventListener("input", (e) => {
      state.scalePct = parseFloat(e.target.value) || 100.0;
      rebuildProfileText();
    });
  }
  const checkScale = document.getElementById("check-scale-damage");
  if (checkScale) {
    checkScale.addEventListener("change", (e) => {
      state.enableScale = e.target.checked;
      rebuildProfileText();
    });
  }

  // Single Target & AoE duration inputs
  const stDuration = document.getElementById("input-st-duration");
  if (stDuration) stDuration.addEventListener("input", rebuildProfileText);
  const aoeTargets = document.getElementById("input-aoe-targets");
  if (aoeTargets) aoeTargets.addEventListener("input", rebuildProfileText);
  const aoeDuration = document.getElementById("input-aoe-duration");
  if (aoeDuration) aoeDuration.addEventListener("input", rebuildProfileText);

  // Weapon Selector
  const selectWeapon = document.getElementById("select-weapon");
  if (selectWeapon) {
    selectWeapon.addEventListener("change", (e) => {
      state.weapon = e.target.value;
      rebuildProfileText();
    });
  }

  // Legendary Selector
  const selectLegendary = document.getElementById("select-legendary");
  if (selectLegendary) {
    selectLegendary.addEventListener("change", (e) => {
      state.legendary = e.target.value;
      rebuildProfileText();
    });
  }

  // APL Presets and Custom APL Toggle
  const selectApl = document.getElementById("select-apl-preset");
  if (selectApl) {
    selectApl.addEventListener("change", (e) => {
      state.aplChoice = e.target.value;
      rebuildProfileText();
    });
  }
  const customAplCheck = document.getElementById("check-custom-apl");
  const customAplCont = document.getElementById("custom-apl-container");
  if (customAplCheck && customAplCont) {
    customAplCheck.checked = state.useCustomApl;
    customAplCont.style.display = state.useCustomApl ? "block" : "none";
    if (selectApl) selectApl.disabled = state.useCustomApl;

    customAplCheck.addEventListener("change", (e) => {
      state.useCustomApl = e.target.checked;
      customAplCont.style.display = e.target.checked ? "block" : "none";
      if (selectApl) selectApl.disabled = state.useCustomApl;
      rebuildProfileText();
    });
  }
  const customAplEd = document.getElementById("custom-apl-editor");
  if (customAplEd) {
    customAplEd.value = state.customAplText;
    customAplEd.addEventListener("input", (e) => {
      state.customAplText = e.target.value;
      if (state.useCustomApl) {
        rebuildProfileText();
      }
    });
  }

  // Iterations & Threads Listeners
  const inputIter = document.getElementById("input-iterations");
  if (inputIter) {
    inputIter.addEventListener("input", (e) => {
      state.iterations = parseInt(e.target.value) || 1000;
      rebuildProfileText();
    });
  }
  document.querySelectorAll(".btn-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".btn-chip").forEach(c => {
        c.classList.remove("btn-primary");
        c.classList.add("btn-secondary");
      });
      chip.classList.remove("btn-secondary");
      chip.classList.add("btn-primary");
      const iters = parseInt(chip.dataset.iterations) || 1000;
      state.iterations = iters;
      if (inputIter) inputIter.value = iters;
      rebuildProfileText();
    });
  });

  const inputThr = document.getElementById("input-threads");
  if (inputThr) {
    inputThr.addEventListener("input", (e) => {
      state.threads = parseInt(e.target.value) || 12;
      rebuildProfileText();
    });
  }

  // Run Simulation Button
  const btnRun = document.getElementById("btn-run-sim");
  if (btnRun) btnRun.addEventListener("click", runSimulation);

  // Open HTML Report
  const btnOpenHtml = document.getElementById("btn-open-html-report");
  if (btnOpenHtml) {
    btnOpenHtml.addEventListener("click", () => {
      window.open("/api/report", "_blank");
    });
  }
}

// API Config
async function checkApiConfig() {
  try {
    const res = await fetch("/api/config");
    const data = await res.json();
    const cfgInput = document.getElementById("cfg-client-id");
    if (cfgInput && data.client_id) {
      cfgInput.value = data.client_id;
    }
    const statusBadge = document.getElementById("connection-status");
    if (statusBadge) {
      if (data.has_secret) {
        statusBadge.className = "status-badge connected";
        statusBadge.querySelector(".status-text").textContent = "API Ready";
      } else {
        statusBadge.className = "status-badge warning";
        statusBadge.querySelector(".status-text").textContent = "Set API Keys";
      }
    }
  } catch (e) {
    console.error("Config check failed", e);
  }
}

async function saveApiConfig() {
  const cid = document.getElementById("cfg-client-id").value;
  const sec = document.getElementById("cfg-client-secret").value;
  try {
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: cid, client_secret: sec })
    });
    if (res.ok) {
      document.getElementById("modal-settings").style.display = "none";
      checkApiConfig();
    }
  } catch (e) {
    alert("Failed to save credentials: " + e);
  }
}

// Fetch Report Fights and auto-select
async function fetchReport() {
  const urlOrCode = document.getElementById("input-report-url").value;
  const btn = document.getElementById("btn-fetch-report");
  if (!btn) return;
  btn.textContent = "Fetching...";
  btn.disabled = true;

  try {
    const res = await fetch("/api/import-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url_or_code: urlOrCode })
    });
    const data = await res.json();
    if (data.error) {
      alert("Error: " + data.error);
      return;
    }

    state.reportCode = data.report_code;
    const fights = (data.report && data.report.fights) ? data.report.fights : [];
    const actors = (data.report && data.report.masterData) ? data.report.masterData.actors : [];

    // Populate Fights Dropdown
    const selectFight = document.getElementById("select-fight");
    if (selectFight) {
      selectFight.innerHTML = "";
      fights.forEach(f => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = `Fight ${f.id}: ${f.name} (${f.kill ? "Kill" : "Wipe"})`;
        if (data.default_fight_id && f.id === data.default_fight_id) {
          opt.selected = true;
        }
        selectFight.appendChild(opt);
      });
    }

    // Populate Players Dropdown
    const selectPlayer = document.getElementById("select-player");
    if (selectPlayer) {
      selectPlayer.innerHTML = "";
      actors.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.id;
        opt.dataset.name = a.name;
        opt.dataset.type = a.type || a.subType;
        opt.textContent = `${a.name} (${a.type || a.subType || "Hero"})`;
        if (data.default_source_id && (String(a.id) === String(data.default_source_id) || a.name.toLowerCase() === String(data.default_source_id).toLowerCase())) {
          opt.selected = true;
        }
        selectPlayer.appendChild(opt);
      });
    }

    document.getElementById("import-selection-area").style.display = "grid";
  } catch (e) {
    alert("Network error: " + e);
  } finally {
    btn.textContent = "FETCH FIGHTS";
    btn.disabled = false;
  }
}

// Import Character Loadout
async function importCharacter() {
  const selectFight = document.getElementById("select-fight");
  const selectPlayer = document.getElementById("select-player");
  const fightId = selectFight ? parseInt(selectFight.value) : (state.selectedFightId || 32);
  const playerId = selectPlayer ? parseInt(selectPlayer.value) : (state.selectedPlayerId || 3);
  const playerName = selectPlayer && selectPlayer.selectedOptions[0] ? selectPlayer.selectedOptions[0].dataset.name : "Midpls";

  state.selectedFightId = fightId;
  state.selectedPlayerId = playerId;
  state.selectedPlayerName = playerName;

  const btn = document.getElementById("btn-load-character");
  if (btn) {
    btn.textContent = "Importing Loadout...";
    btn.disabled = true;
  }

  try {
    const res = await fetch("/api/import-character", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_code: state.reportCode,
        fight_id: fightId,
        player_id: playerId,
        player_name: playerName
      })
    });
    const data = await res.json();
    if (data.error) {
      alert("Error importing character: " + data.error);
      return;
    }

    state.characterData = data;
    const gen = data.generated_profile_components || data.generated_profile;

    // Detect hero class and switch
    const rawHeroType = (gen.hero_type || "rime").toLowerCase();
    const heroKey = HERO_DEFINITIONS[rawHeroType] ? rawHeroType : "rime";
    selectHero(heroKey, false);

    // Update Summary Header
    const nameEl = document.getElementById("summary-name");
    const classEl = document.getElementById("summary-class");
    if (nameEl) nameEl.textContent = playerName.toUpperCase();
    if (classEl) classEl.textContent = heroKey.toUpperCase();

    // Summary Quick Stats
    const statsEl = document.getElementById("summary-stats");
    if (statsEl) {
      statsEl.innerHTML = `
        <span>Primary: <strong>${gen.attrs.Intellect || gen.attrs.Agility || gen.attrs.Strength || gen.attrs.Attack_Power || 183}</strong></span>
        <span>Stam: <strong>${gen.attrs.Stamina}</strong></span>
        <span>Haste: <strong>${gen.attrs.Haste}</strong></span>
        <span>Crit: <strong>${gen.attrs['Critical Strike']}</strong></span>
        <span>Expertise: <strong>${gen.attrs.Expertise}</strong></span>
        <span>Spirit: <strong>${gen.attrs.Spirit}</strong></span>
        <span>Armor: <strong>${gen.attrs.Armor}</strong></span>
      `;
    }
    const badgeCard = document.getElementById("character-summary-badge");
    if (badgeCard) badgeCard.style.display = "flex";

    // Update Direct Stat Inputs
    const primStatVal = gen.attrs.Intellect || gen.attrs.Agility || gen.attrs.Strength || gen.attrs.Attack_Power || 183;
    const statPrimary = document.getElementById("stat-primary");
    const statStam = document.getElementById("stat-stamina");
    const statHaste = document.getElementById("stat-haste");
    const statCrit = document.getElementById("stat-crit");
    const statExp = document.getElementById("stat-expertise");
    const statSp = document.getElementById("stat-spirit");
    const statArm = document.getElementById("stat-armor");

    if (statPrimary) statPrimary.value = primStatVal;
    if (statStam) statStam.value = gen.attrs.Stamina;
    if (statHaste) statHaste.value = gen.attrs.Haste;
    if (statCrit) statCrit.value = gen.attrs["Critical Strike"];
    if (statExp) statExp.value = gen.attrs.Expertise;
    if (statSp) statSp.value = gen.attrs.Spirit;
    if (statArm) statArm.value = gen.attrs.Armor;

    state.stats = {
      primary: primStatVal,
      stamina: gen.attrs.Stamina,
      haste: gen.attrs.Haste,
      expertise: gen.attrs.Expertise,
      crit: gen.attrs["Critical Strike"],
      spirit: gen.attrs.Spirit,
      armor: gen.attrs.Armor
    };

    // Update Talents
    state.selectedTalents.clear();
    const heroTree = ALL_HERO_TALENTS?.[heroKey] || ALL_HERO_TALENTS?.["rime"];
    const allHeroTalents = [];
    if (heroTree && heroTree.tiers) {
      heroTree.tiers.forEach(tr => {
        tr.talents.forEach(tal => allHeroTalents.push(tal));
      });
    }

    if (Array.isArray(gen.talents)) {
      gen.talents.forEach(tStr => {
        const rawClean = tStr.toLowerCase().replace(/[^a-z0-9]/g, '');
        const matched = allHeroTalents.find(tal => {
          const idClean = tal.id.toLowerCase().replace(/[^a-z0-9]/g, '');
          const nameClean = tal.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          return idClean === rawClean || nameClean === rawClean;
        });
        if (matched) {
          state.selectedTalents.add(matched.id);
        } else {
          state.selectedTalents.add(tStr.toLowerCase().replace(/[^a-z0-9]/g, '_'));
        }
      });
    }
    renderTalentTree();

    // Store Gems, Traits, and Blessings
    state.gems = {
      sapphire: gen.gems?.sapphire || 0,
      amethyst: gen.gems?.amethyst || 0,
      emerald: gen.gems?.emerald || 0,
      ruby: gen.gems?.ruby || 0,
      diamond: gen.gems?.diamond || 0,
      topaz: gen.gems?.topaz || 0
    };
    ["sapphire", "amethyst", "emerald", "ruby", "diamond", "topaz"].forEach(k => {
      const el = document.getElementById(`gem-${k}`);
      if (el) el.value = state.gems[k];
    });

    state.traitCounts = gen.trait_counts || {};
    state.blessingCounts = gen.blessing_counts || {};
    state.gearItemNames = gen.gear_item_names || state.gearItemNames || {};
    state.gearAffixes = gen.gear_items_output || [];
    state.weapon = gen.weapon || "chronoshift";

    const selWeap = document.getElementById("select-weapon");
    if (selWeap) selWeap.value = state.weapon;

    // Set Imported Legendary (or default none)
    if (gen.legendary && gen.legendary !== "none") {
      state.legendary = gen.legendary;
    } else {
      state.legendary = "none";
    }
    const selectLeg = document.getElementById("select-legendary");
    if (selectLeg) selectLeg.value = state.legendary;

    renderWeaponTraits();
    renderBlessings();

    // Rebuild raw profile
    rebuildProfileText();
  } catch (e) {
    alert("Import failed: " + e);
  } finally {
    if (btn) {
      btn.textContent = "IMPORT CHARACTER LOADOUT";
      btn.disabled = false;
    }
  }
}

// Import Custom Route from Log
async function importCustomRoute() {
  const urlOrCode = document.getElementById("input-route-url").value || state.reportCode;
  const selectFight = document.getElementById("select-fight");
  const fightId = selectFight ? parseInt(selectFight.value) : (state.selectedFightId || 32);
  const statusDiv = document.getElementById("route-import-status");
  const btn = document.getElementById("btn-import-log-route");

  if (btn) {
    btn.textContent = "Importing Route...";
    btn.disabled = true;
  }

  try {
    const res = await fetch("/api/import-route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url_or_code: urlOrCode,
        fight_id: fightId,
        scale_pct: state.scalePct
      })
    });
    const data = await res.json();
    if (data.error) {
      alert("Route import error: " + data.error);
      return;
    }

    state.customRouteText = data.route_text;
    if (statusDiv) {
      statusDiv.textContent = `Successfully imported route: ${data.fight_name} (${data.enemies_count} enemy types, scaled to ${data.scale_pct}%)`;
      statusDiv.style.display = "block";
    }

    // Update dropdown in Dungeon Route card and select imported
    const selDungeonRoute = document.getElementById("select-dungeon-route");
    if (selDungeonRoute) {
      selDungeonRoute.value = "custom_imported";
      state.selectedRouteType = "custom_imported";
    }
    const desc = document.getElementById("dungeon-route-desc");
    if (desc) desc.textContent = `Custom route: ${data.fight_name} (${data.enemies_count} enemy types).`;

    // Make sure dungeon card is active
    document.querySelectorAll(".mode-card").forEach(c => c.classList.remove("active"));
    const cardDungeon = document.getElementById("card-mode-dungeon");
    if (cardDungeon) cardDungeon.classList.add("active");
    state.activeMode = "dungeon";

    rebuildProfileText();
    alert(`Dungeon route imported from ${data.fight_name}!`);
  } catch (e) {
    alert("Failed to import route: " + e);
  } finally {
    if (btn) {
      btn.textContent = "Import Route";
      btn.disabled = false;
    }
  }
}

// Rebuild .simc Profile Text
function rebuildProfileText() {
  const pName = state.selectedPlayerName || (state.characterData ? state.characterData.player.name : "Midpls");
  const heroKey = (state.selectedHero || "rime").toLowerCase();
  const heroDef = HERO_DEFINITIONS[heroKey] || HERO_DEFINITIONS["rime"];

  let lines = [
    `# ====================================================================`,
    `# FellowSimc Profile - ${pName} (${heroDef.name.toUpperCase()})`,
    `# Generated via FellowSimc Importer`,
    `# ====================================================================`,
    ``,
    `iterations=${state.iterations || 1000}`,
    `optimal_raid=0`,
    `threads=${state.threads || 12}`,
    ``
  ];

  if (state.activeMode === "dungeon") {
    if (state.selectedRouteType === "custom_imported" && state.customRouteText) {
      lines.push(`# Encounter: Custom Imported Dungeon Route`);
      lines.push(state.customRouteText);
    } else {
      lines.push(`# Encounter: Dungeon Route - Eternal 62 (Exported from a Wyrmheart 62 route)`);
      lines.push(`apl/routes/wyrmheart_62_solo.simc`);
    }
  } else if (state.activeMode === "single_target") {
    const dur = document.getElementById("input-st-duration") ? document.getElementById("input-st-duration").value : 360;
    lines.push(`# Encounter: Single Target (${dur}s)`);
    lines.push(`max_time=${dur}`);
    lines.push(`vary_combat_length=0.0`);
    lines.push(`fight_style=Patchwerk`);
  } else if (state.activeMode === "aoe") {
    const targets = document.getElementById("input-aoe-targets") ? document.getElementById("input-aoe-targets").value : 10;
    const dur = document.getElementById("input-aoe-duration") ? document.getElementById("input-aoe-duration").value : 360;
    lines.push(`# Encounter: AoE (${targets} Targets, ${dur}s)`);
    lines.push(`max_time=${dur}`);
    lines.push(`vary_combat_length=0.0`);
    lines.push(`fight_style=Patchwerk`);
    lines.push(`desired_targets=${targets}`);
  }

  lines.push(``);
  lines.push(`# Hero & APL`);
  lines.push(`${heroDef.simcClass}="${pName}"`);
  lines.push(`level=80`);

  if (state.useCustomApl && state.customAplText) {
    lines.push(`# Custom Action Priority List`);
    lines.push(state.customAplText);
  } else if (state.aplChoice === "talons" && heroKey === "rime") {
    lines.push(`apl/heroes/rime/rime_talons_apl.simc`);
  } else if (state.aplChoice === "generic" && heroKey === "rime") {
    lines.push(`apl/heroes/rime/rime_generic_apl.simc`);
  } else {
    lines.push(`apl/heroes/${heroKey}/${heroKey}_base_apl.simc`);
  }
  lines.push(``);

  lines.push(`# Gear Attributes & Ratings`);
  if (state.stats.primary > 0) {
    lines.push(`gear_${heroDef.primaryStat}=${state.stats.primary}`);
  }
  if (state.stats.stamina > 0) lines.push(`gear_stamina=${state.stats.stamina}`);
  if (state.stats.haste > 0) lines.push(`gear_haste_rating=${state.stats.haste}`);
  if (state.stats.expertise > 0) lines.push(`gear_expertise_rating=${state.stats.expertise}`);
  if (state.stats.crit > 0) lines.push(`gear_crit_rating=${state.stats.crit}`);
  if (state.stats.spirit > 0) lines.push(`gear_spirit=${state.stats.spirit}`);
  if (state.stats.armor > 0) lines.push(`gear_armor=${state.stats.armor}`);
  lines.push(``);

  // Gem Powers
  if (state.gems) {
    lines.push(`# Gem Powers`);
    for (const [gname, gpow] of Object.entries(state.gems)) {
      if (gpow > 0) lines.push(`gems.${gname}_power=${gpow}`);
    }
    lines.push(``);
  }

  // Sets & Legendary
  lines.push(`# Active Sets & Legendary`);
  lines.push(`sets.dark_prophecy=1`);
  lines.push(`sets.drakheims_absolution=1`);
  lines.push(`sets.seal_of_the_heskyr=1`);
  lines.push(`sets.deaths_grasp=1`);
  if (state.legendary && state.legendary !== "none") {
    lines.push(`legendary.${state.legendary}=1`);
  }
  lines.push(``);

  // Weapon & Weapon Traits
  lines.push(`# Equipped Weapon & Weapon Traits`);
  lines.push(`weapon=${state.weapon}`);
  if (state.traitCounts) {
    for (const [tname, trank] of Object.entries(state.traitCounts)) {
      lines.push(`weapon_trait.${tname}=${trank}`);
    }
  }
  lines.push(``);

  // Gear Items & Blessings (Affixes) - Evenly distributed across gear slots
  const activeBlessingList = [];
  if (state.blessingCounts) {
    for (const [bid, count] of Object.entries(state.blessingCounts)) {
      // Support imported > 4 counts, but only ever place a maximum of 4 per blessing into .simc profile
      const cappedCount = Math.min(4, Math.max(0, count));
      for (let i = 0; i < cappedCount; i++) {
        activeBlessingList.push(bid);
      }
    }
  }

  const standardSlots = [
    "head", "shoulder", "chest", "wrists", "hands", "legs",
    "feet", "finger1", "finger2", "neck", "back", "main_hand"
  ];

  if (activeBlessingList.length > 0) {
    lines.push(`# Gear Items & Blessings (Affixes)`);
    
    // Distribute up to 2 blessings per gear slot across available slots
    const slotMap = {};
    standardSlots.forEach(s => { slotMap[s] = []; });

    let slotIdx = 0;
    activeBlessingList.forEach(blessing => {
      let placed = false;
      for (let i = 0; i < standardSlots.length; i++) {
        const s = standardSlots[(slotIdx + i) % standardSlots.length];
        if (slotMap[s].length < 2) {
          slotMap[s].push(blessing);
          slotIdx = (slotIdx + i + 1) % standardSlots.length;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const s = standardSlots[slotIdx % standardSlots.length];
        slotMap[s].push(blessing);
        slotIdx = (slotIdx + 1) % standardSlots.length;
      }
    });

    standardSlots.forEach(slot => {
      const affs = slotMap[slot];
      if (affs && affs.length > 0) {
        const itemName = state.gearItemNames?.[slot] || `${slot}_item`;
        lines.push(`${slot}=${itemName},affixes=${affs.join("/")}`);
      }
    });
    lines.push(``);
  } else if (state.gearAffixes && state.gearAffixes.length > 0) {
    lines.push(`# Gear Items & Blessings (Affixes)`);
    state.gearAffixes.forEach(g => lines.push(g));
    lines.push(``);
  }

  // Build Talents in Simulationcraft format: talents=tal1:1/tal2:1/...
  if (state.selectedTalents.size > 0) {
    lines.push(`# Talents`);
    const activeTalents = Array.from(state.selectedTalents).map(id => `${id}:1`);
    lines.push(`talents=${activeTalents.join("/")}`);
    lines.push(``);
  }

  const profileEditor = document.getElementById("raw-profile-editor");
  if (profileEditor) {
    profileEditor.value = lines.join("\n");
  }
}

// Run Simulation (Live SimulationCraft Log Streaming)
async function runSimulation() {
  const profileText = document.getElementById("raw-profile-editor").value;
  const consoleBox = document.getElementById("sim-console-output");
  const dpsVal = document.getElementById("result-dps-value");
  const metaVal = document.getElementById("result-meta-info");
  const btnRun = document.getElementById("btn-run-sim");
  const btnHtml = document.getElementById("btn-open-html-report");

  // Switch to results tab
  document.querySelectorAll(".fg-tab, .nav-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  const resTab = document.querySelector('[data-tab="tab-results"]');
  const resPane = document.getElementById("tab-results");
  if (resTab) resTab.classList.add("active");
  if (resPane) resPane.classList.add("active");

  if (btnRun) {
    btnRun.disabled = true;
    btnRun.innerHTML = `<span>RUNNING SIM...</span>`;
  }
  if (btnHtml) btnHtml.style.display = "none";

  const iters = state.iterations || 1000;
  const threads = state.threads || 12;
  const itersFormatted = iters.toLocaleString();

  if (dpsVal) dpsVal.textContent = "SIMULATING...";
  if (metaVal) metaVal.textContent = `Executing ${itersFormatted} iterations across ${threads} threads...`;
  if (consoleBox) {
    consoleBox.textContent = "";
  }

  const startTime = Date.now();
  try {
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_text: profileText })
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let sseBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const events = sseBuffer.split("\n\n");
      sseBuffer = events.pop() || "";

      for (const evtBlock of events) {
        if (!evtBlock.trim()) continue;
        const lines = evtBlock.split("\n");
        let eventType = "message";
        let eventData = null;

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            try {
              eventData = JSON.parse(line.slice(5).trim());
            } catch (e) {
              eventData = line.slice(5).trim();
            }
          }
        }

        if (eventType === "log" && eventData) {
          if (consoleBox) {
            const text = eventData.text || "";
            const eol = eventData.eol || "\n";
            if (eol === "\r" && consoleBox.textContent) {
              const curLines = consoleBox.textContent.split("\n");
              curLines[curLines.length - 1] = text;
              consoleBox.textContent = curLines.join("\n");
            } else {
              consoleBox.textContent += (consoleBox.textContent ? "\n" : "") + text;
            }
            consoleBox.scrollTop = consoleBox.scrollHeight;
          }
        } else if (eventType === "done" && eventData) {
          const elapsedTotal = eventData.elapsed_seconds || ((Date.now() - startTime) / 1000).toFixed(2);
          const meanDps = eventData.mean_dps ? Math.round(eventData.mean_dps) : 0;
          const dpsStr = meanDps > 0 ? `${meanDps.toLocaleString()} DPS` : "COMPLETED";

          if (dpsVal) dpsVal.textContent = dpsStr;
          if (metaVal) metaVal.textContent = `${itersFormatted} Iterations • ${elapsedTotal}s elapsed • Exit code: ${eventData.return_code}`;

          if (consoleBox && eventData.report) {
            consoleBox.textContent += "\n\n" + eventData.report;
            consoleBox.scrollTop = 0;
          }

          if (btnHtml) {
            btnHtml.style.display = eventData.has_html ? "inline-flex" : "none";
            btnHtml.disabled = !eventData.has_html;
          }
        }
      }
    }
  } catch (e) {
    if (dpsVal) dpsVal.textContent = "ERROR";
    if (metaVal) metaVal.textContent = "Execution error.";
    if (consoleBox) consoleBox.textContent += "\n\nSimulation execution error: " + e;
  } finally {
    if (btnRun) {
      btnRun.disabled = false;
      btnRun.innerHTML = `<span>RUN SIM</span>`;
    }
  }
}
