// Central State Store for FellowSimc

export class AppState {
  constructor() {
    this.reportCode = "";
    this.currentFights = [];
    this.currentActors = [];
    this.selectedFightId = null;
    this.selectedPlayerId = null;
    this.selectedPlayerName = "Rime";
    this.selectedHero = "rime";
    this.characterData = null;
    this.activeMode = "dungeon";
    this.selectedRouteType = "eternal_62";
    this.iterations = 1000;
    this.threads = 12;
    this.scalePct = 37.99;
    this.enableScale = true;
    this.customRouteText = "";
    this.aplChoice = "base";
    this.legendary = "none";
    this.activeSets = new Set();
    this.useCustomApl = false;
    this.customAplText = `# Custom Action Priority List
actions.precombat=snapshot_stats
actions.precombat+=/frost_bolt
actions+=/ice_blitz
actions+=/winters_blessing
actions+=/flight_of_the_navir
actions+=/cold_snap,if=cooldown.chronoshift.up&worb<5
actions+=/chronoshift,if=(spirit>=70|spirit>=85|buff.ice_blitz.up)&(cooldown.cold_snap.charges=0|worb>=5)
actions+=/frost_bolt`;
    this.selectedTalents = new Set();
    this.stats = {
      primary: 259,
      stamina: 425,
      haste: 53,
      expertise: 158,
      crit: 185,
      spirit: 146,
      armor: 539
    };
    this.gems = {
      sapphire: 0,
      amethyst: 0,
      emerald: 0,
      ruby: 0,
      diamond: 0,
      topaz: 0
    };
    this.traitCounts = {};
    this.blessingCounts = {};
    this.gearAffixes = [];
    this.gearItemNames = {};
    this.weapon = "chronoshift";
    this.savedBuilds = [];
    this.selectedCompareBuildIds = new Set();
    this.includeCurrentInCompare = true;
    this.enableCompare = false;
    this.activeBuildName = "";
    this.currentLoadedBuildId = "";

    this._listeners = new Set();
    this.loadSavedBuilds();
  }

  loadSavedBuilds() {
    try {
      const stored = localStorage.getItem("fellowsimc_saved_builds");
      if (stored) {
        this.savedBuilds = JSON.parse(stored);
        this.selectedCompareBuildIds = new Set(this.savedBuilds.map(b => b.id));
      }
    } catch (e) {
      console.warn("Failed to load saved builds from localStorage:", e);
      this.savedBuilds = [];
    }
  }

  saveBuildsToStorage() {
    try {
      localStorage.setItem("fellowsimc_saved_builds", JSON.stringify(this.savedBuilds));
    } catch (e) {
      console.error("Failed to save builds to localStorage:", e);
    }
  }

  toBuildSnapshot(name) {
    return {
      id: "build_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5),
      name: name || this.activeBuildName || `${this.selectedPlayerName} - ${this.selectedHero.toUpperCase()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      hero: this.selectedHero,
      playerName: this.selectedPlayerName,
      stats: { ...this.stats },
      selectedTalents: Array.from(this.selectedTalents),
      weapon: this.weapon,
      legendary: this.legendary,
      activeSets: Array.from(this.activeSets),
      gems: { ...this.gems },
      traitCounts: { ...this.traitCounts },
      blessingCounts: { ...this.blessingCounts },
      gearAffixes: [...(this.gearAffixes || [])],
      gearItemNames: { ...(this.gearItemNames || {}) },
      aplChoice: this.aplChoice,
      useCustomApl: this.useCustomApl,
      customAplText: this.customAplText
    };
  }

  applyBuildSnapshot(b) {
    if (!b) return;
    this.currentLoadedBuildId = b.id || "";
    this.activeBuildName = b.name || "Loaded Build";
    this.selectedPlayerName = b.playerName || b.name || "Hero";
    this.selectedHero = (b.hero || "rime").toLowerCase();
    this.stats = b.stats ? { ...b.stats } : { ...this.stats };
    this.selectedTalents = new Set(b.selectedTalents || []);
    this.weapon = b.weapon || "chronoshift";
    this.legendary = b.legendary || "none";
    this.activeSets = new Set(b.activeSets || []);
    this.gems = b.gems ? { ...b.gems } : { ...this.gems };
    this.traitCounts = b.traitCounts ? { ...b.traitCounts } : {};
    this.blessingCounts = b.blessingCounts ? { ...b.blessingCounts } : {};
    this.gearAffixes = b.gearAffixes ? [...b.gearAffixes] : [];
    this.gearItemNames = b.gearItemNames ? { ...b.gearItemNames } : {};
    this.aplChoice = b.aplChoice || "base";
    this.useCustomApl = Boolean(b.useCustomApl);
    this.customAplText = b.customAplText || this.customAplText;
  }

  onChange(callback) {
    this._listeners.add(callback);
  }

  notify() {
    this._listeners.forEach(cb => {
      try {
        cb(this);
      } catch (e) {
        console.error("State listener error:", e);
      }
    });
  }
}

export const state = new AppState();
