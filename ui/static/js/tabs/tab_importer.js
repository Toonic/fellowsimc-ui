// Tab 1: Log Importer Controller
import { LogImporter } from "../modules/importer.js";

export class ImporterTab {
  constructor(state, heroPicker, gearController, statsController) {
    this.state = state;
    this.importer = new LogImporter(state, heroPicker, gearController, statsController);
  }

  init() {
    this.importer.init();
  }

  fetchReport() {
    return this.importer.fetchReport();
  }

  importCharacter() {
    return this.importer.importCharacter();
  }

  importCustomRoute() {
    return this.importer.importCustomRoute();
  }
}

