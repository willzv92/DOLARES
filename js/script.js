// Importamos las funciones necesarias de la versión 12.11.0
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrEYcnNbWLgVShx6v5GmeU3eddCGTQ1xU",
  authDomain: "dolares-aa1fa.firebaseapp.com",
  projectId: "dolares-aa1fa",
  storageBucket: "dolares-aa1fa.firebasestorage.app",
  messagingSenderId: "383367321854",
  appId: "1:383367321854:web:924a893f685f21b6feadaf",
  measurementId: "G-L8CPLQSREN",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "historial_cambios");

let chartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
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

    // Cálculo de Brecha (se actualiza mientras escribes)
    if (bcv > 0) {
      const brechaVal = (Math.abs(usdt - bcv) / bcv) * 100;
      brechaDisp.value = brechaVal.toFixed(2) + "%";
    }

    const promedio = (bcv + usdt) / 2;
    tasaPromedioDisp.value = promedio.toFixed(4);

    if (promedio > 0) {
      const diferenciaPct = (Math.abs(usdt - bcv) / bcv) * 100;
      let estimada =
        diferenciaPct < 50
          ? promedio + (usdt - promedio) * f1
          : promedio + (usdt - promedio) * f2;
      tasaEstimadaDisp.value = estimada.toFixed(4);
    }

    if (mayor50 > 0) {
      const calculoMenor = mayor50 - 15;
      tasaMenor50Disp.value = calculoMenor.toFixed(2);
    } else {
      tasaMenor50Disp.value = "";
    }
  };

  // Listeners de entrada únicos
  inputs.forEach((id) =>
    fields[id].addEventListener("input", updateAutomatedFields),
  );

  btnCalcular.addEventListener("click", () => {
    const montoUSD = parseFloat(fields.montoUSD.value) || 0;
    const comisionPct = parseFloat(fields.comisionPct.value) || 0;
    const mayor50 = parseFloat(fields.tasaMayor50.value) || 0;
    const menor50 = parseFloat(tasaMenor50Disp.value) || 0;

    if (montoUSD <= 0 || mayor50 <= 0) {
      alert("Por favor, ingrese el Monto $ y la Tasa >= 50$");
      return;
    }

    const tasaFinal = montoUSD >= 50 ? mayor50 : menor50;
    const montoBs = montoUSD * tasaFinal;
    const comisionBs = montoBs * (comisionPct / 100);
    const totalBs = montoBs + comisionBs;

    document.getElementById("outMontoBs").innerText = montoBs.toLocaleString(
      "es-VE",
      { minimumFractionDigits: 2 },
    );
    document.getElementById("outComisionBs").innerText =
      comisionBs.toLocaleString("es-VE", { minimumFractionDigits: 2 });
    document.getElementById("outTotalBs").innerText = totalBs.toLocaleString(
      "es-VE",
      { minimumFractionDigits: 2 },
    );
    document.getElementById("result-card").style.display = "block";
  });
});

function actualizarGrafico(registros) {
  const ctx = document.getElementById("graficoGanancias").getContext("2d");
  const gananciasPorMes = {};

  registros.forEach((reg) => {
    const fecha = new Date(reg.timestamp);
    const mesAnio = fecha.toLocaleString("es-ES", {
      month: "short",
      year: "2-digit",
    });
    gananciasPorMes[mesAnio] = (gananciasPorMes[mesAnio] || 0) + reg.ganancia;
  });

  const etiquetas = Object.keys(gananciasPorMes).reverse();
  const datos = Object.values(gananciasPorMes).reverse();

  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Ganancia USDt",
          data: datos,
          backgroundColor: "#c5a059",
          borderRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: "#233554" } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

// LÓGICA DE FIREBASE (onSnapshot actualizado)
onSnapshot(query(colRef, orderBy("timestamp", "desc")), (snapshot) => {
  const registros = [];
  const listaRegistrosUI = document.getElementById("lista-registros");
  listaRegistrosUI.innerHTML = "";

  snapshot.docs.forEach((docSnap) => {
    const reg = docSnap.data();
    registros.push(reg);
    const colorGanancia = reg.ganancia >= 0 ? "#2ecc71" : "#e74c3c";
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>${reg.fecha}</td>
            <td>${reg.monto.toFixed(2)}</td>
            <td>${reg.tasa.toFixed(2)}</td>
            <td>${reg.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</td>
            <td>${reg.montoUsdt.toFixed(2)}</td>
            <td>${reg.cambioUsdt.toFixed(2)}</td>
            <td style="color: ${colorGanancia}; font-weight: bold;">${reg.ganancia.toFixed(2)}</td>
            <td style="color: ${colorGanancia}">${reg.pct.toFixed(2)}%</td>
            <td><button class="btn-del" data-id="${docSnap.id}">X</button></td>
        `;
    listaRegistrosUI.appendChild(tr);
  });

  // Llamamos al gráfico con los datos actuales de la base de datos
  actualizarGrafico(registros);

  document.querySelectorAll(".btn-del").forEach((btn) => {
    btn.onclick = async () => {
      if (confirm("¿Eliminar registro?")) {
        await deleteDoc(
          doc(db, "historial_cambios", btn.getAttribute("data-id")),
        );
      }
    };
  });
});

const btnRegistrar = document.getElementById("btn-registrar");
btnRegistrar.addEventListener("click", async () => {
  const montoUSD = parseFloat(document.getElementById("montoUSD").value) || 0;
  const tasaMayor50 =
    parseFloat(document.getElementById("tasaMayor50").value) || 0;
  const tasaMenor50 =
    parseFloat(document.getElementById("tasaMenor50").value) || 0;
  const tasaZelle = parseFloat(document.getElementById("tasaZelle").value) || 0;
  const tasaBsUsdt =
    parseFloat(document.getElementById("tasaBsUsdt").value) || 0;
  const comisionUsdt =
    parseFloat(document.getElementById("comisionUsdt").value) || 0;

  if (montoUSD === 0 || tasaBsUsdt === 0) {
    alert("Faltan datos (Monto $ o Tasa Bs/USDt)");
    return;
  }

  const tasaUsada = montoUSD >= 50 ? tasaMayor50 : tasaMenor50;
  const montoTotalBs = montoUSD * tasaUsada;
  const montoUSDt = montoUSD * tasaZelle;
  const cambioUSDt = montoTotalBs / tasaBsUsdt;
  const gananciaUSDt = montoUSDt - cambioUSDt - comisionUsdt;

  await addDoc(colRef, {
    fecha: new Date().toLocaleString(),
    timestamp: Date.now(),
    monto: montoUSD,
    tasa: tasaUsada,
    totalBs: montoTotalBs,
    montoUsdt: montoUSDt,
    cambioUsdt: cambioUSDt,
    ganancia: gananciaUSDt,
    pct: montoUSDt !== 0 ? (gananciaUSDt / montoUSDt) * 100 : 0,
  });
});
