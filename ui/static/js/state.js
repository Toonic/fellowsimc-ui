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
    this.talentsData = null;

    this._listeners = new Set();
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
