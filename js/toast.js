let container = null;

function ensureContainer() {
  if (container) return container;
  container = document.createElement("div");
  container.id = "toast-container";
  document.body.appendChild(container);
  return container;
}

export function showToast(message, type = "success") {
  const parent = ensureContainer();
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  parent.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-show"));
  setTimeout(() => {
    toast.classList.remove("toast-show");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
