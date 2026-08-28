// Tab 4: Advanced & APL Controller
import { ProfileGenerator } from "../modules/profile.js";

export class AdvancedTab {
  constructor(state, onProfileUpdate) {
    this.state = state;
    this.onProfileUpdate = onProfileUpdate || (() => ProfileGenerator.updateEditor(this.state));
  }

  init() {
    this.#initAplControls();
    this.#initIterationControls();
    this.#initProfileEditor();
  }

  #initAplControls() {
    const selectApl = document.getElementById("select-apl-preset");
    if (selectApl) {
      selectApl.addEventListener("change", (e) => {
        this.state.aplChoice = e.target.value;
        this.onProfileUpdate();
      });
    }

    const customAplCheck = document.getElementById("check-custom-apl");
    const customAplCont  = document.getElementById("custom-apl-container");
    if (customAplCheck && customAplCont) {
      customAplCheck.checked = this.state.useCustomApl;
      customAplCont.classList.toggle("hidden", !this.state.useCustomApl);
      if (selectApl) selectApl.disabled = this.state.useCustomApl;

      customAplCheck.addEventListener("change", (e) => {
        this.state.useCustomApl = e.target.checked;
        customAplCont.classList.toggle("hidden", !e.target.checked);
        if (selectApl) selectApl.disabled = this.state.useCustomApl;
        this.onProfileUpdate();
      });
    }

    const customAplEd = document.getElementById("custom-apl-editor");
    if (customAplEd) {
      customAplEd.value = this.state.customAplText;
      customAplEd.addEventListener("input", (e) => {
        this.state.customAplText = e.target.value;
        if (this.state.useCustomApl) this.onProfileUpdate();
      });
    }
  }

  #initIterationControls() {
    const inputIter = document.getElementById("input-iterations");
    if (inputIter) {
      inputIter.addEventListener("input", (e) => {
        this.state.iterations = parseInt(e.target.value) || 1000;
        this.onProfileUpdate();
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
        this.state.iterations = iters;
        if (inputIter) inputIter.value = iters;
        this.onProfileUpdate();
      });
    });

    const defaultThreads = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;
    const inputThr = document.getElementById("input-threads");
    if (inputThr) {
      inputThr.value = this.state.threads || defaultThreads;
      inputThr.addEventListener("input", (e) => {
        this.state.threads = parseInt(e.target.value) || defaultThreads;
        this.onProfileUpdate();
      });
    }
  }

  #initProfileEditor() {
    // Initial profile generation
    ProfileGenerator.updateEditor(this.state);
  }

  updateProfile() {
    ProfileGenerator.updateEditor(this.state);
  }
}

