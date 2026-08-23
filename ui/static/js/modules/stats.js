// Stats Input and Binding Controller
import { ProfileGenerator } from "./profile.js";

/** Stat field definitions — shared between init() and updateInputs() */
const STAT_FIELDS = [
  { id: "stat-primary",   key: "primary"   },
  { id: "stat-stamina",   key: "stamina"   },
  { id: "stat-haste",     key: "haste"     },
  { id: "stat-expertise", key: "expertise" },
  { id: "stat-crit",      key: "crit"      },
  { id: "stat-spirit",    key: "spirit"    },
  { id: "stat-armor",     key: "armor"     },
];

export class StatsController {
  constructor(state) {
    this.state = state;
  }

  init() {
    STAT_FIELDS.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = this.state.stats[key] ?? 0;
        el.addEventListener("input", (e) => {
          this.state.stats[key] = parseInt(e.target.value) || 0;
          ProfileGenerator.updateEditor(this.state);
        });
      }
    });
  }

  updateInputs() {
    STAT_FIELDS.forEach(({ id, key }) => {
      const el = document.getElementById(id);
      if (el) {
        el.value = this.state.stats[key] ?? 0;
      }
    });
  }
}
