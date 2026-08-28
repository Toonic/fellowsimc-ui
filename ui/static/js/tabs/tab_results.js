// Tab 5: Simulate & Results Controller
import { SimRunner } from "../modules/simulator.js";

export class ResultsTab {
  constructor(state, buildsController, heroPicker, gearController, statsController) {
    this.state = state;
    this.simulator = new SimRunner(state, buildsController, heroPicker, gearController, statsController);
  }

  init() {
    this.simulator.init();
    this.simulator.checkApiConfig();
  }

  runSimulation() {
    return this.simulator.runSimulation();
  }

  stopSimulation() {
    return this.simulator.stopSimulation();
  }

  checkApiConfig() {
    return this.simulator.checkApiConfig();
  }
}

