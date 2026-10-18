/**
 * Carga perezosa de jsPDF + AutoTable con cadena de CDNs.
 *
 * Antes los dos <script defer> vivían en index.html y dependían de:
 *   1) que el navegador no los bloqueara (cdnjs está filtrado por Brave/Shields)
 *   2) que se ejecutaran en orden (jsPDF antes que AutoTable)
 * Aquí se cargan solo al exportar, en orden garantizado (se espera el onload
 * de jsPDF antes de pedir AutoTable) y con espejos: jsdelivr → unpkg → cdnjs.
 */

const TIMEOUT_MS = 10000;

const JSPDF_URLS = [
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

const AUTOTABLE_URLS = [
  "https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js",
  "https://unpkg.com/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js",
];

let cargando = null;

function jspdfListo() {
  return (
    typeof window.jspdf === "object" &&
    window.jspdf !== null &&
    typeof window.jspdf.jsPDF === "function"
  );
}

function autoTableListo() {
  return (
    jspdfListo() &&
    typeof window.jspdf.jsPDF.API === "object" &&
    typeof window.jspdf.jsPDF.API.autoTable === "function"
  );
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    const limpiar = () => {
      clearTimeout(timer);
      s.remove(); // el código ya se ejecutó; evita scripts huérfanos
    };
    const timer = setTimeout(() => {
      limpiar();
      reject(new Error(`tiempo agotado en ${url}`));
    }, TIMEOUT_MS);

    s.onload = () => {
      limpiar();
      resolve();
    };
    s.onerror = () => {
      limpiar();
      reject(new Error(`bloqueado o sin conexión: ${url}`));
    };
    document.head.appendChild(s);
  });
}

async function cargarDesde(urls, listo, nombre) {
  const fallos = [];
  for (const url of urls) {
    if (listo()) return;
    try {
      await loadScript(url);
      if (listo()) return;
      fallos.push(`${url} → se descargó pero no registró ${nombre}`);
    } catch (error) {
      fallos.push(error.message);
    }
  }
  // El detalle (qué CDN exacto falló y por qué) va a la consola...
  console.error(`[pdfLibs] ${nombre}: ningún espejo respondió.`, fallos.join(" | "));
  // ...y el toast se lleva un mensaje corto.
  throw new Error(
    `${nombre} no se pudo descargar (sin conexión o bloqueado por el navegador). Detalle en la consola (F12).`,
  );
}

/** Último recurso: si el plugin cargó pero no se auto-aplicó, se aplica a mano. */
function aplicarPluginManual() {
  if (autoTableListo() || !jspdfListo()) return;
  const { jsPDF, applyPlugin } = window.jspdf;
  const fn = applyPlugin || window.applyPlugin;
  if (typeof fn === "function") {
    fn(jsPDF);
    console.warn("[pdfLibs] AutoTable se aplicó manualmente a jsPDF.API");
  }
}

/**
 * Garantiza que jsPDF y AutoTable estén registrados.
 * Resuelve si todo está listo; rechaza con un mensaje que indica qué falló.
 */
export function ensurePdfLibs() {
  if (autoTableListo()) return Promise.resolve();
  if (cargando) return cargando;

  cargando = (async () => {
    if (!jspdfListo()) await cargarDesde(JSPDF_URLS, jspdfListo, "jsPDF");
    if (!autoTableListo()) await cargarDesde(AUTOTABLE_URLS, autoTableListo, "AutoTable");
    if (!autoTableListo()) aplicarPluginManual();
    if (!autoTableListo()) {
      throw new Error("AutoTable se descargó pero no se pudo registrar en jsPDF.API");
    }
  })()
    .catch((error) => {
      cargando = null;
      throw error;
    })
    .then(() => {
      cargando = null;
    });

  return cargando;
}
