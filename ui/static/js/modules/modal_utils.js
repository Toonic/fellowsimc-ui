// Themed Modal and Notification Utilities

export function openSettingsModal() {
  const modalOverlay = document.getElementById("modal-settings");
  if (modalOverlay) {
    modalOverlay.classList.remove("hidden");
    modalOverlay.style.display = "flex";
  }
}

export function closeSettingsModal() {
  const modalOverlay = document.getElementById("modal-settings");
  if (modalOverlay) {
    modalOverlay.classList.add("hidden");
    modalOverlay.style.display = "none";
  }
}

export function showThemedNotice({
  title = "API NOT CONFIGURED",
  message = "FellowshipLogs API credentials are not configured. Please enter your Client ID and Client Secret in API Settings.",
  type = "error", // "error", "warning", "info", "success"
  isApiConfig = true,
  actionText = "CONFIGURE API KEYS",
  onAction = null
} = {}) {
  const modal = document.getElementById("modal-notice");
  if (!modal) {
    alert(`${title}\n\n${message}`);
    return;
  }

  const titleEl = document.getElementById("modal-notice-title");
  const msgEl = document.getElementById("modal-notice-message");
  const btnClose = document.getElementById("btn-close-notice");
  const btnDismiss = document.getElementById("btn-notice-dismiss");
  const btnAction = document.getElementById("btn-notice-action");
  const iconWrap = document.getElementById("notice-icon-wrap");

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;

  if (iconWrap) {
    iconWrap.className = `notice-icon-badge ${type}`;
  }

  const closeNotice = () => {
    modal.classList.add("hidden");
    modal.style.display = "none";
  };

  if (btnClose) btnClose.onclick = closeNotice;
  if (btnDismiss) btnDismiss.onclick = closeNotice;

  if (btnAction) {
    if (isApiConfig) {
      btnAction.textContent = actionText || "CONFIGURE API KEYS";
      btnAction.style.display = "inline-flex";
      btnAction.onclick = () => {
        closeNotice();
        openSettingsModal();
      };
    } else if (onAction) {
      btnAction.textContent = actionText || "PROCEED";
      btnAction.style.display = "inline-flex";
      btnAction.onclick = () => {
        closeNotice();
        onAction();
      };
    } else {
      btnAction.style.display = "none";
    }
  }

  modal.classList.remove("hidden");
  modal.style.display = "flex";
}

