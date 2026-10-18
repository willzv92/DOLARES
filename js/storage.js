const STORAGE_KEY = "dolares_state_v1";

export const PERSIST_FIELDS = [
  "tasaBCV",
  "tasaUSDt",
  "tasaZelle",
  "tasaBsUsdt",
  "tasaMayor50",
  "f1",
  "f2",
  "comisionPct",
  "comisionUsdt",
];

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function restoreState() {
  const data = loadState();
  PERSIST_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el && data[id] !== undefined) el.value = data[id];
  });
}

export function saveState() {
  const data = {};
  PERSIST_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) data[id] = el.value;
  });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage lleno o bloqueado: se ignora
  }
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
