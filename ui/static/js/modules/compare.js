// ============================================================================
// Compare Builds Controller & Multi-Actor Simulation Generator
// ============================================================================

export class CompareController {
  constructor(state, onUpdate) {
    this.state = state;
    this.onUpdate = onUpdate || (() => {});
  }

  init() {
    const chkEnableCompare = document.getElementById("check-enable-compare");
    const compareBox = document.getElementById("compare-builds-box");
    const chkEnableUpgrade = document.getElementById("check-enable-upgrade");
    const upgradeBox = document.getElementById("upgrade-options-box");

    if (chkEnableCompare) {
      chkEnableCompare.checked = this.state.enableCompare;
      if (compareBox) compareBox.classList.toggle("disabled-box", !this.state.enableCompare);

      chkEnableCompare.addEventListener("change", (e) => {
        this.state.enableCompare = e.target.checked;
        if (compareBox) compareBox.classList.toggle("disabled-box", !e.target.checked);

        // Mutually exclusive: if Compare is enabled, disable Upgrade Finder
        if (e.target.checked && chkEnableUpgrade && chkEnableUpgrade.checked) {
          chkEnableUpgrade.checked = false;
          this.state.enableUpgrade = false;
          if (upgradeBox) upgradeBox.classList.add("disabled-box");
        }
        this.onUpdate();
      });
    }

    const btnSelectAllCompare = document.getElementById("btn-compare-select-all");
    if (btnSelectAllCompare) {
      btnSelectAllCompare.addEventListener("click", () => {
        this.state.selectedCompareBuildIds.add("__current__");
        (this.state.savedBuilds || []).forEach(b => this.state.selectedCompareBuildIds.add(b.id));
        this.state.enableCompare = true;
        if (chkEnableCompare) chkEnableCompare.checked = true;
        if (compareBox) compareBox.classList.remove("disabled-box");
        this.renderCompareBuildsList();
        this.onUpdate();
      });
    }

    const btnClearCompare = document.getElementById("btn-compare-clear-all");
    if (btnClearCompare) {
      btnClearCompare.addEventListener("click", () => {
        this.state.selectedCompareBuildIds.clear();
        this.renderCompareBuildsList();
        this.onUpdate();
      });
    }

    this.renderCompareBuildsList();
  }

  renderCompareBuildsList() {
    const container = document.getElementById("compare-builds-checklist");
    if (!container) return;
    container.innerHTML = "";

    const curHeroKey = (this.state.selectedHero || "rime").toLowerCase();
    const allItems = [
      {
        id: "__current__",
        name: "Current Editor",
        heroKey: curHeroKey,
        isCurrent: true
      },
      ...(this.state.savedBuilds || []).map(b => ({
        id: b.id,
        name: b.name,
        heroKey: (b.hero || "rime").toLowerCase(),
        isCurrent: false
      }))
    ];

    const firstSelectedId = allItems.find(item => this.state.selectedCompareBuildIds.has(item.id))?.id;

    allItems.forEach(item => {
      const isChecked = this.state.selectedCompareBuildIds.has(item.id);
      const isBaseline = isChecked && item.id === firstSelectedId;
      const row = document.createElement("label");
      row.className = `compare-build-row ${isChecked ? "selected" : ""}`;

      row.innerHTML = `
        <input type="checkbox" class="compare-build-checkbox" value="${item.id}" ${isChecked ? "checked" : ""}>
        <div class="compare-row-content">
          <span class="badge-role badge-${item.heroKey}">${item.heroKey.toUpperCase()}</span>
          <strong class="compare-build-title">${item.name}</strong>
          ${isBaseline ? `<span class="badge-role" style="background: rgba(176, 142, 88, 0.2); color: var(--text-gold); border: 1px solid var(--border-gold); margin-left: auto;">Baseline</span>` : ""}
        </div>
      `;

      const chk = row.querySelector("input");
      chk?.addEventListener("change", (e) => {
        if (e.target.checked) {
          this.state.selectedCompareBuildIds.add(item.id);
        } else {
          this.state.selectedCompareBuildIds.delete(item.id);
        }
        const prevScroll = container.scrollTop;
        this.renderCompareBuildsList();
        container.scrollTop = prevScroll;
        this.onUpdate();
      });

      container.appendChild(row);
    });

    if ((!this.state.savedBuilds || this.state.savedBuilds.length === 0) && !this.state.selectedCompareBuildIds.has("__current__")) {
      const notice = document.createElement("div");
      notice.className = "empty-state-notice";
      notice.style.gridColumn = "1 / -1";
      notice.innerHTML = "<p>No builds selected. Select Current Editor or save builds in <strong>Hero & Loadout</strong> to compare them!</p>";
      container.appendChild(notice);
    }
  }

  /**
   * Generates multiple actor definitions for all selected compare builds.
   */
  static generateCompareActors(state, actorBlockFn) {
    const lines = [];
    const usedNames = new Set();
    const sanitizeActorName = (rawName) => {
      let clean = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').trim();
      if (!clean) clean = "Build";
      let finalName = clean;
      let suffix = 2;
      while (usedNames.has(finalName)) {
        finalName = `${clean}_${suffix++}`;
      }
      usedNames.add(finalName);
      return finalName;
    };

    const selectedActors = [];

    // 1. Current Editor (if checked / selected)
    const domCurrentChecked = document.querySelector('.compare-build-checkbox[value="__current__"]:checked');
    const isCurrentSelected = domCurrentChecked ? true : (
      state.selectedCompareBuildIds && (
        (typeof state.selectedCompareBuildIds.has === "function" && state.selectedCompareBuildIds.has("__current__")) ||
        (Array.isArray(state.selectedCompareBuildIds) && state.selectedCompareBuildIds.includes("__current__"))
      )
    );

    if (isCurrentSelected) {
      selectedActors.push({
        name: sanitizeActorName("Current_Editor"),
        build: state,
        displayName: "Current Editor"
      });
    }

    // 2. Saved Builds
    const domCheckedIds = new Set();
    document.querySelectorAll(".compare-build-checkbox:checked").forEach(cb => {
      if (cb.value && cb.value !== "__current__") {
        domCheckedIds.add(cb.value);
      }
    });

    if (state.savedBuilds && state.savedBuilds.length > 0) {
      state.savedBuilds.forEach(b => {
        const isSelected = (state.selectedCompareBuildIds && (
          (typeof state.selectedCompareBuildIds.has === "function" && (state.selectedCompareBuildIds.has(b.id) || state.selectedCompareBuildIds.has(String(b.id)))) ||
          (Array.isArray(state.selectedCompareBuildIds) && (state.selectedCompareBuildIds.includes(b.id) || state.selectedCompareBuildIds.includes(String(b.id))))
        )) || domCheckedIds.has(b.id) || domCheckedIds.has(String(b.id));

        if (isSelected) {
          const bName = sanitizeActorName(b.name || `Build_${b.id}`);
          selectedActors.push({
            name: bName,
            build: b,
            displayName: b.name || `Build ${b.id}`
          });
        }
      });
    }

    if (selectedActors.length === 0) {
      lines.push(actorBlockFn(state, "Current_Editor"));
    } else {
      selectedActors.forEach((actor, idx) => {
        lines.push(``);
        lines.push(`# ====================================================================`);
        lines.push(`# Actor ${idx + 1}: ${actor.displayName}`);
        lines.push(`# ====================================================================`);
        lines.push(actorBlockFn(actor.build, actor.name));
      });
    }

    return lines;
  }
}
