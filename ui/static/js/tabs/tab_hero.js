// Tab 2: Hero & Loadout Controller
import { HeroPickerController } from "../modules/hero_picker.js";
import { StatsController } from "../modules/stats.js";
import { GearController } from "../modules/gear.js";
import { BuildsController } from "../modules/builds.js";

export class HeroTab {
  constructor(state, compareController) {
    this.state = state;
    this.compareController = compareController;

    this.heroPicker = new HeroPickerController(this.state);
    this.statsController = new StatsController(this.state);
    this.gearController = new GearController(this.state);
    this.builds = new BuildsController(
      this.state,
      this.heroPicker,
      this.gearController,
      this.statsController,
      this.compareController
    );
  }

  init() {
    this.heroPicker.init();
    this.heroPicker.onHeroChange = () => {
      if (this.compareController && typeof this.compareController.renderCompareBuildsList === "function") {
        this.compareController.renderCompareBuildsList();
      }
    };
    this.statsController.init();
    this.gearController.init();
    this.builds.init();
  }

  selectHero(heroKey, autoPickTalents = false) {
    this.heroPicker.selectHero(heroKey, autoPickTalents);
  }
}

