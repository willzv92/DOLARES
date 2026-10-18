import {
  db,
  colRef,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  writeBatch,
} from "./firebase.js";
import {
  calcularBrecha,
  calcularTasaPromedio,
  calcularTasaEstimada,
  calcularTasaMenor50,
  tasaAplicable,
  calcularResumenBs,
  calcularOperacion,
} from "./calculos.js";
import { PERSIST_FIELDS, restoreState, saveState, debounce } from "./storage.js";
import { actualizarGrafico } from "./grafico.js";
import { showToast } from "./toast.js";
import { exportarInformePDF } from "./informe.js";

const moneyFmt = new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2 });

let registrosCache = [];

function buildRow(reg, id) {
  const tr = document.createElement("tr");
  const colorGanancia = reg.ganancia >= 0 ? "#2ecc71" : "#e74c3c";

  [
    reg.fecha,
    reg.monto.toFixed(2),
    reg.tasa.toFixed(2),
    moneyFmt.format(reg.totalBs),
    reg.montoUsdt.toFixed(2),
    reg.cambioUsdt.toFixed(2),
  ].forEach((texto) => {
    const td = document.createElement("td");
    td.textContent = texto;
    tr.appendChild(td);
  });

  const tdGanancia = document.createElement("td");
  tdGanancia.style.color = colorGanancia;
  tdGanancia.style.fontWeight = "bold";
  tdGanancia.textContent = reg.ganancia.toFixed(2);
  tr.appendChild(tdGanancia);

  const tdPct = document.createElement("td");
  tdPct.style.color = colorGanancia;
  tdPct.textContent = reg.pct.toFixed(2) + "%";
  tr.appendChild(tdPct);

  const tdAccion = document.createElement("td");
  const btn = document.createElement("button");
  btn.className = "btn-del";
  btn.textContent = "X";
  btn.setAttribute("data-id", id);
  btn.onclick = async () => {
    if (!confirm("¿Eliminar registro?")) return;
    try {
      await deleteDoc(doc(db, "historial_cambios", id));
      showToast("Registro eliminado");
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    }
  };
  tdAccion.appendChild(btn);
  tr.appendChild(tdAccion);

  return tr;
}

function exportarInforme() {
  if (!registrosCache.length) {
    showToast("No hay registros para exportar", "error");
    return;
  }
  try {
    const generado = exportarInformePDF(registrosCache);
    if (generado) {
      showToast("Informe PDF generado");
    } else {
      showToast("No se pudo generar el PDF. Revisá la consola (F12).", "error");
    }
  } catch (error) {
    console.error("Error al generar PDF:", error);
    showToast("Error al generar el PDF: " + error.message, "error");
  }
}

async function cerrarAnio() {
  const btnCerrar = document.getElementById("btn-cerrar-anio");
  const total = registrosCache.length;

  if (!total) {
    showToast("No hay registros para cerrar", "error");
    return;
  }

  const confirmado = confirm(
    `Se exportará y eliminarán ${total} registros del historial. El año quedará en 0. ¿Continuar?`,
  );
  if (!confirmado) return;

  // Si el informe no se pudo generar, no se borra nada
  if (!exportarInformePDF(registrosCache)) {
    showToast("No se pudo generar el informe PDF. No se borró nada.", "error");
    return;
  }

  btnCerrar.disabled = true;
  try {
    const idList = Array.from(
      document.querySelectorAll("#lista-registros .btn-del"),
    ).map((b) => b.getAttribute("data-id"));

    const CHUNK = 500;
    for (let i = 0; i < idList.length; i += CHUNK) {
      const lote = idList.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      lote.forEach((id) => batch.delete(doc(db, "historial_cambios", id)));
      await batch.commit();
    }

    showToast("Año cerrado. Historial reiniciado.");
  } catch (error) {
    showToast("Error al cerrar el año: " + error.message, "error");
  } finally {
    btnCerrar.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Restaurar valores guardados ANTES del primer cálculo
  restoreState();

  const inputs = [
    "tasaBCV",
    "tasaUSDt",
    "montoUSD",
    "comisionPct",
    "f1",
    "f2",
    "tasaMayor50",
  ];
  const fields = {};
  inputs.forEach((id) => (fields[id] = document.getElementById(id)));

  const tasaPromedioDisp = document.getElementById("tasaPromedio");
  const tasaEstimadaDisp = document.getElementById("tasaEstimada");
  const tasaMenor50Disp = document.getElementById("tasaMenor50");
  const brechaDisp = document.getElementById("brechaReal");
  const btnCalcular = document.getElementById("btn-calcular");

  const updateAutomatedFields = () => {
    const bcv = parseFloat(fields.tasaBCV.value) || 0;
    const usdt = parseFloat(fields.tasaUSDt.value) || 0;
    const f1 = parseFloat(fields.f1.value) || 0;
    const f2 = parseFloat(fields.f2.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;

    const brecha = calcularBrecha(bcv, usdt);
    brechaDisp.value = brecha !== null ? brecha.toFixed(2) + "%" : "";

    tasaPromedioDisp.value = calcularTasaPromedio(bcv, usdt).toFixed(4);

    const estimada = calcularTasaEstimada(bcv, usdt, f1, f2);
    tasaEstimadaDisp.value = estimada !== null ? estimada.toFixed(4) : "";

    const menor50 = calcularTasaMenor50(mayor50);
    tasaMenor50Disp.value = menor50 !== null ? menor50.toFixed(2) : "";
  };

  const saveDebounced = debounce(() => saveState(), 300);

  inputs.forEach((id) =>
    fields[id].addEventListener("input", () => {
      updateAutomatedFields();
      saveDebounced();
    }),
  );

  // Guardar inmediatamente al salir del campo
  PERSIST_FIELDS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => saveState());
  });

  // Calcular campos automáticos con los valores restaurados
  updateAutomatedFields();

  btnCalcular.addEventListener("click", () => {
    const montoUSD = parseFloat(fields.montoUSD.value) || 0;
    const comisionPct = parseFloat(fields.comisionPct.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;
    const menor50 = parseFloat(tasaMenor50Disp.value) || 0;

    if (montoUSD <= 0 || mayor50 <= 0) {
      showToast("Por favor, ingrese el Monto $ y la Tasa >= 50$", "error");
      return;
    }

    const tasaFinal = tasaAplicable(montoUSD, mayor50, menor50);
    const { montoBs, comisionBs, totalBs } = calcularResumenBs(
      montoUSD,
      tasaFinal,
      comisionPct,
    );

    document.getElementById("outMontoBs").textContent = moneyFmt.format(montoBs);
    document.getElementById("outComisionBs").textContent = moneyFmt.format(comisionBs);
    document.getElementById("outTotalBs").textContent = moneyFmt.format(totalBs);
    document.getElementById("result-card").style.display = "block";
  });

  document.getElementById("btn-export").addEventListener("click", exportarInforme);
  document.getElementById("btn-cerrar-anio").addEventListener("click", cerrarAnio);

  const btnRegistrar = document.getElementById("btn-registrar");
  btnRegistrar.addEventListener("click", async () => {
    const montoUSD = parseFloat(fields.montoUSD.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;
    const menor50 = parseFloat(tasaMenor50Disp.value) || 0;
    const tasaZelle = parseFloat(document.getElementById("tasaZelle").value) || 0;
    const tasaBsUsdt = parseFloat(document.getElementById("tasaBsUsdt").value) || 0;
    const comisionUsdt = parseFloat(document.getElementById("comisionUsdt").value) || 0;
    const comisionPct = parseFloat(fields.comisionPct.value) || 0;

    if (montoUSD <= 0) {
      showToast("Ingrese el Monto $", "error");
      return;
    }
    if (tasaBsUsdt <= 0) {
      showToast("Ingrese la Tasa Bs/USDt", "error");
      return;
    }
    if (tasaZelle <= 0) {
      showToast("Ingrese la Tasa $/USDt (Zelle)", "error");
      return;
    }

    const tasaUsada = tasaAplicable(montoUSD, mayor50, menor50);
    if (tasaUsada <= 0) {
      showToast("La tasa aplicable es 0. Verifique la Tasa >= 50$", "error");
      return;
    }

    const { totalBs, montoUsdt, cambioUsdt, ganancia, pct } = calcularOperacion({
      montoUSD,
      tasaUsada,
      tasaZelle,
      tasaBsUsdt,
      comisionUsdt,
      comisionPct,
    });

    try {
      await addDoc(colRef, {
        fecha: new Date().toLocaleString(),
        timestamp: Date.now(),
        monto: montoUSD,
        tasa: tasaUsada,
        totalBs,
        montoUsdt,
        cambioUsdt,
        ganancia,
        pct,
      });
      fields.montoUSD.value = "";
      showToast("Registro guardado correctamente");
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  });
});

onSnapshot(
  query(colRef, orderBy("timestamp", "desc")),
  (snapshot) => {
    registrosCache = [];
    const listaRegistrosUI = document.getElementById("lista-registros");
    listaRegistrosUI.innerHTML = "";

    snapshot.docs.forEach((docSnap) => {
      const reg = docSnap.data();
      registrosCache.push(reg);
      listaRegistrosUI.appendChild(buildRow(reg, docSnap.id));
    });

    actualizarGrafico(registrosCache);
  },
  (error) => {
    console.error("Firestore onSnapshot:", error);
    showToast("Error al cargar el historial: " + error.message, "error");
  },
);
