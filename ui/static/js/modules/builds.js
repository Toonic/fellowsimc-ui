// Build Management Controller (Save, Load, New, Rename, Duplicate, Export, Import, Compare)
import { ProfileGenerator } from "./profile.js";

export class BuildsController {
  constructor(state, heroController, gearController, statsController, compareController) {
    this.state = state;
    this.heroController = heroController;
    this.gearController = gearController;
    this.statsController = statsController;
    this.compareController = compareController;
  }

  init() {
    this.populateLoadDropdown();

    const inputName = document.getElementById("input-build-name");
    const selectLoad = document.getElementById("select-load-build");

    // Load build on dropdown change
    if (selectLoad) {
      selectLoad.addEventListener("change", (e) => {
        const buildId = e.target.value;
        if (buildId) {
          this.loadBuild(buildId);
        }
      });
    }

    // Save build
    const btnSave = document.getElementById("btn-save-build");
    if (btnSave && inputName) {
      btnSave.addEventListener("click", () => {
        let name = inputName.value.trim();
        if (!name) {
          name = `${this.state.selectedPlayerName} - ${this.state.selectedHero.toUpperCase()}`;
          inputName.value = name;
        }
        this.saveCurrentBuild(name);
      });

      inputName.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          btnSave.click();
        }
      });
    }

    // New build button
    const btnNew = document.getElementById("btn-new-build");
    if (btnNew) {
      btnNew.addEventListener("click", () => {
        this.state.currentLoadedBuildId = "";
        this.state.activeBuildName = "";
        if (inputName) inputName.value = "";
        if (selectLoad) selectLoad.value = "";
        ProfileGenerator.updateEditor(this.state);
        inputName?.focus();
      });
    }

    // Rename build button
    const btnRename = document.getElementById("btn-rename-build");
    if (btnRename) {
      btnRename.addEventListener("click", () => {
        const currentId = this.state.currentLoadedBuildId || selectLoad?.value;
        const currentBuild = this.state.savedBuilds.find(b => b.id === currentId);
        if (!currentBuild) {
          alert("Please select or load a build to rename.");
          return;
        }
        const newName = prompt("Enter new name for this build:", currentBuild.name);
        if (newName && newName.trim() && newName.trim() !== currentBuild.name) {
          currentBuild.name = newName.trim();
          currentBuild.updatedAt = Date.now();
          this.state.activeBuildName = currentBuild.name;
          if (inputName) inputName.value = currentBuild.name;
          this.state.saveBuildsToStorage();
          this.populateLoadDropdown();
          if (this.compareController) this.compareController.renderCompareBuildsList();
          ProfileGenerator.updateEditor(this.state);
        }
      });
    }

    // Duplicate build button
    const btnDuplicate = document.getElementById("btn-duplicate-build");
    if (btnDuplicate) {
      btnDuplicate.addEventListener("click", () => {
        const currentId = this.state.currentLoadedBuildId || selectLoad?.value;
        if (!currentId) {
          alert("Please select or load a build to duplicate.");
          return;
        }
        this.duplicateBuild(currentId);
      });
    }

    // Delete build button
    const btnDelete = document.getElementById("btn-delete-build");
    if (btnDelete) {
      btnDelete.addEventListener("click", () => {
        const currentId = this.state.currentLoadedBuildId || selectLoad?.value;
        const currentBuild = this.state.savedBuilds.find(b => b.id === currentId);
        if (!currentBuild) {
          alert("Please select a build to delete.");
          return;
        }
        if (confirm(`Delete build "${currentBuild.name}"?`)) {
          this.deleteBuild(currentId);
        }
      });
    }

    // Export / Import JSON
    const btnExport = document.getElementById("btn-export-builds");
    if (btnExport) {
      btnExport.addEventListener("click", () => this.exportBuilds());
    }

    const inputImport = document.getElementById("input-import-builds-file");
    const btnImport = document.getElementById("btn-import-builds");
    if (btnImport && inputImport) {
      btnImport.addEventListener("click", () => inputImport.click());
      inputImport.addEventListener("change", (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.importBuilds(file);
          inputImport.value = "";
        }
      });
    }

    this.syncWithServer();
  }

  async syncWithServer() {
    try {
      const res = await fetch("/api/builds");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.builds) && data.builds.length > 0) {
          const serverBuilds = data.builds;
          // Merge server builds with existing
          const existingIds = new Set(this.state.savedBuilds.map(b => b.name.toLowerCase()));
          serverBuilds.forEach(sb => {
            const idx = this.state.savedBuilds.findIndex(b => b.name.toLowerCase() === sb.name.toLowerCase());
            if (idx >= 0) {
              this.state.savedBuilds[idx] = { ...this.state.savedBuilds[idx], ...sb };
            } else {
              this.state.savedBuilds.push(sb);
              this.state.selectedCompareBuildIds.add(sb.id);
            }
          });
          this.state.saveBuildsToStorage();
          this.populateLoadDropdown();
          this.renderCompareBuildsList();
          ProfileGenerator.updateEditor(this.state);
        }
      }
    } catch (e) {
      console.warn("Could not sync builds with server:", e);
    }
  }

  async saveCurrentBuild(name) {
    const cleanName = name.trim();
    if (!cleanName) return;

    const snapshot = this.state.toBuildSnapshot(cleanName);
    
    // Check if build with exact name exists (case-insensitive)
    const existingIdx = this.state.savedBuilds.findIndex(b => 
      b.name.trim().toLowerCase() === cleanName.toLowerCase()
    );

    if (existingIdx >= 0) {
      snapshot.id = this.state.savedBuilds[existingIdx].id;
      snapshot.updatedAt = Date.now();
      this.state.savedBuilds[existingIdx] = snapshot;
      this.state.currentLoadedBuildId = snapshot.id;
    } else {
      this.state.savedBuilds.unshift(snapshot);
      this.state.currentLoadedBuildId = snapshot.id;
      this.state.selectedCompareBuildIds.add(snapshot.id);
    }

    this.state.activeBuildName = snapshot.name;
    this.state.saveBuildsToStorage();
    this.populateLoadDropdown(snapshot.id);
    if (this.compareController) this.compareController.renderCompareBuildsList();
    ProfileGenerator.updateEditor(this.state);

    // Persist as .simc file to builds/ on disk
    try {
      const simcContent = ProfileGenerator.generateActorBlock(this.state, snapshot.name);
      await fetch("/api/builds/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: snapshot.name,
          simc_content: simcContent
        })
      });
    } catch (e) {
      console.error("Failed to persist build to disk:", e);
    }
  }

  loadBuild(buildId) {
    const build = this.state.savedBuilds.find(b => b.id === buildId);
    if (!build) return;

    this.state.applyBuildSnapshot(build);

    // Sync input name
    const inputName = document.getElementById("input-build-name");
    if (inputName) inputName.value = build.name || "";

    const selectLoad = document.getElementById("select-load-build");
    if (selectLoad) selectLoad.value = build.id;

    // 1. Select hero and sync talents
    this.heroController.selectHero(this.state.selectedHero, false);
    this.heroController.renderTalentTree();

    // 2. Stats
    this.statsController.updateInputs();

    // 3. Gear Sets, Gems, Traits, Blessings
    this.gearController.updateGemInputs();
    this.gearController.renderGearSets();
    this.gearController.renderWeaponTraits();
    this.gearController.renderBlessings();

    // 4. Weapon & Legendary dropdowns
    const selWeap = document.getElementById("select-weapon");
    if (selWeap) selWeap.value = this.state.weapon || "chronoshift";

    const selLeg = document.getElementById("select-legendary");
    if (selLeg) selLeg.value = this.state.legendary || "none";

    // 5. APL controls
    const selApl = document.getElementById("select-apl-preset");
    if (selApl) selApl.value = this.state.aplChoice || "base";

    const chkCustomApl = document.getElementById("check-custom-apl") || document.getElementById("chk-custom-apl");
    const txtCustomApl = document.getElementById("custom-apl-editor") || document.getElementById("custom-apl-text");
    if (chkCustomApl) chkCustomApl.checked = this.state.useCustomApl;
    if (txtCustomApl) txtCustomApl.value = this.state.customAplText;

    // 6. Update Profile
    ProfileGenerator.updateEditor(this.state);
  }

  async deleteBuild(buildId) {
    const targetBuild = this.state.savedBuilds.find(b => b.id === buildId);
    const buildName = targetBuild ? targetBuild.name : "";

    this.state.savedBuilds = this.state.savedBuilds.filter(b => b.id !== buildId);
    this.state.selectedCompareBuildIds.delete(buildId);
    if (this.state.currentLoadedBuildId === buildId) {
      this.state.currentLoadedBuildId = "";
      this.state.activeBuildName = "";
      const inputName = document.getElementById("input-build-name");
      if (inputName) inputName.value = "";
    }
    this.state.saveBuildsToStorage();
    this.populateLoadDropdown();
    if (this.compareController) this.compareController.renderCompareBuildsList();
    ProfileGenerator.updateEditor(this.state);

    if (buildName) {
      try {
        await fetch("/api/builds/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: buildName })
        });
      } catch (e) {
        console.error("Failed to delete build from disk:", e);
      }
    }
  }

  async duplicateBuild(buildId) {
    const build = this.state.savedBuilds.find(b => b.id === buildId);
    if (!build) return;

    const copy = JSON.parse(JSON.stringify(build));
    copy.id = "build_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
    copy.name = `${build.name} (Copy)`;
    copy.createdAt = Date.now();
    copy.updatedAt = Date.now();

    this.state.savedBuilds.unshift(copy);
    this.state.currentLoadedBuildId = copy.id;
    this.state.activeBuildName = copy.name;
    this.state.selectedCompareBuildIds.add(copy.id);
    this.state.saveBuildsToStorage();

    const inputName = document.getElementById("input-build-name");
    if (inputName) inputName.value = copy.name;

    this.populateLoadDropdown(copy.id);
    if (this.compareController) this.compareController.renderCompareBuildsList();
    ProfileGenerator.updateEditor(this.state);

    // Save copy to disk
    try {
      const simcContent = ProfileGenerator.generateActorBlock(copy, copy.name);
      await fetch("/api/builds/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copy.name,
          simc_content: simcContent
        })
      });
    } catch (e) {
      console.error("Failed to save duplicated build to disk:", e);
    }
  }

  exportBuilds() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state.savedBuilds, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `fellowsimc_builds_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  }

  importBuilds(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          const existingIds = new Set(this.state.savedBuilds.map(b => b.id));
          imported.forEach(b => {
            if (!existingIds.has(b.id)) {
              this.state.savedBuilds.push(b);
              this.state.selectedCompareBuildIds.add(b.id);
            }
          });
          this.state.saveBuildsToStorage();
          this.populateLoadDropdown();
          if (this.compareController) this.compareController.renderCompareBuildsList();
          ProfileGenerator.updateEditor(this.state);
          alert(`Successfully imported ${imported.length} builds.`);
        } else {
          alert("Invalid build export file format.");
        }
      } catch (err) {
        alert("Error parsing imported JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  }

  populateLoadDropdown(selectedId) {
    const select = document.getElementById("select-load-build");
    if (!select) return;

    select.innerHTML = '<option value="">Load build...</option>';
    this.state.savedBuilds.forEach(build => {
      const opt = document.createElement("option");
      opt.value = build.id;
      const heroKey = (build.hero || "rime").toUpperCase();
      opt.textContent = `${build.name} [${heroKey}]`;
      if (selectedId && build.id === selectedId) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    if (this.state.currentLoadedBuildId) {
      select.value = this.state.currentLoadedBuildId;
    }
  }
}
